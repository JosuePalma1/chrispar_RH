import os
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Usamos una ruta relativa. En el contenedor esto será /app/storage
UPLOAD_FOLDER = 'storage' 
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'docx', 'doc'}

# Como Docker expondrá el puerto 5000 en tu Windows, la URL debe coincidir.
BASE_URL = 'http://localhost:5000'

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Crear la carpeta si no existe (Buena práctica para evitar errores al inicio)
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}-{filename}"
        
        # Se guarda en /app/storage/...
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))

        file_url = f"{BASE_URL}/files/{unique_filename}"

        return jsonify({'url': file_url}), 201

    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/files/<filename>', methods=['GET', 'DELETE'])
def manage_file(filename):
    filename = secure_filename(filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    if request.method == 'GET':
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    if request.method == 'DELETE':
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                return jsonify({'message': 'Archivo eliminado correctamente'}), 200
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        else:
            return jsonify({'error': 'Archivo no encontrado'}), 404

if __name__ == '__main__':
    # Gunicorn ignorará esto, pero sirve para pruebas locales sin Docker
    app.run(host='0.0.0.0', port=5000)