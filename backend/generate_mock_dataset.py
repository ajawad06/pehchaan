import pandas as pd
import numpy as np

# =============================================================================
# BOOTSTRAP DATASET v2 — Synthetic only.
# Distributions hand-tuned per career cluster based on RIASEC theory and
# O*NET occupational interest profiles. NOT real user data.
# DO NOT claim predictions as accurate until real session data drives retraining.
# Replace with: O*NET Interest Profiler dataset OR logged Pehchaan sessions.
# =============================================================================

FEATURES = ["R","I","A","S","E","C","numerical_reasoning","analytical_thinking",
            "creativity","communication","risk_tolerance","domain_exposure"]

np.random.seed(42)
data = []
N = 1000  # samples per cluster

for _ in range(N):
    # ── software_engineering: High I, C, numerical_reasoning, analytical_thinking ──
    data.append([np.random.beta(3, 7), np.random.beta(8, 2), np.random.beta(2, 6), np.random.beta(2, 7), np.random.beta(3, 6), np.random.beta(6, 4),
                 np.random.beta(8, 2), np.random.beta(8, 2), np.random.beta(6, 4), np.random.beta(4, 6), np.random.beta(4, 6), np.random.beta(7, 3), "software_engineering"])

    # ── data_science: Very high I, C, numerical_reasoning, analytical_thinking ──
    data.append([np.random.beta(2, 7), np.random.beta(9, 1), np.random.beta(3, 7), np.random.beta(2, 7), np.random.beta(3, 7), np.random.beta(7, 3),
                 np.random.beta(9, 1), np.random.beta(9, 1), np.random.beta(4, 6), np.random.beta(5, 5), np.random.beta(3, 7), np.random.beta(6, 4), "data_science"])

    # ── medicine: High I, S, C; communication & domain_exposure strong ──
    data.append([np.random.beta(5, 5), np.random.beta(8, 2), np.random.beta(2, 6), np.random.beta(8, 2), np.random.beta(4, 6), np.random.beta(7, 3),
                 np.random.beta(6, 4), np.random.beta(7, 3), np.random.beta(3, 7), np.random.beta(8, 2), np.random.beta(2, 8), np.random.beta(8, 2), "medicine"])

    # ── marketing: High E, S, A; communication & risk_tolerance strong ──
    data.append([np.random.beta(2, 7), np.random.beta(3, 7), np.random.beta(7, 3), np.random.beta(8, 2), np.random.beta(9, 1), np.random.beta(4, 6),
                 np.random.beta(4, 6), np.random.beta(5, 5), np.random.beta(7, 3), np.random.beta(9, 1), np.random.beta(8, 2), np.random.beta(6, 4), "marketing"])

    # ── graphic_design: Very high A; moderate E; creativity dominant ──
    data.append([np.random.beta(4, 6), np.random.beta(4, 6), np.random.beta(9, 1), np.random.beta(2, 6), np.random.beta(5, 5), np.random.beta(2, 7),
                 np.random.beta(3, 7), np.random.beta(4, 6), np.random.beta(9, 1), np.random.beta(6, 4), np.random.beta(5, 5), np.random.beta(4, 6), "graphic_design"])

    # ── architecture: High R, I, A; spatial via analytical; creativity high ──
    data.append([np.random.beta(7, 3), np.random.beta(7, 3), np.random.beta(8, 2), np.random.beta(3, 7), np.random.beta(4, 6), np.random.beta(5, 5),
                 np.random.beta(6, 4), np.random.beta(7, 3), np.random.beta(8, 2), np.random.beta(5, 5), np.random.beta(4, 6), np.random.beta(6, 4), "architecture"])

    # ── education: High S, A; communication dominant; creativity moderate ──
    data.append([np.random.beta(3, 7), np.random.beta(5, 5), np.random.beta(7, 3), np.random.beta(9, 1), np.random.beta(5, 5), np.random.beta(5, 5),
                 np.random.beta(4, 6), np.random.beta(5, 5), np.random.beta(7, 3), np.random.beta(9, 1), np.random.beta(3, 7), np.random.beta(5, 5), "education"])

    # ── finance: High C, I, E; numerical_reasoning very strong ──
    data.append([np.random.beta(3, 7), np.random.beta(7, 3), np.random.beta(2, 7), np.random.beta(3, 7), np.random.beta(7, 3), np.random.beta(9, 1),
                 np.random.beta(9, 1), np.random.beta(8, 2), np.random.beta(2, 7), np.random.beta(6, 4), np.random.beta(5, 5), np.random.beta(7, 3), "finance"])

    # ── psychology: High S, I, A; communication & creativity high ──
    data.append([np.random.beta(2, 7), np.random.beta(7, 3), np.random.beta(7, 3), np.random.beta(9, 1), np.random.beta(5, 5), np.random.beta(4, 6),
                 np.random.beta(4, 6), np.random.beta(6, 4), np.random.beta(7, 3), np.random.beta(9, 1), np.random.beta(3, 7), np.random.beta(5, 5), "psychology"])

    # ── entrepreneurship: High E, R; risk_tolerance & communication very high ──
    data.append([np.random.beta(6, 4), np.random.beta(5, 5), np.random.beta(5, 5), np.random.beta(6, 4), np.random.beta(9, 1), np.random.beta(3, 7),
                 np.random.beta(5, 5), np.random.beta(6, 4), np.random.beta(7, 3), np.random.beta(8, 2), np.random.beta(9, 1), np.random.beta(7, 3), "entrepreneurship"])

df = pd.DataFrame(data, columns=FEATURES + ["career_cluster"])
df.to_csv("riasec_career_dataset.csv", index=False)
print(f"Generated {len(df)} rows across {df['career_cluster'].nunique()} clusters (bootstrap_v2).")
