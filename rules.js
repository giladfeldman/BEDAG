// Rules editor — rendered inside settings overlay when rules section is opened

function renderRulesUI() {
  renderRulesList();
  renderAddServiceRule();
  renderAddCustomRule();
}

// ─── Active rules list ────────────────────────────────────────────────────────

function renderRulesList() {
  const body = document.getElementById("rules-body");
  if (!body) return;
  body.innerHTML = "";
  const profile = App.viewedProfile;
  if (!profile) return;

  const isDefault = profile.id === DEFAULT_PROFILE_ID;
  const resolved  = resolveRules(profile, App.defaultProfile);

  if (resolved.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = isDefault
      ? "No rules yet. Add one below."
      : "No rules. Add one below, or rules are inherited from Default.";
    body.appendChild(empty);
    return;
  }

  for (const rule of resolved) {
    const inherited = rule._inherited === true;
    const row = document.createElement("div");
    row.className = "rule-row" + (inherited ? " rule-row--inherited" : "");

    const img = document.createElement("img");
    img.className = "rule-img";
    img.src = rule.serviceImg ?? "./images/logos/google.png";

    const info = document.createElement("div");
    info.className = "rule-info";

    const title = document.createElement("div");
    title.className = "rule-title";
    title.textContent = rule.isCustom
      ? `${rule.serviceTitle} (custom)`
      : (rule.serviceTitle || rule.serviceUrl);

    const desc = document.createElement("div");
    desc.className = "rule-desc";
    desc.textContent = rule.accountEmail;

    if (inherited) {
      const tag = document.createElement("span");
      tag.className = "inherited-tag";
      tag.textContent = "inherited";
      desc.appendChild(document.createTextNode(" "));
      desc.appendChild(tag);
    }

    info.appendChild(title);
    info.appendChild(desc);

    const actions = document.createElement("div");
    actions.className = "rule-actions";

    if (inherited) {
      const overrideBtn = document.createElement("button");
      overrideBtn.className = "rule-btn rule-btn--override";
      overrideBtn.textContent = "Override";
      overrideBtn.title = "Add a rule in this profile that overrides the Default";
      overrideBtn.onclick = () => openOverrideDialog(rule);
      actions.appendChild(overrideBtn);
    } else {
      const delBtn = document.createElement("button");
      delBtn.className = "rule-btn rule-btn--delete";
      delBtn.appendChild(deleteIcon());
      delBtn.title = "Remove rule";
      delBtn.onclick = () => deleteRule(rule);
      actions.appendChild(delBtn);
    }

    row.appendChild(img);
    row.appendChild(info);
    row.appendChild(actions);
    body.appendChild(row);
  }
}

function openOverrideDialog(inheritedRule) {
  const accounts = App.accounts;
  if (!accounts.length) return;

  const body = document.getElementById("rules-body");
  if (!body) return;
  const existing = document.getElementById("override-picker");
  if (existing) existing.remove();

  const picker = document.createElement("div");
  picker.id = "override-picker";
  picker.className = "override-picker";

  const label = document.createElement("p");
  label.textContent = `Override "${inheritedRule.serviceTitle}" for profile "${App.viewedProfile.name}":`;
  picker.appendChild(label);

  const select = document.createElement("select");
  for (const acc of accounts) {
    const opt = document.createElement("option");
    opt.value = JSON.stringify(acc);
    opt.textContent = `${acc.index + 1}) ${acc.email}`;
    if (acc.index === inheritedRule.accountId) opt.selected = true;
    select.appendChild(opt);
  }
  picker.appendChild(select);

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex"; btnRow.style.gap = "8px"; btnRow.style.marginTop = "8px";

  const confirm = document.createElement("button");
  confirm.className = "settings-btn";
  confirm.textContent = "Save override";
  confirm.onclick = () => {
    const acc = JSON.parse(select.value);
    addRuleToProfile({
      serviceName:   inheritedRule.serviceName,
      serviceTitle:  inheritedRule.serviceTitle,
      serviceUrl:    inheritedRule.serviceUrl,
      serviceImg:    inheritedRule.serviceImg,
      accountEmail:  acc.email,
      accountId:     acc.index,
      isCustom:      inheritedRule.isCustom,
      pattern:       inheritedRule.pattern,
    });
    picker.remove();
  };
  const cancel = document.createElement("button");
  cancel.className = "settings-btn settings-btn--ghost";
  cancel.textContent = "Cancel";
  cancel.onclick = () => picker.remove();
  btnRow.appendChild(confirm);
  btnRow.appendChild(cancel);
  picker.appendChild(btnRow);

  body.insertAdjacentElement("afterend", picker);
}

// ─── Add Google service rule ──────────────────────────────────────────────────

function renderAddServiceRule() {
  const profile     = App.viewedProfile;
  const allServices = allSupportedGoogleServices();
  const usedNames   = new Set((profile?.rules ?? []).filter(r => !r.isCustom).map(r => (r.serviceName || "").toLowerCase()));
  const available   = allServices.filter(s => !usedNames.has(s.name.toLowerCase()))
                                  .sort((a, b) => a.title.localeCompare(b.title));
  const accounts    = App.accounts;

  const svc = document.getElementById("service-picker-container");
  if (!svc) return;
  svc.innerHTML = "";

  const svcLabel = document.createElement("label");
  svcLabel.textContent = "Google service:";
  svc.appendChild(svcLabel);

  const search = document.createElement("input");
  search.type = "text";
  search.placeholder = "Search services...";
  search.className = "service-search";
  svc.appendChild(search);

  const arrow1 = document.createElement("img");
  arrow1.src = "images/arrow.svg";
  const svcSelect = document.createElement("select");
  svcSelect.id = "service-picker";

  function fill(filter) {
    svcSelect.innerHTML = "";
    const filtered = filter
      ? available.filter(s => s.title.toLowerCase().includes(filter.toLowerCase()))
      : available;
    for (const s of filtered) {
      const opt = document.createElement("option");
      opt.value = JSON.stringify(s);
      opt.textContent = s.title;
      svcSelect.appendChild(opt);
    }
  }
  fill("");
  search.addEventListener("input", () => fill(search.value));
  svc.appendChild(svcSelect);
  svc.appendChild(arrow1);

  const acc = document.getElementById("account-picker-container");
  if (!acc) return;
  acc.innerHTML = "";

  const accLabel = document.createElement("label");
  accLabel.textContent = "Account:";
  acc.appendChild(accLabel);

  const arrow2 = document.createElement("img");
  arrow2.src = "images/arrow.svg";
  const accSelect = document.createElement("select");
  accSelect.id = "account-picker";
  for (const a of accounts) {
    const opt = document.createElement("option");
    opt.value = JSON.stringify(a);
    opt.textContent = `${a.index + 1}) ${a.email}`;
    accSelect.appendChild(opt);
  }
  acc.appendChild(accSelect);
  acc.appendChild(arrow2);

  const btnDiv = document.getElementById("action-button-div");
  if (!btnDiv) return;
  btnDiv.innerHTML = "";
  const btn = document.createElement("button");
  btn.textContent = "Add rule";
  btn.onclick = () => {
    if (!svcSelect.options.length || !accSelect.options.length) return;
    const s = JSON.parse(svcSelect.options[svcSelect.selectedIndex].value);
    const a = JSON.parse(accSelect.options[accSelect.selectedIndex].value);
    addRuleToProfile({
      serviceName:  s.name,
      serviceTitle: s.title,
      serviceUrl:   s.url,
      serviceImg:   s.img,
      accountEmail: a.email,
      accountId:    a.index,
    });
  };
  btnDiv.appendChild(btn);
}

// ─── Add custom URL rule ──────────────────────────────────────────────────────

function renderAddCustomRule() {
  const container = document.getElementById("custom-account-picker-container");
  if (!container) return;
  container.innerHTML = "";
  const accounts = App.accounts;

  const label = document.createElement("label");
  label.textContent = "Account:";
  container.appendChild(label);

  const arrow = document.createElement("img");
  arrow.src = "images/arrow.svg";
  const select = document.createElement("select");
  select.id = "custom-account-picker";
  for (const a of accounts) {
    const opt = document.createElement("option");
    opt.value = JSON.stringify(a);
    opt.textContent = `${a.index + 1}) ${a.email}`;
    select.appendChild(opt);
  }
  container.appendChild(select);
  container.appendChild(arrow);

  const addBtn = document.getElementById("add-custom-rule-btn");
  if (!addBtn) return;
  const newBtn = addBtn.cloneNode(true);
  addBtn.parentNode.replaceChild(newBtn, addBtn);

  newBtn.addEventListener("click", () => {
    const name    = document.getElementById("custom-name").value.trim();
    const pattern = document.getElementById("custom-pattern").value.trim();
    if (!name || !pattern) return;
    if (!select.options.length) return;

    const a = JSON.parse(select.options[select.selectedIndex].value);
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    addRuleToProfile({
      serviceName:  name,
      serviceTitle: name,
      serviceUrl:   pattern,
      serviceImg:   "./images/logos/google.png",
      accountEmail: a.email,
      accountId:    a.index,
      isCustom:     true,
      pattern:      escaped,
    });

    document.getElementById("custom-name").value    = "";
    document.getElementById("custom-pattern").value = "";
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

function addRuleToProfile(rule) {
  const profile = App.viewedProfile;
  if (!profile) return;
  profile.rules = profile.rules ?? [];
  const idx = profile.rules.findIndex((r) => {
    if (Boolean(r.isCustom) !== Boolean(rule.isCustom)) return false;
    if (rule.isCustom) return r.serviceUrl === rule.serviceUrl;
    return (r.serviceName || "").toLowerCase() === (rule.serviceName || "").toLowerCase();
  });
  if (idx >= 0) profile.rules[idx] = rule;
  else profile.rules.push(rule);

  App.saveProfiles(() => {
    renderRulesUI();
    renderRulesSummary();
  });
}

function deleteRule(rule) {
  const profile = App.viewedProfile;
  if (!profile) return;
  profile.rules = (profile.rules ?? []).filter((r) => {
    if (rule.isCustom) return !(r.isCustom && r.serviceUrl === rule.serviceUrl);
    return (r.serviceName || "").toLowerCase() !== (rule.serviceName || "").toLowerCase();
  });
  App.saveProfiles(() => {
    renderRulesUI();
    renderRulesSummary();
  });
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function deleteIcon() {
  // Cloned from a <template> in popup.html rather than built from a string:
  // assigning markup via innerHTML trips AMO's UNSAFE_VAR_ASSIGNMENT check.
  const tpl = document.getElementById("tpl-delete-icon");
  return tpl ? tpl.content.cloneNode(true) : document.createTextNode("\u00d7");
}

// ─── Init ─────────────────────────────────────────────────────────────────────

window.addEventListener("app:rules-opened",     renderRulesUI);
window.addEventListener("app:profile-switched",  () => { if (document.getElementById("rules-body")) renderRulesUI(); });
window.addEventListener("app:updated",           () => { if (document.getElementById("rules-body")) renderRulesUI(); });
