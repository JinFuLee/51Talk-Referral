import csv
import json
from pathlib import Path

ROOT = Path("/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research")
SCORES = ROOT / "scores_by_cli.csv"
SCENARIOS = ROOT / "route_scenarios.csv"
WEIGHTS = ROOT / "weights.json"
OUT = ROOT / "route_selector_output.csv"
CLI_COLS = {"Claude": "claude_code", "Codex": "codex", "Gemini": "gemini_cli"}

stage_scores = {cli: {} for cli in CLI_COLS}
with SCORES.open(newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        for cli, col in CLI_COLS.items():
            stage_scores[cli].setdefault(row["stage"], 0.0)
            stage_scores[cli][row["stage"]] += float(row[col]) * float(row["weight"]) / 5

route_weights = json.loads(WEIGHTS.read_text(encoding="utf-8"))["route_weights"]

with SCENARIOS.open(newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

with OUT.open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["scenario_id", "research_owner", "review_owner", "delivery_owner", "fallback_owner", "route_label", "route_score"])
    for row in rows:
        research = "Claude" if row["offline_mode"] == "true" or row["requires_external_freshness"] != "true" else "Gemini"
        if row["policy_density"] == "high" or row["risk_profile"] != "low":
            review = "Claude"
        else:
            review = "Claude"
        delivery = "Codex" if row["writes_code"] == "true" else "Claude"
        fallback = "Claude" if delivery == "Codex" else "Codex"
        score = (
            route_weights["research"] * stage_scores[research]["research"]
            + route_weights["review"] * stage_scores[review]["review"]
            + route_weights["delivery"] * stage_scores[delivery]["delivery"]
        )
        label = f"{research}->Claude->{delivery}"
        w.writerow([row["scenario_id"], research, review, delivery, fallback, label, f"{score:.2f}"])
