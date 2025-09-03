# app.py
from flask import Flask, render_template, jsonify
import requests, os, json, logging

app = Flask(__name__, static_folder="static", template_folder="templates")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dashboard")

LIVE_DASHBOARD_URL = os.getenv("LIVE_DASHBOARD_URL", "http://localhost:5000").rstrip("/")


def load_specs():
    candidates = [os.path.join(app.root_path, "specs.json"), os.path.join(app.static_folder, "specs.json")]
    for path in candidates:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.exception("Failed reading specs.json: %s", e)
                return {"error": f"Failed to read specs.json: {e}"}
    return {"error": "specs.json not found (place at repo root or inside /static)"}


def fetch_sensor_data():
    url = f"{LIVE_DASHBOARD_URL}/api/data"
    try:
        r = requests.get(url, timeout=12)
        r.raise_for_status()
        data = r.json()
        # Normalize: always return list
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            if "error" in data:
                # pass error object so front-end can show message
                return {"error": data.get("error")}
            return [data]
        # Unexpected / plain string
        try:
            parsed = json.loads(data)
            if isinstance(parsed, list):
                return parsed
            if isinstance(parsed, dict):
                return [parsed]
        except Exception:
            pass
        return []
    except Exception as e:
        logger.exception("Failed to fetch data from %s: %s", url, e)
        return {"error": f"Failed to fetch live data: {e}"}


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
    return jsonify({"ok": True})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=False)
