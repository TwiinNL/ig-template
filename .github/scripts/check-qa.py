#!/usr/bin/env python3
"""Fail on every publisher error of test/sample-ig that is not listed in its known-errors.txt.

Run from the repo root after a build of test/sample-ig. Taken from the Twiin IG repositories.

Two sources, because the publisher reports validation errors in qa.xml but errors from
checking the generated HTML (e.g. WCAG heading checks) only in qa.txt and qa.json:
- output/qa.xml (a Bundle of OperationOutcomes). Each error/fatal issue becomes one line
  "<location>: <message>", where location is the issue's expression (e.g.
  ImplementationGuide/<id>), or else the file name.
- output/qa.txt. Each "ERROR:" / "FATAL:" line becomes "<location>: <message>", with the
  absolute path of the output folder replaced by "output/" so the lines do not depend on
  the machine.
The errors of both sources, counted once when both report them, must equal "errs" in
output/qa.json. Lines are compared exactly with the non-comment lines of known-errors.txt.
"""
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter

NS = {"f": "http://hl7.org/fhir"}
FILE_EXT = "http://hl7.org/fhir/StructureDefinition/operationoutcome-file"


def val(el, path):
    found = el.find(path, NS)
    return found.get("value") if found is not None else None


def errors(qa_xml):
    result = []
    for outcome in ET.parse(qa_xml).getroot().iter("{http://hl7.org/fhir}OperationOutcome"):
        file_ext = next((e for e in outcome.findall("f:extension", NS) if e.get("url") == FILE_EXT), None)
        file_name = os.path.basename(val(file_ext, "f:valueString") or "") if file_ext is not None else ""
        for issue in outcome.findall("f:issue", NS):
            if val(issue, "f:severity") not in ("error", "fatal"):
                continue
            location = val(issue, "f:expression") or file_name or "n/a"
            message = " ".join((val(issue, "f:details/f:text") or "").split())
            result.append(f"{location}: {message}")
    return result


def txt_errors(qa_txt):
    output_dir = os.path.abspath("test/sample-ig/output") + os.sep
    result = []
    with open(qa_txt, encoding="utf-8") as f:
        for line in f:
            m = re.match(r"(?:ERROR|FATAL): (.*)", line.rstrip("\n"))
            if m:
                result.append(" ".join(m.group(1).replace(output_dir, "output/").split()))
    return result


def main():
    from_xml = errors("test/sample-ig/output/qa.xml")
    from_txt = txt_errors("test/sample-ig/output/qa.txt")
    # qa.txt repeats the errors of qa.xml; the union counts each error once.
    found = list((Counter(from_xml) | Counter(from_txt)).elements())
    with open("test/sample-ig/output/qa.json") as f:
        expected = json.load(f)["errs"]
    if len(found) != expected:
        print(f"::error::qa.xml has {len(from_xml)} and qa.txt has {len(from_txt)} error(s), "
              f"together {len(found)}, but qa.json reports errs={expected}; "
              "the QA output layout may have changed")
        return 1
    with open("test/sample-ig/known-errors.txt") as f:
        known = [l.rstrip("\n") for l in f if l.strip() and not l.startswith("#")]
    unknown = [e for e in found if e not in known]
    for e in found:
        print(("KNOWN   " if e in known else "UNKNOWN ") + e)
    for k in known:
        if k not in found:
            print(f"::notice::known-errors.txt entry no longer occurs: {k}")
    if unknown:
        print(f"::error::IG build has {len(unknown)} error(s) not listed in known-errors.txt; see qa.html in the ig-output artifact")
        return 1
    return 0


sys.exit(main())
