from flask import Flask, jsonify, render_template, send_from_directory
import pandas as pd
import requests
import os

app = Flask(__name__)

# URL of your live data (returns HTML table)
LIVE_DATA_URL = "https://dataset1st.onrender.com/dashboard"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/sensor-data")
def sensor_data():
    try:
        # Read HTML table into pandas DataFrame
        tables = pd.read_html(LIVE_DATA_URL)
        if len(tables) > 0:
            df = tables[0]  # assuming first table is the sensor data
            data = df.to_dict(orient="records")  # convert to list of dicts
            return jsonify(data)
        else:
            return jsonify({"error": "No tables found in the page"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/specs")
def specs():
    # Serve machine specs from static/specs.json
    specs_path = os.path.join(app.static_folder, "specs.json")
    if os.path.exists(specs_path):
        return send_from_directory(app.static_folder, "specs.json")
    return jsonify({"error": "Specs file not found"}), 404

@app.route("/model")
def model():
    # Serve your 3D model file from static folder
    model_path = os.path.join(app.static_folder, "model.glb")
    if os.path.exists(model_path):
        return send_from_directory(app.static_folder, "model.glb")
    return jsonify({"error": "3D model not found"}), 404

if __name__ == "__main__":
    app.run(debug=True)
