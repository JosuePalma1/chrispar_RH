from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 🔑 Esto habilita peticiones desde el frontend

@app.route("/")
def home():
    return jsonify({"message": "Backend Flask funcionando 🚀"})

if __name__ == "__main__":
    app.run(debug=True)
