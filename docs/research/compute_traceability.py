import csv
import re
from pathlib import Path

ROOT = Path("/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research")
REPORT = ROOT / "see-three-cli-collaboration-report.md"
EVIDENCE = ROOT / "evidence_map.csv"
OUT = ROOT / "traceability.csv"

text = REPORT.read_text(encoding="utf-8")
section = ""
if "## Core Claims" in text:
    section = text.split("## Core Claims", 1)[1]
    section = section.split("\n## ", 1)[0]
claims = [line.strip() for line in section.splitlines() if line.strip().startswith("- ")]
ids_by_claim = [re.findall(r"\[(E|I|A)\d{2}\]", c) for c in claims]
id_tokens_by_claim = [re.findall(r"\[((?:E|I|A)\d{2})\]", c) for c in claims]
covered = [c for c in claims if re.search(r"\[(E|I|A)\d{2}\]", c)]

evidence = {}
with EVIDENCE.open(newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        evidence[row["id"]] = row

def locator_readable(row):
    snapshot = row.get("snapshot_path", "").strip()
    if snapshot:
        return Path(snapshot).exists()
    locator = row.get("locator", "").strip()
    return Path(locator).exists() if locator.startswith("/") else True

id_found = 0
snapshot_exists = 0
for tokens in id_tokens_by_claim:
    if tokens and all(t in evidence for t in tokens):
        id_found += 1
    if tokens and all(t in evidence and locator_readable(evidence[t]) for t in tokens):
        snapshot_exists += 1

with OUT.open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["metric", "covered", "total", "value", "id_found", "snapshot_exists"])
    total = len(claims)
    cov = len(covered)
    value = f"{(cov / total) if total else 0:.3f}"
    w.writerow(["traceability", cov, total, value, id_found, snapshot_exists])
    w.writerow(["evidence_coverage", cov, total, value, id_found, snapshot_exists])
