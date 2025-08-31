from flask import Flask, render_template, send_from_directory, jsonify
import requests, os, json

app = Flask(__name__)

# Path to specs.json
SPECS_FILE = "specs.json"

@app.route("/")
def dashboard():
    return render_template("index.html")

# Proxy sensor API (your Render live API)
@app.route("/api/sensor-data")
def get_sensor_data():
    try:
        res = requests.get("https://dataset1st.onrender.com/dashboard", timeout=5)
        return jsonify(res.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Serve machine specs.json
@app.route("/api/specs")
def get_specs():
    if os.path.exists(SPECS_FILE):
        with open(SPECS_FILE) as f:
            return jsonify(json.load(f))
    return jsonify({"error": "Specs file not found"}), 404

# Serve static model
@app.route("/model.glb")
def get_model():
    return send_from_directory("static", "model.glb")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
