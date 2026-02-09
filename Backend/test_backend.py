
import requests
import json

url = "http://localhost:9000/api/agent"
headers = {"Content-Type": "application/json"}
data = {"prompt": "Explain Quantum Entanglement"}

try:
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
