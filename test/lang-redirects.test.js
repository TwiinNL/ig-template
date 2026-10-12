#!/usr/bin/env node
// Checks the language redirect of the published stub pages of the test IG: every browser language
// ends up on en/<page>, and query string and fragment are kept. After a build of test/sample-ig,
// run from the repo root:
//   node test/lang-redirects.test.js
// The template's lang-redirects.js is the version of HL7/ig-template-base2 main; the one in
// fhir2.base.template#0.1.0 stops after the first language.
const fs = require("fs");
const crypto = require("crypto");

const TEMPLATE_FILE = "package/content/assets/js/lang-redirects.js";
const OUTPUT_COPIES = ["test/sample-ig/output/assets/js/lang-redirects.js", "test/sample-ig/output/en/assets/js/lang-redirects.js"];

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
let failed = false;
const fail = (msg) => { console.log(`::error::${msg}`); failed = true; };

for (const copy of OUTPUT_COPIES) {
  if (!fs.existsSync(copy)) { fail(`${copy} is missing`); continue; }
  if (sha256(copy) !== sha256(TEMPLATE_FILE)) {
    fail(`${copy} is not ${TEMPLATE_FILE}: the override of the base template file did not take effect`);
    continue;
  }
  const src = fs.readFileSync(copy, "utf8");
  // [language, pathname, search, hash, expected]
  const cases = [
    ["nl", "/ig/sample/index.html", "", "", "en/index.html"],
    ["nl-NL", "/ig/sample/artifacts.html", "", "", "en/artifacts.html"],
    ["de", "/ig/sample/index.html", "", "", "en/index.html"],
    ["en", "/ig/sample/StructureDefinition-sample-patient.html", "", "", "en/StructureDefinition-sample-patient.html"],
    ["en-US", "/ig/sample/index.html", "", "", "en/index.html"],
    ["nl", "/ig/sample/index.html", "?a=1&b=2", "#section", "en/index.html?a=1&b=2#section"],
    ["en-US", "/ig/sample/artifacts.html", "", "#table", "en/artifacts.html#table"],
    ["de", "/ig/sample/artifacts.html", "?q=x", "", "en/artifacts.html?q=x"],
  ];
  for (const [language, pathname, search, hash, expected] of cases) {
    const targets = [];
    const window = { location: { pathname, search, hash, replace: (url) => targets.push(url) } };
    new Function("langs", "navigator", "window", src)(["en"], { language }, window);
    const ok = targets.length === 1 && targets[0] === expected;
    console.log(`${ok ? "ok  " : "FAIL"} ${copy} ${language} ${pathname}${search}${hash} -> ${targets.join(", ") || "(no redirect)"}`);
    if (!ok) failed = true;
  }
}
process.exit(failed ? 1 : 0);
