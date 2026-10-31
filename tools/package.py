#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "module.json").read_text(encoding="utf-8"))
module_id = manifest["id"]
version = manifest["version"]
dist = ROOT / "dist"
dist.mkdir(exist_ok=True)
install_name = f"{module_id}-v{version}-mod.zip"
source_name = f"{module_id}-v{version}-src.zip"
doc_name = f"{module_id}-v{version}-doc.zip"
exclude = {"dist", "node_modules", ".git", "__pycache__"}

def add_tree(archive, source, prefix, files):
    for path in files:
        relative = path.relative_to(source).as_posix()
        info = zipfile.ZipInfo(f"{prefix}/{relative}", (2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = (0o100644) << 16
        archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)

def collect(base, prefixes):
    files = []
    for item in prefixes:
        target = base / item
        if target.is_file():
            files.append(target)
        elif target.is_dir():
            files.extend(path for path in target.rglob("*") if path.is_file())
    return files

runtime = collect(ROOT, ["module.json", "LICENSE", "README.md", "CHANGELOG.md", "scripts", "styles", "lang"])
source = [path for path in ROOT.rglob("*") if path.is_file() and not any(part in exclude for part in path.relative_to(ROOT).parts)]
docs = collect(ROOT, ["README.md", "CHANGELOG.md", "LICENSE", "SECURITY.md", "CONTRIBUTING.md", "docs"])

def write_zip(name, files, prefix, base):
    destination = dist / name
    destination.unlink(missing_ok=True)
    with zipfile.ZipFile(destination, "w") as archive:
        add_tree(archive, base, prefix, files)
    return destination

install = write_zip(install_name, runtime, module_id, ROOT)
source_zip = write_zip(source_name, source, f"{module_id}-v{version}-src", ROOT)
doc_zip = write_zip(doc_name, docs, f"{module_id}-v{version}-doc", ROOT)
checksums = dist / f"{module_id}-v{version}-SHA256SUMS.txt"
lines = []
for path in (install, source_zip, doc_zip):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    lines.append(f"{digest}  {path.name}")
checksums.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("\n".join(lines))
