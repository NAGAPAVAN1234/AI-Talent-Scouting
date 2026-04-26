from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any


# ── Candidate Models ───────────────────────────────────────────────────────────
class CandidateBase(BaseModel):
    name: str
    skills: List[str]
    experience_years: float
    location: str
    expected_salary: str
    notice_period: str
    email: Optional[str] = ""
    bio: Optional[str] = ""
    current_role: Optional[str] = ""
    education: Optional[str] = ""
    portfolio_url: Optional[str] = ""

    @field_validator("skills", mode="before")
    @classmethod
    def normalize_skills(cls, v):
        """Lowercase, strip, and deduplicate all incoming skills automatically."""
        seen, result = set(), []
        for skill in (v or []):
            n = skill.strip().lower()
            if n and n not in seen:
                seen.add(n)
                result.append(n)
        return result


class CandidateCreate(CandidateBase):
    pass


class CandidateInDB(CandidateBase):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True


# ── JD Models ──────────────────────────────────────────────────────────────────
class JDUpload(BaseModel):
    jd_text: str


class ParsedJD(BaseModel):
    role: str
    skills: List[str]
    experience_years: float
    location: Optional[str] = ""
    salary_range: Optional[str] = ""
    responsibilities: Optional[List[str]] = []
    nice_to_have: Optional[List[str]] = []

    @field_validator("skills", "nice_to_have", mode="before")
    @classmethod
    def normalize_skills(cls, v):
        seen, result = set(), []
        for skill in (v or []):
            n = skill.strip().lower()
            if n and n not in seen:
                seen.add(n)
                result.append(n)
        return result


# ── Scoring Models ─────────────────────────────────────────────────────────────
class ScoreBreakdown(BaseModel):
    skills_score: float = 0.0
    fuzzy_skill_score: float = 0.0
    lsa_score: float = 0.0
    required_pct: float = 0.0
    nth_pct: float = 0.0
    extra_bonus: float = 0.0
    experience_score: float = 0.0
    location_score: float = 0.0
    overall: float = 0.0


class MatchResult(BaseModel):
    candidate: CandidateInDB
    match_score: float
    score_breakdown: Optional[ScoreBreakdown] = None
    explanation: str
    matched_skills: Optional[List[str]] = []
    missing_skills: Optional[List[str]] = []
    interest_score: float = 0.0
    final_score: float = 0.0
    rank: Optional[int] = None
    chat_summary: Optional[Dict[str, Any]] = None


# ── Chat Models ────────────────────────────────────────────────────────────────
class Message(BaseModel):
    sender: str
    text: str
    timestamp: Optional[str] = ""


class ChatSession(BaseModel):
    candidate_id: str
    messages: List[Message]
    summary: Optional[Dict[str, Any]] = None


class CandidateLogin(BaseModel):
    name: str


class ChatReply(BaseModel):
    candidate_id: str
    text: str


class SimulateRequest(BaseModel):
    candidate_id: str
    role: str


# ── Shortlist Export ───────────────────────────────────────────────────────────
class ShortlistEntry(BaseModel):
    rank: int
    candidate_name: str
    match_score: float
    interest_score: float
    final_score: float
    decision: str
    explanation: str