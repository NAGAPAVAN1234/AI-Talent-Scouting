# 🤖 AI Talent Scout & Engagement Agent

> An AI-powered recruiter that parses job descriptions, discovers matching candidates, engages them conversationally, and outputs a ranked shortlist — all in minutes.

---

## 🎯 Problem Statement

Recruiters spend hours manually sifting through profiles and chasing candidate interest. This agent automates the full pipeline:
1. **Parse** any Job Description with AI
2. **Discover** matching candidates with explainable scoring
3. **Engage** candidates via AI-simulated conversation
4. **Rank** candidates by combined Match + Interest score

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧠 JD Parsing | Gemini AI extracts role, skills, experience, location & salary from raw JD text |
| 🔍 Candidate Matching | Zero-API local matching: TF-IDF + LSA (cosine similarity) + fuzzy alias scoring |
| 💬 AI Chat Outreach | Personalized recruiter messages + simulated candidate responses |
| 📊 Interest Scoring | Real-time chat analysis scores genuine candidate enthusiasm (0–100) |
| 🏆 Ranked Shortlist | Final score = 60% Match + 40% Interest, top 5 with recruiter tips |
| 📜 JD History | Persisted job descriptions for reference and reuse |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                  │
│   Recruiter Dashboard │ Candidate Portal │ Chat Interface        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (Axios)
┌───────────────────────────▼─────────────────────────────────────┐
│                    BACKEND (FastAPI + Python)                    │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ /api/    │  │ /api/    │  │ /api/    │  │ /api/shortlist │  │
│  │upload-jd │  │  match   │  │  chat/*  │  │                │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬────────┘  │
│       │             │             │                 │           │
│  ┌────▼─────────────▼─────────────▼─────────────────▼────────┐  │
│  │                  services.py (AI Logic Layer)              │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │         LOCAL MATCHING ENGINE (Zero API calls)      │  │  │
│  │  │  TF-IDF Vectorizer → TruncatedSVD → Cosine Sim (LSA)│  │  │
│  │  │  Fuzzy Skill Matching (6-layer cascade + alias map) │  │  │
│  │  │  Experience S-curve │ Location token scoring        │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  parse_jd() │ generate_recruiter_msg() │ analyze_chat()    │  │
│  │  simulate_candidate_response() │ generate_shortlist_summary│  │
│  └─────────────────────────┬──────────────────────────────────┘  │
│                            │ HTTPS (for JD parsing & chat only) │
└────────────────────────────│────────────────────────────────────┘
                             │
              ┌──────────────▼────────────────┐
              │   Google Gemini 2.5 Flash API  │
              │  (JD parsing, chat, summaries) │
              └───────────────────────────────┘
                             │
              ┌──────────────▼────────────────┐
              │     MongoDB (Motor Async)      │
              │  candidates │ chats │ jds      │
              └───────────────────────────────┘
```

---

## 🔬 Matching Engine — How It Works

The candidate matching system is **entirely local** — no API calls, no latency. It runs five layers of scoring on every candidate in the database against the parsed JD.

### Layer 1 — Fuzzy Skill Matching with Alias Resolution

Each JD skill is compared against every candidate skill using a **6-layer cascade**:

| Layer | Method | Score Range |
|---|---|---|
| L1 | Exact string match | 1.0 |
| L2 | Canonical alias group (e.g. `react` = `reactjs` = `react.js`) | 1.0 |
| L3 | Substring containment (penalised by length ratio) | 0.75–0.90 |
| L4 | `SequenceMatcher` ratio ≥ 0.85 | 0.0–0.88 |
| L5 | Token (word) overlap ≥ 0.5 | 0.60–0.85 |
| L6 | Character bigram Jaccard similarity ≥ 0.55 | 0.0–0.75 |

A **skill alias table** of 50+ technology groups (Python, React, Kubernetes, etc.) maps synonyms and abbreviations to a canonical key before any fuzzy comparison, ensuring `golang` matches `go`, `k8s` matches `kubernetes`, `pg` matches `postgresql`, and so on.

**Skill sub-score breakdown:**
- Required skills → 75% weight (partial credit for fuzzy matches)
- Nice-to-have skills → 15% bonus
- Extra skills (breadth bonus) → up to +10 pts

### Layer 2 — LSA Semantic Similarity (TF-IDF + Cosine Similarity)

The JD and candidate profile are each converted to rich text representations, then scored via **Latent Semantic Analysis**:

1. **TF-IDF Vectorisation** — unigrams and bigrams, sublinear TF, covering skills, role, bio, responsibilities, and location.
2. **TruncatedSVD** — reduces the TF-IDF matrix to a dense topic space (up to 30 components).
3. **Cosine Similarity** — measures the angular distance between JD and candidate vectors in that topic space.

LSA captures **synonym and concept overlap** beyond exact token matching — e.g. a candidate with "Django REST Framework" will score well against a JD asking for "Python backend APIs" even if the wording differs.

The final skills component blends both approaches:
```
Skills Score = (Fuzzy Score × 0.75) + (LSA Score × 0.25)
```

### Layer 3 — Experience Scoring (S-curve)

A smooth S-curve that avoids hard cliffs:

| Candidate Experience | Score |
|---|---|
| ≥ required years | 100 |
| 80–100% of required | 85–100 |
| 50–80% of required | 60–85 |
| < 50% of required | 0–60 |
| Overqualified (>1.5×) | still 100 |

### Layer 4 — Location Scoring

| Match Type | Score |
|---|---|
| Remote in JD or candidate | 100 |
| Hybrid JD | 90 |
| Same city/country tokens | 100 |
| Same country only | 70 |
| No match | 40 |

### Final Score Weights

```
Final Match Score = (Skills Score × 0.60)
                  + (Experience Score × 0.25)
                  + (Location Score × 0.15)

Overall Candidate Score = (Match Score × 0.60)
                        + (Interest Score × 0.40)
```

---

## 🧠 AI-Powered Features (Gemini 2.5 Flash)

Only three operations call the Gemini API:

| Function | Trigger | Purpose |
|---|---|---|
| `parse_jd()` | On JD upload | Extracts structured fields (role, skills, experience, salary, location) from raw text |
| `generate_recruiter_message()` + `simulate_candidate_response()` | On chat init/simulate | Personalized outreach and realistic candidate replies |
| `analyze_chat_and_score()` | After every message | Scores interest signals, salary alignment, availability, and returns a shortlist decision |

> A built-in rate limiter (`asyncio.Semaphore(2)` + 4-second minimum gap) and exponential backoff handle Gemini's quota limits automatically. If no API key is set, the app runs in **demo mode** with mock responses.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Axios, Lucide React |
| Backend | FastAPI, Python 3.9+, Uvicorn |
| Matching Engine | scikit-learn (TF-IDF, TruncatedSVD, cosine similarity), difflib |
| Database | MongoDB (async via Motor) |
| AI Model | Google Gemini 2.5 Flash |
| HTTP Client | HTTPX (async) |
| Data Validation | Pydantic v2 |

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js v18+
- Python 3.9+
- MongoDB running on `localhost:27017`
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

---

### 1. Clone the Repository

```bash
git clone https://github.com/NAGAPAVAN1234/AI-Talent-Scouting.git
cd AI-Talent-Scouting
```

---

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate       # macOS/Linux
# venv\Scripts\activate        # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Edit .env and set your Gemini API key:
# GEMINI_API_KEY=your_api_key_here
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=talent_scout

# Seed the database with 8 sample candidates
python seed.py

# Start the backend server
python main.py
```

Backend will be available at: `http://localhost:8000`

---

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

npm install
npm run dev
```

Frontend will be available at: `http://localhost:5173`

---

## 📖 Demo Flow

1. Open `http://localhost:5173` (Recruiter Dashboard)
2. Paste a Job Description in the text area (see sample below)
3. Click **"Parse JD with AI"** — Gemini extracts structured requirements
4. Click **"Find Top Candidates"** — the local matching engine scores all candidates instantly (no API call)
5. View ranked results with match scores, skill breakdowns, and LSA semantic scores
6. Click **"Engage Candidate"** on any result to open the AI chat
7. Click **"Simulate Reply"** to see the AI respond as that candidate
8. Watch the **Interest Score** and **Decision** update in real time
9. Navigate to `/shortlist` to see the full ranked shortlist

---

## 📝 Sample Inputs & Outputs

### Sample JD Input

```
We are looking for a Senior Full-Stack Engineer with 4+ years of experience.
Requirements:
- Strong proficiency in React and Python
- Experience with FastAPI or Django
- Knowledge of MongoDB or PostgreSQL
- Familiarity with Docker and cloud deployments (AWS/GCP)
- Nice to have: TypeScript, Redis, Kubernetes
Location: Remote | Salary: $120k-$150k
```

### Sample Match Output

```json
{
  "results": [
    {
      "rank": 1,
      "candidate": { "name": "Priya Sharma", "experience_years": 6.0 },
      "match_score": 92,
      "score_breakdown": {
        "skills_score": 95,
        "fuzzy_skill_score": 94,
        "lsa_score": 88,
        "required_pct": 96,
        "nth_pct": 60,
        "extra_bonus": 8.5,
        "experience_score": 100,
        "location_score": 100,
        "overall": 92
      },
      "matched_skills": ["python", "react", "docker", "postgresql", "redis"],
      "missing_skills": ["typescript"],
      "explanation": "Matched: python, react, docker, postgresql, redis. Missing: typescript. Exp: 6 yrs (req 4 yrs). Required coverage: 96% | Nice-to-have: 60%.",
      "interest_score": 88,
      "final_score": 90.7
    }
  ],
  "summary": "Priya Sharma is the standout candidate with a 90.7 final score — schedule a technical screen immediately."
}
```

### Sample Chat & Interest Score

```
RECRUITER: Hi Priya! I came across your profile and was really impressed by your 
           Python and React background. We have a Senior Full-Stack role at a 
           fast-growing startup — would you be open to a quick chat?

CANDIDATE: Thanks for reaching out! This sounds interesting. I'm currently at 
           FinTech Inc but open to the right opportunity. Could you tell me more 
           about the tech stack and team size? Also, is this fully remote?

→ Interest Score: 85 | Decision: Shortlist
→ Recruiter Tip: "Schedule a technical screen — candidate is actively exploring."
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/upload-jd` | Parse a job description with AI |
| GET | `/api/jds` | List JD history |
| POST | `/api/match` | Match candidates against a parsed JD (local, zero API calls) |
| GET | `/api/candidates` | List all candidates |
| POST | `/api/candidates` | Add a new candidate |
| GET | `/api/candidates/{id}` | Get a specific candidate |
| DELETE | `/api/candidates/{id}` | Remove a candidate |
| POST | `/api/login` | Candidate login by name |
| POST | `/api/chat/init` | Start AI recruiter outreach |
| POST | `/api/chat/reply` | Send candidate reply |
| POST | `/api/chat/simulate` | AI simulates candidate response |
| GET | `/api/chat/{id}` | Get chat history |
| DELETE | `/api/chat/{id}` | Reset a chat session |
| GET | `/api/shortlist` | Get interest-ranked shortlist |

---

## 🗂️ Project Structure

```
ai-talent-scout/
├── backend/
│   ├── main.py          # FastAPI app, CORS, startup seed
│   ├── routers.py       # All API route handlers
│   ├── services.py      # AI + local matching logic
│   │                    #   ├── calculate_match_local() — TF-IDF + LSA + fuzzy
│   │                    #   ├── _skill_similarity()     — 6-layer cascade
│   │                    #   ├── _lsa_score()            — TruncatedSVD cosine sim
│   │                    #   ├── _experience_score()     — S-curve
│   │                    #   └── _call_gemini()          — rate-limited API helper
│   ├── models.py        # Pydantic data models
│   ├── database.py      # MongoDB Motor client setup
│   ├── seed.py          # Sample candidate data seeder
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── RecruiterDashboard.jsx
    │   │   ├── CandidatePortal.jsx
    │   │   └── Shortlist.jsx
    │   ├── components/
    │   │   ├── ChatWindow.jsx
    │   │   ├── CandidateCard.jsx
    │   │   └── JDParser.jsx
    │   └── App.jsx
    ├── package.json
    └── vite.config.js
```

---

## 🌱 Sample Candidates (Pre-seeded)

The database is auto-seeded with 8 diverse candidates on first run:

| Name | Role | Experience | Skills |
|---|---|---|---|
| Alice Johnson | Senior Backend Developer | 4.5 yrs | Python, React, MongoDB, FastAPI, Docker |
| Bob Smith | Junior Software Engineer | 2.0 yrs | Java, Spring Boot, SQL, Kafka |
| Charlie Davis | Lead Frontend Engineer | 5.0 yrs | React, Node.js, TypeScript, GraphQL, AWS |
| Diana Prince | ML Engineer | 3.0 yrs | Python, PyTorch, FastAPI, NLP |
| Evan Wright | Frontend Developer | 1.5 yrs | HTML, CSS, Vue.js, Figma |
| Priya Sharma | Senior Software Engineer | 6.0 yrs | Python, Django, React, PostgreSQL, Redis |
| Marcus Lee | Staff DevOps Engineer | 7.0 yrs | Go, Kubernetes, Terraform, AWS, GCP |
| Sophia Chen | Data Scientist | 4.0 yrs | Python, R, Spark, Tableau, ML |

To force re-seed: `python seed.py --force`

---

## 🔑 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | *(required)* | Your Google Gemini API key |
| `MONGO_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `DB_NAME` | `talent_scout` | Database name |

> **Note:** Without a `GEMINI_API_KEY`, the app runs in **demo mode** with mock AI responses, so you can still explore the full UI and flow. The local matching engine always works regardless of API key status.

---

## 📹 Demo Video

[▶ Watch 4-minute walkthrough](https://your-demo-link.com)

Topics covered:
- Pasting and parsing a real JD
- Reviewing matched candidates with TF-IDF + LSA score breakdowns
- Simulating AI chat and watching Interest Score update live
- Viewing the final ranked shortlist

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

*Built for the AI Talent Scouting Challenge · Powered by Google Gemini 2.5 Flash + scikit-learn LSA*
