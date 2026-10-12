#!/usr/bin/env bash
# Unpacks build/<name>-<version>.tgz into the local FHIR package cache, so an IG with
# "template = <name>#<version>" in ig.ini uses it. Run scripts/build.py first.
set -euo pipefail
cd "$(dirname "$0")/.."
name=$(python3 -c 'import json; print(json.load(open("package/package.json"))["name"])')
version=$(python3 -c 'import json; print(json.load(open("package/package.json"))["version"])')
target="$HOME/.fhir/packages/${name}#${version}"
rm -rf "$target"
mkdir -p "$target"
tar -xzf "build/${name}-${version}.tgz" -C "$target"
echo "installed $target"
