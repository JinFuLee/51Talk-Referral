from __future__ import annotations

import csv
import hashlib
import random
from pathlib import Path

ROOT = Path("/Users/felixmacbookairm4/Desktop/ref-ops-engine/docs/research")
RATER_A = ROOT / "route_decisions_rater_a.csv"
RATER_B = ROOT / "route_decisions_rater_b.csv"
OUT = ROOT / "reliability.csv"

ROUTE_TO_NUM = {
    "Claude->Claude->Claude": 0,
    "Claude->Claude->Codex": 1,
    "Gemini->Claude->Claude": 2,
    "Gemini->Claude->Codex": 3,
}


def load_rows(path: Path):
    with path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    rows.sort(key=lambda row: row["scenario_id"])
    return rows


def cohen_kappa(a, b):
    labels = sorted(set(a) | set(b))
    n = len(a)
    po = sum(1 for x, y in zip(a, b) if x == y) / n
    pa = {k: sum(1 for x in a if x == k) / n for k in labels}
    pb = {k: sum(1 for y in b if y == k) / n for k in labels}
    pe = sum(pa[k] * pb[k] for k in labels)
    return 1.0 if pe == 1 else (po - pe) / (1 - pe)


def icc_2_1(a, b):
    data = list(zip(a, b))
    n = len(data)
    k = 2
    row_means = [sum(r) / k for r in data]
    col_means = [
        sum(x for x, _ in data) / n,
        sum(y for _, y in data) / n,
    ]
    grand = sum(row_means) / n
    msr = k * sum((m - grand) ** 2 for m in row_means) / (n - 1)
    msc = n * sum((m - grand) ** 2 for m in col_means) / (k - 1)
    sse = 0.0
    for i, (x, y) in enumerate(data):
        for j, val in enumerate((x, y)):
            sse += (val - row_means[i] - col_means[j] + grand) ** 2
    mse = sse / ((n - 1) * (k - 1))
    return (msr - mse) / (msr + (k - 1) * mse + k * (msc - mse) / n)


def bootstrap_ci(metric, a, b, iterations=2000, seed=7):
    rnd = random.Random(seed)
    pairs = list(zip(a, b))
    values = []
    for _ in range(iterations):
        sample = [pairs[rnd.randrange(len(pairs))] for _ in range(len(pairs))]
        sa = [x for x, _ in sample]
        sb = [y for _, y in sample]
        values.append(metric(sa, sb))
    values.sort()
    lo = values[int(0.025 * len(values))]
    hi = values[int(0.975 * len(values))]
    return lo, hi


def main():
    rows_a = load_rows(RATER_A)
    rows_b = load_rows(RATER_B)
    labels_a = [row["route_label"] for row in rows_a]
    labels_b = [row["route_label"] for row in rows_b]
    scores_a = [float(row["route_score"]) for row in rows_a]
    scores_b = [float(row["route_score"]) for row in rows_b]
    kappa = cohen_kappa(labels_a, labels_b)
    icc = icc_2_1(scores_a, scores_b)
    k_lo, k_hi = bootstrap_ci(cohen_kappa, labels_a, labels_b)
    i_lo, i_hi = bootstrap_ci(icc_2_1, scores_a, scores_b)
    sha = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()[:16]

    with OUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "items",
                "raters",
                "signal",
                "cohen_kappa",
                "kappa_ci_low",
                "kappa_ci_high",
                "icc_2_1",
                "icc_ci_low",
                "icc_ci_high",
                "script_sha256_16",
            ]
        )
        writer.writerow(
            [
                len(labels_a),
                2,
                "route_protocol",
                f"{kappa:.3f}",
                f"{k_lo:.3f}",
                f"{k_hi:.3f}",
                f"{icc:.3f}",
                f"{i_lo:.3f}",
                f"{i_hi:.3f}",
                sha,
            ]
        )


if __name__ == "__main__":
    main()
