from flask import Flask, render_template, jsonify
import requests
from bs4 import BeautifulSoup
import json
import os
import logging
from datetime import datetime

app = Flask(__name__, static_folder="static", template_folder="templates")

# Put your live dashboard link here (as you already have)
LIVE_DASHBOARD_URL = "https://dataset1st.onrender.com/dashboard"

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
    """
    Scrape the first (largest) HTML table from the external dashboard and return as JSON.
    Returns either a list-of-rows (each row is dict) or a dict with 'error' key.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        r = requests.get(LIVE_DASHBOARD_URL, headers=headers, timeout=12)
        r.raise_for_status()
        html = r.text

        # Use lxml if available for faster/more robust parsing
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception:
            soup = BeautifulSoup(html, "html.parser")

        tables = soup.find_all("table")
        if not tables:
            # helpful debug info for troubleshooting
            snippet = html[:1000].replace("\n", " ")
            logger.warning("No <table> found at live URL; returning snippet for debugging")
            return {"error": "No <table> found at the live dashboard URL.", "snippet": snippet}

        # choose the table with the most rows (robust if page has multiple small tables)
        best_table = max(tables, key=lambda t: len(t.find_all("tr")))

        rows = best_table.find_all("tr")
        if not rows:
            return {"error": "No rows found in the selected table."}

        # headers: prefer <th>, fall back to first row's <td>
        header_cells = rows[0].find_all(["th", "td"])
        headers_list = [hc.get_text(strip=True) for hc in header_cells] if header_cells else []

        data = []
        for tr in rows[1:]:
            cells = tr.find_all("td")
            if not cells:
                # sometimes rows without td (e.g., separators) — skip
                continue
            cell_texts = [td.get_text(strip=True) for td in cells]
            # build dict with headers (zip to shortest)
            row_obj = {}
            for i, text in enumerate(cell_texts):
                key = headers_list[i] if i < len(headers_list) else f"col_{i}"
                row_obj[key] = text
            data.append(row_obj)

        return {
            "fetched_at": datetime.utcnow().isoformat() + "Z",
            "source": LIVE_DASHBOARD_URL,
            "rows": data,
        }

    except requests.RequestException as e:
        logger.exception("Requests error while fetching live dashboard")
        return {"error": f"Failed to fetch live data: {str(e)}"}
    except Exception as e:
        logger.exception("Unexpected error while fetching live dashboard")
        return {"error": f"Unexpected error: {str(e)}"}


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
