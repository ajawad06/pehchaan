# train.py
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import pandas as pd, joblib

df = pd.read_csv("riasec_career_dataset.csv")
FEATURES = ["R","I","A","S","E","C","numerical_reasoning","analytical_thinking",
            "creativity","communication","risk_tolerance","domain_exposure"]
X, y = df[FEATURES], df["career_cluster"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
clf = RandomForestClassifier(n_estimators=300, max_depth=12, random_state=42)
clf.fit(X_train, y_train)
print("Test accuracy:", clf.score(X_test, y_test))
joblib.dump(clf, "career_model.joblib")
