import pandas as pd
import numpy as np

# Clusters: software_engineering, data_science, medicine, marketing, graphic_design
FEATURES = ["R","I","A","S","E","C","numerical_reasoning","analytical_thinking",
            "creativity","communication","risk_tolerance","domain_exposure"]

np.random.seed(42)
data = []
for _ in range(500):
    # software_engineering
    data.append([np.random.beta(2, 5), np.random.beta(8, 2), np.random.beta(2, 5), np.random.beta(2, 5), np.random.beta(2, 5), np.random.beta(5, 5),
                 np.random.beta(8, 2), np.random.beta(8, 2), np.random.beta(6, 4), np.random.beta(4, 6), np.random.beta(4, 6), np.random.beta(6, 4), "software_engineering"])
    # data_science
    data.append([np.random.beta(2, 5), np.random.beta(9, 1), np.random.beta(3, 7), np.random.beta(2, 5), np.random.beta(3, 7), np.random.beta(6, 4),
                 np.random.beta(9, 1), np.random.beta(9, 1), np.random.beta(4, 6), np.random.beta(5, 5), np.random.beta(3, 7), np.random.beta(5, 5), "data_science"])
    # medicine
    data.append([np.random.beta(5, 5), np.random.beta(8, 2), np.random.beta(2, 5), np.random.beta(8, 2), np.random.beta(4, 6), np.random.beta(7, 3),
                 np.random.beta(6, 4), np.random.beta(7, 3), np.random.beta(3, 7), np.random.beta(7, 3), np.random.beta(2, 8), np.random.beta(6, 4), "medicine"])
    # marketing
    data.append([np.random.beta(2, 5), np.random.beta(3, 7), np.random.beta(6, 4), np.random.beta(8, 2), np.random.beta(9, 1), np.random.beta(4, 6),
                 np.random.beta(4, 6), np.random.beta(5, 5), np.random.beta(7, 3), np.random.beta(9, 1), np.random.beta(7, 3), np.random.beta(6, 4), "marketing"])
    # graphic_design
    data.append([np.random.beta(4, 6), np.random.beta(4, 6), np.random.beta(9, 1), np.random.beta(2, 5), np.random.beta(5, 5), np.random.beta(2, 5),
                 np.random.beta(3, 7), np.random.beta(4, 6), np.random.beta(9, 1), np.random.beta(6, 4), np.random.beta(5, 5), np.random.beta(4, 6), "graphic_design"])

df = pd.DataFrame(data, columns=FEATURES + ["career_cluster"])
df.to_csv("riasec_career_dataset.csv", index=False)
