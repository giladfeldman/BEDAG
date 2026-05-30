// utils.js is loaded first via manifest background.scripts — do not importScripts again.

// ─── In-memory state ─────────────────────────────────────────────────────────

let _profiles = [];
let _activeProfileId = DEFAULT_PROFILE_ID;
let _accounts = [];
let _settings = { ...DEFAULT_SETTINGS };
let _interceptorsRegistered = false;

function activeProfile() {
  return getActiveProfile(_profiles, _activeProfileId);
}
function defaultProfile() {
  return getDefaultProfile(_profiles);
}

function loadState(cb) {
  loadProfiles((data) => {
    _profiles = data.profiles;
    _activeProfileId = data.activeProfileId;
    _accounts = data.accounts ?? [];
    if (rebindRuleAccountIds(_profiles, _accounts)) {
      saveProfiles(_profiles, () => {});
    } else if (normalizeProfileServiceUrls(_profiles)) {
      saveProfiles(_profiles, () => {});
    }
    loadSettings((s) => {
      _settings = s;
      if (cb) cb();
    });
  });
}

function storeAccountsAndRebind(accounts, callback) {
  SyncStorage.get("profiles", (data) => {
    const profiles = data.profiles ?? _profiles;
    if (rebindRuleAccountIds(profiles, accounts)) {
      SyncStorage.store({ accounts, profiles }, callback);
    } else {
      SyncStorage.store({ accounts }, callback);
    }
    _accounts = accounts;
  });
}

function pickGoogleTabId(callback) {
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

function runListAccountsOnTab(tabId, createdTab, done) {
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
        done(
          null,
          "No signed-in Google accounts returned. Open google.com while signed in, then click Refresh."
        );
        return;
      }
      done(accounts, null);
    }
  );
}

function fetchListAccountsViaGoogleTab(done) {
  pickGoogleTabId((tabId, createdTab) => {
    if (!tabId) {
      done(null, "No Google tab available to read signed-in accounts.");
      return;
    }
    runListAccountsOnTab(tabId, createdTab, done);
  });
}

function fetchListAccountsFromBackground(done) {
  const url = LIST_ACCOUNTS_URLS[0];
  fetch(url)
    .then((r) => r.text())
    .then((rawText) => {
      const accounts = accountsFromListAccountsText(rawText);
      if (accounts.length) done(accounts, null);
      else done(null, "background-empty");
    })
    .catch(() => done(null, "background-fetch-failed"));
}

function fetchGoogleAccountsComplete(done) {
  fetchListAccountsViaGoogleTab((accounts, err) => {
    if (accounts?.length) {
      done(accounts, null);
      return;
    }
    fetchListAccountsFromBackground((bgAccounts, bgErr) => {
      if (bgAccounts?.length) {
        done(bgAccounts, null);
        return;
      }
      done(null, err || bgErr || "Could not load Google accounts.");
    });
  });
}

function fetchGoogleAccountsInBackground() {
  fetchGoogleAccountsComplete((accounts, err) => {
    if (!accounts?.length) return;
    storeAccountsAndRebind(accounts);
  });
}

migrateLegacyStorageIfNeeded(() => {
  loadState(() => {
    fetchGoogleAccountsInBackground();
    registerInterceptors();
  });
});

chrome.storage.onChanged.addListener(() => {
  loadState();
});

chrome.runtime.onInstalled.addListener(() => {
  migrateLegacyStorageIfNeeded(() => {
    loadState(() => {
      fetchGoogleAccountsInBackground();
      registerInterceptors();
    });
  });
});

// ─── Message handlers ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === "fetch_google_accounts") {
    fetchGoogleAccountsComplete((accounts, err) => {
      if (accounts?.length) {
        storeAccountsAndRebind(accounts, () => sendResponse({ accounts }));
      } else {
        sendResponse({ accounts: [], error: err });
      }
    });
    return true;
  }

  if (message?.type === "set_active_profile") {
    const { profileId, redirectTabs, tabIds } = message;
    SyncStorage.store({ activeProfileId: profileId }, () => {
      _activeProfileId = profileId;
      if (redirectTabs) {
        if (tabIds && tabIds.length > 0) {
          redirectSpecificTabs(tabIds);
        } else {
          redirectAllGoogleTabs();
        }
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (message === "get_google_tabs") {
    chrome.tabs.query({}, (tabs) => {
      const googleTabs = tabs.filter((t) => t.url && isGoogleServiceUrl(t.url));
      sendResponse(
        googleTabs.map((t) => ({ id: t.id, url: t.url, title: t.title }))
      );
    });
    return true;
  }

  if (message === "export_settings") {
    SyncStorage.get(["profiles", "activeProfileId"], (data) => {
      sendResponse({
        version: "2.1",
        bedagVersion: chrome.runtime.getManifest().version,
        exportedAt: new Date().toISOString(),
        profiles: data.profiles ?? [],
        activeProfileId: data.activeProfileId ?? DEFAULT_PROFILE_ID,
      });
    });
    return true;
  }

  if (message?.type === "save_settings") {
    saveSettings(message.data, () => {
      _settings = { ...DEFAULT_SETTINGS, ...message.data };
      sendResponse({ success: true });
    });
    return true;
  }

  if (message === "try_migrate_legacy") {
    migrateLegacyStorageIfNeeded((result) => {
      if (result?.migrated) loadState();
      sendResponse(result ?? { migrated: false, ruleCount: 0 });
    });
    return true;
  }

  if (message === "get_storage_diagnostics") {
    SyncStorage.get(
      ["rules", "defaultAccount", "customServices", "profiles", "activeProfileId", "accounts"],
      (data) => {
        sendResponse(getStorageDiagnostics(data));
      }
    );
    return true;
  }

  if (message === "check_extension_conflicts") {
    if (!chrome.management?.getAll) {
      sendResponse({ officialEnabled: false });
      return true;
    }
    chrome.management.getAll((exts) => {
      const official = exts.find(
        (e) => e.enabled && isOfficialDefaultGoogleAccountExtension(e, chrome.runtime.id)
      );
      sendResponse({
        officialEnabled: Boolean(official),
        officialName: official?.name ?? null,
      });
    });
    return true;
  }

  if (message?.type === "import_settings") {
    const normalized = normalizeImportPayload(message.data);
    if (normalized.error) {
      sendResponse({ success: false, error: normalized.error });
      return true;
    }
    SyncStorage.store(
      {
        profiles: normalized.profiles,
        activeProfileId: normalized.activeProfileId,
      },
      () => {
        _profiles = normalized.profiles;
        _activeProfileId = normalized.activeProfileId;
        loadState(() => {
          fetchGoogleAccountsInBackground();
          sendResponse({ success: true });
        });
      }
    );
    return true;
  }
});

// ─── Redirect tabs to active profile ──────────────────────────────────────────

function redirectAllGoogleTabs() {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      applyRedirectToTab(tab.id, tab.url);
    }
  });
}

function redirectSpecificTabs(tabIds) {
  if (!tabIds || tabIds.length === 0) return;
  const tabIdSet = new Set(tabIds);
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tabIdSet.has(tab.id)) continue;
      applyRedirectToTab(tab.id, tab.url);
    }
  });
}

function applyRedirectToTab(tabId, url) {
  if (!url || shouldSuppressTabRedirect(tabId)) return;
  const result = resolveRedirectForUrl(
    url,
    _settings,
    _profiles,
    _activeProfileId,
    _accounts
  );
  if (!result?.redirectUrl) return;
  if (detectRedirectCycle(result.redirectUrl)) return;
  recordTabRedirectTarget(tabId, result.accountId);
  chrome.tabs.update(tabId, { url: result.redirectUrl });
}

// ─── Request interception (primary — same approach as original extension) ─────

let last4RedirectUrls = [];
const maxRedirectTimeMS = 250;

/** Per-tab authuser ping-pong detection (Maps often fights authuser=1 vs 0). */
const tabAuthHistory = new Map();
const TAB_PING_PONG_WINDOW_MS = 4000;
const TAB_SUPPRESS_MS = 45000;

function authuserFromUrlString(url) {
  try {
    const u = new URL(url);
    const auth = u.searchParams.get("authuser");
    if (auth !== null && auth !== "") return parseInt(auth, 10);
    const m = u.pathname.match(/\/u\/(\d+)/);
    if (m) return parseInt(m[1], 10);
  } catch {}
  return null;
}

function noteTabAuthNavigation(tabId, url) {
  if (tabId < 0 || !url) return;
  const auth = authuserFromUrlString(url);
  if (auth === null) return;

  const now = Date.now();
  const state = tabAuthHistory.get(tabId) ?? { samples: [], suppressUntil: 0 };
  const last = state.samples[state.samples.length - 1];

  if (!last || last.auth !== auth) {
    state.samples.push({ auth, t: now });
  }
  state.samples = state.samples.filter((s) => now - s.t < TAB_PING_PONG_WINDOW_MS);

  if (state.samples.length >= 4) {
    let alternations = 0;
    for (let i = 1; i < state.samples.length; i++) {
      if (state.samples[i].auth !== state.samples[i - 1].auth) alternations++;
    }
    if (alternations >= 3) {
      state.suppressUntil = now + TAB_SUPPRESS_MS;
      state.samples = [];
    }
  }

  tabAuthHistory.set(tabId, state);
}

function shouldSuppressTabRedirect(tabId) {
  if (tabId < 0) return false;
  const state = tabAuthHistory.get(tabId);
  return state ? Date.now() < state.suppressUntil : false;
}

function recordTabRedirectTarget(tabId, accountId) {
  if (tabId < 0) return;
  const now = Date.now();
  const state = tabAuthHistory.get(tabId) ?? { samples: [], suppressUntil: 0 };
  state.samples.push({ auth: accountId, t: now });
  state.samples = state.samples.filter((s) => now - s.t < TAB_PING_PONG_WINDOW_MS);
  tabAuthHistory.set(tabId, state);
}

chrome.tabs.onRemoved.addListener((tabId) => {
  tabAuthHistory.delete(tabId);
});

function redirectCycleKey(url) {
  try {
    const u = new URL(url);
    const auth = u.searchParams.get("authuser");
    const um = u.pathname.match(/\/u\/(\d+)/);
    const idx = auth !== null && auth !== "" ? auth : um ? um[1] : "none";
    return `${u.origin}${u.pathname}|${idx}`;
  } catch {
    return url;
  }
}

function detectRedirectCycle(redirectUrl) {
  const currentTime = Date.now();
  const key = redirectCycleKey(redirectUrl);
  if (last4RedirectUrls.length > 0) {
    const last = last4RedirectUrls[last4RedirectUrls.length - 1];
    if (currentTime - last.time > maxRedirectTimeMS) last4RedirectUrls = [];
  }
  last4RedirectUrls.push({ time: currentTime, redirectUrl, key });
  last4RedirectUrls = last4RedirectUrls.filter((r) => currentTime - r.time <= maxRedirectTimeMS);
  if (last4RedirectUrls.length < 4) return false;
  const keys = last4RedirectUrls.map((r) => r.key);
  if (new Set(keys).size <= 2) return true;
  return last4RedirectUrls.every((r) => r.redirectUrl === last4RedirectUrls[0].redirectUrl);
}

function isCustomServiceUrl(url) {
  const prof = activeProfile();
  const defProf = defaultProfile();
  const allCustom = [
    ...(prof?.customServices ?? []),
    ...((prof?.id !== DEFAULT_PROFILE_ID ? defProf?.customServices : null) ?? []),
  ];
  return allCustom.some((cs) => {
    try {
      return new RegExp(cs.pattern, "i").test(url);
    } catch {
      return false;
    }
  });
}

function shouldInterceptUrl(url) {
  if (shouldIgnoreRedirectUrl(url)) return false;
  return isGoogleServiceUrl(url) || isCustomServiceUrl(url);
}

function registerInterceptors() {
  if (_interceptorsRegistered) return;
  _interceptorsRegistered = true;

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method !== "GET") return;
    if (!shouldInterceptUrl(details.url)) return;

    noteTabAuthNavigation(details.tabId, details.url);
    if (shouldSuppressTabRedirect(details.tabId)) return;

    const result = resolveRedirectForUrl(
      details.url,
      _settings,
      _profiles,
      _activeProfileId,
      _accounts
    );
    if (!result?.redirectUrl) return;

    if (detectRedirectCycle(result.redirectUrl)) return;

    recordTabRedirectTarget(details.tabId, result.accountId);
    return { redirectUrl: result.redirectUrl };
  },
  { types: ["main_frame"], urls: ["<all_urls>"] },
  ["blocking"]
);

chrome.tabs.onCreated.addListener((tab) => {
  const url = tab.pendingUrl || tab.url;
  if (!url || !shouldInterceptUrl(url)) return;

  const applyNewTabRedirect = () => {
    if (shouldSuppressTabRedirect(tab.id)) return;
    const result = resolveRedirectForUrl(
      url,
      _settings,
      _profiles,
      _activeProfileId,
      _accounts
    );
    if (!result?.redirectUrl) return;
    if (detectRedirectCycle(result.redirectUrl)) return;
    recordTabRedirectTarget(tab.id, result.accountId);
    chrome.tabs.update(tab.id, { url: result.redirectUrl });
  };

  if (tab.openerTabId) {
    chrome.tabs.get(tab.openerTabId, (opener) => {
      if (opener?.url && isAnyGoogleUrl(opener.url)) return;
      applyNewTabRedirect();
    });
  } else {
    applyNewTabRedirect();
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  // webRequest handles most loads; only fill in URLs with no account marker yet.
  if (_settings.enforceOnPrecachedUrls) {
    if (/[?&]authuser=\d/i.test(details.url) || /\/u\/\d+\b/i.test(details.url)) return;
  } else if (/authuser/i.test(details.url) || /\/u\/\d+/i.test(details.url)) {
    return;
  }
  if (shouldSuppressTabRedirect(details.tabId)) return;
  applyRedirectToTab(details.tabId, details.url);
});
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  if (!command?.startsWith("switch_to_ga_")) return;
  const accNum = parseInt(command.slice(-1), 10) - 1;
  if (isNaN(accNum)) return;
  if (getAccountByIndex(_accounts, accNum)) {
    redirectCurrentTab(accNum);
  }
});
