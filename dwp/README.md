# Digital Work Passport (frontend prototype)

Verifiable work records, income history and a trust indicator for informal workers in India.

## Run (Windows / VS Code) - you need TWO terminals
**Terminal 1: backend (FastAPI + SQLite)**
```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
Open http://localhost:8000/docs to see and test every API endpoint. The database file `backend/workpassport.db` is created automatically with demo data; open it with "DB Browser for SQLite" to show the tables.

**Terminal 2: frontend**
1. Install Node.js LTS from nodejs.org
2. Open this folder in VS Code, open the terminal, run `npm install` then `npm run dev`
3. Open the link shown (usually http://localhost:5173). Use Chrome or Edge for voice features.

## Demo logins (demo data only)
- Worker: 9000000001 / worker123
- Client: 9000000002 / client123
- Partner: partner@demo.com / partner123

## Folder guide
- `src/algorithms/aStar.js`, `csp.js`: matching logic (used behind the scenes, not named on screen)
- `src/services/store.js`: calls the backend API (login token kept per browser tab)
- `backend/main.py`: FastAPI endpoints, role checks, server-side trust score. `backend/database.py`: SQLite tables + demo seed
- `src/services/matching.js`: CSP filters workers, A* scores the path job -> skill -> experience -> location -> worker
- `src/data/`: demo data and sample scheme rules (verify on official sites before real use)
- `src/locales/`: English, Hindi, Tamil. Add a language: new json file + one line in `src/i18n.js`
- `src/components/Voice.jsx`: SpeechButton (read aloud) and VoiceInput (speak to type), using the browser Web Speech API

## Notes
- Trust score is a platform indicator, not a credit score.
- Scheme matches are indicative only; always verify on official portals.
- "Reset demo data" at the bottom of every page restores the sample data.

## Government schemes
- Data lives in `src/data/schemes.js` (rules, documents, official links, last-checked date).
- Matching uses the worker's age, gender, state and estimated income. Conditions the app cannot know (for example "not an EPFO member") are shown as "Please confirm yourself".
- Rules were checked on 3 October 2026. Re-check before real use; later, replace the file with an official data source.

## Backend notes
- Partners and workers cannot create payments or ratings (the API returns 403). Payments have no edit or delete endpoint.
- Passwords are stored hashed. Other people's phone numbers are masked by the server.
- "Reset demo data" at the bottom of the app re-creates the demo database.
- To move to PostgreSQL later, replace `database.py` (for example with SQLAlchemy).

## Indian-language messaging, translation and voice
- The messaging panel accepts Unicode text, so Tamil, English, Hindi, Telugu, Malayalam and Kannada can be typed and stored in SQLite.
- In an active client-worker connection, choose the message's source language and target language, then select **Translate message**. 

**Languages currently enabled for translation:** English, Tamil, Hindi, Telugu, Malayalam and Kannada. Other Indian scripts can be typed into messages, but translation/dictation support for them is not enabled in this version.

## Run (all features: calling, chat translation, Tamil/Hindi/English)
Backend: `cd backend`, `pip install -r requirements.txt`, `python -m uvicorn main:app --reload`.
Frontend: `npm install`, `npm run dev`, open http://localhost:5173 (use localhost, not an IP address, so the microphone works).
- Chat translation uses the local IndicTrans2 model; if it is unavailable it falls back to a free online service. Set `DWP_TRANSLATE_FALLBACK=0` to disable the online fallback.
- The language switch (English / हिन्दी / தமிழ்) translates the whole app. Text typed by users (custom names, free-text skills) is shown as entered.
