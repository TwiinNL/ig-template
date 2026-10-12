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
| `content/assets/css/twiin.css` | Colours, Albert Sans, header layout, orange-red line, dark grey navigation. The publish box is styled only through the CSS variables of the base template. |
| `content/assets/images/twiin-logo.svg`, `content/assets/ico/favicon.png` | Logo and favicon, the same files as on fhir.twiin.nl (`ig/_twiin/`). |
| `content/assets/fonts/` | Albert Sans 400 and 700, with `OFL.txt`. |
| `includes/fragment-pageend.html` | Override: footer with the licence text of fhir.twiin.nl. |
| `includes/fragment-pagebegin.html` | Override, fix: shows the release label (`releaselabel` parameter) in the header; in 0.1.0 the label stays empty. Same change as in the IGs. |
| `layouts/layout-profile-history.html` | Override, fix: one `<h2 id="root">` on profile history pages (HL7/ig-template-base2 commit 5b8c9667). |
| `content/assets/js/lang-redirects.js` | Override, fix: the version of HL7/ig-template-base2 `main`; the 0.1.0 version stops the redirect after the first language. |
| `content/assets/images/nld.svg` | Fix: the Dutch flag; the publisher writes it to `output/` but not to `output/en/`, where the pages look for it. |

## Using it in an IG

`ig.ini`:

```ini
[IG]
ig = input/ImplementationGuide-<id>.json
template = twiin.base.template#0.1.0
```

The publisher finds the template in the local package cache. Download the release asset, check its
sha-256 against the value in the release description, and unpack it there before the build:

```sh
TEMPLATE_VERSION=0.1.0
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
  `fragment-pageend.html`, `layout-profile-history.html`, `lang-redirects.js`) is no longer the
  0.1.0 version. The override must then be reviewed: copied again with the change reapplied, or
  removed.
- `test/sample-ig/` is a small IG (one profile, jurisdiction NL) built with IG Publisher 3.0.0 and this
  template. After the build, `node test/output.test.js`, `node test/lang-redirects.test.js` and
  `python3 .github/scripts/check-qa.py` check the logo, CSS, release label, footer, history heading,
  flag, redirect and that there are no QA errors other than those in `test/sample-ig/known-errors.txt`.

CI (`.github/workflows/ci.yml`) runs all of this. Locally:

```sh
python3 scripts/build.py && scripts/install-local.sh
cd test/sample-ig && java -jar input-cache/publisher.jar -ig . && cd ../..
node test/base-hashes.test.js && node test/output.test.js && node test/lang-redirects.test.js && python3 .github/scripts/check-qa.py
```

## Releasing

1. Update `version` in `package/package.json` and the version in the `ig.ini` of `test/sample-ig`.
2. Merge to `main` with a green CI.
3. `python3 scripts/build.py` writes `build/twiin.base.template-<version>.tgz` and its sha-256. The
   tar inside the archive is reproducible (sorted entries, fixed timestamps and owners); the gzip
   compression can differ between zlib versions, so the `.tgz` itself can have another sha-256 on
   another machine. The sha-256 of the asset that is uploaded is the one the IGs pin.
4. Create the release with the archive as asset and the sha-256 in the description:

   ```sh
   gh release create v<version> build/twiin.base.template-<version>.tgz \
     --title "twiin.base.template <version>" \
     --notes "sha-256: <sha-256>"
   ```

The IGs pin the version and the sha-256 of the asset; a released asset is never replaced.

## When the fixes can go

The fixes are needed as long as this template is based on `fhir2.base.template#0.1.0`. When a newer
base version is used (the dependency in `package/package.json`), `test/base-hashes.test.js` fails and
each override is reviewed:

- `lang-redirects.js`: remove when the base version has the HL7/ig-template-base2 `main` version.
- `layout-profile-history.html`: remove when the base has commit 5b8c9667 (one `<h2 id="root">`).
- `fragment-pagebegin.html`: remove when the base shows the release label; the header does not
  need it otherwise.
- `nld.svg`: remove when the publisher writes the flag to `output/en/` itself (`node
  test/output.test.js` keeps checking that it is there).

## Licences

- CSS and HTML code of this template: licence to be determined.
- Albert Sans: SIL Open Font License 1.1, see `package/content/assets/fonts/OFL.txt`.
- The Twiin logo belongs to Twiin and is not covered by CC BY-SA 4.0 or the code licence. It may be
  used in the Twiin IG packages and on fhir.twiin.nl.
- The base template `fhir2.base.template` is CC0-1.0; the overridden files are derived from it.
