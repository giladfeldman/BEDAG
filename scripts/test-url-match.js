/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const utilsSrc = fs.readFileSync(path.join(__dirname, "..", "utils.js"), "utf8");
eval(utilsSrc);

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

const mapsUrl = "https://www.google.com/maps/@48.2,16.3,12z";
const searchUrl = "https://www.google.com/";
const flightsUrl = "https://www.google.com/travel/flights";
const travelUrl = "https://www.google.com/travel/destinations";

const rules = [
  {
    serviceName: "Search",
    serviceUrl: "google.com",
    accountId: 0,
    accountEmail: "giladfel@gmail.com",
  },
  {
    serviceName: "Maps",
    serviceUrl: "maps.google.com",
    accountId: 1,
    accountEmail: "filination@gmail.com",
  },
  {
    serviceName: "Flights",
    serviceUrl: "google.com/travel/flights",
    accountId: 2,
    accountEmail: "other@gmail.com",
  },
  {
    serviceName: "Travel",
    serviceUrl: "google.com/travel",
    accountId: 0,
    accountEmail: "giladfel@gmail.com",
  },
];

assert(urlMatchesRule(rules[1], mapsUrl), "Maps rule matches maps URL");
assert(getAccountForUrl(mapsUrl, rules, 0) === 1, "Maps wins over Search");
assert(getAccountForUrl(searchUrl, rules, 0) === 0, "Search homepage uses Search rule");
assert(
  urlMatchesServiceRule("scholar", "https://www.google.com/scholar"),
  "Scholar path on google.com"
);
assert(!urlMatchesServiceRule("travel", flightsUrl), "Travel rule excludes /travel/flights");
assert(urlMatchesServiceRule("flights", flightsUrl), "Flights rule matches /travel/flights");
assert(getAccountForUrl(flightsUrl, rules, 0) === 2, "Flights beats Travel on flights URL");
assert(getAccountForUrl(travelUrl, rules, 0) === 0, "Travel rule on generic travel page");

assert(shouldIgnoreRedirectUrl("https://accounts.google.com/signin"), "ignore accounts signin");
assert(
  !shouldIgnoreRedirectUrl("https://www.google.com/maps"),
  "do not ignore normal maps"
);

const result = resolveRedirectForUrl(
  mapsUrl,
  { enforceOnPrecachedUrls: true },
  [{ id: "default", name: "Default", defaultAccount: 0, rules }],
  "default",
  [{ index: 1, email: "filination@gmail.com", isLoggedIn: true }]
);
assert(result?.redirectUrl?.includes("authuser=1"), "Maps redirects to account 1");

const noAuthMaps = "https://www.google.com/maps/";
const rulesDefault0 = [
  { serviceName: "Maps", serviceUrl: "google.com/maps", accountId: 0, accountEmail: "a@x.com" },
];
const noRedirect = resolveRedirectForUrl(
  noAuthMaps,
  { enforceOnPrecachedUrls: true },
  [{ id: "default", defaultAccount: 0, rules: rulesDefault0 }],
  "default",
  []
);
assert(noRedirect === null, "Maps account 0 bare URL needs no redirect");

const u0 = new URL("https://www.google.com/maps?authuser=1");
const stripped = convertAuthUserUrl(u0, 0);
assert(stripped && !stripped.includes("authuser="), "account 0 strips authuser");

console.log("All URL/redirect tests passed.");
