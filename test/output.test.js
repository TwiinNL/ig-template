#!/usr/bin/env node
// Checks the output of the test IG for the house style and the fixes of the template. After a
// build of test/sample-ig, run from the repo root:
//   node test/output.test.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const OUT = "test/sample-ig/output";
const PAGES = `${OUT}/en`;
const LABEL = "Draft – normative only when referenced by the Twiin afsprakenstelsel";
const HISTORY = `${PAGES}/StructureDefinition-sample-patient.profile.history.html`;

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
let failed = false;
const check = (ok, msg) => { console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) { console.log(`::error::${msg}`); failed = true; } };
const same = (copy, original) => fs.existsSync(copy) && sha256(copy) === sha256(original);

// Assets of the template in the output, in output/ and output/en/.
for (const dir of [OUT, PAGES]) {
  check(same(`${dir}/assets/css/twiin.css`, "package/content/assets/css/twiin.css"), `${dir}/assets/css/twiin.css is the Twiin CSS`);
  check(same(`${dir}/assets/images/twiin-logo.svg`, "package/content/assets/images/twiin-logo.svg"), `${dir}/assets/images/twiin-logo.svg is the Twiin logo`);
}
// jurisdiction NL: the build writes nld.svg to output/ only; the template's own file must be in en/.
check(fs.existsSync(`${OUT}/assets/images/nld.svg`), `${OUT}/assets/images/nld.svg exists`);
check(same(`${PAGES}/assets/images/nld.svg`, "package/content/assets/images/nld.svg"), `${PAGES}/assets/images/nld.svg is the template's flag`);

// Every page with the template header: logo, Twiin CSS, release label, link to all IGs, footer.
let pages = 0;
for (const name of fs.readdirSync(PAGES).filter((f) => f.endsWith(".html")).sort()) {
  const html = fs.readFileSync(path.join(PAGES, name), "utf8");
  // Header from fragment-pagebegin.html; searchform.html (checked below) and the qa pages have their own header.
  if (name === "searchform.html") continue;
  const status = html.match(/<div id="ig-status">[\s\S]*?<\/div>/);
  if (!status) continue;
  pages++;
  const errors = [];
  if (!status[0].includes(LABEL)) errors.push("release label not in the page header");
  if (!html.includes('src="assets/images/twiin-logo.svg"')) errors.push("logo missing");
  if (!/<a id="twiin-fhir-icon"[^>]*href="http:\/\/hl7.org\/fhir\/R4\/index.html"[^>]*><img src="assets\/ico\/icon-fhir-144.png"/.test(html)) errors.push("FHIR icon missing from header");
  if (!html.includes('href="assets/css/twiin.css"')) errors.push("twiin.css not linked");
  if (!html.includes('src="assets/js/twiin-tables.js"')) errors.push("twiin-tables.js not loaded");
  if (!/<ul class="nav navbar-nav" id="twiin-nav-all">\s*<li><a no-external="true" href="https:\/\/fhir.twiin.nl\/ig\/">All Implementation Guides<\/a><\/li>/.test(html)) errors.push("navigation item All Implementation Guides missing");
  if (!html.includes("except the Twiin logo and the design and code of this site (all rights reserved).")) errors.push("licence text missing from footer");
  if (!html.includes("You may share and adapt the content, also commercially, if you give appropriate credit and share adaptations under the same licence.")) errors.push("licence explanation missing from footer");
  if (!html.includes('href="https://github.com/TwiinNL/ig-sample">Source repository</a>')) errors.push("repository link missing from footer");
  if (!html.includes('href="https://fhir.twiin.nl/ig/sample/history.html">Version history</a>')) errors.push("version history link missing from footer");
  if (!/Feedback: use the feedback button on the page of the TA in the <a [^>]*href="https:\/\/afsprakenstelsel.twiin.nl">Twiin Afsprakenstelsel<\/a> that refers to this guide./.test(html)) errors.push("default feedback text missing from footer");
  if (errors.length) check(false, `${PAGES}/${name}: ${errors.join("; ")}`);
}
check(pages > 0, `${pages} pages with the template header checked`);

// Home page: section "Maintenance and participation" from includes/twiin-maintenance.md.
{
  const html = fs.readFileSync(`${PAGES}/index.html`, "utf8");
  check(html.includes("This implementation guide is maintained by Twiin."), "index.html: maintenance text");
  check(html.includes('href="https://afsprakenstelsel.twiin.nl/normatief/ta150/6-governance"'), "index.html: link to Governance chapter");
  check(html.includes("werkgroep TA's"), "index.html: participation through werkgroep TA's");
  check(html.includes('href="mailto:info@twiin.nl"'), "index.html: contact address for joining");
  check(/To give feedback on this guide, use the feedback button on the page of the TA in the <a [^>]*href="https:\/\/afsprakenstelsel.twiin.nl"[^>]*>Twiin Afsprakenstelsel<\/a> that refers to this guide./.test(html), "index.html: default feedback text");
  check(!html.includes("{%") && !html.includes("{{"), "index.html: no unresolved Liquid");
}

// searchform.html (and its en/ copy): no external resources, no unresolved placeholders, own CSS.
for (const f of [`${OUT}/searchform.html`, `${OUT}/en/searchform.html`]) {
  const html = fs.readFileSync(f, "utf8");
  check(!/(src|href)="https?:\/\/[^"]*\.(css|png|jpg|svg|js|ico)"/.test(html), `${f}: no external stylesheet, image or script`);
  check(!html.includes("{{"), `${f}: no unresolved placeholders`);
  // No ig-status: the publisher fills no placeholders in en/, so the release label cannot be shown on this page. IG tests that every page with #ig-status shows the label rely on its absence.
  check(!/id=["']ig-status["']/.test(html), `${f}: no element with id ig-status`);
  check(html.includes('href="assets/css/twiin.css"') && html.includes('src="assets/images/twiin-logo.svg"'), `${f}: Twiin CSS and logo`);
  check(html.includes("except the Twiin logo and the design and code of this site (all rights reserved)."), `${f}: Twiin footer`);
}

// History page: exactly one top level heading.
const history = fs.existsSync(HISTORY) ? fs.readFileSync(HISTORY, "utf8") : "";
const h2 = history.match(/<h2[\s>]/g) || [];
const root = history.match(/<h2 id="root">/g) || [];
check(h2.length === 1 && root.length === 1, `${HISTORY}: one <h2 id="root"> (found ${h2.length} <h2>, ${root.length} with id="root")`);

process.exit(failed ? 1 : 0);
