from flask import Flask, render_template, jsonify
import requests
from bs4 import BeautifulSoup
import json
import os
import logging
from datetime import datetime

app = Flask(__name__, static_folder="static", template_folder="templates")

# Put your live dashboard link here (as you already have)
LIVE_DASHBOARD_URL = "https://dataset1st.onrender.com/api/data"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("machine-dashboard")


# ---- helpers ----
def load_specs():
    """
    Load machine specs. Prefer repo-root specs.json; fallback to static/specs.json.
    """
    candidates = [
        os.path.join(app.root_path, "specs.json"),
        os.path.join(app.static_folder, "specs.json"),
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.exception("Failed reading specs.json")
                return {"error": f"Failed to read {os.path.basename(path)}: {e}"}
    return {"error": "specs.json not found (place it at repo root or inside /static)"}


def fetch_sensor_data():
   def fetch_sensor_data():
    """
    Scrape the live dashboard table and extract JSON from the 'Data' column.
    Returns structured JSON list.
    """
    try:
        r = requests.get(LIVE_DASHBOARD_URL, timeout=12)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "lxml")

        table = soup.find("table")
        if not table:
            return {"error": "No <table> found at the live dashboard URL."}

        rows = []
        for row in table.find_all("tr")[1:]:  # skip header
            cells = row.find_all("td")
            if len(cells) < 4:
                continue

            try:
                data_json = json.loads(cells[3].get_text(strip=True))
            except Exception:
                data_json = {"raw": cells[3].get_text(strip=True)}

            row_data = {
                "id": cells[0].get_text(strip=True),
                "received_at": cells[1].get_text(strip=True),
                "path": cells[2].get_text(strip=True),
                **data_json,  # flatten JSON values
            }
            rows.append(row_data)

        return rows if rows else {"error": "No sensor rows found."}
    except Exception as e:
        return {"error": f"Failed to fetch live data: {e}"}

# ---- routes ----
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/specs")
def api_specs():
    return jsonify(load_specs())


@app.route("/api/sensors")
def api_sensors():
    return jsonify(fetch_sensor_data())


@app.route("/health")
def health():
    return {"ok": True}


if __name__ == "__main__":
    # Render sets $PORT; default to 5000 locally
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)





