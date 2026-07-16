"""Extrae columnas clave de work_orders.csv roto (export pgAdmin)."""
import re
from pathlib import Path

src = Path(__file__).resolve().parents[1] / "data/raw/exports/work_orders.csv"
dst = src.parent / "work_orders_slim.csv"
lines = src.read_text(encoding="utf-8", errors="replace").splitlines()
rows = ["assetId,workOrderSubcategoryId,createdAt"]
dt = r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+-\d{2}"
skipped = 0
for line in lines[1:]:
    dates = re.findall(dt, line)
    if not dates:
        skipped += 1
        continue
    m_sub = re.search(dt + r",(\d+),[tf],", line)
    m_asset = re.search(
        r",(?:completed|pending|cancelled|in_progress|open|closed|rejected|approved),(\d+),",
        line,
    )
    if not m_sub or not m_asset:
        skipped += 1
        continue
    rows.append(f"{m_asset.group(1)},{m_sub.group(1)},{dates[0]}")
dst.write_text("\n".join(rows) + "\n", encoding="utf-8")
print(f"OK {len(rows) - 1} filas -> {dst} (omitidas: {skipped})")
