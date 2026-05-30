/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const utilsSrc = fs.readFileSync(path.join(__dirname, "..", "utils.js"), "utf8");
eval(utilsSrc);

const mapsUrl = "https://www.google.com/maps/@48.2,16.3,12z";
const searchUrl = "https://www.google.com/";
const scholarUrl = "https://scholar.google.com/";

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
];

console.log("Maps via serviceName:", urlMatchesRule(rules[1], mapsUrl));
console.log("Maps account (Search first):", getAccountForUrl(mapsUrl, rules, 0));
console.log("Search homepage account:", getAccountForUrl(searchUrl, rules, 0));
console.log("Scholar path:", urlMatchesServiceRule("scholar", "https://www.google.com/scholar"));

const result = resolveRedirectForUrl(
  mapsUrl,
  { enforceOnPrecachedUrls: true },
  [
    {
      id: "default",
      name: "Default",
      defaultAccount: 0,
      rules,
    },
  ],
  "default",
  [{ index: 1, email: "filination@gmail.com", isLoggedIn: true }]
);
console.log("Redirect:", result);
