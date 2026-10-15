#!/usr/bin/env node
// Checks that the files of the base template that this template overrides are still the
// fhir2.base.template#0.1.0 versions the overrides were made from. The base version is the one in
// package/package.json; its package is downloaded from the FHIR package registry, or read from the
// folder given as the first argument (the unpacked package):
//   node test/base-hashes.test.js [path/to/fhir2.base.template/package]
// If this fails, review each listed override against the new base file: copy it again and reapply
// the change, or remove the override when the base has the fix. Then update the hashes below.
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const BASE = "fhir2.base.template";
// SHA-256 of the files in fhir2.base.template#0.1.0.
const EXPECTED = {
  "includes/fragment-pagebegin.html": "431379c0d2dabaa855c2d57f051b08e9f0d00cb23bdf70447845bf63170996f9",
  "includes/fragment-pageend.html": "03a71eab09e80310c362df7f44ef5494f80c1367f072e14adc8946b104e257f8",
  "layouts/layout-profile-history.html": "e220ce28a748f804046a543c90845321e01ad7889a69049edb5e6abdc1ff4e46",
  "layouts/layout-ext.html": "04e2827288d918339c24b3e3a9391640059904e20dc3c2104f7a6450d44ee4b8",
  "layouts/layout-profile.html": "242eb8942ed29b9aee201d31f9b2980567b32e40fdc3e25c9572ebe3f7d359b8",
  "content/searchform.html": "29930f069d8bc26c64103da9a0d57c5b76995738d0a26c6cb32f9ea585b3aac0",
  "content/assets/js/lang-redirects.js": "7ea6ae46a27c877dc47cc7ac0df4cc05f01b8debcbeec66db372da7577e92383",
};

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../package/package.json"), "utf8"));
const version = pkg.dependencies[BASE];
let dir = process.argv[2];
if (!dir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "base-template-"));
  const tgz = path.join(tmp, "base.tgz");
  execFileSync("curl", ["-sSfL", "-o", tgz, `https://packages.fhir.org/${BASE}/${version}`]);
  fs.mkdirSync(path.join(tmp, "x"));
  execFileSync("tar", ["-xzf", tgz, "-C", path.join(tmp, "x")]);
  dir = path.join(tmp, "x");
}

let failed = false;
for (const [file, expected] of Object.entries(EXPECTED)) {
  const full = path.join(dir, file);
  const actual = fs.existsSync(full) ? crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex") : "(missing)";
  if (actual === expected) {
    console.log(`ok   ${file}`);
  } else {
    console.log(`::error::${BASE}#${version} ${file} is not the 0.1.0 version (sha-256 ${actual}): review the override package/${file}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
