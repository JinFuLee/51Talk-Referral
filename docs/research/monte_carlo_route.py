import csv
import json
import random
from pathlib import Path

ROOT = Path("/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research")
rows = list(csv.DictReader((ROOT / "scores_by_cli.csv").open()))
weights = json.loads((ROOT / "weights.json").read_text())["route_weights"]
random.seed(7)
routes = {"recommended": [], "claude_only": [], "codex_only": [], "gemini_only": []}

for _ in range(5000):
    stage = {cli: {} for cli in ["claude_code", "codex", "gemini_cli"]}
    for row in rows:
        for cli in stage:
            stage[cli].setdefault(row["stage"], 0.0)
            raw = max(0, min(5, float(row[cli]) + random.uniform(-0.5, 0.5)))
            stage[cli][row["stage"]] += raw * float(row["weight"]) / 5
    routes["recommended"].append(weights["research"] * stage["gemini_cli"]["research"] + weights["review"] * stage["claude_code"]["review"] + weights["delivery"] * stage["codex"]["delivery"])
    routes["claude_only"].append(weights["research"] * stage["claude_code"]["research"] + weights["review"] * stage["claude_code"]["review"] + weights["delivery"] * stage["claude_code"]["delivery"])
    routes["codex_only"].append(weights["research"] * stage["codex"]["research"] + weights["review"] * stage["codex"]["review"] + weights["delivery"] * stage["codex"]["delivery"])
    routes["gemini_only"].append(weights["research"] * stage["gemini_cli"]["research"] + weights["review"] * stage["gemini_cli"]["review"] + weights["delivery"] * stage["gemini_cli"]["delivery"])

with (ROOT / "monte_carlo_route.csv").open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["route", "runs", "mean", "ci_low", "ci_high"])
    for route, vals in routes.items():
        vals = sorted(vals)
        lo = vals[int(0.025 * len(vals))]
        hi = vals[int(0.975 * len(vals))]
        mean = sum(vals) / len(vals)
        w.writerow([route, len(vals), f"{mean:.3f}", f"{lo:.3f}", f"{hi:.3f}"])
