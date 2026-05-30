// ─── Extension identity (must differ from official AMO add-on) ─────────────────

/** Official Mozilla add-on — do not reuse this gecko.id in this fork. */
const OFFICIAL_AMO_EXTENSION_ID = "roman.furman@uptech.team";

// ─── URL matching ────────────────────────────────────────────────────────────

/** Path-prefix rules on www.google.com (and country TLDs). */
const GOOGLE_PATH_SERVICES = [
  "maps",
  "finance",
  "travel/flights",
  "travel",
  "flights",
  "shopping",
  "books",
  "scholar",
  "sheets",
  "spreadsheets",
  "alerts",
  "advanced_search",
];

function isGooglePathServiceUrl(url) {
  return GOOGLE_PATH_SERVICES.some((segment) => {
    const seg = segment.replace(/\//g, "\\/");
    return new RegExp(
      `^https?:\\/\\/(www\\.)?google\\.co(?:m|\\.[a-z]{2,3})\\/${seg}(?:\\/|\\?|#|$)`,
      "i"
    ).test(url);
  });
}

function isGoogleServiceUrl(url) {
  return (
    /^https?:\/\/[^?&]*(?:mail|drive|calendar|meet|docs|admin|photos|translate|keep|hangouts|chat|workspace|maps|news|ads|ediscovery|jamboard|earth|podcasts|classroom|business|myaccount|adsense|adwords|cloud|analytics|firebase|play|voice|tagmanager|duo|datastudio|lookerstudio|optimize|merchants|finance|colab\.research|contacts|script|messages|search|stadia|developers|one|chrome|books|sites|groups|blogger|gemini|notebooklm|looker|forms|slides|pay|lens|aistudio)\.google\.co.*/i.test(
      url
    ) ||
    isGooglePathServiceUrl(url) ||
    /^https?:\/\/[^?&]*scholar\.google\.co.*/i.test(url) ||
    /^https?:\/\/(www\.)?youtube\.com/i.test(url) ||
    /^https?:\/\/(www\.)?youtu\.be/i.test(url) ||
    /^https?:\/\/(www\.)?blogger\.com/i.test(url) ||
    /^https?:\/\/.*\.blogspot\.com/i.test(url)
  );
}

function isAnyGoogleUrl(url) {
  return (
    /^https?:\/\/([^?&]*\.)?google\.co.*/i.test(url) ||
    /^https?:\/\/(www\.)?youtube\.com/i.test(url) ||
    /^https?:\/\/(www\.)?blogger\.com/i.test(url)
  );
}

function convertToRedirectUrl(originalUrl, accountId) {
  const url = new URL(originalUrl);
  if (/youtube\.com|youtu\.be/i.test(url.hostname)) return convertAuthUserUrl(url, accountId);
  if (/blogger\.com|blogspot\.com/i.test(url.hostname)) return convertAuthUserUrl(url, accountId);
  return convertAuthUserUrl(url, accountId);
}

function convertAuthUserUrl(url, accountId) {
  const params = new URLSearchParams(url.search);
  if (`${params.get("authuser")}` === `${accountId}`) return null;
  const uMatch = url.href.match(/\/u\/(\d+)\/?/i);
  if (uMatch && uMatch[1] && `${uMatch[1]}` === `${accountId}`) return null;
  params.delete("authuser");
  params.set("authuser", accountId);
  url.search = params.toString();
  return url.toString();
}

function redirectCurrentTab(accountId) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs && tabs[0] && isGoogleServiceUrl(tabs[0].url)) {
      const url = convertToRedirectUrl(tabs[0].url, accountId);
      if (url) chrome.tabs.update(tabs[0].id, { url });
    }
  });
}

/** True when url belongs to a built-in Google service rule (not custom patterns). */
function urlMatchesServiceRule(serviceName, url) {
  const name = serviceName?.toLowerCase();
  if (!name) return false;

  if (name === "youtube") {
    return (
      /^https?:\/\/(www\.)?youtube\.com/i.test(url) ||
      /^https?:\/\/(www\.)?youtu\.be/i.test(url)
    );
  }
  if (name === "blogger") {
    return (
      /^https?:\/\/(www\.)?blogger\.com/i.test(url) ||
      /^https?:\/\/.*\.blogspot\.com/i.test(url)
    );
  }
  if (name === "search") {
    return /^https?:\/\/(www\.)?google\.co(m|\.[a-z]{2,3})\/?(\?|$|#|\/search|\/webhp)/i.test(url);
  }
  if (name === "maps") {
    return (
      /^https?:\/\/(www\.)?google\.co(m|\.[a-z]{2,3})\/maps/i.test(url) ||
      /^https?:\/\/[^?&]*maps\.google\.co.*/i.test(url)
    );
  }
  if (name === "scholar") {
    return (
      /^https?:\/\/[^?&]*scholar\.google\.co.*/i.test(url) ||
      /^https?:\/\/(www\.)?google\.co(m|\.[a-z]{2,3})\/scholar/i.test(url)
    );
  }
  if (name === "sheets") {
    return (
      /^https?:\/\/(www\.)?google\.co(m|\.[a-z]{2,3})\/(?:sheets|spreadsheets)/i.test(url) ||
      /^https?:\/\/docs\.google\.com\/spreadsheets/i.test(url)
    );
  }
  if (name === "finance") {
    return /^https?:\/\/(www\.)?google\.co(m|\.[a-z]{2,3})\/finance/i.test(url);
  }
  if (name === "flights") {
    return /^https?:\/\/(www\.)?google\.co(m|\.[a-z]{2,3})\/(?:travel\/flights|flights)/i.test(url);
  }
  if (name === "travel") {
    return /^https?:\/\/(www\.)?google\.co(m|\.[a-z]{2,3})\/travel/i.test(url);
  }
  if (name === "shopping") {
    return /^https?:\/\/(www\.)?google\.co(m|\.[a-z]{2,3})\/shopping/i.test(url);
  }
  if (name === "books") {
    return (
      /^https?:\/\/(www\.)?google\.co(m|\.[a-z]{2,3})\/books/i.test(url) ||
      /^https?:\/\/[^?&]*books\.google\.co.*/i.test(url)
    );
  }
  if (name === "slides") {
    return (
      /^https?:\/\/docs\.google\.com\/presentation/i.test(url) ||
      /^https?:\/\/[^?&]*slides\.google\.co.*/i.test(url)
    );
  }
  if (name === "forms") {
    return (
      /^https?:\/\/docs\.google\.com\/forms/i.test(url) ||
      /^https?:\/\/[^?&]*forms\.google\.co.*/i.test(url)
    );
  }
  if (name === "datastudio" || name === "lookerstudio") {
    return /^https?:\/\/[^?&]*(?:datastudio|lookerstudio)\.google\.co.*/i.test(url);
  }
  if (name === "cloud") {
    return /^https?:\/\/console\.cloud\.google\.com/i.test(url);
  }
  if (name === "adwords" || name === "ads") {
    return /^https?:\/\/[^?&]*(?:ads|adwords)\.google\.co.*/i.test(url);
  }
  if (name === "shopping") {
    return (
      /^https?:\/\/(www\.)?google\.co(m|\.[a-z]{2,3})\/shopping/i.test(url) ||
      /^https?:\/\/[^?&]*shopping\.google\.co.*/i.test(url)
    );
  }
  if (name === "pay") {
    return /^https?:\/\/[^?&]*pay\.google\.co.*/i.test(url);
  }
  if (name === "lens") {
    return /^https?:\/\/[^?&]*lens\.google\.co.*/i.test(url);
  }
  if (name === "alerts") {
    return /^https?:\/\/(www\.)?google\.co(m|\.[a-z]{2,3})\/alerts/i.test(url);
  }
  if (name === "aistudio") {
    return /^https?:\/\/[^?&]*aistudio\.google\.co.*/i.test(url);
  }
  if (name === "searchconsole") {
    return /^https?:\/\/[^?&]*search\.google\.co.*(?:search-console|webmasters)/i.test(url);
  }

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^https?:\\/\\/[^?&]*${escaped}\\.google\\.co.*`, "is").test(url);
}

/** Legacy serviceUrl → canonical catalogue url (for imports + display). */
const LEGACY_SERVICE_URL_CANONICAL = {
  "maps.google.com": "google.com/maps",
  "finance.google.com": "google.com/finance",
  "shopping.google.com": "google.com/shopping",
  "books.google.com": "google.com/books",
  "datastudio.google.com": "lookerstudio.google.com",
  "adwords.google.com": "ads.google.com",
};

function canonicalServiceUrl(serviceUrl) {
  if (!serviceUrl) return serviceUrl;
  const key = serviceUrl.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  return LEGACY_SERVICE_URL_CANONICAL[key] ?? serviceUrl;
}

function ruleDedupeKey(rule) {
  if (rule.isCustom) return `custom:${rule.serviceUrl || rule.pattern || ""}`;
  const name = (rule.serviceName || "").toLowerCase();
  if (name) return `name:${name}`;
  return `url:${canonicalServiceUrl(rule.serviceUrl || "").toLowerCase()}`;
}

/** Specificity score — higher wins when multiple rules match the same URL. */
function ruleMatchScore(rule, url) {
  if (!urlMatchesRule(rule, url)) return -1;
  if (rule.isCustom) return 100;

  const name = rule.serviceName?.toLowerCase();
  if (!name) return 20;

  if (name === "search") return 10;
  if (name === "sheets" && /docs\.google\.com\/spreadsheets/i.test(url)) return 95;
  if (name === "slides" && /docs\.google\.com\/presentation/i.test(url)) return 95;
  if (name === "forms" && /docs\.google\.com\/forms/i.test(url)) return 95;
  if (
    ["maps", "finance", "scholar", "sheets", "shopping", "books", "flights", "travel", "alerts"].includes(
      name
    )
  ) {
    return 80;
  }
  if (name === "cloud" && /console\.cloud\.google\.com/i.test(url)) return 85;
  if ((name === "datastudio" || name === "lookerstudio") && /lookerstudio\.google/i.test(url)) {
    return 85;
  }
  return 50;
}
/** Match imported rule.serviceUrl (legacy catalogue strings). */
function urlMatchesServiceUrlField(serviceUrl, url) {
  if (!serviceUrl) return false;
  const su = serviceUrl.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");

  if (su === "google.com") return urlMatchesServiceRule("search", url);

  const legacyName = {
    "maps.google.com": "maps",
    "finance.google.com": "finance",
    "shopping.google.com": "shopping",
    "books.google.com": "books",
    "scholar.google.com": "scholar",
    "datastudio.google.com": "datastudio",
    "lookerstudio.google.com": "lookerstudio",
  };
  if (legacyName[su]) return urlMatchesServiceRule(legacyName[su], url);

  if (su.includes("/")) {
    const pathPart = su.split("/").slice(1).join("/");
    if (pathPart === "maps") return urlMatchesServiceRule("maps", url);
    if (pathPart === "sheets" || pathPart === "spreadsheets") {
      return urlMatchesServiceRule("sheets", url);
    }
    if (pathPart === "scholar") return urlMatchesServiceRule("scholar", url);
    if (pathPart === "finance") return urlMatchesServiceRule("finance", url);
    if (pathPart === "shopping") return urlMatchesServiceRule("shopping", url);
    if (pathPart === "books") return urlMatchesServiceRule("books", url);
    if (pathPart === "travel/flights" || pathPart === "flights") {
      return urlMatchesServiceRule("flights", url);
    }
    if (pathPart === "travel") return urlMatchesServiceRule("travel", url);
    if (pathPart === "alerts") return urlMatchesServiceRule("alerts", url);
    return new RegExp(
      `google\\.co(?:m|\\.\\w{2,3})/${pathPart.replace(/\//g, "\\/")}`,
      "i"
    ).test(url);
  }

  try {
    const host = su.split("/")[0];
    const u = new URL(url);
    const urlHost = u.hostname.replace(/^www\./, "");
    return urlHost === host || urlHost.endsWith("." + host);
  } catch {
    return false;
  }
}

function urlMatchesRule(rule, url) {
  if (rule.isCustom && rule.pattern) {
    try {
      return new RegExp(rule.pattern, "i").test(url);
    } catch {
      return false;
    }
  }
  if (urlMatchesServiceRule(rule.serviceName, url)) return true;
  return urlMatchesServiceUrlField(rule.serviceUrl, url);
}

function getAccountForUrl(url, rules, fallbackAccount) {
  let bestScore = -1;
  let bestAccount = fallbackAccount;
  for (const rule of rules ?? []) {
    const score = ruleMatchScore(rule, url);
    if (score > bestScore) {
      bestScore = score;
      bestAccount = rule.accountId;
    }
  }
  return bestAccount;
}

function getAccountByIndex(accounts, accountIndex) {
  if (!Array.isArray(accounts)) return null;
  return accounts.find((a) => a.index === accountIndex) ?? null;
}

// ─── Google ListAccounts (must run with session cookies on a Google tab) ─────

const LIST_ACCOUNTS_URLS = [
  "https://accounts.google.com/ListAccounts?gpsia=1&source=ogb&mo=1&listPages=0&origin=https://www.google.com",
  "https://accounts.google.com/ListAccounts?listPages=0&origin=https://www.google.com",
];

function decodeListAccountsPayload(str) {
  return str
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, p) => String.fromCharCode(parseInt(p, 16)))
    .replace(/\\\//g, "/")
    .replace(/\\n/g, "\n")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"');
}

/** Parse HTML/text body from ListAccounts (postMessage or legacy script tag). */
function parseListAccountsResponse(rawText) {
  if (!rawText || typeof rawText !== "string") return null;

  const postMessageMatch = rawText.match(/postMessage\s*\(\s*['"](.*?)['"]\s*,/s);
  if (postMessageMatch) {
    try {
      return JSON.parse(decodeListAccountsPayload(postMessageMatch[1]));
    } catch {
      return null;
    }
  }

  const scriptMatch = rawText.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  if (scriptMatch) {
    const dataStr = scriptMatch[1].split("'")[1];
    if (dataStr) {
      try {
        return JSON.parse(decodeListAccountsPayload(dataStr));
      } catch {
        return null;
      }
    }
  }

  return null;
}

function mapAccountRow(info, arrayIndex) {
  if (!Array.isArray(info)) return null;

  let email = typeof info[3] === "string" ? info[3] : "";
  if (!email.includes("@")) {
    const found = info.find((f) => typeof f === "string" && f.includes("@"));
    if (found) email = found;
  }
  if (!email) return null;

  let index = arrayIndex;
  if (info[7] !== undefined && info[7] !== null && `${info[7]}` !== "") {
    const parsed = parseInt(info[7], 10);
    if (!isNaN(parsed)) index = parsed;
  }

  const name = (typeof info[2] === "string" && info[2]) || email.split("@")[0];

  return {
    index,
    name,
    email,
    profileUrl: typeof info[4] === "string" ? info[4] : "",
    isLoggedIn: info.length >= 10,
  };
}

/** Build extension account list from parsed ListAccounts payload. */
function accountsFromListAccountsPayload(parsed) {
  if (!parsed || !Array.isArray(parsed[1])) return [];
  const rows = parsed[1];
  const accounts = [];
  for (let i = 0; i < rows.length; i++) {
    const acc = mapAccountRow(rows[i], i);
    if (acc) accounts.push(acc);
  }
  accounts.sort((a, b) => a.index - b.index);
  return accounts;
}

function accountsFromListAccountsText(rawText) {
  return accountsFromListAccountsPayload(parseListAccountsResponse(rawText));
}

/** Code injected into a Google tab to fetch ListAccounts with session cookies. */
function buildListAccountsInjectCode() {
  return `(async function() {
  const urls = ${JSON.stringify(LIST_ACCOUNTS_URLS)};
  for (const u of urls) {
    try {
      const r = await fetch(u, { credentials: "include" });
      const text = await r.text();
      if (text && text.indexOf("gaia") >= 0) return text;
    } catch (e) {}
  }
  return null;
})()`;
}

function isAccountLoggedIn(accounts, accountIndex) {
  if (accountIndex === 0) return true;
  const acc = getAccountByIndex(accounts, accountIndex);
  if (!acc) return true;
  if (acc.isLoggedIn === false) return false;
  return true;
}

function currentAccountFromUrl(url) {
  try {
    const u = new URL(url);
    const auth = u.searchParams.get("authuser");
    if (auth !== null && auth !== "") return parseInt(auth, 10) || 0;
    const m = u.pathname.match(/\/u\/(\d+)/);
    if (m) return parseInt(m[1], 10) || 0;
  } catch {}
  return null;
}

/** Shared redirect decision for webRequest + tab updates. */
function resolveRedirectForUrl(url, settings, profiles, activeProfileId, accounts) {
  if (!url || typeof url !== "string") return null;
  if (url.includes("docs.google") && url.includes("/create")) return null;

  const prof = getActiveProfile(profiles, activeProfileId);
  if (!prof) return null;
  const defProf = getDefaultProfile(profiles);
  const resolvedRules = resolveRules(prof, defProf);

  const matchesService =
    isGoogleServiceUrl(url) ||
    resolvedRules.some((rule) => rule.isCustom && urlMatchesRule(rule, url));
  if (!matchesService) return null;

  let evalUrl = url;
  if (settings.enforceOnPrecachedUrls) {
    try {
      const u = new URL(url);
      u.pathname = u.pathname.replace(/\/u\/\d+\/?/i, "/");
      u.searchParams.delete("authuser");
      evalUrl = u.toString();
    } catch {}
  } else {
    if (/authuser/i.test(url)) return null;
    if (/\/u\/\d+/i.test(url)) return null;
  }

  const accountId = getAccountForUrl(evalUrl, resolvedRules, prof.defaultAccount);

  if (settings.enforceOnPrecachedUrls) {
    const current = currentAccountFromUrl(url);
    if (current !== null && current === accountId) return null;
  }

  const redirectUrl = convertToRedirectUrl(url, accountId);
  if (!redirectUrl) return null;
  if (!isAccountLoggedIn(accounts, accountId)) return null;

  return { redirectUrl, accountId };
}

/** Normalize legacy catalogue URLs in stored rules. */
function normalizeProfileServiceUrls(profiles) {
  if (!Array.isArray(profiles)) return false;
  let changed = false;
  for (const profile of profiles) {
    for (const rule of profile.rules ?? []) {
      if (rule.serviceUrl && !rule.isCustom) {
        const canon = canonicalServiceUrl(rule.serviceUrl);
        if (canon !== rule.serviceUrl) {
          rule.serviceUrl = canon;
          changed = true;
        }
      }
    }
  }
  return changed;
}

/** After import or account list refresh, align accountId with accountEmail. */
function rebindRuleAccountIds(profiles, accounts) {
  let changed = normalizeProfileServiceUrls(profiles);
  if (!Array.isArray(profiles) || !Array.isArray(accounts) || !accounts.length) {
    return changed;
  }
  for (const profile of profiles) {
    for (const rule of profile.rules ?? []) {
      if (!rule.accountEmail) continue;
      const acc = accounts.find((a) => a.email === rule.accountEmail);
      if (acc && acc.index !== rule.accountId) {
        rule.accountId = acc.index;
        changed = true;
      }
    }
    if (typeof profile.defaultAccount === "number") {
      const def = accounts.find((a) => a.index === profile.defaultAccount);
      if (!def && profile.defaultAccountEmail) {
        const byEmail = accounts.find((a) => a.email === profile.defaultAccountEmail);
        if (byEmail && byEmail.index !== profile.defaultAccount) {
          profile.defaultAccount = byEmail.index;
          changed = true;
        }
      }
    }
  }
  return changed;
}

// ─── Service catalogue ───────────────────────────────────────────────────────

function allSupportedGoogleServices() {
  return [
    { name: "YouTube",        title: "YouTube",          url: "youtube.com",                      img: "./images/logos/youtube.png",     category: "media" },
    { name: "Calendar",       title: "Calendar",         url: "calendar.google.com",              img: "./images/logos/calendar.png",    category: "productivity" },
    { name: "Drive",          title: "Drive",            url: "drive.google.com",                 img: "./images/logos/drive.png",       category: "productivity" },
    { name: "Maps",           title: "Maps",             url: "google.com/maps",                  img: "./images/logos/maps.png",        category: "utilities" },
    { name: "Meet",           title: "Meet",             url: "meet.google.com",                  img: "./images/logos/meet.png",        category: "communication" },
    { name: "Mail",           title: "Gmail",            url: "mail.google.com",                  img: "./images/logos/mail.png",        category: "communication" },
    { name: "Docs",           title: "Docs",             url: "docs.google.com",                  img: "./images/logos/docs.png",        category: "productivity" },
    { name: "Sheets",         title: "Sheets",           url: "google.com/sheets",                img: "./images/logos/docs.png",        category: "productivity" },
    { name: "Admin",          title: "Admin",            url: "admin.google.com",                 img: "./images/logos/admin.png",       category: "admin" },
    { name: "Photos",         title: "Photos",           url: "photos.google.com",                img: "./images/logos/photos.png",      category: "media" },
    { name: "Translate",      title: "Translate",        url: "translate.google.com",             img: "./images/logos/translate.png",   category: "utilities" },
    { name: "Keep",           title: "Keep",             url: "keep.google.com",                  img: "./images/logos/keep.png",        category: "productivity" },
    { name: "Chat",           title: "Chat",             url: "chat.google.com",                  img: "./images/logos/chat.png",        category: "communication" },
    { name: "Gemini",         title: "Gemini (AI)",      url: "gemini.google.com",                img: "./images/logos/google.png",      category: "utilities" },
    { name: "NotebookLM",     title: "NotebookLM",       url: "notebooklm.google.com",            img: "./images/logos/google.png",      category: "productivity" },
    { name: "AIStudio",       title: "AI Studio",        url: "aistudio.google.com",              img: "./images/logos/google.png",      category: "developer" },
    { name: "Search",         title: "Google Search",    url: "google.com",                       img: "./images/logos/search.png",      category: "utilities" },
    { name: "Shopping",       title: "Shopping",         url: "google.com/shopping",              img: "./images/logos/google.png",      category: "utilities" },
    { name: "Scholar",        title: "Scholar",          url: "scholar.google.com",               img: "./images/logos/google.png",      category: "utilities" },
    { name: "Slides",         title: "Slides",           url: "docs.google.com/presentation",     img: "./images/logos/docs.png",        category: "productivity" },
    { name: "Forms",          title: "Forms",            url: "docs.google.com/forms",            img: "./images/logos/docs.png",        category: "productivity" },
    { name: "News",           title: "News",             url: "news.google.com",                  img: "./images/logos/news.png",        category: "media" },
    { name: "Ads",            title: "Ads",              url: "ads.google.com",                   img: "./images/logos/ads.png",         category: "marketing" },
    { name: "Ediscovery",     title: "Ediscovery (Vault)",url: "ediscovery.google.com",           img: "./images/logos/ediscovery.png",  category: "admin" },
    { name: "Earth",          title: "Earth",            url: "earth.google.com",                 img: "./images/logos/earth.png",       category: "utilities" },
    { name: "Podcasts",       title: "Podcasts",         url: "podcasts.google.com",              img: "./images/logos/podcasts.png",    category: "media" },
    { name: "Classroom",      title: "Classroom",        url: "classroom.google.com",             img: "./images/logos/classroom.png",   category: "productivity" },
    { name: "Business",       title: "Business Profile", url: "business.google.com",              img: "./images/logos/business.png",    category: "marketing" },
    { name: "MyAccount",      title: "My Account",       url: "myaccount.google.com",             img: "./images/logos/google.png",      category: "admin" },
    { name: "Adsense",        title: "AdSense",          url: "adsense.google.com",               img: "./images/logos/adsense.png",     category: "marketing" },
    { name: "Adwords",        title: "Google Ads",       url: "ads.google.com",                   img: "./images/logos/ads.png",         category: "marketing" },
    { name: "Cloud",          title: "Cloud Console",    url: "console.cloud.google.com",         img: "./images/logos/cloud.png",       category: "developer" },
    { name: "Analytics",      title: "Analytics",        url: "analytics.google.com",             img: "./images/logos/analytics.png",   category: "marketing" },
    { name: "Firebase",       title: "Firebase Console", url: "console.firebase.google.com",      img: "./images/logos/firebase.png",    category: "developer" },
    { name: "Play",           title: "Google Play",      url: "play.google.com",                  img: "./images/logos/play.png",        category: "media" },
    { name: "Voice",          title: "Voice",            url: "voice.google.com",                 img: "./images/logos/voice.png",       category: "communication" },
    { name: "TagManager",     title: "Tag Manager",      url: "tagmanager.google.com",            img: "./images/logos/tagmanager.png",  category: "marketing" },
    { name: "DataStudio",     title: "Looker Studio",    url: "lookerstudio.google.com",          img: "./images/logos/datastudio.png",  category: "marketing" },
    { name: "LookerStudio",   title: "Looker Studio",    url: "lookerstudio.google.com",          img: "./images/logos/datastudio.png",  category: "marketing" },
    { name: "Merchants",      title: "Merchant Center",  url: "merchants.google.com",             img: "./images/logos/merchants.png",   category: "marketing" },
    { name: "Finance",        title: "Finance",          url: "google.com/finance",               img: "./images/logos/finance.png",     category: "utilities" },
    { name: "Collab",         title: "Colab",            url: "colab.research.google.com",        img: "./images/logos/google.png",      category: "developer" },
    { name: "Contacts",       title: "Contacts",         url: "contacts.google.com",              img: "./images/logos/contacts.png",    category: "communication" },
    { name: "Script",         title: "Apps Script",      url: "script.google.com",                img: "./images/logos/script.png",      category: "developer" },
    { name: "Messages",       title: "Messages",         url: "messages.google.com",              img: "./images/logos/messages.png",    category: "communication" },
    { name: "SearchConsole",  title: "Search Console",   url: "search.google.com",                img: "./images/logos/search.png",      category: "developer" },
    { name: "Developers",     title: "Developers",       url: "developers.google.com",            img: "./images/logos/developers.png",  category: "developer" },
    { name: "One",            title: "Google One",       url: "one.google.com",                   img: "./images/logos/one.png",         category: "utilities" },
    { name: "ChromeWebStore", title: "Chrome Web Store", url: "chrome.google.com",                img: "./images/logos/chrome.png",      category: "utilities" },
    { name: "Sites",          title: "Sites",            url: "sites.google.com",                 img: "./images/logos/sites.png",       category: "productivity" },
    { name: "Groups",         title: "Groups",           url: "groups.google.com",                img: "./images/logos/groups.png",      category: "communication" },
    { name: "Blogger",        title: "Blogger",          url: "blogger.com",                      img: "./images/logos/google.png",      category: "media" },
    { name: "Workspace",      title: "Workspace",        url: "workspace.google.com",             img: "./images/logos/google.png",      category: "admin" },
    { name: "Hangouts",       title: "Hangouts",         url: "hangouts.google.com",              img: "./images/logos/hangouts.png",    category: "communication" },
    { name: "Jamboard",       title: "Jamboard",         url: "jamboard.google.com",              img: "./images/logos/jamboard.png",    category: "productivity" },
    { name: "Duo",            title: "Duo",              url: "duo.google.com",                   img: "./images/logos/duo.png",         category: "communication" },
    { name: "Stadia",         title: "Stadia",           url: "stadia.google.com",                img: "./images/logos/stadia.png",      category: "media" },
    { name: "Optimize",       title: "Optimize",         url: "optimize.google.com",              img: "./images/logos/optimize.png",    category: "marketing" },
    { name: "Books",          title: "Books",            url: "google.com/books",                 img: "./images/logos/google.png",      category: "media" },
    { name: "Flights",        title: "Flights",          url: "google.com/travel/flights",        img: "./images/logos/google.png",      category: "utilities" },
    { name: "Travel",         title: "Travel",           url: "google.com/travel",                img: "./images/logos/google.png",      category: "utilities" },
    { name: "Looker",         title: "Looker",           url: "looker.google.com",                img: "./images/logos/google.png",      category: "developer" },
    { name: "Pay",            title: "Google Pay",       url: "pay.google.com",                   img: "./images/logos/google.png",      category: "utilities" },
    { name: "Lens",           title: "Google Lens",    url: "lens.google.com",                  img: "./images/logos/google.png",      category: "utilities" },
    { name: "Alerts",         title: "Google Alerts",  url: "google.com/alerts",                img: "./images/logos/google.png",      category: "utilities" },
  ];
}

// ─── Profile helpers ─────────────────────────────────────────────────────────

const DEFAULT_PROFILE_ID = "default";

const PROFILE_COLORS = [
  "#d66d58", "#4a90d9", "#5cb85c", "#9b59b6",
  "#e67e22", "#1abc9c", "#e91e63", "#607d8b",
];

function makeProfile(name, color, overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name,
    color: color ?? PROFILE_COLORS[0],
    defaultAccount: 0,
    rules: [],
    customServices: [],
    ...overrides,
  };
}

function makeDefaultProfile() {
  return {
    id: DEFAULT_PROFILE_ID,
    name: "Default",
    color: "#8b8792",
    defaultAccount: 0,
    rules: [],
    customServices: [],
  };
}

// Resolve rules for a profile with inheritance from Default.
// Returns merged rule list: profile rules take precedence over default rules
// for the same serviceUrl.
function resolveRules(profile, defaultProfile) {
  if (!defaultProfile || profile.id === DEFAULT_PROFILE_ID) return profile.rules ?? [];
  const profileKeys = new Set((profile.rules ?? []).map(ruleDedupeKey));
  const inherited = (defaultProfile.rules ?? [])
    .filter((r) => !profileKeys.has(ruleDedupeKey(r)))
    .map((r) => ({ ...r, _inherited: true }));
  return [...(profile.rules ?? []), ...inherited];
}

// ─── Storage ─────────────────────────────────────────────────────────────────

class SyncStorage {
  static store(obj, callback) {
    chrome.storage.sync.set(obj, callback);
  }
  static get(key, callback) {
    chrome.storage.sync.get(key, callback);
  }
}

// Load profiles + activeProfileId; guarantee Default always exists.
function loadProfiles(callback) {
  SyncStorage.get(["profiles", "activeProfileId", "accounts"], (data) => {
    let profiles = data.profiles ?? [];
    let activeProfileId = data.activeProfileId ?? DEFAULT_PROFILE_ID;

    if (!profiles.find(p => p.id === DEFAULT_PROFILE_ID)) {
      profiles = [makeDefaultProfile(), ...profiles];
    }
    if (!profiles.find(p => p.id === activeProfileId)) {
      activeProfileId = DEFAULT_PROFILE_ID;
    }

    callback({
      profiles,
      activeProfileId,
      accounts: data.accounts ?? [],
    });
  });
}

function saveProfiles(profiles, callback) {
  SyncStorage.store({ profiles }, callback);
}

function getActiveProfile(profiles, activeProfileId) {
  return profiles.find(p => p.id === activeProfileId) ?? profiles[0];
}

function getDefaultProfile(profiles) {
  return profiles.find(p => p.id === DEFAULT_PROFILE_ID);
}

// ─── Global settings (independent of profiles) ───────────────────────────────

const DEFAULT_SETTINGS = {
  enforceOnPrecachedUrls: true,
  profileSwitchRedirect: "ask", // "ask" | "always" | "never"
};

function loadSettings(callback) {
  SyncStorage.get("settings", (data) => {
    callback({ ...DEFAULT_SETTINGS, ...(data.settings ?? {}) });
  });
}

function saveSettings(settings, callback) {
  SyncStorage.store({ settings }, callback);
}

// ─── Import normalization (v2 profiles export or legacy v1.14) ─────────────

/**
 * Accepts v2 export { profiles, activeProfileId } or legacy { rules, defaultAccount }.
 * Returns normalized v2 payload or { error: string }.
 */
function normalizeImportPayload(data) {
  if (!data || typeof data !== "object") {
    return { error: "Invalid settings file" };
  }

  if (Array.isArray(data.profiles)) {
    return {
      profiles: data.profiles,
      activeProfileId: data.activeProfileId ?? DEFAULT_PROFILE_ID,
    };
  }

  if (Array.isArray(data.rules)) {
    const legacy = makeDefaultProfile();
    legacy.rules = data.rules.map((rule) => ({
      ...rule,
      serviceUrl: rule.isCustom ? rule.serviceUrl : canonicalServiceUrl(rule.serviceUrl),
    }));
    if (typeof data.defaultAccount === "number") {
      legacy.defaultAccount = data.defaultAccount;
    }
    if (Array.isArray(data.customServices)) {
      legacy.customServices = data.customServices;
    }
    return {
      profiles: [legacy],
      activeProfileId: DEFAULT_PROFILE_ID,
    };
  }

  return { error: "Unrecognized format: need profiles[] or legacy rules[]" };
}

function isOfficialDefaultGoogleAccountExtension(ext, runtimeId) {
  if (!ext || ext.id === runtimeId) return false;
  return ext.id === OFFICIAL_AMO_EXTENSION_ID;
}

// ─── Auto-migrate legacy JSON shape (rules at sync root after import) ─────────

function shouldMigrateLegacyStorage(data) {
  if (!Array.isArray(data.rules) || data.rules.length === 0) return false;
  if (!data.profiles || data.profiles.length === 0) return true;
  const def =
    data.profiles.find((p) => p.id === DEFAULT_PROFILE_ID) ?? data.profiles[0];
  return !def?.rules?.length;
}

/** Inspect sync storage to explain empty popup / failed import. */
function getStorageDiagnostics(data) {
  const profiles = data.profiles ?? [];
  const def =
    profiles.find((p) => p.id === DEFAULT_PROFILE_ID) ?? profiles[0];
  const rootRules = Array.isArray(data.rules) ? data.rules.length : 0;
  const profileRules = (def?.rules ?? []).length;
  const totalProfileRules = profiles.reduce(
    (n, p) => n + (p.rules?.length ?? 0),
    0
  );

  return {
    hasProfiles: profiles.length > 0,
    profileCount: profiles.length,
    rootRuleCount: rootRules,
    defaultProfileRuleCount: profileRules,
    totalProfileRuleCount: totalProfileRules,
    hasLegacyRulesAtRoot: rootRules > 0,
    hasAccounts: Array.isArray(data.accounts) && data.accounts.length > 0,
    canAutoMigrate: shouldMigrateLegacyStorage(data),
    activeProfileId: data.activeProfileId ?? DEFAULT_PROFILE_ID,
  };
}

function mergeLegacyRulesIntoProfiles(data) {
  const legacyRules = (data.rules ?? []).map((rule) => ({
    ...rule,
    serviceUrl: rule.isCustom ? rule.serviceUrl : canonicalServiceUrl(rule.serviceUrl),
  }));

  let profiles = Array.isArray(data.profiles) ? [...data.profiles] : [];
  if (!profiles.find((p) => p.id === DEFAULT_PROFILE_ID)) {
    profiles = [makeDefaultProfile(), ...profiles];
  }

  profiles = profiles.map((p) => {
    if (p.id !== DEFAULT_PROFILE_ID) return p;
    return {
      ...p,
      rules: legacyRules,
      defaultAccount:
        typeof data.defaultAccount === "number" ? data.defaultAccount : p.defaultAccount ?? 0,
      customServices: Array.isArray(data.customServices)
        ? data.customServices
        : p.customServices ?? [],
    };
  });

  return profiles;
}

function migrateLegacyStorageIfNeeded(callback) {
  SyncStorage.get(
    ["rules", "defaultAccount", "customServices", "profiles", "activeProfileId", "accounts"],
    (data) => {
      if (!shouldMigrateLegacyStorage(data)) {
        if (!data.profiles || data.profiles.length === 0) {
          SyncStorage.store(
            {
              profiles: [makeDefaultProfile()],
              activeProfileId: data.activeProfileId ?? DEFAULT_PROFILE_ID,
            },
            () =>
              callback?.({
                migrated: false,
                ruleCount: 0,
                diagnostics: getStorageDiagnostics({
                  ...data,
                  profiles: [makeDefaultProfile()],
                }),
              })
          );
          return;
        }
        callback?.({
          migrated: false,
          ruleCount: 0,
          diagnostics: getStorageDiagnostics(data),
        });
        return;
      }

      const profiles = mergeLegacyRulesIntoProfiles(data);

      SyncStorage.store(
        {
          profiles,
          activeProfileId: data.activeProfileId ?? DEFAULT_PROFILE_ID,
        },
        () => {
          SyncStorage.get("accounts", (acctData) => {
            if (rebindRuleAccountIds(profiles, acctData.accounts ?? [])) {
              SyncStorage.store({ profiles });
            }
            callback?.({
              migrated: true,
              ruleCount: data.rules.length,
              profileCount: profiles.length,
              diagnostics: getStorageDiagnostics({
                ...data,
                profiles,
              }),
            });
          });
        }
      );
    }
  );
}
