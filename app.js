// ─── Global app state ─────────────────────────────────────────────────────────

window.App = {
  profiles: [],
  activeProfileId: DEFAULT_PROFILE_ID,
  viewedProfileId: DEFAULT_PROFILE_ID,
  accounts: [],
  accountsFetchError: null,
  settings: { ...DEFAULT_SETTINGS },

  get activeProfile() {
    return getActiveProfile(this.profiles, this.activeProfileId);
  },
  get viewedProfile() {
    return getActiveProfile(this.profiles, this.viewedProfileId);
  },
  get defaultProfile() {
    return getDefaultProfile(this.profiles);
  },

  saveProfiles(callback) {
    saveProfiles(this.profiles, () => { if (callback) callback(); });
  },
};

// ─── Boot ─────────────────────────────────────────────────────────────────────

function bootFromStorage() {
  loadProfiles((data) => {
    App.profiles = data.profiles;
    App.activeProfileId = data.activeProfileId;
    App.viewedProfileId = data.activeProfileId;
    App.accounts = data.accounts;

    loadSettings((s) => {
      App.settings = s;
      renderProfileBar();
      renderQuickSwitch();
      renderRulesSummary();
      window.dispatchEvent(new CustomEvent("app:ready"));
    });

    fetchAndStoreAccounts();
  });
}

function showMigrationBanner(text, showRepair) {
  const banner = document.getElementById("migration-banner");
  const label = document.getElementById("migration-banner-text");
  if (!banner || !label) return;
  label.textContent = text;
  banner.classList.remove("hidden");

  let repairBtn = document.getElementById("migration-repair-btn");
  if (showRepair) {
    if (!repairBtn) {
      repairBtn = document.createElement("button");
      repairBtn.id = "migration-repair-btn";
      repairBtn.type = "button";
      repairBtn.className = "banner-btn banner-btn-yes migration-repair-btn";
      repairBtn.textContent = "Try import again";
      banner.appendChild(repairBtn);
    }
    repairBtn.onclick = () => {
      chrome.runtime.sendMessage("try_migrate_legacy", (result) => {
        bootFromStorage();
        if (result?.migrated && result.ruleCount > 0) {
          showMigrationBanner(
            "Imported " + result.ruleCount + " rule(s) from previous extension storage.",
            false
          );
        } else {
          explainEmptyStorage(result?.diagnostics);
        }
      });
    };
    repairBtn.classList.remove("hidden");
  } else if (repairBtn) {
    repairBtn.classList.add("hidden");
  }
}

function explainEmptyStorage(diagnostics) {
  chrome.runtime.sendMessage("check_extension_conflicts", (conflict) => {
    if (conflict?.officialEnabled) {
      showMigrationBanner(
        "The official “" +
          (conflict.officialName || "Default Google Account") +
          "” add-on is still enabled. Disable it in about:addons so only this extension redirects. Import rules via Settings → Import / Export (see docs/MIGRATION.md).",
        false
      );
      return;
    }

    if (diagnostics?.hasLegacyRulesAtRoot && diagnostics?.canAutoMigrate) {
      showMigrationBanner(
        "Found " +
          diagnostics.rootRuleCount +
          " rule(s) in imported data. Click Try import again to merge into profiles.",
        true
      );
      return;
    }

    showMigrationBanner(
      "No rules saved yet. Import a JSON backup or add rules under Settings. See docs/MIGRATION.md on GitHub.",
      false
    );
  });
}

function checkExtensionConflicts() {
  chrome.runtime.sendMessage("check_extension_conflicts", (res) => {
    if (res?.officialEnabled) {
      showMigrationBanner(
        "Disable the official “" +
          (res.officialName || "Default Google Account") +
          "” add-on in about:addons. Only one redirect extension should be enabled. Import your rules via Settings → Import / Export.",
        false
      );
    }
  });
}

chrome.runtime.sendMessage("try_migrate_legacy", (result) => {
  bootFromStorage();
  if (result?.migrated && result.ruleCount > 0) {
    showMigrationBanner(
      "Merged " + result.ruleCount + " rule(s) into your Default profile.",
      false
    );
  } else {
    const d = result?.diagnostics;
    if (d?.hasLegacyRulesAtRoot && d.canAutoMigrate) {
      showMigrationBanner(
        "Found " + d.rootRuleCount + " imported rule(s). Click Try import again to merge into profiles.",
        true
      );
    } else {
      explainEmptyStorage(d);
    }
  }
  checkExtensionConflicts();
});

chrome.storage.onChanged.addListener(() => {
  loadProfiles((data) => {
    App.profiles = data.profiles;
    App.activeProfileId = data.activeProfileId;
    App.accounts = data.accounts;
    loadSettings((s) => {
      App.settings = s;
      renderProfileBar();
      renderQuickSwitch();
      renderRulesSummary();
      window.dispatchEvent(new CustomEvent("app:updated"));
    });
  });
});

// ─── Account fetching ─────────────────────────────────────────────────────────

function applyFetchedAccounts(accounts) {
  App.accounts = accounts;
  App.accountsFetchError = null;
  SyncStorage.store({ accounts }, () => {
    if (rebindRuleAccountIds(App.profiles, accounts)) {
      App.saveProfiles(() => {
        renderQuickSwitch();
        renderRulesSummary();
        window.dispatchEvent(new CustomEvent("app:updated"));
      });
      return;
    }
    renderQuickSwitch();
    renderRulesSummary();
    window.dispatchEvent(new CustomEvent("app:updated"));
  });
}

/** Popup fallback when background is not reachable (e.g. after a bad reload). */
function fetchAccountsViaPopupTab(done) {
  pickGoogleTabIdForPopup((tabId, createdTab) => {
    if (!tabId) {
      done(null, "Open https://www.google.com in a tab (signed in), then click Refresh.");
      return;
    }
    chrome.tabs.executeScript(
      tabId,
      { code: buildListAccountsInjectCode() },
      (results) => {
        if (createdTab) chrome.tabs.remove(tabId);
        if (chrome.runtime.lastError) {
          done(null, chrome.runtime.lastError.message);
          return;
        }
        const accounts = accountsFromListAccountsText(results?.[0]);
        if (!accounts.length) {
          done(null, "No accounts returned from Google. Stay signed in and try again.");
          return;
        }
        done(accounts, null);
      }
    );
  });
}

function pickGoogleTabIdForPopup(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    const active = activeTabs?.[0];
    if (active?.id && active.url && isAnyGoogleUrl(active.url)) {
      callback(active.id, false);
      return;
    }
    chrome.tabs.query({ url: ["*://*.google.com/*"] }, (tabs) => {
      if (tabs?.length) {
        callback(tabs[0].id, false);
        return;
      }
      chrome.tabs.create({ url: "https://www.google.com/", active: false }, (tab) => {
        if (!tab?.id) {
          callback(null, false);
          return;
        }
        const onUpdated = (tabId, info) => {
          if (tabId !== tab.id || info.status !== "complete") return;
          chrome.tabs.onUpdated.removeListener(onUpdated);
          callback(tab.id, true);
        };
        chrome.tabs.onUpdated.addListener(onUpdated);
      });
    });
  });
}

function fetchAndStoreAccounts() {
  App.accountsFetchError = null;

  const finish = (accounts, err) => {
    if (!accounts?.length) {
      App.accountsFetchError = err || "Could not load Google accounts.";
      renderQuickSwitch();
      renderRulesSummary();
      return;
    }
    applyFetchedAccounts(accounts);
  };

  chrome.runtime.sendMessage("fetch_google_accounts", (response) => {
    if (chrome.runtime.lastError) {
      const msg = chrome.runtime.lastError.message || "";
      const backgroundDead = /receiving end does not exist/i.test(msg);
      if (backgroundDead) {
        fetchAccountsViaPopupTab((accounts, err) => {
          if (accounts?.length) finish(accounts, null);
          else {
            App.accountsFetchError =
              (err || msg) +
              " Reload this extension in about:debugging (click Reload on the add-on).";
            renderQuickSwitch();
            renderRulesSummary();
          }
        });
        return;
      }
      finish(null, msg);
      return;
    }

    const accounts = response?.accounts ?? [];
    if (!accounts.length) {
      fetchAccountsViaPopupTab((fallbackAccounts, err) => {
        if (fallbackAccounts?.length) finish(fallbackAccounts, null);
        else finish(null, response?.error || err);
      });
      return;
    }
    finish(accounts, null);
  });
}

function openSignInForAccount(user) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    let url;
    try { url = new URL(tabs[0].url); } catch { url = new URL("https://www.google.com/webhp"); }
    const params = new URLSearchParams(url.search);
    params.delete("authuser");
    params.set("authuser", "");
    url.search = params.toString();
    const signInUrl = "https://accounts.google.com/AccountChooser?source=ogb&continue="
      + encodeURIComponent(url.toString()) + "&Email=" + encodeURIComponent(user.email);
    window.open(signInUrl);
    window.close();
  });
}

// ─── Profile bar ──────────────────────────────────────────────────────────────

function renderProfileBar() {
  const chips = document.getElementById("profile-chips");
  chips.innerHTML = "";
  for (const p of App.profiles) {
    const chip = document.createElement("button");
    chip.className = "profile-chip" + (p.id === App.activeProfileId ? " active" : "");
    chip.style.setProperty("--chip-color", p.color);
    chip.textContent = p.name;
    chip.title = p.id === App.activeProfileId ? "Active profile" : `Switch to ${p.name}`;
    chip.onclick = () => switchActiveProfile(p.id);
    chips.appendChild(chip);
  }
}

// ─── Quick-switch ─────────────────────────────────────────────────────────────

function renderQuickSwitch() {
  const body = document.getElementById("quick-switch-body");
  body.innerHTML = "";

  if (App.accountsFetchError && !App.accounts.length) {
    const err = document.createElement("div");
    err.className = "qs-empty qs-empty--error";
    err.textContent = App.accountsFetchError;
    body.appendChild(err);
    const hint = document.createElement("div");
    hint.className = "qs-hint";
    hint.textContent =
      "Tip: open https://www.google.com in a tab (signed in), then click Refresh above.";
    body.appendChild(hint);
    return;
  }

  if (!App.accounts.length) {
    body.innerHTML =
      '<div class="qs-empty">Loading Google accounts…</div>';
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabUrl = tabs?.[0]?.url ?? "";
    const onGoogle = tabUrl && isGoogleServiceUrl(tabUrl);

    if (!onGoogle) {
      const hint = document.createElement("div");
      hint.className = "qs-hint";
      hint.textContent =
        "Signed-in accounts (open a Google page to switch this tab):";
      body.appendChild(hint);
    }

    let currentAccount = null;
    if (onGoogle) {
      try {
        const u = new URL(tabUrl);
        const auth = u.searchParams.get("authuser");
        if (auth !== null) currentAccount = parseInt(auth, 10) || 0;
        const m = u.pathname.match(/\/u\/(\d+)/);
        if (m) currentAccount = parseInt(m[1], 10) || 0;
      } catch {}
    }

    for (const user of App.accounts) {
      const row = document.createElement("div");
      row.className =
        "qs-row" +
        (onGoogle && user.index === currentAccount ? " qs-row--current" : "");

      const avatar = document.createElement("div");
      avatar.className = "qs-avatar";
      if (user.profileUrl) {
        const img = document.createElement("img");
        img.src = user.profileUrl;
        avatar.appendChild(img);
      } else {
        avatar.textContent = (user.name || user.email || "?")[0].toUpperCase();
      }

      const info = document.createElement("div");
      info.className = "qs-info";
      const nameEl = document.createElement("div");
      nameEl.className = "qs-name";
      nameEl.textContent = user.name;
      const emailEl = document.createElement("div");
      emailEl.className = "qs-email";
      emailEl.textContent = `${user.index + 1}) ${user.email}`;
      info.appendChild(nameEl);
      info.appendChild(emailEl);

      row.appendChild(avatar);
      row.appendChild(info);

      if (!user.isLoggedIn) {
        const badge = document.createElement("span");
        badge.className = "qs-badge";
        badge.textContent = "Signed out";
        row.appendChild(badge);
        if (onGoogle) row.onclick = () => openSignInForAccount(user);
      } else if (onGoogle && user.index === currentAccount) {
        const check = document.createElement("img");
        check.src = "images/checked.svg";
        check.className = "qs-check";
        row.appendChild(check);
      } else if (onGoogle) {
        row.onclick = () => {
          redirectCurrentTab(user.index);
          window.close();
        };
      } else {
        row.classList.add("qs-row--readonly");
      }

      body.appendChild(row);
    }
  });
}

document.getElementById("refresh-accounts-btn")?.addEventListener("click", () => {
  fetchAndStoreAccounts();
});

// ─── Rules summary (read-only, main view) ─────────────────────────────────────

function renderRulesSummary() {
  const container = document.getElementById("rules-summary");
  container.innerHTML = "";

  const profile = App.activeProfile;
  if (!profile) return;

  const resolved = resolveRules(profile, App.defaultProfile);

  if (resolved.length === 0) {
    const empty = document.createElement("div");
    empty.className = "qs-empty qs-empty--import";
    empty.innerHTML =
      "No rules yet. Import a JSON backup or add rules manually.<br><br>" +
      "<button type=\"button\" class=\"settings-btn settings-btn--inline\" id=\"import-from-empty-btn\">Import JSON backup</button> " +
      "or <b>Edit</b> to add rules.";
    container.appendChild(empty);
    const btn = document.getElementById("import-from-empty-btn");
    if (btn) btn.onclick = () => openSettings("data");
    return;
  }

  for (const rule of resolved) {
    const inherited = rule._inherited === true;
    const row = document.createElement("div");
    row.className = "rule-summary-row" + (inherited ? " rule-summary-row--inherited" : "");

    const img = document.createElement("img");
    img.className = "rule-summary-icon";
    img.src = rule.serviceImg ?? "./images/logos/google.png";

    const name = document.createElement("span");
    name.className = "rule-summary-name";
    name.textContent = rule.serviceTitle || rule.serviceUrl;

    const acct = document.createElement("span");
    acct.className = "rule-summary-acct";
    const acctInfo = App.accounts.find(a => a.index === rule.accountId);
    acct.textContent = acctInfo ? acctInfo.email : `#${(rule.accountId ?? 0) + 1}`;

    if (inherited) {
      const tag = document.createElement("span");
      tag.className = "rule-summary-inherited";
      tag.textContent = "inherited";
      row.appendChild(img);
      row.appendChild(name);
      row.appendChild(tag);
    } else {
      row.appendChild(img);
      row.appendChild(name);
    }

    row.appendChild(acct);
    container.appendChild(row);
  }
}

document.getElementById("edit-rules-btn").onclick = () => {
  openSettings("rules");
};

// ─── Profile switch ───────────────────────────────────────────────────────────

function switchActiveProfile(profileId) {
  if (profileId === App.activeProfileId) return;

  const behavior = App.settings.profileSwitchRedirect ?? "ask";

  if (behavior === "always") {
    doSwitchProfile(profileId, true);
    return;
  }
  if (behavior === "never") {
    doSwitchProfile(profileId, false);
    return;
  }

  chrome.runtime.sendMessage("get_google_tabs", (tabs) => {
    if (tabs && tabs.length > 0) {
      showRedirectBanner(profileId, tabs.length);
    } else {
      doSwitchProfile(profileId, false);
    }
  });
}

function showRedirectBanner(profileId, tabCount) {
  const banner = document.getElementById("redirect-banner");
  document.getElementById("redirect-banner-text").textContent =
    `${tabCount} Google tab${tabCount > 1 ? "s" : ""} open. Redirect?`;

  banner.classList.remove("hidden");

  document.getElementById("redirect-yes-btn").onclick = () => {
    banner.classList.add("hidden");
    doSwitchProfile(profileId, true);
  };

  document.getElementById("redirect-choose-btn").onclick = () => {
    banner.classList.add("hidden");
    showTabChooser(profileId);
  };

  document.getElementById("redirect-no-btn").onclick = () => {
    banner.classList.add("hidden");
    doSwitchProfile(profileId, false);
  };
  document.getElementById("redirect-always-btn").onclick = () => {
    banner.classList.add("hidden");
    saveSetting("profileSwitchRedirect", "always");
    doSwitchProfile(profileId, true);
  };
  document.getElementById("redirect-never-btn").onclick = () => {
    banner.classList.add("hidden");
    saveSetting("profileSwitchRedirect", "never");
    doSwitchProfile(profileId, false);
  };
}

function doSwitchProfile(profileId, redirectTabs, tabIds) {
  const msg = { type: "set_active_profile", profileId, redirectTabs };
  if (tabIds && tabIds.length > 0) {
    msg.tabIds = tabIds;
  }
  chrome.runtime.sendMessage(msg, () => {
    App.activeProfileId = profileId;
    App.viewedProfileId = profileId;
    renderProfileBar();
    renderQuickSwitch();
    renderRulesSummary();
    window.dispatchEvent(new CustomEvent("app:profile-switched", { detail: { profileId } }));
  });
}

// ─── Tab chooser ──────────────────────────────────────────────────────────────

function showTabChooser(profileId) {
  const overlay = document.getElementById("tab-chooser-overlay");
  const body = document.getElementById("tab-chooser-body");
  body.innerHTML = "";

  chrome.tabs.query({}, (tabs) => {
    const googleTabs = tabs.filter(t => t.url && isGoogleServiceUrl(t.url));

    if (googleTabs.length === 0) {
      body.innerHTML = '<div class="empty-state">No Google tabs found.</div>';
      return;
    }

    const selected = new Set();

    for (const tab of googleTabs) {
      const item = document.createElement("div");
      item.className = "tab-chooser-item";

      const checkbox = document.createElement("div");
      checkbox.className = "tab-chooser-checkbox";
      checkbox.innerHTML = "✓";

      const info = document.createElement("div");
      info.className = "tab-chooser-info";
      const title = document.createElement("div");
      title.className = "tab-chooser-title";
      title.textContent = tab.title || "Untitled";
      const url = document.createElement("div");
      url.className = "tab-chooser-url";
      url.textContent = new URL(tab.url).hostname;
      info.appendChild(title);
      info.appendChild(url);

      item.appendChild(checkbox);
      item.appendChild(info);

      item.onclick = () => {
        if (selected.has(tab.id)) {
          selected.delete(tab.id);
          checkbox.classList.remove("checked");
        } else {
          selected.add(tab.id);
          checkbox.classList.add("checked");
        }
      };

      body.appendChild(item);
    }

    // Buttons
    document.getElementById("tab-chooser-confirm-btn").onclick = () => {
      overlay.classList.add("hidden");
      doSwitchProfile(profileId, true, Array.from(selected));
    };

    document.getElementById("tab-chooser-cancel-btn").onclick = () => {
      overlay.classList.add("hidden");
    };

    document.getElementById("tab-chooser-close-btn").onclick = () => {
      overlay.classList.add("hidden");
    };
  });

  overlay.classList.remove("hidden");
}

// ─── Settings overlay ─────────────────────────────────────────────────────────

const settingsOverlay = document.getElementById("settings-overlay");
const settingsBody = document.getElementById("settings-body");
const settingsTitle = document.getElementById("settings-title");
// Detach the nav from the live DOM so it survives innerHTML wipes
const settingsNavTemplate = document.getElementById("settings-nav").cloneNode(true);
let _settingsAtNav = true;

document.getElementById("settings-btn").onclick = () => openSettings();
document.getElementById("settings-back-btn").onclick = () => closeSettings();

function openSettings(section) {
  settingsOverlay.classList.remove("hidden");
  if (section) {
    showSettingsSection(section);
  } else {
    showSettingsNav();
  }
}

function closeSettings() {
  if (!_settingsAtNav) {
    showSettingsNav();
    return;
  }
  settingsOverlay.classList.add("hidden");
}

function showSettingsNav() {
  _settingsAtNav = true;
  settingsTitle.textContent = "Settings";
  settingsBody.innerHTML = "";
  const nav = settingsNavTemplate.cloneNode(true);
  nav.querySelectorAll(".settings-nav-item").forEach(btn => {
    btn.onclick = () => showSettingsSection(btn.dataset.section);
  });
  settingsBody.appendChild(nav);
}

function showSettingsSection(section) {
  _settingsAtNav = false;
  const titles = { profiles: "Profiles", rules: "Rules", behaviour: "Behaviour", data: "Import / Export" };
  settingsTitle.textContent = titles[section] || "Settings";

  const tpl = document.getElementById("tpl-" + section);
  if (!tpl) return;

  settingsBody.innerHTML = "";
  const content = tpl.content.cloneNode(true);
  settingsBody.appendChild(content);

  if (section === "profiles") {
    renderProfilesManager();
  } else if (section === "rules") {
    App.viewedProfileId = App.activeProfileId;
    renderScopeLabels();
    window.dispatchEvent(new CustomEvent("app:rules-opened"));
  } else if (section === "behaviour") {
    initBehaviourSettings();
  } else if (section === "data") {
    initImportExport();
  }
}

function renderScopeLabels() {
  const viewed = App.viewedProfile;
  const rl = document.getElementById("rules-scope-label");
  if (rl) {
    const isActive = viewed?.id === App.activeProfileId;
    rl.textContent = (viewed?.name ?? "") + (isActive ? " (active)" : "");
  }
}

// ─── Profile modal (used for edit forms on top of settings) ───────────────────

document.getElementById("modal-close-btn").onclick = closeProfileModal;
document.getElementById("profile-modal-overlay").onclick = (e) => {
  if (e.target === document.getElementById("profile-modal-overlay")) closeProfileModal();
};

function openProfileModal() {
  document.getElementById("profile-modal-overlay").classList.remove("hidden");
}

function closeProfileModal() {
  document.getElementById("profile-modal-overlay").classList.add("hidden");
}

// ─── Behaviour settings ───────────────────────────────────────────────────────

function initBehaviourSettings() {
  const toggle = document.getElementById("enforce-precached-toggle");
  if (!toggle) return;
  toggle.checked = Boolean(App.settings.enforceOnPrecachedUrls);
  toggle.onchange = () => saveSetting("enforceOnPrecachedUrls", toggle.checked);

  const control = document.getElementById("profile-switch-control");
  if (!control) return;
  const options = control.querySelectorAll(".seg-option");
  const current = App.settings.profileSwitchRedirect ?? "ask";
  options.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === current);
    btn.onclick = () => {
      options.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      saveSetting("profileSwitchRedirect", btn.dataset.value);
    };
  });
}

function saveSetting(key, value) {
  const updated = { ...App.settings, [key]: value };
  App.settings = updated;
  chrome.runtime.sendMessage({ type: "save_settings", data: updated }, () => {
    const el = document.getElementById("behaviour-status");
    if (el) {
      el.textContent = "Saved.";
      el.className = "settings-status success";
      setTimeout(() => { el.textContent = ""; el.className = "settings-status"; }, 1500);
    }
  });
}

// ─── Import / Export ──────────────────────────────────────────────────────────

// popup.html is served both as the toolbar popup and, via ?view=tab, as a full tab.
// Firefox tears the popup down the moment a file picker or a download prompt opens
// (bugzilla 1658694, 1384190), so `input[type=file]`'s change event never fires and
// import silently does nothing. The documented workaround is to run that UI on an
// extension page that is not a popup — hence the tab.
const RUNNING_IN_TAB = new URLSearchParams(location.search).get("view") === "tab";
// The stylesheet sizes this document as a 480x600 popup with overflow hidden.
// As a full tab that would clip the page and leave it unscrollable, so the tab
// layout is opted into explicitly rather than applied to both.
if (RUNNING_IN_TAB) document.documentElement.classList.add("as-tab");

function openImportExportInTab() {
  chrome.tabs.create({ url: chrome.runtime.getURL("popup.html?view=tab") });
  window.close();
}

function initImportExport() {
  const versionEl = document.getElementById("bedag-version");
  if (versionEl) versionEl.textContent = chrome.runtime.getManifest().version;

  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const importFile = document.getElementById("import-file");
  if (!exportBtn) return;

  if (!RUNNING_IN_TAB) {
    // In the popup, both buttons would be dismissed mid-action. Offer the tab instead.
    const note = document.getElementById("data-popup-note");
    if (note) note.classList.remove("hidden");
    exportBtn.textContent = "Open in a tab";
    exportBtn.onclick = openImportExportInTab;
    importBtn.textContent = "Open in a tab";
    importBtn.onclick = openImportExportInTab;
    return;
  }

  exportBtn.onclick = () => {
    chrome.runtime.sendMessage("export_settings", (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bedag-settings.json";
      a.click();
      URL.revokeObjectURL(url);
      showStatus("Exported successfully!", "success");
    });
  };

  importBtn.onclick = () => importFile.click();

  importFile.onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        chrome.runtime.sendMessage({ type: "import_settings", data }, (response) => {
          if (response?.success) {
            showStatus("Imported! Reopen popup (reload extension if rules look stale).", "success");
          } else {
            showStatus("Import failed: " + (response?.error ?? "unknown error"), "error");
          }
        });
      } catch {
        showStatus("Invalid JSON file.", "error");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };
}

// Opened as a tab purely to do an import or export - go straight there.
if (RUNNING_IN_TAB) {
  window.addEventListener("app:ready", () => openSettings("data"), { once: true });
}

function showStatus(msg, type) {
  const el = document.getElementById("settings-status");
  if (!el) return;
  el.textContent = msg;
  el.className = "settings-status " + type;
  setTimeout(() => { el.textContent = ""; el.className = "settings-status"; }, 4000);
}
