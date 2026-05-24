"""
✈️ Flight Oracle — Advanced Flask Application
Author: Aishwarya M | Enhanced with Auth, Profiles & History
"""

from flask import Flask, render_template, request, jsonify, session
import pandas as pd
import numpy as np
import pickle
import json
import os
import random
import hashlib
import uuid
from datetime import datetime

app = Flask(__name__)
app.secret_key = "flight_oracle_secret_2024"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ─────────────────────────────────────────────
# USER DATABASE (JSON file-based storage)
# ─────────────────────────────────────────────

USERS_FILE = os.path.join(BASE_DIR, "data", "users.json")

def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, "r") as f:
            return json.load(f)
    return {}

def save_users(users):
    os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# ─────────────────────────────────────────────
# LOAD MODEL & DATA
# ─────────────────────────────────────────────

def load_model():
    path = os.path.join(BASE_DIR, "models", "flight_model.pkl")
    if os.path.exists(path):
        with open(path, "rb") as f:
            return pickle.load(f)
    return None

def load_categories():
    path = os.path.join(BASE_DIR, "models", "category_values.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return {
        "airline": ["Air India", "IndiGo", "SpiceJet", "Vistara", "GO FIRST", "AirAsia"],
        "source_city": ["Delhi", "Mumbai", "Bangalore", "Kolkata", "Chennai", "Hyderabad"],
        "destination_city": ["Delhi", "Mumbai", "Bangalore", "Kolkata", "Chennai", "Hyderabad"],
        "departure_time": ["Early_Morning", "Morning", "Afternoon", "Evening", "Night", "Late_Night"],
        "arrival_time": ["Early_Morning", "Morning", "Afternoon", "Evening", "Night", "Late_Night"],
        "stops": ["zero", "one", "two_or_more"],
        "class": ["Economy", "Business"]
    }

def load_dataset_stats():
    path = os.path.join(BASE_DIR, "data", "Clean_Dataset.csv")
    if os.path.exists(path):
        df = pd.read_csv(path, nrows=5000)
        if "Unnamed: 0" in df.columns:
            df.drop(columns=["Unnamed: 0"], inplace=True)
        return df
    return None

from sklearn.preprocessing import LabelEncoder

model = load_model()
cat_vals = load_categories()
df_sample = load_dataset_stats()

encoding_maps = {}
COLS_TO_ENCODE = ["airline", "source_city", "destination_city",
                  "departure_time", "arrival_time", "stops", "class"]
FEATURES = ["airline", "source_city", "destination_city",
            "departure_time", "arrival_time", "stops",
            "class", "duration", "days_left"]

if df_sample is not None:
    for col in COLS_TO_ENCODE:
        le = LabelEncoder()
        le.fit(df_sample[col])
        encoding_maps[col] = le
else:
    for col in COLS_TO_ENCODE:
        le = LabelEncoder()
        le.fit(cat_vals[col])
        encoding_maps[col] = le

# ─────────────────────────────────────────────
# AUTH ROUTES
# ─────────────────────────────────────────────

@app.route("/auth/signup", methods=["POST"])
def signup():
    data = request.json
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"success": False, "error": "All fields are required."})
    if len(password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters."})

    users = load_users()
    if email in users:
        return jsonify({"success": False, "error": "An account with this email already exists."})

    user_id = str(uuid.uuid4())[:8]
    users[email] = {
        "id": user_id,
        "name": name,
        "email": email,
        "password": hash_password(password),
        "created_at": datetime.now().isoformat(),
        "avatar_initials": name[:2].upper(),
        "predictions": [],
        "chat_history": [],
        "favorite_routes": [],
        "total_searches": 0
    }
    save_users(users)

    session["user_email"] = email
    user = users[email].copy()
    user.pop("password")
    return jsonify({"success": True, "user": user})


@app.route("/auth/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    users = load_users()
    if email not in users:
        return jsonify({"success": False, "error": "No account found with this email."})

    if users[email]["password"] != hash_password(password):
        return jsonify({"success": False, "error": "Incorrect password."})

    session["user_email"] = email
    user = users[email].copy()
    user.pop("password")
    return jsonify({"success": True, "user": user})


@app.route("/auth/logout", methods=["POST"])
def logout():
    session.pop("user_email", None)
    return jsonify({"success": True})


@app.route("/auth/me")
def me():
    email = session.get("user_email")
    if not email:
        return jsonify({"success": False, "error": "Not logged in"})
    users = load_users()
    if email not in users:
        return jsonify({"success": False, "error": "User not found"})
    user = users[email].copy()
    user.pop("password")
    return jsonify({"success": True, "user": user})


@app.route("/auth/update_profile", methods=["POST"])
def update_profile():
    email = session.get("user_email")
    if not email:
        return jsonify({"success": False, "error": "Not logged in"})
    data = request.json
    users = load_users()
    if "name" in data:
        users[email]["name"] = data["name"]
        users[email]["avatar_initials"] = data["name"][:2].upper()
    save_users(users)
    user = users[email].copy()
    user.pop("password")
    return jsonify({"success": True, "user": user})

# ─────────────────────────────────────────────
# MAIN ROUTES
# ─────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html", categories=cat_vals)


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        if model is None:
            base = 4500
            multipliers = {
                "Business": 2.8, "Economy": 1.0,
                "zero": 0.9, "one": 1.1, "two_or_more": 1.3
            }
            price = base * multipliers.get(data.get("class", "Economy"), 1.0)
            price *= multipliers.get(data.get("stops", "one"), 1.0)
            price += random.randint(-500, 1500)
            price = max(1500, int(price))
        else:
            encoded = []
            for col in FEATURES:
                if col in encoding_maps:
                    val = encoding_maps[col].transform([data[col]])[0]
                elif col == "duration":
                    val = float(data["duration"])
                elif col == "days_left":
                    val = int(data["days_left"])
                encoded.append(val)
            price = int(model.predict([encoded])[0])

        days_left = int(data.get("days_left", 15))
        if days_left > 30:
            advice = "Book anytime — prices are stable this far out."
            advice_level = "safe"
        elif days_left > 10:
            advice = "Book soon — prices are starting to climb."
            advice_level = "warn"
        else:
            advice = "Book immediately — last-minute fares are at peak."
            advice_level = "danger"

        if price < 3000:
            tier = "budget"
        elif price < 8000:
            tier = "moderate"
        elif price < 15000:
            tier = "premium"
        else:
            tier = "luxury"

        result = {
            "success": True,
            "price": price,
            "formatted": f"₹{price:,}",
            "advice": advice,
            "advice_level": advice_level,
            "tier": tier,
            "demo_mode": model is None
        }

        # Save to user history if logged in
        email = session.get("user_email")
        if email:
            users = load_users()
            if email in users:
                prediction_record = {
                    "id": str(uuid.uuid4())[:8],
                    "timestamp": datetime.now().isoformat(),
                    "input": data,
                    "price": price,
                    "formatted": f"₹{price:,}",
                    "tier": tier
                }
                users[email]["predictions"].insert(0, prediction_record)
                users[email]["predictions"] = users[email]["predictions"][:50]  # keep last 50
                users[email]["total_searches"] = users[email].get("total_searches", 0) + 1
                save_users(users)

        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


@app.route("/stats")
def stats():
    if df_sample is not None:
        df = df_sample
        airline_avg = df.groupby("airline")["price"].mean().round(0).to_dict()
        stops_avg   = df.groupby("stops")["price"].mean().round(0).to_dict()
        class_avg   = df.groupby("class")["price"].mean().round(0).to_dict()
        city_avg    = df.groupby("source_city")["price"].mean().round(0).to_dict()

        price_bins = [1000, 3000, 6000, 10000, 20000, 50000]
        hist, _ = np.histogram(df["price"], bins=price_bins)
        labels = [f"₹{price_bins[i]:,}–₹{price_bins[i+1]:,}" for i in range(len(price_bins)-1)]

        return jsonify({
            "total_records": len(df),
            "avg_price": int(df["price"].mean()),
            "min_price": int(df["price"].min()),
            "max_price": int(df["price"].max()),
            "airline_avg": airline_avg,
            "stops_avg": stops_avg,
            "class_avg": class_avg,
            "city_avg": city_avg,
            "price_hist": {"counts": hist.tolist(), "labels": labels},
        })
    else:
        return jsonify({
            "total_records": 300153,
            "avg_price": 7890,
            "min_price": 1105,
            "max_price": 98564,
            "airline_avg": {"Air India": 9200, "IndiGo": 5400, "SpiceJet": 4800, "Vistara": 11200, "GO FIRST": 4600, "AirAsia": 5100},
            "stops_avg": {"zero": 6500, "one": 7200, "two_or_more": 9100},
            "class_avg": {"Economy": 6200, "Business": 18500},
            "city_avg": {"Delhi": 7100, "Mumbai": 8200, "Bangalore": 7600, "Kolkata": 7800, "Chennai": 7300, "Hyderabad": 7500},
            "price_hist": {"counts": [12000, 89000, 110000, 62000, 27153], "labels": ["₹1,000–₹3,000", "₹3,000–₹6,000", "₹6,000–₹10,000", "₹10,000–₹20,000", "₹20,000–₹50,000"]},
        })


@app.route("/save_chat", methods=["POST"])
def save_chat():
    email = session.get("user_email")
    if not email:
        return jsonify({"success": False})
    data = request.json
    users = load_users()
    if email in users:
        users[email]["chat_history"].insert(0, {
            "id": str(uuid.uuid4())[:8],
            "timestamp": datetime.now().isoformat(),
            "user_msg": data.get("user_msg", ""),
            "bot_reply": data.get("bot_reply", "")
        })
        users[email]["chat_history"] = users[email]["chat_history"][:100]
        save_users(users)
    return jsonify({"success": True})


@app.route("/toggle_favorite", methods=["POST"])
def toggle_favorite():
    email = session.get("user_email")
    if not email:
        return jsonify({"success": False, "error": "Not logged in"})
    data = request.json
    route_key = f"{data.get('from', '')}→{data.get('to', '')}"
    users = load_users()
    favs = users[email].get("favorite_routes", [])
    if route_key in favs:
        favs.remove(route_key)
        action = "removed"
    else:
        favs.insert(0, route_key)
        action = "added"
    users[email]["favorite_routes"] = favs[:10]
    save_users(users)
    return jsonify({"success": True, "action": action, "favorites": favs})


@app.route("/chat", methods=["POST"])
def chat():
    user_msg = request.json.get("message", "").lower().strip()

    responses = {
        "cheap": "💡 Book **30+ days early** for the cheapest fares. Economy class on IndiGo or SpiceJet with zero stops typically gives the best value.",
        "cheapest": "💡 Book **30+ days early** for the cheapest fares. Economy class on IndiGo or SpiceJet with zero stops typically gives the best value.",
        "best airline": "🏆 For budget: **IndiGo & SpiceJet** are cheapest. For premium: **Vistara & Air India**. For business class: **Vistara** tops the charts.",
        "business": "👔 Business class is typically **2.5–3x** the economy price. Vistara offers the best business experience. Book 15–20 days early for decent business deals.",
        "economy": "✈️ Economy class offers the best value. Zero-stop Economy on IndiGo is usually the cheapest combination. Book 30+ days early.",
        "stops": "🔄 More stops = higher price generally. **Zero stops** are fastest and often cheapest. **Two+ stops** add time but can sometimes be cheaper on budget routes.",
        "duration": "⏱ Duration affects price significantly. Longer flights cost more. Non-stop routes (2–3 hours) are generally cheaper than multi-hour layovers.",
        "days": "📅 **Book 30+ days ahead** for best prices. Prices surge in the final 10 days. The sweet spot is **15–45 days** before departure.",
        "morning": "🌅 Early morning departures (before 7am) tend to be cheaper than evening or night flights. They also have fewer delays.",
        "night": "🌙 Late night flights are often discounted but less convenient. Good for budget travelers who can handle odd hours.",
        "delhi": "🏙 Delhi (DEL) is India's busiest hub. Flights from Delhi to Mumbai are among the most competitive — great prices year-round.",
        "mumbai": "🌆 Mumbai (BOM) has frequent flights to all major cities. Mumbai–Bangalore and Mumbai–Delhi routes are very price-competitive.",
        "bangalore": "🌿 Bangalore (BLR) is a tech hub with high flight demand. Prices can be elevated, but early booking helps.",
        "model": "🤖 The price predictor uses **XGBoost**, a gradient boosting algorithm trained on 300,000+ real flight records. It achieves an **R² score of ~0.90**.",
        "accuracy": "📊 The XGBoost model achieves an **R² of ~0.90**, meaning it explains 90% of price variation. MAE is typically under ₹1,500.",
        "predict": "🎯 Use the **Price Predictor** tab to get an instant estimate! Fill in airline, cities, class, stops, duration, and days before departure.",
        "feature": "🔍 Top price drivers: **class** (biggest), **days_left**, **airline**, **stops**, and **duration**.",
        "hello": "👋 Hello! I'm your Flight Intelligence Assistant. Ask me anything about prices, booking tips, airlines, or how the AI works!",
        "hi": "👋 Hi there! Ready to help you decode flight prices. What would you like to know?",
        "help": "🆘 I can answer questions about:\n• ✈️ Best airlines & routes\n• 💰 When to book for cheap fares\n• 🤖 How the AI model works\n• 📊 Price trends & statistics\nJust ask naturally!",
    }

    reply = None
    for keyword, response in responses.items():
        if keyword in user_msg:
            reply = response
            break

    if reply is None:
        if any(w in user_msg for w in ["price", "cost", "fare", "expensive"]):
            reply = "💰 Prices are driven by **class, stops, days left, airline, and duration**. Business class on last-minute bookings is always most expensive. Use the predictor for a precise estimate!"
        elif any(w in user_msg for w in ["thank", "thanks", "great", "awesome"]):
            reply = "😊 Happy to help! Safe travels and may your fares always be low! ✈️"
        elif any(w in user_msg for w in ["how", "what", "why", "when", "which"]):
            reply = "🤔 Great question! Try asking about a particular airline, route, booking timing, or price factor. I'll give you the insider scoop!"
        else:
            reply = "🌌 Try asking about **airlines**, **booking timing**, **price factors**, or the **AI model**. I'm here to illuminate the mysteries of flight pricing!"

    return jsonify({"reply": reply, "timestamp": datetime.now().strftime("%H:%M")})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
