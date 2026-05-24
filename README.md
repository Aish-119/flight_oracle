# ✈️ Flight Oracle — Price Intelligence Dashboard

Dark-themed flight price predictor with XGBoost ML, interactive charts,
AI chatbot, user login/signup with persistent history, and profile drawer.

---

## 📁 Project Structure (CORRECT — do not move files)

```
flight_oracle/
├── app.py                        ← Flask server (run this)
├── train_model.py                ← Train XGBoost model
├── requirements.txt              ← Python dependencies
│
├── data/
│   ├── Clean_Dataset.csv         ← ⚠️ PASTE YOUR DATASET HERE
│   └── users.json                ← Auto-created on first signup
│
├── models/                       ← Auto-created after training
│   ├── flight_model.pkl
│   └── category_values.json
│
├── templates/
│   └── index.html                ← Dashboard HTML (Flask looks here)
│
└── static/
    ├── css/
    │   └── style.css
    └── js/
        ├── auth.js               ← Login/signup/session
        ├── dashboard.js          ← Charts + prediction
        ├── chatbot.js            ← AI chat UI
        └── profile.js            ← Profile drawer + history
```

---

## 🚀 Quick Start

### Step 1 — Install dependencies
```bash
pip install -r requirements.txt
```

### Step 2 — Add your dataset
Copy `Clean_Dataset.csv` into the `data/` folder.

### Step 3 — Train the model (optional — app runs in demo mode without it)
```bash
python train_model.py
```

### Step 4 — Run the app
```bash
python app.py
```

### Step 5 — Open in browser
```
http://127.0.0.1:5000
```

---

## 🔐 Auth Features

- Sign up with name, email, password (stored in `data/users.json`)
- Login verified against saved hashed passwords
- Sessions persist across page refreshes
- Guest mode available (no signup needed)
- Profile drawer (bottom-left) shows prediction history, saved routes, settings

---

## 🎛️ Dashboard Sections

| Tab        | What's inside                                          |
|------------|--------------------------------------------------------|
| Dashboard  | KPI cards + 4 precise labeled charts                  |
| Predictor  | XGBoost price estimation with booking advice          |
| Analytics  | City chart, booking window curve, grouped airline bars |
| Insights   | 6 intelligence cards with stats                       |
| AI Model   | Feature importance, model comparison, pipeline         |

---

## 🤖 Chatbot

Click the **◉** bubble (bottom-right) to open Oracle AI.
- Smooth typing indicator while bot responds
- Contextual suggestion chips after each reply
- Chat history saved per user account

---

## ⚙️ VS Code Setup

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
python app.py
```

*Built by Aishwarya M*
