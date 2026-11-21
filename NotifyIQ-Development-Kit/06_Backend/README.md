# Python Backend

The backend is optional and not in the notification capture path. Initial endpoints are health/readiness/capabilities. Add auth, Neon and R2 only when a feature needs them.

## Local run
```bash
cd 06_Backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Deploy
Create a Render Web Service from the backend directory or configure the root directory. Build command: `pip install -r requirements.txt`. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

Free Render services sleep after inactivity and use ephemeral local storage. Do not store uploads, SQLite databases, model weights or durable user data on the Render filesystem. Treat the free tier as a prototype environment.
