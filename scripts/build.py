#!/usr/bin/env python3
"""Build build/<name>-<version>.tgz from package/ and print its sha-256.

The archive has the layout of an NPM/FHIR package (every file under package/) and is byte for byte
reproducible on any machine:
- tar: entries sorted by path, mtime of every entry the commit date of the last commit that
  changed package/ (or SOURCE_DATE_EPOCH when set), uid/gid 0 without user and group names,
  mode 0644, ustar format;
- gzip: no file name, mtime 0, and deflate "stored" blocks (no compression). zlib versions compress
  the same data differently, so the compressed output of zlib would differ between machines; stored
  blocks do not depend on the zlib version. The archive is small, so the size does not matter.
Run from the repo root: python3 scripts/build.py
"""
import hashlib
import io
import json
import os
import struct
import subprocess
import sys
import tarfile
import zlib

SRC = "package"
OUT = "build"


def source_date():
    if os.environ.get("SOURCE_DATE_EPOCH"):
        return int(os.environ["SOURCE_DATE_EPOCH"])
    out = subprocess.run(["git", "log", "-1", "--format=%ct", "--", SRC],
                         capture_output=True, text=True, check=True).stdout.strip()
    if not out:
        sys.exit("no commit found for package/; set SOURCE_DATE_EPOCH")
    return int(out)


def gzip_stored(data):
    """gzip member (RFC 1952) with deflate stored blocks (RFC 1951, BTYPE=00)."""
    out = bytearray(b"\x1f\x8b\x08\x00" + struct.pack("<I", 0) + b"\x00\xff")
    size = 0xFFFF
    chunks = [data[i:i + size] for i in range(0, len(data), size)] or [b""]
    for i, chunk in enumerate(chunks):
        final = 1 if i == len(chunks) - 1 else 0
        out += bytes([final]) + struct.pack("<HH", len(chunk), len(chunk) ^ 0xFFFF) + chunk
    out += struct.pack("<II", zlib.crc32(data) & 0xFFFFFFFF, len(data) & 0xFFFFFFFF)
    return bytes(out)


def main():
    meta = json.load(open(os.path.join(SRC, "package.json")))
    mtime = source_date()
    files = []
    for root, dirs, names in os.walk(SRC):
        for n in names:
            if n == ".DS_Store":
                continue
            p = os.path.join(root, n)
            files.append((os.path.relpath(p, SRC).replace(os.sep, "/"), p))
    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode="w", format=tarfile.USTAR_FORMAT) as tar:
        for rel, p in sorted(files):
            with open(p, "rb") as f:
                data = f.read()
            info = tarfile.TarInfo("package/" + rel)
            info.size = len(data)
            info.mtime = mtime
            info.mode = 0o644
            info.uid = info.gid = 0
            info.uname = info.gname = ""
            tar.addfile(info, io.BytesIO(data))
    os.makedirs(OUT, exist_ok=True)
    target = os.path.join(OUT, f"{meta['name']}-{meta['version']}.tgz")
    with open(target, "wb") as f:
        f.write(gzip_stored(raw.getvalue()))
    digest = hashlib.sha256(open(target, "rb").read()).hexdigest()
    with open(target + ".sha256", "w") as f:
        f.write(f"{digest}  {os.path.basename(target)}\n")
    print(f"{digest}  {target}")
    return 0


sys.exit(main())
