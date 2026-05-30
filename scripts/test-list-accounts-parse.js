const fs = require("fs");
const path = require("path");

const utilsSrc = fs.readFileSync(path.join(__dirname, "..", "utils.js"), "utf8");
eval(utilsSrc);

const empty =
  `<!DOCTYPE html><html><body><script type="text/javascript">window.parent.postMessage('\\x5b\\x22gaia.l.a.r\\x22,\\x5b\\x5d\\x5d', 'https://accounts.google.com');</script></body></html>`;

const accounts = accountsFromListAccountsText(empty);
console.log("empty accounts", accounts.length, accounts.length === 0 ? "OK" : "FAIL");

const sampleRow = [
  "",
  "Gilad",
  "giladfel@gmail.com",
  "https://lh3.googleusercontent.com/a/default",
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
];
const payload = ["gaia.l.a.r", [sampleRow, sampleRow]];
const encoded = JSON.stringify(payload)
  .replace(/\//g, "\\/")
  .replace(/"/g, '\\"');
const html = `postMessage('${encoded.replace(/\\/g, "\\\\")}', 'https://accounts.google.com');`;
// simpler test direct
const direct = accountsFromListAccountsPayload(["gaia.l.a.r", [sampleRow]]);
console.log("direct parse", direct.length, direct[0]?.email);
