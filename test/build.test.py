#!/usr/bin/env python3
"""Checks scripts/build.py: the archive holds exactly package/ under package/, its tar and gzip
headers carry no machine-specific data, and two builds give the same bytes.
Run from the repo root: python3 test/build.test.py
"""
import gzip
import hashlib
import json
import os
import subprocess
import sys
import tarfile

EPOCH = "1700000000"
failed = False


def check(ok, msg):
    global failed
    print(("ok   " if ok else "FAIL ") + msg)
    if not ok:
        print(f"::error::{msg}")
        failed = True


def build():
    env = dict(os.environ, SOURCE_DATE_EPOCH=EPOCH)
    subprocess.run([sys.executable, "scripts/build.py"], env=env, check=True, capture_output=True)
    meta = json.load(open("package/package.json"))
    path = f"build/{meta['name']}-{meta['version']}.tgz"
    return path, open(path, "rb").read()


path, first = build()
_, second = build()
check(first == second, "two builds give the same bytes")
check(first[3] == 0, "gzip header has no file name or other flags")
check(first[4:8] == b"\0\0\0\0", "gzip header mtime is 0")
check(gzip.decompress(first) is not None, "gzip data is valid")

expected = sorted(
    "package/" + os.path.relpath(os.path.join(r, n), "package").replace(os.sep, "/")
    for r, _, ns in os.walk("package") for n in ns if n != ".DS_Store")
with tarfile.open(path) as tar:
    members = tar.getmembers()
    names = [m.name for m in members]
    check(names == expected, "tar holds exactly the files of package/, sorted")
    check(all(m.mtime == int(EPOCH) and m.uid == 0 and m.gid == 0 and m.uname == "" and m.gname == ""
              and m.mode == 0o644 for m in members), "tar entries have fixed mtime, owner and mode")
    same = all(tar.extractfile(m).read() == open(m.name, "rb").read() for m in members)
    check(same, "tar file contents equal package/")

print(hashlib.sha256(first).hexdigest(), path, f"(SOURCE_DATE_EPOCH={EPOCH})")
sys.exit(1 if failed else 0)
