#!/usr/bin/env python3
"""Build build/<name>-<version>.tgz from package/ and print its sha-256.

The archive has the layout of an NPM/FHIR package (every file under package/) and is
reproducible: sorted entries, fixed mtime, owner and mode, so the same sources always give the
same sha-256. Run from the repo root: python3 scripts/build.py
"""
import gzip
import hashlib
import io
import json
import os
import sys
import tarfile

SRC = "package"
OUT = "build"


def add(tar, path, arcname):
    info = tarfile.TarInfo(arcname)
    info.mtime = 0
    info.uid = info.gid = 0
    info.uname = info.gname = ""
    info.mode = 0o644
    with open(path, "rb") as f:
        data = f.read()
    info.size = len(data)
    tar.addfile(info, io.BytesIO(data))


def main():
    meta = json.load(open(os.path.join(SRC, "package.json")))
    files = []
    for root, dirs, names in os.walk(SRC):
        dirs.sort()
        for n in sorted(names):
            if n == ".DS_Store":
                continue
            p = os.path.join(root, n)
            files.append((p, os.path.relpath(p, SRC).replace(os.sep, "/")))
    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode="w", format=tarfile.USTAR_FORMAT) as tar:
        for p, rel in sorted(files, key=lambda x: x[1]):
            add(tar, p, "package/" + rel)
    os.makedirs(OUT, exist_ok=True)
    target = os.path.join(OUT, f"{meta['name']}-{meta['version']}.tgz")
    with open(target, "wb") as f:
        f.write(gzip.compress(raw.getvalue(), mtime=0))
    digest = hashlib.sha256(open(target, "rb").read()).hexdigest()
    with open(target + ".sha256", "w") as f:
        f.write(f"{digest}  {os.path.basename(target)}\n")
    print(f"{digest}  {target}")
    return 0


sys.exit(main())
