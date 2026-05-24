"""
✈️ Flight Oracle — Model Training Script
Trains XGBoost on the Clean_Dataset.csv and saves:
  - models/flight_model.pkl
  - models/category_values.json

Run: python train_model.py
"""

import pandas as pd
import numpy as np
import pickle
import json
import os
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb

# ── PATHS ──────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_PATH  = os.path.join(BASE_DIR, "data", "Clean_Dataset.csv")
MODEL_DIR  = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# ── LOAD DATA ──────────────────────────────
print("=" * 55)
print("  ✈  FLIGHT ORACLE — MODEL TRAINING")
print("=" * 55)

if not os.path.exists(DATA_PATH):
    print(f"\n❌ Dataset not found at: {DATA_PATH}")
    print("   Please place Clean_Dataset.csv in the data/ folder.")
    exit(1)

df = pd.read_csv(DATA_PATH)
if "Unnamed: 0" in df.columns:
    df.drop(columns=["Unnamed: 0"], inplace=True)

print(f"\n📦 Dataset loaded  : {df.shape[0]:,} rows × {df.shape[1]} columns")

# ── CLEAN ──────────────────────────────────
before = len(df)
df.drop_duplicates(inplace=True)
df.dropna(inplace=True)

upper = df["price"].quantile(0.99)
df = df[df["price"] <= upper]
print(f"🧹 After cleaning  : {len(df):,} rows  (removed {before - len(df):,})")
print(f"💰 Price range     : ₹{df['price'].min():,} – ₹{df['price'].max():,}")

# ── FEATURE ENGINEERING ────────────────────
COLS_TO_ENCODE = ["airline", "source_city", "destination_city",
                  "departure_time", "arrival_time", "stops", "class"]
FEATURES       = ["airline", "source_city", "destination_city",
                  "departure_time", "arrival_time", "stops",
                  "class", "duration", "days_left"]

category_values = {}
for col in COLS_TO_ENCODE:
    category_values[col] = sorted(df[col].unique().tolist())

df_ml = df.copy()
encoding_maps = {}

for col in COLS_TO_ENCODE:
    le = LabelEncoder()
    df_ml[col] = le.fit_transform(df_ml[col])
    encoding_maps[col] = le

X = df_ml[FEATURES]
y = df_ml["price"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"\n✂️  Train/Test split: {len(X_train):,} / {len(X_test):,}")

# ── EVALUATE HELPER ────────────────────────
def evaluate(name, model, Xtr, Xte, ytr, yte):
    model.fit(Xtr, ytr)
    preds = model.predict(Xte)
    mae   = mean_absolute_error(yte, preds)
    rmse  = np.sqrt(mean_squared_error(yte, preds))
    r2    = r2_score(yte, preds)
    print(f"\n  {name}")
    print(f"    MAE  : ₹{mae:,.0f}")
    print(f"    RMSE : ₹{rmse:,.0f}")
    print(f"    R²   : {r2:.4f}")
    return {"mae": mae, "rmse": rmse, "r2": r2, "preds": preds, "model": model}

# ── TRAIN MODELS ───────────────────────────
print("\n" + "─" * 55)
print("  TRAINING MODELS")
print("─" * 55)

lr     = evaluate("Linear Regression",   LinearRegression(), X_train, X_test, y_train, y_test)
rf     = evaluate("Random Forest",       RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1), X_train, X_test, y_train, y_test)
xgb_res = evaluate("XGBoost ✅",
    xgb.XGBRegressor(
        n_estimators=300, learning_rate=0.05,
        max_depth=8, subsample=0.8,
        colsample_bytree=0.8, random_state=42,
        verbosity=0, n_jobs=-1
    ),
    X_train, X_test, y_train, y_test
)

best_model = xgb_res["model"]

# ── CROSS VALIDATION ───────────────────────
print("\n" + "─" * 55)
print("  5-FOLD CROSS VALIDATION (XGBoost)")
print("─" * 55)
cv = cross_val_score(best_model, X, y, cv=5, scoring="r2", n_jobs=-1)
for i, s in enumerate(cv, 1):
    print(f"  Fold {i}: {s:.4f}")
print(f"\n  Mean R²  : {cv.mean():.4f}")
print(f"  Std Dev  : {cv.std():.4f}")
print(f"  {'✅ Stable!' if cv.std() < 0.05 else '⚠️  High variance'}")

# ── FEATURE IMPORTANCE ─────────────────────
print("\n" + "─" * 55)
print("  TOP FEATURE IMPORTANCES")
print("─" * 55)
fi = pd.Series(best_model.feature_importances_, index=FEATURES).sort_values(ascending=False)
for feat, score in fi.items():
    bar = "█" * int(score * 40)
    print(f"  {feat:20} {bar:40} {score:.4f}")

# ── SAVE MODEL & METADATA ──────────────────
model_path = os.path.join(MODEL_DIR, "flight_model.pkl")
cat_path   = os.path.join(MODEL_DIR, "category_values.json")

with open(model_path, "wb") as f:
    pickle.dump(best_model, f)

with open(cat_path, "w") as f:
    json.dump(category_values, f, indent=2)

print("\n" + "=" * 55)
print("  ✅ TRAINING COMPLETE")
print("=" * 55)
print(f"  → {model_path}")
print(f"  → {cat_path}")
print(f"\n  Best R²  : {xgb_res['r2']:.4f}")
print(f"  Best MAE : ₹{xgb_res['mae']:,.0f}")
print("\n  Run `python app.py` to start the dashboard.\n")
