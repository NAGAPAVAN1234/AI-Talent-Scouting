from fastapi import APIRouter, HTTPException, Body, Query
from fastapi.responses import JSONResponse
from typing import List, Optional
from database import candidates_collection, chats_collection, jds_collection
from models import (
    CandidateCreate, CandidateInDB, JDUpload, MatchResult,
    Message, ChatSession, CandidateLogin, ChatReply, SimulateRequest
)
import services
from services import calculate_match_local
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter()


def _str_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


# ── Candidates ────────────────────────────────────────────────────────────────
@router.post("/api/candidates", response_model=CandidateInDB)
async def create_candidate(candidate: CandidateCreate):
    candidate_dict = candidate.dict()
    result = await candidates_collection.insert_one(candidate_dict)
    candidate_dict["_id"] = str(result.inserted_id)
    return candidate_dict


@router.post("/api/login", response_model=CandidateInDB)
async def login_candidate(login_data: CandidateLogin):
    candidate = await candidates_collection.find_one({"name": login_data.name})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return _str_id(candidate)


@router.get("/api/candidates", response_model=List[CandidateInDB])
async def get_candidates():
    candidates = []
    async for c in candidates_collection.find():
        candidates.append(_str_id(c))
    return candidates


@router.get("/api/candidates/{candidate_id}", response_model=CandidateInDB)
async def get_candidate(candidate_id: str):
    try:
        c = await candidates_collection.find_one({"_id": ObjectId(candidate_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid candidate ID")
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return _str_id(c)


@router.delete("/api/candidates/{candidate_id}")
async def delete_candidate(candidate_id: str):
    try:
        res = await candidates_collection.delete_one({"_id": ObjectId(candidate_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid candidate ID")
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "Candidate deleted"}


# ── JD Parsing ────────────────────────────────────────────────────────────────
@router.post("/api/upload-jd")
async def upload_jd(jd: JDUpload):
    parsed_jd = await services.parse_jd(jd.jd_text)
    jd_doc = {
        "raw_text": jd.jd_text,
        "parsed": parsed_jd,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await jds_collection.insert_one(jd_doc)
    parsed_jd["jd_id"] = str(result.inserted_id)
    return {"parsed_jd": parsed_jd}


@router.get("/api/jds")
async def get_jd_history(limit: int = Query(default=10)):
    jds = []
    async for jd in jds_collection.find().sort("created_at", -1).limit(limit):
        jd["_id"] = str(jd["_id"])
        jds.append(jd)
    return jds


# ── Matching (Local TF-IDF, Zero API calls) ───────────────────────────────────
@router.post("/api/match")
async def match_candidates(parsed_jd: dict = Body(...)):
    candidates = []
    async for c in candidates_collection.find():
        candidates.append(_str_id(c))

    if not candidates:
        return {"results": [], "summary": "No candidates in database."}

    results = []
    for candidate in candidates:
        match_result = calculate_match_local(parsed_jd, candidate)

        candidate_id = candidate["_id"]  # already a string after _str_id()

        # ✅ Try both string ID and ObjectId to find the chat
        chat = await chats_collection.find_one({"candidate_id": candidate_id})
        if not chat:
            # Fallback: some chats stored with ObjectId instead of string
            try:
                chat = await chats_collection.find_one(
                    {"candidate_id": ObjectId(candidate_id)}
                )
            except Exception:
                pass

        interest_score = 0.0
        chat_summary = None
        if chat:
            chat_summary = chat.get("summary") or {}
            interest_score = float(chat_summary.get("interest_score", 0.0)) if chat_summary else 0.0

        match_score = match_result.get("match_score", 0)
        final_score = round((0.6 * match_score) + (0.4 * interest_score), 1)

        results.append({
            "candidate": candidate,
            "match_score": match_score,
            "score_breakdown": match_result.get("score_breakdown", {}),
            "explanation": match_result.get("explanation", ""),
            "matched_skills": match_result.get("matched_skills", []),
            "missing_skills": match_result.get("missing_skills", []),
            "interest_score": interest_score,
            "final_score": final_score,
            "chat_summary": chat_summary
        })

    results.sort(key=lambda x: x["final_score"], reverse=True)
    top = results[:5]
    for i, r in enumerate(top):
        r["rank"] = i + 1

    summary = await services.generate_shortlist_summary(top)
    return {"results": top, "summary": summary}


# ── Chat ──────────────────────────────────────────────────────────────────────
@router.post("/api/chat/init")
async def init_chat(
    candidate_id: str = Body(...),
    role: str = Body(...),
    jd_context: Optional[dict] = Body(default=None)
):
    try:
        candidate = await candidates_collection.find_one({"_id": ObjectId(candidate_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid candidate ID")
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate = _str_id(candidate)

    recruiter_msg = await services.generate_recruiter_message(candidate, role, jd_context)

    now = datetime.now(timezone.utc).isoformat()
    new_message = {"sender": "recruiter", "text": recruiter_msg, "timestamp": now}

    # ✅ Always use string candidate_id for consistent lookup
    str_candidate_id = str(candidate["_id"])

    chat = await chats_collection.find_one({"candidate_id": str_candidate_id})
    if not chat:
        chat = {
            "candidate_id": str_candidate_id,   # ✅ always string
            "messages": [new_message],
            "summary": None,
            "created_at": now
        }
        await chats_collection.insert_one(chat)
    else:
        chat["messages"].append(new_message)
        await chats_collection.update_one(
            {"candidate_id": str_candidate_id},
            {"$set": {"messages": chat["messages"]}}
        )

    summary = await services.analyze_chat_and_score(chat["messages"], candidate)
    chat["summary"] = summary
    await chats_collection.update_one(
        {"candidate_id": str_candidate_id},
        {"$set": {"summary": summary}}
    )

    chat["_id"] = str(chat.get("_id", ""))
    return {"chat": chat}

@router.post("/api/chat/reply")
async def reply_chat(reply: ChatReply):
    try:
        candidate = await candidates_collection.find_one({"_id": ObjectId(reply.candidate_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid candidate ID")
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate = _str_id(candidate)

    str_candidate_id = str(candidate["_id"])   # ✅ consistent string

    chat = await chats_collection.find_one({"candidate_id": str_candidate_id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found. Initiate chat first.")

    now = datetime.now(timezone.utc).isoformat()
    chat["messages"].append({"sender": "candidate", "text": reply.text, "timestamp": now})

    summary = await services.analyze_chat_and_score(chat["messages"], candidate)
    chat["summary"] = summary

    await chats_collection.update_one(
        {"candidate_id": str_candidate_id},
        {"$set": {"messages": chat["messages"], "summary": summary}}
    )
    chat["_id"] = str(chat["_id"])
    return {"chat": chat}


@router.post("/api/chat/simulate")
async def simulate_reply(req: SimulateRequest):
    try:
        candidate = await candidates_collection.find_one({"_id": ObjectId(req.candidate_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid candidate ID")
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate = _str_id(candidate)

    str_candidate_id = str(candidate["_id"])   # ✅ consistent string

    chat = await chats_collection.find_one({"candidate_id": str_candidate_id})
    messages = chat["messages"] if chat else []

    simulated_text = await services.simulate_candidate_response(candidate, messages, req.role)

    now = datetime.now(timezone.utc).isoformat()
    sim_message = {"sender": "candidate", "text": simulated_text, "timestamp": now}
    if chat:
        chat["messages"].append(sim_message)
        summary = await services.analyze_chat_and_score(chat["messages"], candidate)
        await chats_collection.update_one(
            {"candidate_id": str_candidate_id},
            {"$set": {"messages": chat["messages"], "summary": summary}}
        )
        chat["summary"] = summary
        chat["_id"] = str(chat["_id"])
        return {"chat": chat, "simulated_reply": simulated_text}

    return {"simulated_reply": simulated_text}

@router.get("/api/chat/{candidate_id}")
async def get_chat(candidate_id: str):
    chat = await chats_collection.find_one({"candidate_id": candidate_id})
    if not chat:
        return {"messages": [], "summary": None}
    chat["_id"] = str(chat["_id"])
    return chat


@router.delete("/api/chat/{candidate_id}")
async def reset_chat(candidate_id: str):
    await chats_collection.delete_one({"candidate_id": candidate_id})
    return {"message": "Chat reset successfully"}


# ── Shortlist ─────────────────────────────────────────────────────────────────
@router.get("/api/shortlist")
async def get_shortlist():
    candidates = []
    async for c in candidates_collection.find():
        candidates.append(_str_id(c))

    shortlist = []
    for c in candidates:
        chat = await chats_collection.find_one({"candidate_id": c["_id"]})
        interest_score = 0.0
        decision = "Pending"
        tip = ""
        if chat and chat.get("summary"):
            interest_score = chat["summary"].get("interest_score", 0.0)
            decision = chat["summary"].get("final_decision", "Pending")
            tip = chat["summary"].get("recruiter_tip", "")

        shortlist.append({
            "candidate": c,
            "interest_score": interest_score,
            "decision": decision,
            "recruiter_tip": tip
        })

    shortlist.sort(key=lambda x: x["interest_score"], reverse=True)
    return shortlist