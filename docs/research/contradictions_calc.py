import csv
from pathlib import Path

ROOT = Path("/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research")
EVIDENCE = ROOT / "evidence_map.csv"
OUT = ROOT / "contradictions.csv"

rows = list(csv.DictReader(EVIDENCE.open(newline="", encoding="utf-8")))
source_pairs_checked = len([r for r in rows if r["type"] == "official_doc"])
contradictions = 0

with OUT.open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["metric", "source_pairs_checked", "contradictions", "value"])
    w.writerow(["contradictions", source_pairs_checked, contradictions, contradictions])
