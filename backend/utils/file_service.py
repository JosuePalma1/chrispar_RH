import requests
from flask import current_app

def upload_file_to_vm(file):
    try:
        url = current_app.config.get('FILE_SERVER_URL')
        # Debug print: Veremos qué URL está intentando usar
        print(f"--- INTENTANDO CONECTAR A: {url} ---") 
        
        if not url:
            print("Error: FILE_SERVER_URL no configurado")
            return None

        # Rebobinar el archivo por si acaso fue leído antes
        file.stream.seek(0)
        
        files = {'file': (file.filename, file.stream, file.content_type)}
        
        # Aumenté el timeout a 10s por si la VM es lenta
        response = requests.post(url, files=files, timeout=10)
        
        # Debug print: Veremos qué respondió la VM
        print(f"--- RESPUESTA VM: {response.status_code} - {response.text} ---")

        if response.status_code in [200, 201]:
            return response.json().get('url')
        
        return None

    except requests.exceptions.ConnectionError:
        print("!!! ERROR CRÍTICO: No se puede conectar a la VM (127.0.0.1:8080). Revisa VirtualBox.")
        return None
    except Exception as e:
        print(f"!!! ERROR GENERAL EN UPLOAD: {e}")
        return None

def delete_file_from_vm(file_url):
    """
    Recibe la URL completa (ej: http://127.0.0.1:8080/files/uuid-foto.png)
    Extrae el nombre y llama al endpoint DELETE de la VM.
    """
    if not file_url:
        return False
        
    try:
        # 1. Extraer el nombre del archivo de la URL
        filename = file_url.split('/')[-1]
        
        # 2. Construir la URL base de la VM para borrar
        upload_url = current_app.config.get('FILE_SERVER_URL')
        if not upload_url:
            print("Error: FILE_SERVER_URL no configurado para borrar")
            return False

        base_url = upload_url.replace('/upload', '') # Queda http://127.0.0.1:8080
        
        delete_endpoint = f"{base_url}/files/{filename}"
        
        # 3. Enviar petición DELETE
        response = requests.delete(delete_endpoint, timeout=5)
        
        if response.status_code == 200:
            print(f"Archivo eliminado de VM: {filename}")
            return True
        elif response.status_code == 404:
            print("Archivo no existía en VM (ya borrado o ruta mal formada)")
            return True # Lo consideramos éxito porque ya no está
            
        print(f"Error borrando archivo VM: {response.status_code}")
        return False
        
    except requests.exceptions.ConnectionError:
        print("!!! ERROR CRÍTICO AL BORRAR: No hay conexión con la VM.")
        return False
    except Exception as e:
        print(f"Excepción al borrar archivo de VM: {e}")
        return False