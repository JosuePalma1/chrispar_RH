import requests
import time

BASE_URL = "http://127.0.0.1:5000"

print("Testing endpoints...")
time.sleep(2)

# Login to get token
try:
    r = requests.post(f"{BASE_URL}/api/usuarios/login", json={"username": "admin", "password": "123"})
    if r.status_code == 200:
        token = r.json().get('token')
        print("✓ Login successful")
    else:
        print(f"✗ Login failed: {r.status_code}")
        exit(1)
except Exception as e:
    print(f"✗ Login error: {e}")
    exit(1)

headers = {"Authorization": f"Bearer {token}"}

# Test nominas endpoint
try:
    r = requests.get(f"{BASE_URL}/api/nominas/", headers=headers)
    if r.status_code == 200:
        print(f"✓ Nominas: {r.status_code} - {len(r.json())} records")
    else:
        print(f"✗ Nominas: {r.status_code} - {r.text[:100]}")
except Exception as e:
    print(f"✗ Nominas error: {e}")

# Test rubros endpoint
try:
    r = requests.get(f"{BASE_URL}/api/rubros/", headers=headers)
    if r.status_code == 200:
        print(f"✓ Rubros: {r.status_code} - {len(r.json())} records")
    else:
        print(f"✗ Rubros: {r.status_code} - {r.text[:100]}")
except Exception as e:
    print(f"✗ Rubros error: {e}")

print("\nTest complete!")
