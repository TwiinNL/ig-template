# twiin.base.template

IG Publisher template for Twiin implementation guides. It is a thin child template of
[fhir2.base.template#0.1.0](https://packages.fhir.org/fhir2.base.template/0.1.0): it adds the Twiin
house style and fixes three bugs of the base template, so the IGs no longer need their own
workarounds. It is not published to the FHIR package registry; it is released as a `.tgz` asset of
a GitHub release of this repository.

## Contents

| File in `package/` | Purpose |
|---|---|
| `package.json`, `config.json` | Template package; `base` is `fhir2.base.template`, no scripts or targets of its own. |
| `includes/fragment-css.html` | Loads `assets/css/twiin.css` after the CSS of the base template. |
| `includes/fragment-header.html` | Twiin logo in the page header. |
| `content/assets/css/twiin.css` | Colours, Albert Sans, header layout, orange-red line, dark grey navigation. Text in tables does not break inside words; long words outside tables (URLs) may break. The publish box is styled only through the CSS variables of the base template. |
| `content/assets/images/twiin-logo.svg`, `content/assets/ico/favicon.png` | Logo and favicon, the same files as on fhir.twiin.nl (`ig/_twiin/`). |
| `content/assets/fonts/` | Albert Sans 400 and 700, with `OFL.txt`. |
| `includes/fragment-pageend.html` | Override: footer with the licence statement of fhir.twiin.nl and a repository link derived from the canonical, and loads `twiin-tables.js`. |
| `content/assets/js/twiin-tables.js` | Puts every top-level table of the page content in its own container that scrolls horizontally, so wide tables (profile tables, constraints, bindings) do not make the page wider than the screen. In the base template they do, which also pushes the menu button out of view on a phone. |
| `includes/fragment-pagebegin.html` | Override. Fix: shows the release label (`releaselabel` parameter) in the header; in 0.1.0 the label stays empty. Same change as in the IGs. Addition: a fixed navigation item "All Implementation Guides" (https://fhir.twiin.nl/ig/), in its own list after the IG's `menu.xml`, on the right on wide screens. |
| `layouts/layout-profile-history.html` | Override, fix: one `<h2 id="root">` on profile history pages (HL7/ig-template-base2 commit 5b8c9667). |
| `layouts/layout-profile.html`, `layouts/layout-ext.html` | Override, fix: without the stray `</p>` after the "Derived" paragraph, which made the profile and extension pages not well formed (rest of commit 5b8c9667, applied as is to the 0.1.0 files). |
| `content/assets/js/lang-redirects.js` | Override, fix: the version of HL7/ig-template-base2 `main`; the 0.1.0 version stops the redirect after the first language. |
| `content/searchform.html` | Override, fix: a styled page without external resources or placeholders. The base file loads its stylesheets, logos and favicon over `http://` from hl7.org (unstyled on https pages) and has unresolved `{{site.data.info.assets}}`, `{{title}}` and `{{url}}` placeholders (broken links; the `en/` copy is not filled in by the publisher). It now links the template's own CSS relatively, has the Twiin header and footer, and says that search is not available, with a link to the start page. The DuckDuckGo search box is dropped. |
| `content/assets/images/nld.svg` | Fix: the Dutch flag; the publisher writes it to `output/` but not to `output/en/`, where the pages look for it. |

## Using it in an IG

`ig.ini`:

```ini
[IG]
ig = input/ImplementationGuide-<id>.json
template = twiin.base.template#0.1.7
```

The publisher finds the template in the local package cache. Download the release asset, check its
sha-256 against the value in the release description, and unpack it there before the build:

```sh
TEMPLATE_VERSION=0.1.7
TEMPLATE_SHA256=<sha-256 from the release description>
curl -sSfL -o template.tgz \
  "https://github.com/TwiinNL/ig-template/releases/download/v${TEMPLATE_VERSION}/twiin.base.template-${TEMPLATE_VERSION}.tgz"
echo "${TEMPLATE_SHA256}  template.tgz" | shasum -a 256 -c -
mkdir -p ~/.fhir/packages/twiin.base.template#${TEMPLATE_VERSION}
tar -xzf template.tgz -C ~/.fhir/packages/twiin.base.template#${TEMPLATE_VERSION}
```

The base template `fhir2.base.template#0.1.0` is downloaded by the publisher as usual.

When an IG switches to this template, it can drop its own `input/includes/fragment-pagebegin.html`,
`input/images/assets/js/lang-redirects.js` and `input/images/assets/images/nld.svg`, and the
history-heading entry in `known-errors.txt`.

## Tests

- `node test/base-hashes.test.js` downloads the base template version named in `package/package.json`
  and fails when one of the base files this template overrides (`fragment-pagebegin.html`,
  `fragment-pageend.html`, `layout-profile-history.html`, `layout-profile.html`, `layout-ext.html`,
  `searchform.html`, `lang-redirects.js`) is no longer the 0.1.0 version. The override must then be reviewed: copied again with the change reapplied, or
  removed.
- `node test/mobile.test.js` loads pages of the test IG at 390 px in headless Chromium (`$CHROME`,
  or the first Chrome, Chromium, Edge or Brave found) and fails when the page is wider than the
  screen, a content table is not in its own scrolling container, a table cell breaks inside words, or
  a column is narrower than the longest word of its header.
- `test/sample-ig/` is a small IG (two profiles, one with long element names, long URLs, a constraint
  and a binding; jurisdiction NL) built with IG Publisher 3.0.0 and this
  template. After the build, `node test/output.test.js`, `node test/lang-redirects.test.js` and
  `python3 .github/scripts/check-qa.py` check the logo, CSS, release label, the "All Implementation
  Guides" item, footer, history heading, flag, redirect and that there are no QA errors other than those in `test/sample-ig/known-errors.txt`.

CI (`.github/workflows/ci.yml`) runs all of this. Locally:

```sh
python3 scripts/build.py && scripts/install-local.sh
cd test/sample-ig && java -jar input-cache/publisher.jar -ig . && cd ../..
python3 test/build.test.py && node test/base-hashes.test.js && node test/output.test.js && node test/mobile.test.js && node test/lang-redirects.test.js && python3 .github/scripts/check-qa.py
```

## Releasing

1. Update `version` in `package/package.json` and the version in the `ig.ini` of `test/sample-ig`.
2. Merge to `main` with a green CI.
3. Tag the merge commit and push the tag:

   ```sh
   git tag v<version> && git push origin v<version>
   ```

   `.github/workflows/release.yml` checks that the tag matches the version, runs the hash and build
   tests, builds `twiin.base.template-<version>.tgz` and creates the GitHub release with the archive
   as asset and its sha-256 in the description.

`scripts/build.py` is byte for byte reproducible: entries sorted, mtime of every entry the date of
the last commit that changed `package/`, uid/gid 0 without names, and gzip without file name or
timestamp. The gzip layer uses uncompressed (stored) deflate blocks, because zlib versions compress
the same data differently; the archive is about 150 KB. So anyone can check a release asset:

```sh
git checkout v<version> && python3 scripts/build.py   # prints the same sha-256 as the release
```

The IGs pin the version and the sha-256 of the asset; a released asset is never replaced.

## When the fixes can go

The fixes are needed as long as this template is based on `fhir2.base.template#0.1.0`. When a newer
base version is used (the dependency in `package/package.json`), `test/base-hashes.test.js` fails and
each override is reviewed:

- `lang-redirects.js`: remove when the base version has the HL7/ig-template-base2 `main` version.
- `layout-profile-history.html`, `layout-profile.html`, `layout-ext.html`: remove when the base has
  commit 5b8c9667 (one `<h2 id="root">`, no stray `</p>`).
- `fragment-pagebegin.html`: remove when the base shows the release label; the header does not
  need it otherwise.
- `nld.svg`: remove when the publisher writes the flag to `output/en/` itself (`node
  test/output.test.js` keeps checking that it is there).

## Licences

- CSS and HTML code of this template: Copyright © Twiin, all rights reserved (`UNLICENSED`, see `LICENSE`).
- Albert Sans: SIL Open Font License 1.1, see `package/content/assets/fonts/OFL.txt`.
- The Twiin logo belongs to Twiin and is not covered by CC BY-SA 4.0 or the code licence. It may be
  used in the Twiin IG packages and on fhir.twiin.nl.
- The base template `fhir2.base.template` is CC0-1.0; the overridden files are derived from it.

## Known issues of the base template

Not fixed here, the same with `fhir2.base.template#0.1.0` alone:

- Profile history pages are not in the page list of the publisher, so their breadcrumb bar is empty
  and the heading has no section number (".11" instead of e.g. "2.1.1").

## Changes

- 0.1.7: Footer: "Repository" link to `https://github.com/TwiinNL/ig-<last segment of the canonical>`, shown only when the canonical starts with `https://fhir.twiin.nl/ig/`.
- 0.1.6: Footer: licence statement (design and code all rights reserved), link to www.twiin.nl, links underlined without external-link icons; package marked UNLICENSED.
- 0.1.5: Header: logo sized and spaced by the handbook rules for the wordmark; IG status text centred on the logo.
- 0.1.4: `searchform.html` has no `<div id="ig-status">` any more. The publisher fills no placeholders in `output/en/searchform.html`, so the release label cannot be shown there; IG tests that check the label on every page with `#ig-status` skip the page because of its absence. The rest of the header, the styling and the footer are unchanged.
- 0.1.3: `searchform.html` is styled like the other pages and has no broken links: own CSS, Twiin logo and footer, no hl7.org resources, no placeholders. The search box is removed.
- 0.1.2: `searchform.html` is well formed: the logo `<img>` is closed and the unbalanced `</div>`s are removed, so the publisher no longer warns about it. Layout unchanged.
- 0.1.1: wide tables scroll in their own container on narrow screens. 0.1.0 let table text break
  anywhere (`overflow-wrap: anywhere`), which squeezed the profile tables into columns of one letter
  on a phone, while the page still got wider than the screen.
- 0.1.0: first release.

