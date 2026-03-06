import os
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

api_key = os.getenv("ELEVENLABS_API_KEY")
voice_id = os.getenv("ELEVENLABS_VOICE_ID")

print(f"API Key: {api_key[:10]}..." if api_key else "API Key: MISSING")
print(f"Voice ID: {voice_id}")

url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

resp = requests.post(
    url,
    headers={
        "xi-api-key": api_key,
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
    },
    json={
        "text": "[hesitant] I... I didn't mean to say that. [regretful] It just came out",
        "model_id": "eleven_v3",
        "voice_settings": {
            "speed": 1.25,
        },
    },
    timeout=30,
)

print(f"\nStatus: {resp.status_code}")
print(f"Headers: {dict(resp.headers)}")

if resp.status_code == 200:
    print(f"Success! Got {len(resp.content)} bytes of audio")
    out_path = os.path.join(os.path.dirname(__file__), "test_output.mp3")
    with open(out_path, "wb") as f:
        f.write(resp.content)
    print(f"Saved to: {out_path}")
else:
    print(f"Error body: {resp.text}")
