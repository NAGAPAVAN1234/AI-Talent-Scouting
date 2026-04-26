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
| 🔍 Candidate Matching | Multi-dimension scoring: skills, experience, location, with explanations |
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
│  │  parse_jd() │ calculate_match() │ generate_recruiter_msg() │  │
│  │  simulate_candidate_response() │ analyze_chat_and_score()  │  │
│  └─────────────────────────┬──────────────────────────────────┘  │
│                            │ HTTPS                              │
└────────────────────────────│────────────────────────────────────┘
                             │
              ┌──────────────▼────────────────┐
              │   Google Gemini 2.5 Flash API  │
              └───────────────────────────────┘
                             │
              ┌──────────────▼────────────────┐
              │     MongoDB (Motor Async)      │
              │  candidates │ chats │ jds      │
              └───────────────────────────────┘
```

### Scoring Logic

```
Final Score = (0.6 × Match Score) + (0.4 × Interest Score)

Match Score (0-100):
  ├── Skills Match:      Does candidate have required skills?
  ├── Experience Match:  Years of experience vs. requirement?
  └── Location Match:    Remote / same city / flexible?

Interest Score (0-100):
  ├── Engagement depth:  Length and quality of chat responses
  ├── Enthusiasm signals: Positive language, questions asked
  ├── Salary alignment:  Expected salary vs. JD range
  └── Availability:      Notice period and urgency
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Axios, Lucide React |
| Backend | FastAPI, Python 3.9+, Uvicorn |
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
git clone https://github.com/your-username/ai-talent-scout.git
cd ai-talent-scout
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
cp .env.example .env
# Edit .env and set your Gemini API key:
# GEMINI_API_KEY=your_api_key_here
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=talent_scout

# Seed the database with 8 sample candidates
python seed.py

# Start the backend server
uvicorn main:app --reload --port 8000
# Alternative: python main.py
```

Backend will be available at: `http://localhost:8000`  
API docs (Swagger UI): `http://localhost:8000/docs`

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
4. Click **"Find Top Candidates"** — matching engine scores all candidates
5. View ranked results with match scores and skill breakdowns
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
        "skills_match": 95,
        "experience_match": 90,
        "location_match": 95,
        "overall": 92
      },
      "matched_skills": ["Python", "React", "Docker", "PostgreSQL", "Redis"],
      "missing_skills": ["TypeScript"],
      "explanation": "Priya's 6 years of full-stack Python + React experience at a FinTech firm is an excellent match. She has Docker and Redis skills and is available remotely.",
      "interest_score": 88,
      "final_score": 90.7
    }
  ],
  "summary": "Priya Sharma is the standout candidate with a 90.7 final score — schedule a technical screen immediately. Alice Johnson is a strong backup with solid FastAPI experience."
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
| POST | `/api/match` | Match candidates against a parsed JD |
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
│   ├── services.py      # AI logic (Gemini calls, scoring)
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

> **Note:** Without a `GEMINI_API_KEY`, the app runs in **demo mode** with mock AI responses, so you can still explore the full UI and flow.

---

## 📹 Demo Video

[▶ Watch 4-minute walkthrough](https://your-demo-link.com)

Topics covered:
- Pasting and parsing a real JD
- Reviewing matched candidates with score breakdowns
- Simulating AI chat and watching Interest Score update live
- Viewing the final ranked shortlist

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

*Built for the AI Talent Scouting Challenge · Powered by Google Gemini 2.5 Flash*