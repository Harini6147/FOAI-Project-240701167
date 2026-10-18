"""Digital Work Passport API (FastAPI + SQLite).
Run:  uvicorn main:app --reload      then open http://localhost:8000/docs
"""
import datetime, json, os, re, secrets
from contextlib import asynccontextmanager
from typing import Literal, Optional
from functools import lru_cache
import tempfile
from pathlib import Path
from fastapi import Depends, FastAPI, Header, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from database import get_db, hash_password, init_db, reset_demo, verify_password
from translator import translate_text

@asynccontextmanager
async def lifespan(app):
    init_db()
    yield

app = FastAPI(title="Digital Work Passport API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])

# ---------- request models (FastAPI validates automatically) ----------
class SignUp(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    login: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=100)
    role: Literal["worker", "client", "partner"]

class SignIn(BaseModel):
    login: str
    password: str

class ProfileIn(BaseModel):
    location: str = Field(min_length=1, max_length=80)
    state: str = Field(min_length=1, max_length=80)
    workType: str = Field(min_length=1, max_length=80)
    skills: list[str] = []
    requiredSkills: list[str] = []
    experience: float = Field(0, ge=0, le=60)
    expectedSalary: int = Field(0, ge=0)
    availability: Literal["Available", "Busy"] = "Available"
    age: int = Field(0, ge=0, le=100)
    gender: Literal["Female", "Male", "Other", "Prefer not to say", ""] = ""

class ConnectionIn(BaseModel):
    workerId: str
    job: str = Field(min_length=1, max_length=80)
    salary: int = Field(ge=0)
    match: Optional[dict] = None

class TransactionIn(BaseModel):
    connectionId: str
    amount: int = Field(gt=0, le=10_000_000)
    type: str = Field("Monthly Salary", max_length=40)

class RatingIn(BaseModel):
    connectionId: str
    stars: int = Field(ge=1, le=5)
    comment: str = Field("", max_length=500)

class MessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)

class TranslateIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    source: Literal["en", "ta", "hi", "te", "ml", "kn"]
    target: Literal["en", "ta", "hi", "te", "ml", "kn"]

# ---------- helpers ----------
def normalize_login(v: str) -> str:
    v = v.strip()
    if "@" in v:
        return v.lower()
    d = re.sub(r"\D", "", v)
    return d[2:] if len(d) == 12 and d.startswith("91") else d

def next_id(c, table, prefix):
    nums = [int(r["id"].rsplit("-", 1)[1]) for r in c.execute(f"SELECT id FROM {table}")]  # table names are constants
    return f"{prefix}{max([999] + nums) + 1:06d}"

def today():
    return datetime.date.today().isoformat()

def current_user(authorization: str = Header(default=""), c=Depends(get_db)):
    token = authorization.removeprefix("Bearer ").strip()
    row = c.execute("SELECT u.* FROM sessions s JOIN users u ON u.login = s.login WHERE s.token = ?", (token,)).fetchone()
    if not row:
        raise HTTPException(401, "unauthorized")
    return dict(row)

def require(*roles):
    def dep(u=Depends(current_user)):
        if u["role"] not in roles:
            raise HTTPException(403, "forbidden")  # e.g. partners can never write
        return u
    return dep

def mask(phone):
    return "XXXXXX" + (phone or "")[-4:]

def trust_for(c, w):
    """Platform trust indicator (not a credit score), calculated on the server so users cannot fake it."""
    conns = c.execute("SELECT COUNT(*) FROM connections WHERE worker_id=?", (w["id"],)).fetchone()[0]
    pays = c.execute("SELECT COUNT(*) FROM transactions WHERE worker_id=?", (w["id"],)).fetchone()[0]
    n, avg = c.execute("SELECT COUNT(*), AVG(r.stars) FROM ratings r JOIN connections k ON k.id=r.connection_id WHERE k.worker_id=?", (w["id"],)).fetchone()
    parts = [["experience", min(w["experience"], 8) / 8 * 25], ["ratings", (avg / 5 * 30) if n else 10],
             ["payments", min(pays, 12) / 12 * 25], ["connections", min(conns, 4) / 4 * 20]]
    return {"score": round(sum(p[1] for p in parts)), "parts": parts}

def worker_json(c, r, own=False):
    return {"id": r["id"], "name": r["name"], "phone": r["phone"] if own else mask(r["phone"]), "location": r["location"], "state": r["state"],
            "workType": r["work_type"], "skills": json.loads(r["skills"]), "experience": r["experience"], "expectedSalary": r["expected_salary"],
            "availability": r["availability"], "age": r["age"], "gender": r["gender"], "trust": trust_for(c, r)}

def client_json(r, own=False):
    return {"id": r["id"], "name": r["name"], "phone": r["phone"] if own else mask(r["phone"]), "location": r["location"], "state": r["state"],
            "workType": r["work_type"], "requiredSkills": json.loads(r["required_skills"])}

def conn_json(c, r):
    ratings = [{"stars": x["stars"], "comment": x["comment"], "date": x["date"]} for x in c.execute("SELECT * FROM ratings WHERE connection_id=? ORDER BY id", (r["id"],))]
    return {"id": r["id"], "clientId": r["client_id"], "workerId": r["worker_id"], "job": r["job"], "start": r["start"], "salary": r["salary"],
            "status": r["status"], "ratings": ratings, "match": json.loads(r["match"]) if r["match"] else None}

def txn_json(r):
    return {"id": r["id"], "clientId": r["client_id"], "workerId": r["worker_id"], "amount": r["amount"], "type": r["type"], "date": r["date"], "status": r["status"]}

def new_session(c, login):
    token = secrets.token_urlsafe(32)
    c.execute("INSERT INTO sessions VALUES(?,?)", (token, login))
    return token

# ---------- auth ----------
@app.post("/api/auth/signup")
def signup(b: SignUp, c=Depends(get_db)):
    login = normalize_login(b.login)
    if len(login) < 3:
        raise HTTPException(422, "invalid login")
    if c.execute("SELECT 1 FROM users WHERE login=?", (login,)).fetchone():
        raise HTTPException(409, "exists")
    salt, h = hash_password(b.password)  # passwords are stored hashed, never as typed
    c.execute("INSERT INTO users VALUES(?,?,?,?,?,NULL)", (login, b.name.strip(), b.role, salt, h))
    return {"token": new_session(c, login)}

@app.post("/api/auth/signin")
def signin(b: SignIn, c=Depends(get_db)):
    u = c.execute("SELECT * FROM users WHERE login=?", (normalize_login(b.login),)).fetchone()
    if not u:
        raise HTTPException(401, "noAccount")
    if not verify_password(b.password, u["salt"], u["pw_hash"]):
        raise HTTPException(401, "invalid")
    return {"token": new_session(c, u["login"])}

@app.post("/api/auth/signout")
def signout(authorization: str = Header(default=""), c=Depends(get_db)):
    c.execute("DELETE FROM sessions WHERE token=?", (authorization.removeprefix("Bearer ").strip(),))
    return {"ok": True}

@app.get("/api/me")
def me(u=Depends(current_user)):
    return {"user": {"login": u["login"], "name": u["name"], "role": u["role"], "profileId": u["profile_id"]}}

# ---------- profile ----------
@app.put("/api/profile")
def save_profile(b: ProfileIn, u=Depends(require("worker", "client")), c=Depends(get_db)):
    pid = u["profile_id"]
    if u["role"] == "worker":
        if not b.skills or b.age < 14 or b.expectedSalary <= 0:
            raise HTTPException(422, "incomplete")
        vals = (b.location, b.state, b.workType, json.dumps(b.skills), b.experience, b.expectedSalary, b.availability, b.age, b.gender)
        if pid:
            c.execute("UPDATE workers SET location=?,state=?,work_type=?,skills=?,experience=?,expected_salary=?,availability=?,age=?,gender=? WHERE id=?", (*vals, pid))
        else:
            pid = next_id(c, "workers", f"WP-IND-{datetime.date.today().year}-")
            c.execute("INSERT INTO workers VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", (pid, u["name"], u["login"], *vals))
    else:
        if not b.requiredSkills:
            raise HTTPException(422, "incomplete")
        vals = (b.location, b.state, b.workType, json.dumps(b.requiredSkills))
        if pid:
            c.execute("UPDATE clients SET location=?,state=?,work_type=?,required_skills=? WHERE id=?", (*vals, pid))
        else:
            pid = next_id(c, "clients", f"OWN-IND-{datetime.date.today().year}-")
            c.execute("INSERT INTO clients VALUES(?,?,?,?,?,?,?)", (pid, u["name"], u["login"], *vals))
    c.execute("UPDATE users SET profile_id=? WHERE login=?", (pid, u["login"]))
    return {"id": pid}

# ---------- data (each role only receives what it is allowed to see) ----------
@app.get("/api/data")
def data(u=Depends(current_user), c=Depends(get_db)):
    pid, role = u["profile_id"], u["role"]
    rows = lambda sql, *a: c.execute(sql, a).fetchall()
    if role == "worker":
        conns = rows("SELECT * FROM connections WHERE worker_id=?", pid)
        workers = [worker_json(c, r, own=True) for r in rows("SELECT * FROM workers WHERE id=?", pid)]
        clients = [client_json(r) for r in rows("SELECT * FROM clients WHERE id IN (SELECT client_id FROM connections WHERE worker_id=?)", pid)]
        txns = rows("SELECT * FROM transactions WHERE worker_id=?", pid)
    elif role == "client":
        conns = rows("SELECT * FROM connections WHERE client_id=?", pid)
        workers = [worker_json(c, r) for r in rows("SELECT * FROM workers")]
        clients = [client_json(r, own=True) for r in rows("SELECT * FROM clients WHERE id=?", pid)]
        txns = rows("SELECT * FROM transactions WHERE client_id=?", pid)
    else:  # partner: read-only view
        conns = rows("SELECT * FROM connections")
        workers = [worker_json(c, r) for r in rows("SELECT * FROM workers")]
        clients, txns = [], rows("SELECT * FROM transactions")
    return {"workers": workers, "clients": clients, "connections": [conn_json(c, r) for r in conns], "txns": [txn_json(r) for r in txns]}


# ---------- connection messaging ----------
def participant_connection(c, u, connection_id):
    """Only the worker or client belonging to this connection may read/write its messages."""
    if not u.get("profile_id") or u["role"] not in ("worker", "client"):
        raise HTTPException(403, "messaging_forbidden")
    row = c.execute("SELECT * FROM connections WHERE id=? AND status='Active'", (connection_id,)).fetchone()
    if not row:
        raise HTTPException(404, "active_connection_not_found")
    allowed_id = row["worker_id"] if u["role"] == "worker" else row["client_id"]
    if u["profile_id"] != allowed_id:
        raise HTTPException(403, "not_connection_participant")
    return row

def message_json(r):
    return {"id": r["id"], "connectionId": r["connection_id"], "senderLogin": r["sender_login"],
            "senderRole": r["sender_role"], "senderName": r["sender_name"], "body": r["body"], "createdAt": r["created_at"]}

@app.get("/api/connections/{connection_id}/messages")
def list_messages(connection_id: str, u=Depends(current_user), c=Depends(get_db)):
    participant_connection(c, u, connection_id)
    rows = c.execute("SELECT * FROM messages WHERE connection_id=? ORDER BY id ASC", (connection_id,)).fetchall()
    return {"messages": [message_json(r) for r in rows]}

@app.post("/api/connections/{connection_id}/messages")
def send_message(connection_id: str, b: MessageIn, u=Depends(current_user), c=Depends(get_db)):
    participant_connection(c, u, connection_id)
    body = b.body.strip()
    if not body:
        raise HTTPException(422, "empty_message")
    cur = c.execute("INSERT INTO messages(connection_id,sender_login,sender_role,sender_name,body,created_at) VALUES(?,?,?,?,?,?)",
                     (connection_id, u["login"], u["role"], u["name"], body, datetime.datetime.now().astimezone().isoformat(timespec="seconds")))
    row = c.execute("SELECT * FROM messages WHERE id=?", (cur.lastrowid,)).fetchone()
    return {"message": message_json(row)}

@lru_cache(maxsize=1)
def _voice_model():
    # Loaded only when browser speech recognition is unavailable and recording fallback is used.
    from faster_whisper import WhisperModel
    return WhisperModel("base", device="cpu", compute_type="int8")

@app.post("/api/voice/transcribe")
async def transcribe_voice(audio: UploadFile = File(...), language: str = Form("en"), u=Depends(current_user)):
    """Transcribe a short browser recording locally; audio is not sent to a third-party API."""
    supported = {"en", "ta", "hi", "te", "ml", "kn"}
    if language not in supported:
        raise HTTPException(422, "unsupported_voice_language")
    content = await audio.read()
    if not content or len(content) > 15 * 1024 * 1024:
        raise HTTPException(413, "audio_empty_or_too_large")
    suffix = Path(audio.filename or "voice.webm").suffix or ".webm"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            temp.write(content)
            temp_path = temp.name
        model = _voice_model()
        segments, _info = model.transcribe(temp_path, language=language, vad_filter=True)
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return {"text": text, "language": language}
    except ImportError:
        raise HTTPException(503, "voice_transcription_dependency_missing")
    except Exception as exc:
        print(f"Voice transcription failed: {type(exc).__name__}: {exc}")
        raise HTTPException(503, "voice_transcription_unavailable")
    finally:
        if temp_path:
            try: os.unlink(temp_path)
            except OSError: pass

@app.post("/api/connections/{connection_id}/translate")
def translate_connection_message(connection_id: str, b: TranslateIn, u=Depends(current_user), c=Depends(get_db)):
    # Translation is available only to the client/worker who belongs to this active connection.
    participant_connection(c, u, connection_id)
    text = b.text.strip()
    if not text:
        raise HTTPException(422, "empty_text")
    try:
        translated = translate_text(text, b.source, b.target)
    except Exception as exc:
        # Keep model details out of the response; full exception appears in the backend console.
        print(f"Translation failed: {type(exc).__name__}: {exc}")
        raise HTTPException(503, f"Translation unavailable: {str(exc)[:300]}")
    return {"translatedText": translated, "source": b.source, "target": b.target}

# ---------- client actions (workers and partners get 403) ----------
@app.post("/api/connections")
def create_connection(b: ConnectionIn, u=Depends(require("client")), c=Depends(get_db)):
    if not u["profile_id"]:
        raise HTTPException(400, "profile_required")
    if not c.execute("SELECT 1 FROM workers WHERE id=?", (b.workerId,)).fetchone():
        raise HTTPException(404, "worker_not_found")
    if c.execute("SELECT 1 FROM connections WHERE client_id=? AND worker_id=? AND status='Active'", (u["profile_id"], b.workerId)).fetchone():
        raise HTTPException(409, "already_connected")
    cid = next_id(c, "connections", "CN-")
    c.execute("INSERT INTO connections VALUES(?,?,?,?,?,?,?,?)", (cid, u["profile_id"], b.workerId, b.job, today(), b.salary, "Active", json.dumps(b.match) if b.match else None))
    return {"id": cid}

def own_connection(c, u, connection_id):
    r = c.execute("SELECT * FROM connections WHERE id=? AND client_id=?", (connection_id, u["profile_id"])).fetchone()
    if not r:
        raise HTTPException(404, "connection_not_found")
    return r

@app.post("/api/transactions")  # append-only: there is deliberately no edit or delete endpoint
def record_payment(b: TransactionIn, u=Depends(require("client")), c=Depends(get_db)):
    conn = own_connection(c, u, b.connectionId)
    tid = next_id(c, "transactions", "TXN-2026-")
    c.execute("INSERT INTO transactions VALUES(?,?,?,?,?,?,?)", (tid, conn["client_id"], conn["worker_id"], b.amount, b.type, today(), "Recorded"))
    return {"id": tid}

@app.post("/api/ratings")
def add_rating(b: RatingIn, u=Depends(require("client")), c=Depends(get_db)):
    own_connection(c, u, b.connectionId)
    c.execute("INSERT INTO ratings(connection_id,stars,comment,date) VALUES(?,?,?,?)", (b.connectionId, b.stars, b.comment.strip(), today()))
    return {"ok": True}

@app.post("/api/reset-demo")
def reset():
    if os.environ.get("DWP_DEMO", "1") != "1":
        raise HTTPException(403, "disabled")
    reset_demo()
    return {"ok": True}
