#!/usr/bin/env python3
"""
GameData.kt -> data.js eksport qilgich.

Nima uchun: so'zlar bazasi va impostor mantiqi bitta manbada turishi kerak.
Manba:  ImpostorWHO/app/src/main/java/com/example/impostorwho/data/GameData.kt
Natija: play/data.js  (window.GAME_DATA = {...})

Ishlatish:
    python export-data.py "C:/Users/ASUS/AndroidStudioProjects/ImpostorWHO/app/src/main/java/com/example/impostorwho/data/GameData.kt" ../data.js
"""
import json
import re
import sys
from pathlib import Path

KOTLIN = sys.argv[1] if len(sys.argv) > 1 else (
    "C:/Users/ASUS/AndroidStudioProjects/ImpostorWHO/app/src/main/java/"
    "com/example/impostorwho/data/GameData.kt"
)
OUT = sys.argv[2] if len(sys.argv) > 2 else "data.js"

src = Path(KOTLIN).read_text(encoding="utf-8")

# ---------- WordCategory(...) ----------
cat_re = re.compile(
    r'WordCategory\(\s*id\s*=\s*"([^"]+)"\s*,\s*name\s*=\s*"([^"]*)"\s*,\s*'
    r'emoji\s*=\s*"([^"]*)"\s*,\s*words\s*=\s*listOf\((.*?)\)\s*\)',
    re.S,
)
categories = [
    {
        "id": m.group(1),
        "name": m.group(2),
        "emoji": m.group(3),
        "words": re.findall(r'"([^"]*)"', m.group(4)),
    }
    for m in cat_re.finditer(src)
]

# ---------- curatedPairs ----------
i = src.index("curatedPairs = mapOf(")
pairs = {}
for k, v in re.findall(r'"([^"]+)"\s+to\s+"([^"]+)"', src[i:src.index("\n    )", i)]):
    pairs[k.lower()] = v          # Kotlin mapOf kabi: keyingi qiymat ustun

# ---------- clusters (faqat 8 ta bo'shliq bilan boshlanadigan ichki listOf) ----------
i = src.index("clusters = listOf(")
clusters = []
for grp in re.findall(r"\n {8}listOf\(([^()]*)\)", src[i:]):
    items = re.findall(r'"([^"]*)"', grp)
    if len(items) >= 2:
        clusters.append(items)

data = {"categories": categories, "curatedPairs": pairs, "clusters": clusters}

js = (
    "/* Avtomatik generatsiya qilindi — QO'LDA TAHRIRLAMANG!\n"
    "   Manba: ImpostorWHO/app/src/main/java/com/example/impostorwho/data/GameData.kt\n"
    "   Yangilash: python export-data.py <GameData.kt yo'li> data.js */\n"
    "window.GAME_DATA = "
    + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    + ";\n"
)

Path(OUT).write_text(js, encoding="utf-8")

print(
    f"OK -> {OUT}\n"
    f"  kategoriya : {len(categories)}\n"
    f"  so'z       : {sum(len(c['words']) for c in categories)}\n"
    f"  juftlik    : {len(pairs)}\n"
    f"  klaster    : {len(clusters)}"
)
