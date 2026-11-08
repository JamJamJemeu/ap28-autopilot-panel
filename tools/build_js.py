#!/usr/bin/env python3
"""Generuje plik panelu dla gry z czytelnego zrodla.

src/AP28Panel.js (UTF-8, czytelne)  ->  project/PackageSources/html_ui/InGamePanels/AP28Panel/AP28Panel.js
Znaki spoza ASCII (np. cyrylica) sa zapisywane jako \\uXXXX, zeby gra zawsze wczytala plik poprawnie.

Uzycie:  python tools/build_js.py
"""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = root / "src" / "AP28Panel.js"
dst = root / "project" / "PackageSources" / "html_ui" / "InGamePanels" / "AP28Panel" / "AP28Panel.js"

text = src.read_text(encoding="utf-8")
out = "".join(c if ord(c) < 128 else "\\u%04x" % ord(c) for c in text)
dst.write_text(out, encoding="ascii", newline="\n")
print(f"OK: {dst.relative_to(root)} ({len(out)} B)")
