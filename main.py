from flask import Flask, render_template, jsonify
import requests
from bs4 import BeautifulSoup
import json
import os

app = Flask(__name__)

# Load machine specs from local JSON file
def load_specs():
    try:
        with open("static/specs.json", "r") as f:
            return json.load(f)
    except Exception as e:
        return {"error": str(e)}

# Scrape sensor data from external HTML table
def fetch_sensor_data():
    url = "https://dataset1st.onrender.com/dashboard"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        table = soup.find("table")
        data = []

        if table:
            headers = [th.get_text(strip=True) for th in table.find_all("th")]
            for row in table.find_all("tr")[1:]:
                cells = [td.get_text(strip=True) for td in row.find_all("td")]
                if cells:
                    data.append(dict(zip(headers, cells)))
        return data
    except Exception as e:
        return {"error": str(e)}

@app.route("/")
def dashboard():
    return render_template("index.html")

@app.route("/api/specs.json")
def api_specs():
    return jsonify(load_specs.json())

@app.route("/api/sensors")
def api_sensors():
    return jsonify(fetch_sensor_data())

if __name__ == "__main__":
    app.run(debug=True)

