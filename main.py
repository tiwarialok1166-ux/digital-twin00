from flask import Flask, render_template, jsonify
import requests
from bs4 import BeautifulSoup
import json
import os

app = Flask(__name__, static_folder="static", template_folder="templates")

LIVE_DASHBOARD_URL = "https://dataset1st.onrender.com/dashboard"

# ---- helpers ----
def load_specs():
    """
    Load machine specs. Prefer repo-root specs.json; fallback to static/specs.json.
    Must return a dict (key/value pairs).
    """
    candidates = [
        os.path.join(app.root_path, "specs.json"),
        os.path.join(app.static_folder, "specs.json"),
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        return data
                    else:
                        return {"error": "specs.json must be a JSON object (key:value pairs)."}
            except Exception as e:
                return {"error": f"Failed to read {os.path.basename(path)}: {e}"}
    return {"error": "specs.json not found (place it at repo root or inside /static)"}


def fetch_sensor_data():
    """
    Scrape the first HTML table from the external dashboard and return as JSON list of rows.
    Each row is a dict: {column: value}.
    """
    try:
        r = requests.get(LIVE_DASHBOARD_URL, timeout=12)
        r.raise_for_status()
        try:
            soup = BeautifulSoup(r.text, "lxml")
        except Exception:
            soup = BeautifulSoup(r.text, "html.parser")

        table = soup.find("table")
        if not table:
            return []

        # headers
        header_row = table.find("tr")
        if not header_row:
            return []
        headers = [th.get_text(strip=True) for th in header_row.find_all(["th", "td"])]

        data = []
        for row in table.find_all("tr")[1:]:
            cells = [td.get_text(strip=True) for td in row.find_all("td")]
            if cells:
                n = min(len(headers), len(cells))
                data.append({headers[i] if i < len(headers) else f"col_{i}": cells[i] for i in range(n)})
        return data
    except Exception as e:
        return [{"error": f"Failed to fetch live data: {e}"}]


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
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
