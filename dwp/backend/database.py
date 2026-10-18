"""SQLite storage + demo seed data. Uses Python's built-in sqlite3 (no extra install)."""
import hashlib, hmac, json, os, secrets, sqlite3
from pathlib import Path

DB_PATH = os.environ.get("DWP_DB", str(Path(__file__).parent / "workpassport.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(login TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, salt TEXT NOT NULL, pw_hash TEXT NOT NULL, profile_id TEXT);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, login TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS workers(id TEXT PRIMARY KEY, name TEXT, phone TEXT, location TEXT, state TEXT, work_type TEXT, skills TEXT, experience REAL, expected_salary INTEGER, availability TEXT, age INTEGER, gender TEXT);
CREATE TABLE IF NOT EXISTS clients(id TEXT PRIMARY KEY, name TEXT, phone TEXT, location TEXT, state TEXT, work_type TEXT, required_skills TEXT);
CREATE TABLE IF NOT EXISTS connections(id TEXT PRIMARY KEY, client_id TEXT, worker_id TEXT, job TEXT, start TEXT, salary INTEGER, status TEXT, match TEXT);
CREATE TABLE IF NOT EXISTS ratings(id INTEGER PRIMARY KEY AUTOINCREMENT, connection_id TEXT, stars INTEGER, comment TEXT, date TEXT);
CREATE TABLE IF NOT EXISTS transactions(id TEXT PRIMARY KEY, client_id TEXT, worker_id TEXT, amount INTEGER, type TEXT, date TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT, connection_id TEXT NOT NULL, sender_login TEXT NOT NULL, sender_role TEXT NOT NULL, sender_name TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_messages_connection ON messages(connection_id, id);
"""

def connect():
    c = sqlite3.connect(DB_PATH, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c

def get_db():  # FastAPI dependency: one connection per request, committed at the end
    c = connect()
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()

def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return salt, h

def verify_password(password, salt, expected):
    return hmac.compare_digest(hash_password(password, salt)[1], expected)

def init_db():
    c = connect()
    c.executescript(SCHEMA)
    if not c.execute("SELECT 1 FROM users").fetchone():
        seed(c)
    c.commit(); c.close()

def reset_demo():
    c = connect()
    for t in ("sessions", "ratings", "transactions", "connections", "clients", "workers", "users"):
        c.execute(f"DELETE FROM {t}")
    seed(c); c.commit(); c.close()

def seed(c):
    j = json.dumps
    workers = [
        ("WP-IND-2026-000582", "Meena", "9000000001", "Chennai", "Tamil Nadu", "Domestic Worker", ["Cooking", "Cleaning"], 4, 12000, "Available", 32, "Female"),
        ("WP-IND-2026-000583", "Lakshmi", "9000000011", "Chennai", "Tamil Nadu", "Domestic Worker", ["Cooking", "Childcare"], 6, 14000, "Available", 38, "Female"),
        ("WP-IND-2026-000584", "Ravi", "9000000012", "Madurai", "Tamil Nadu", "Electrician", ["Wiring", "Repairs"], 8, 18000, "Available", 35, "Male"),
        ("WP-IND-2026-000585", "Suresh", "9000000013", "Chennai", "Tamil Nadu", "Driver", ["Driving"], 5, 16000, "Busy", 41, "Male"),
        ("WP-IND-2026-000586", "Anita", "9000000014", "Pune", "Maharashtra", "Domestic Worker", ["Cleaning", "Cooking"], 2, 9000, "Available", 27, "Female"),
    ]
    for w in workers:
        c.execute("INSERT INTO workers VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", (*w[:6], j(w[6]), *w[7:]))
    c.execute("INSERT INTO clients VALUES(?,?,?,?,?,?,?)", ("OWN-IND-2026-000124", "Priya", "9000000002", "Chennai", "Tamil Nadu", "Household Services", j(["Cooking", "Cleaning"])))
    for login, pw, role, pid, name in [("9000000001", "worker123", "worker", "WP-IND-2026-000582", "Meena"),
                                       ("9000000002", "client123", "client", "OWN-IND-2026-000124", "Priya"),
                                       ("partner@demo.com", "partner123", "partner", None, "Demo Bank")]:
        salt, h = hash_password(pw)
        c.execute("INSERT INTO users VALUES(?,?,?,?,?,?)", (login, name, role, salt, h, pid))
    c.execute("INSERT INTO connections VALUES(?,?,?,?,?,?,?,?)", ("CN-000001", "OWN-IND-2026-000124", "WP-IND-2026-000582", "Cooking", "2026-01-01", 12000, "Active", None))
    c.execute("INSERT INTO ratings(connection_id,stars,comment,date) VALUES(?,?,?,?)", ("CN-000001", 5, "Excellent work and punctual service.", "2026-06-30"))
    for i in range(8):
        c.execute("INSERT INTO transactions VALUES(?,?,?,?,?,?,?)", (f"TXN-2026-{910 + i:06d}", "OWN-IND-2026-000124", "WP-IND-2026-000582", 11000 + (i % 3) * 750, "Monthly Salary", f"2026-{i + 1:02d}-01", "Recorded"))
