from flask import Flask, jsonify, render_template, send_from_directory
import requests
from bs4 import BeautifulSoup
import os

app = Flask(__name__)

# ---------- ROUTE TO SCRAPE LIVE DATA ----------
@app.route("/live-data")
def live_data():
    url = "https://dataset1st.onrender.com/dashboard"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")

    # Find the table
    table = soup.find("table")
    data = []

    if table:
        headers = [th.text.strip() for th in table.find_all("th")]
        for row in table.find_all("tr")[1:]:
            cells = row.find_all("td")
            if len(cells) == len(headers):
                row_data = {headers[i]: cells[i].text.strip() for i in range(len(headers))}
                data.append(row_data)

    return jsonify(data)


# ---------- ROUTE TO SERVE MACHINE SPECS ----------
@app.route("/specs")
def specs():
    return send_from_directory("static", "specs.json")


# ---------- ROUTE TO SERVE MODEL ----------
@app.route("/model/<path:filename>")
def model(filename):
    return send_from_directory("static/model.glb", filename)


# ---------- MAIN DASHBOARD ----------
@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True)
