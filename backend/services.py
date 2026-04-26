import os
import re
import json
import asyncio
import httpx
import numpy as np
from datetime import datetime
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
from difflib import SequenceMatcher

load_dotenv()

api_key    = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = "gemini-2.5-flash"
API_URL    = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={api_key}"

# ── Rate Limit Controls ────────────────────────────────────────────────────────
_gemini_semaphore = asyncio.Semaphore(2)
_last_call_time: float = 0.0
_MIN_GAP: float = 4.0


# ═══════════════════════════════════════════════════════════════════════════════
# SKILL ALIAS & SYNONYM TABLE
# ═══════════════════════════════════════════════════════════════════════════════

SKILL_ALIASES: dict[str, set] = {
    # Languages
    "python":        {"python", "python3", "py", "python2"},
    "javascript":    {"javascript", "js", "es6", "es2015", "es2020", "ecmascript"},
    "typescript":    {"typescript", "ts"},
    "java":          {"java", "java8", "java11", "java17"},
    "go":            {"go", "golang"},
    "ruby":          {"ruby", "ruby on rails", "rails", "ror"},
    "rust":          {"rust", "rust-lang"},
    "csharp":        {"c#", "csharp", "c sharp", ".net", "dotnet", "asp.net"},
    "cpp":           {"c++", "cpp", "c plus plus"},
    "swift":         {"swift", "swiftui"},
    "kotlin":        {"kotlin", "kotlin android"},
    "php":           {"php", "php8", "laravel", "symfony"},
    "scala":         {"scala", "akka"},
    "r":             {"r", "r language", "rlang"},
    # Frontend
    "react":         {"react", "reactjs", "react.js", "react js", "react native"},
    "vue":           {"vue", "vuejs", "vue.js", "vue js", "vue3"},
    "angular":       {"angular", "angularjs", "angular.js", "angular2+"},
    "nextjs":        {"next.js", "nextjs", "next js"},
    "nuxt":          {"nuxt", "nuxtjs", "nuxt.js"},
    "svelte":        {"svelte", "sveltekit"},
    "html":          {"html", "html5"},
    "css":           {"css", "css3", "scss", "sass", "less", "tailwind", "tailwindcss"},
    # Backend frameworks
    "fastapi":       {"fastapi", "fast api", "fast-api"},
    "django":        {"django", "django rest framework", "drf", "django-rest"},
    "flask":         {"flask", "flask-restful"},
    "express":       {"express", "expressjs", "express.js"},
    "spring":        {"spring", "spring boot", "springboot", "spring framework"},
    "nestjs":        {"nestjs", "nest.js", "nest js"},
    # Databases
    "postgres":      {"postgresql", "postgres", "psql", "pg"},
    "mysql":         {"mysql", "mariadb"},
    "mongo":         {"mongodb", "mongo", "mongoose"},
    "redis":         {"redis", "redis cache"},
    "sql":           {"sql", "mysql", "postgresql", "sqlite", "t-sql", "pl/sql"},
    "nosql":         {"nosql", "mongodb", "dynamodb", "cassandra", "couchdb"},
    "elasticsearch": {"elasticsearch", "elastic search", "elk", "opensearch"},
    "cassandra":     {"cassandra", "apache cassandra"},
    "dynamodb":      {"dynamodb", "aws dynamodb"},
    # Cloud
    "aws":           {"aws", "amazon web services", "amazon aws", "ec2", "s3", "lambda"},
    "gcp":           {"gcp", "google cloud", "google cloud platform", "gke"},
    "azure":         {"azure", "microsoft azure", "azure cloud"},
    # DevOps & infra
    "docker":        {"docker", "dockerfile", "docker compose", "docker-compose", "containers"},
    "k8s":           {"kubernetes", "k8s", "kubectl", "helm", "kube"},
    "terraform":     {"terraform", "terragrunt", "iac", "infrastructure as code"},
    "ansible":       {"ansible", "ansible playbook"},
    "cicd":          {"ci/cd", "cicd", "ci cd", "github actions", "jenkins", "gitlab ci",
                      "circleci", "travis ci", "bitbucket pipelines"},
    "linux":         {"linux", "ubuntu", "debian", "centos", "bash", "shell scripting",
                      "unix", "bash scripting"},
    "nginx":         {"nginx", "apache", "reverse proxy"},
    # Data / ML / AI
    "ml":            {"machine learning", "ml", "supervised learning", "unsupervised learning"},
    "ai":            {"artificial intelligence", "ai", "deep learning", "dl"},
    "nlp":           {"nlp", "natural language processing", "text mining", "spacy", "nltk"},
    "pytorch":       {"pytorch", "torch"},
    "tensorflow":    {"tensorflow", "tf", "keras"},
    "pandas":        {"pandas", "dataframes"},
    "spark":         {"spark", "apache spark", "pyspark", "databricks"},
    "tableau":       {"tableau", "power bi", "looker", "data visualization"},
    # APIs & protocols
    "rest":          {"rest", "restful", "rest api", "restful api", "rest apis"},
    "graphql":       {"graphql", "graph ql", "apollo"},
    "grpc":          {"grpc", "protocol buffers", "protobuf"},
    "websockets":    {"websockets", "ws", "socket.io"},
    # Messaging
    "kafka":         {"kafka", "apache kafka", "confluent kafka"},
    "rabbitmq":      {"rabbitmq", "rabbit mq", "amqp"},
    "celery":        {"celery", "task queue", "worker queue"},
    # Testing
    "testing":       {"testing", "unit testing", "tdd", "bdd", "pytest", "jest",
                      "mocha", "cypress", "selenium", "junit"},
    # Other
    "git":           {"git", "github", "gitlab", "bitbucket", "version control"},
    "microservices": {"microservices", "micro services", "soa", "service oriented"},
    "node":          {"node", "nodejs", "node.js"},
    "figma":         {"figma", "sketch", "adobe xd", "design tools"},
}

# Reverse map: every alias → canonical key
_ALIAS_MAP: dict[str, str] = {}
for _canonical, _aliases in SKILL_ALIASES.items():
    for _alias in _aliases:
        _ALIAS_MAP[_alias.lower().strip()] = _canonical


# ═══════════════════════════════════════════════════════════════════════════════
# NORMALIZATION
# ═══════════════════════════════════════════════════════════════════════════════

def normalize_skills(skills: list[str]) -> list[str]:
    """Lowercase + strip + deduplicate. Used at data-ingestion time."""
    seen, result = set(), []
    for s in skills:
        n = s.strip().lower()
        if n and n not in seen:
            seen.add(n)
            result.append(n)
    return result


def _to_canonical(skill: str) -> str:
    return _ALIAS_MAP.get(skill.lower().strip(), skill.lower().strip())


# ═══════════════════════════════════════════════════════════════════════════════
# PER-SKILL FUZZY SIMILARITY  (5-layer cascade)
# ═══════════════════════════════════════════════════════════════════════════════

def _char_bigrams(s: str) -> set[str]:
    return {s[i:i + 2] for i in range(len(s) - 1)}


def _skill_similarity(a: str, b: str) -> float:
    """
    Returns 0.0–1.0 confidence that two skills refer to the same technology.

    Layer 1 — Exact string match          → 1.0
    Layer 2 — Same canonical alias group  → 1.0
    Layer 3 — Substring containment       → 0.75–0.90
    Layer 4 — SequenceMatcher ratio       → 0.0–0.88  (only if ≥0.85)
    Layer 5 — Token (word) overlap        → 0.60–0.85 (only if ≥0.5 overlap)
    Layer 6 — Character bigram Jaccard    → 0.0–0.75  (only if ≥0.55 Jaccard)
    """
    a, b = a.lower().strip(), b.lower().strip()
    if not a or not b:
        return 0.0

    # L1 — exact
    if a == b:
        return 1.0

    # L2 — canonical alias
    ca, cb = _to_canonical(a), _to_canonical(b)
    if ca == cb:
        return 1.0

    # L3 — substring containment (penalise long mismatches)
    if a in b or b in a:
        shorter = min(len(a), len(b))
        longer  = max(len(a), len(b))
        return round(0.75 + (shorter / longer) * 0.15, 3)

    # L4 — SequenceMatcher
    sm = SequenceMatcher(None, a, b).ratio()
    if sm >= 0.85:
        return round(sm * 0.88, 3)

    # L5 — token overlap
    ta, tb = set(a.split()), set(b.split())
    if ta and tb:
        ov = len(ta & tb) / max(len(ta), len(tb))
        if ov >= 0.5:
            return round(0.60 + ov * 0.25, 3)

    # L6 — bigram Jaccard
    ba, bb = _char_bigrams(a), _char_bigrams(b)
    if ba and bb:
        j = len(ba & bb) / len(ba | bb)
        if j >= 0.55:
            return round(j * 0.75, 3)

    return 0.0


def _best_skill_match(
    jd_skill: str,
    cand_skills: list[str],
    threshold: float = 0.70,
) -> tuple[float, str | None]:
    """Best-match score + which candidate skill matched."""
    best_score, best_skill = 0.0, None
    jd_can = _to_canonical(jd_skill)

    for cs in cand_skills:
        # Fast canonical shortcut
        if jd_can == _to_canonical(cs):
            return 1.0, cs
        score = _skill_similarity(jd_skill, cs)
        if score > best_score:
            best_score, best_skill = score, cs

    return (best_score, best_skill) if best_score >= threshold else (0.0, None)


# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-TIER SKILL SCORE
# ═══════════════════════════════════════════════════════════════════════════════

def _compute_skill_scores(jd_parsed: dict, candidate: dict) -> dict:
    """
    Required skills  → 75% of skill sub-score (partial credit for fuzzy)
    Nice-to-have     → 15% bonus
    Extra skills     → up to +10 pts breadth bonus
    """
    required    = jd_parsed.get("skills", [])
    nth         = jd_parsed.get("nice_to_have", [])
    cand        = candidate.get("skills", [])

    matched_skills  = []
    missing_skills  = []
    partial_details = []

    # ── Required ────────────────────────────────────────────────────────────────
    req_weighted = 0.0
    for jd_skill in required:
        score, matched = _best_skill_match(jd_skill, cand, threshold=0.70)
        if score >= 1.0:
            matched_skills.append(matched)
            req_weighted += 1.0
        elif score >= 0.70:
            matched_skills.append(matched)
            partial_details.append(f"{matched}≈{jd_skill}({int(score*100)}%)")
            req_weighted += score
        else:
            missing_skills.append(jd_skill)

    required_pct = (req_weighted / len(required) * 100) if required else 100.0

    # ── Nice-to-have ────────────────────────────────────────────────────────────
    nth_weighted = 0.0
    for skill in nth:
        score, _ = _best_skill_match(skill, cand, threshold=0.70)
        if score >= 0.70:
            nth_weighted += score
    nth_pct = (nth_weighted / len(nth) * 100) if nth else 0.0

    # ── Extra skills breadth bonus (capped at 10 pts) ───────────────────────────
    all_jd = required + nth
    extra = sum(
        1 for cs in cand
        if not any(_best_skill_match(js, [cs], 0.70)[0] >= 0.70 for js in all_jd)
    )
    extra_bonus = min(extra * 1.5, 10.0)

    final = min(
        round((required_pct * 0.75) + (nth_pct * 0.15) + extra_bonus, 1),
        100.0
    )

    return {
        "skills_score":    final,
        "required_pct":    round(required_pct, 1),
        "nth_pct":         round(nth_pct, 1),
        "extra_bonus":     round(extra_bonus, 1),
        "matched_skills":  list(dict.fromkeys(matched_skills)),
        "missing_skills":  missing_skills,
        "partial_details": partial_details,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LSA SEMANTIC SIMILARITY  (TF-IDF + SVD topic space)
# ═══════════════════════════════════════════════════════════════════════════════

def _build_jd_text(jd: dict) -> str:
    parts = [
        " ".join(jd.get("skills", [])),
        " ".join(jd.get("nice_to_have", [])),
        " ".join(jd.get("responsibilities", [])),
        jd.get("role", ""),
        jd.get("location", ""),
        f"{jd.get('experience_years', 0)} years",
    ]
    return " ".join(p for p in parts if p).lower()


def _build_candidate_text(c: dict) -> str:
    parts = [
        " ".join(c.get("skills", [])),
        c.get("current_role", ""),
        c.get("bio", ""),
        c.get("education", ""),
        f"{c.get('experience_years', 0)} years",
        c.get("location", ""),
    ]
    return " ".join(p for p in parts if p).lower()


def _lsa_score(jd_text: str, cand_text: str) -> float:
    """
    Latent Semantic Analysis cosine similarity.
    TF-IDF (unigrams+bigrams) → SVD → cosine in dense topic space.
    Captures synonyms and conceptual overlap beyond exact tokens.
    Returns 0–100.
    """
    try:
        vec   = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=1)
        tfidf = vec.fit_transform([jd_text, cand_text])
        n_comp = min(30, tfidf.shape[1] - 1)
        if n_comp < 2:
            return round(float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]) * 100, 2)
        svd   = TruncatedSVD(n_components=n_comp, random_state=42)
        lsa   = svd.fit_transform(tfidf)
        score = float(cosine_similarity(lsa[0:1], lsa[1:2])[0][0])
        return round(max(score, 0.0) * 100, 2)
    except Exception:
        return 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# EXPERIENCE & LOCATION
# ═══════════════════════════════════════════════════════════════════════════════

def _experience_score(required: float, actual: float) -> float:
    """
    Smooth S-curve — no hard cliffs.
      actual >= required      → 100
      80%–100% of required    → 85–100   (near-fit range)
      50%–80%  of required    → 60–85    (partial fit)
      < 50%    of required    → 0–60     (underqualified)
    Overqualified (>1.5×) → still 100.
    """
    if required <= 0:
        return 100.0
    if actual >= required:
        return 100.0
    ratio = actual / required
    if ratio >= 0.80:
        return round(85.0 + (ratio - 0.80) * 75.0, 1)
    if ratio >= 0.50:
        return round(60.0 + (ratio - 0.50) * 83.3, 1)
    return round(ratio * 120.0, 1)


def _location_score(jd_location: str, cand_location: str) -> float:
    jd   = jd_location.lower().strip()
    cand = cand_location.lower().strip()
    if not jd:
        return 100.0
    if "remote" in jd or "remote" in cand:
        return 100.0
    if "hybrid" in jd:
        return 90.0
    jd_tok   = set(re.split(r"[\s,/]+", jd))   - {""}
    cand_tok = set(re.split(r"[\s,/]+", cand)) - {""}
    if jd_tok & cand_tok:
        return 100.0
    countries = {"usa", "us", "india", "uk", "canada", "australia", "germany", "france", "singapore"}
    if jd_tok & countries & cand_tok:
        return 70.0
    return 40.0


# ═══════════════════════════════════════════════════════════════════════════════
# MASTER MATCHING FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_match_local(jd_parsed: dict, candidate: dict) -> dict:
    """
    Five-layer local matching. Zero API calls.

    ┌──────────────────────────────────────────────────────────────┐
    │  FINAL SCORE WEIGHTS                                         │
    │    Skills component  60%                                     │
    │    Experience        25%                                     │
    │    Location          15%                                     │
    │                                                              │
    │  SKILLS COMPONENT BLEND                                      │
    │    Fuzzy + alias     75%  (required 75%, nth 15%, extra 10%) │
    │    LSA semantic      25%  (topic-space cosine via SVD)       │
    └──────────────────────────────────────────────────────────────┘
    """

    # Layer 1 — Fuzzy + alias-aware per-skill scoring
    skill_result   = _compute_skill_scores(jd_parsed, candidate)
    fuzzy_score    = skill_result["skills_score"]
    matched_skills = skill_result["matched_skills"]
    missing_skills = skill_result["missing_skills"]

    # Layer 2 — LSA semantic similarity (topic-space cosine)
    lsa = _lsa_score(_build_jd_text(jd_parsed), _build_candidate_text(candidate))

    # Layer 3 — Blend: fuzzy dominates, LSA fills synonym / context gaps
    skills_score = min(round((fuzzy_score * 0.75) + (lsa * 0.25), 1), 100.0)

    # Layer 4 — Experience & location
    exp_score = _experience_score(
        jd_parsed.get("experience_years", 0),
        candidate.get("experience_years", 0)
    )
    loc_score = _location_score(
        jd_parsed.get("location", ""),
        candidate.get("location", "")
    )

    # Layer 5 — Final weighted overall
    overall = round(
        (skills_score * 0.60) +
        (exp_score    * 0.25) +
        (loc_score    * 0.15),
        1
    )

    # Explanation
    matched_str = ", ".join(matched_skills[:5]) or "none"
    missing_str = ", ".join(missing_skills[:3]) or "none"
    partial_str = "; ".join(skill_result["partial_details"][:2])
    explanation = (
        f"Matched: {matched_str}. "
        + (f"Partial: {partial_str}. " if partial_str else "")
        + f"Missing: {missing_str}. "
        + f"Exp: {candidate.get('experience_years')} yrs "
        + f"(req {jd_parsed.get('experience_years')} yrs). "
        + f"Required coverage: {skill_result['required_pct']}% | "
        + f"Nice-to-have: {skill_result['nth_pct']}%."
    )

    return {
        "match_score": overall,
        "score_breakdown": {
            "skills_score":      skills_score,
            "fuzzy_skill_score": fuzzy_score,
            "lsa_score":         lsa,
            "required_pct":      skill_result["required_pct"],
            "nth_pct":           skill_result["nth_pct"],
            "extra_bonus":       skill_result["extra_bonus"],
            "experience_score":  exp_score,
            "location_score":    loc_score,
            "overall":           overall,
        },
        "explanation":    explanation,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# GEMINI HELPER
# ═══════════════════════════════════════════════════════════════════════════════

async def _call_gemini(prompt: str, temperature: float = 0.2) -> str:
    global _last_call_time
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    async with _gemini_semaphore:
        loop = asyncio.get_event_loop()
        gap  = loop.time() - _last_call_time
        if gap < _MIN_GAP:
            await asyncio.sleep(_MIN_GAP - gap)
        _last_call_time = loop.time()

        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature, "maxOutputTokens": 2048}
        }
        async with httpx.AsyncClient(timeout=60) as client:
            for attempt in range(4):
                try:
                    resp = await client.post(API_URL, headers=headers, json=payload)
                    if resp.status_code == 429:
                        wait = 20 * (attempt + 1)
                        print(f"[Gemini] Rate limited – waiting {wait}s")
                        await asyncio.sleep(wait)
                        continue
                    resp.raise_for_status()
                    data = resp.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                except (KeyError, IndexError) as e:
                    print(f"[Gemini] Parse error: {e} | raw: {resp.text[:300]}")
                    return ""
                except httpx.HTTPStatusError as e:
                    print(f"[Gemini] HTTP error {e.response.status_code}")
                    if attempt < 3:
                        await asyncio.sleep(5)
                    continue
    return ""


# ═══════════════════════════════════════════════════════════════════════════════
# JSON HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _safe_json(text: str) -> dict:
    if not text or not text.strip():
        raise ValueError("Empty response from model")
    text = text.strip()
    for fence in ["```json", "```JSON", "```"]:
        text = text.replace(fence, "")
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r'\{[\s\S]*\}', text)
    cand = m.group() if m else text
    try:
        return json.loads(cand)
    except json.JSONDecodeError:
        pass
    repaired = _repair_json(cand)
    if repaired:
        try:
            return json.loads(repaired)
        except json.JSONDecodeError:
            pass
    raise ValueError(f"Could not parse JSON: {text[:300]}")


def _repair_json(text: str) -> str:
    text = text.rstrip().rstrip(",")

    def _in_string(s: str) -> bool:
        in_s, i = False, 0
        while i < len(s):
            if s[i] == "\\" and in_s:
                i += 2; continue
            if s[i] == '"':
                in_s = not in_s
            i += 1
        return in_s

    if _in_string(text):
        text += '"'
    text = re.sub(r',\s*"[^"]*"\s*:\s*$', "", text).rstrip().rstrip(",")
    text += "]" * max(text.count("[") - text.count("]"), 0)
    text += "}" * max(text.count("{") - text.count("}"), 0)
    return text


# ═══════════════════════════════════════════════════════════════════════════════
# JD PARSING
# ═══════════════════════════════════════════════════════════════════════════════

async def parse_jd(jd_text: str) -> dict:
    if not api_key:
        return {
            "role": "Software Engineer (Demo)",
            "skills": ["python", "react", "fastapi"],
            "experience_years": 3,
            "location": "Remote",
            "salary_range": "$100k-$130k",
            "responsibilities": ["Build REST APIs", "Code reviews"],
            "nice_to_have": ["docker", "kubernetes"]
        }
    prompt = f"""You are an expert technical recruiter. Extract structured requirements from the Job Description.

Return ONLY a valid JSON object:
{{
  "role": "Exact job title",
  "skills": ["skill1", "skill2"],
  "experience_years": 3.0,
  "location": "City / Remote / Hybrid",
  "salary_range": "$X-$Y or empty string",
  "responsibilities": ["resp1", "resp2"],
  "nice_to_have": ["optional1", "optional2"]
}}

All skill names must be lowercase. Extract only actual technical skills, not soft skills.

JD:
{jd_text}
"""
    try:
        text   = await _call_gemini(prompt)
        parsed = _safe_json(text)
        parsed["skills"]       = normalize_skills(parsed.get("skills", []))
        parsed["nice_to_have"] = normalize_skills(parsed.get("nice_to_have", []))
        return parsed
    except Exception as e:
        print(f"[parse_jd] Error: {e}")
        return {
            "role": "Unknown", "skills": [], "experience_years": 0,
            "location": "", "salary_range": "", "responsibilities": [], "nice_to_have": []
        }


# ═══════════════════════════════════════════════════════════════════════════════
# AI OUTREACH & CHAT
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_recruiter_message(candidate: dict, role: str, jd_context: dict = None) -> str:
    if not api_key:
        return (
            f"Hi {candidate.get('name')}, I came across your profile and was impressed by your "
            f"experience with {', '.join(candidate.get('skills', [])[:2])}. "
            f"We have an exciting {role} opportunity that I think would be a great fit. "
            f"Would you be open to a quick conversation?"
        )
    skills_preview = ", ".join(candidate.get("skills", [])[:3])
    prompt = f"""You are a friendly but professional AI recruiter writing a first outreach message.

Candidate: {candidate.get('name')}
Their Skills: {skills_preview}
Their Experience: {candidate.get('experience_years')} years
Job Role: {role}
Job Location: {jd_context.get('location', 'flexible') if jd_context else 'flexible'}

Write a warm, personalized 2-3 sentence outreach message. Reference their specific skills.
End with an open question about their interest. No generic corporate speak.
Return only the message text, no formatting.
"""
    try:
        return (await _call_gemini(prompt, temperature=0.7)).strip()
    except Exception as e:
        print(f"[generate_recruiter_message] Error: {e}")
        return f"Hi {candidate.get('name')}, we have an exciting {role} opportunity. Would you like to learn more?"


async def simulate_candidate_response(candidate: dict, chat_history: list, role: str = "") -> str:
    if not api_key:
        return "Thanks for reaching out! I'm definitely interested in hearing more about this opportunity."
    prompt = f"""You are roleplaying as a job candidate responding naturally to a recruiter.

Profile:
- Name: {candidate.get('name')}
- Expected Salary: {candidate.get('expected_salary')}
- Notice Period: {candidate.get('notice_period')}
- Location: {candidate.get('location')}
- Skills: {', '.join(candidate.get('skills', []))}
- Bio: {candidate.get('bio', '')}

Chat history:
{json.dumps(chat_history, indent=2)}

Respond naturally. Show enthusiasm if fit is good. Ask about tech stack / team.
Mention salary or notice period if relevant. Keep 2-4 sentences. Return only the reply.
"""
    try:
        return (await _call_gemini(prompt, temperature=0.8)).strip()
    except Exception as e:
        print(f"[simulate_candidate_response] Error: {e}")
        return "That sounds interesting! Could you tell me more about the team and tech stack?"


async def analyze_chat_and_score(chat_history: list, candidate: dict) -> dict:
    if not api_key:
        return {
            "interest_score": 90, "interest_level": "High",
            "key_points": ["Showed enthusiasm", "Asked about tech stack"],
            "concerns": [], "salary_aligned": True,
            "availability": "Within 30 days", "final_decision": "Shortlist",
            "recruiter_tip": "Schedule a technical screen immediately."
        }
    messages_text = "\n".join(
        f"{m.get('sender', 'unknown').upper()}: {m.get('text', '')}"
        for m in chat_history
    )
    prompt = f"""Analyze this recruiter-candidate conversation for genuine interest signals.

CANDIDATE:
- Name: {candidate.get('name')}
- Expected Salary: {candidate.get('expected_salary')}
- Notice Period: {candidate.get('notice_period')}
- Location: {candidate.get('location')}

CONVERSATION:
{messages_text}

Return ONLY this JSON:
{{
  "interest_score": <0-100>,
  "interest_level": "High" | "Medium" | "Low",
  "key_points": ["signal1", "signal2"],
  "concerns": ["concern1"],
  "salary_aligned": true | false,
  "availability": "Immediate / X days / Unknown",
  "final_decision": "Shortlist" | "Hold" | "Reject",
  "recruiter_tip": "1 actionable next step"
}}
"""
    try:
        return _safe_json(await _call_gemini(prompt))
    except Exception as e:
        print(f"[analyze_chat_and_score] Error: {e}")
        return {
            "interest_score": 50, "interest_level": "Medium",
            "key_points": [], "concerns": ["Analysis failed"],
            "salary_aligned": None, "availability": "Unknown",
            "final_decision": "Hold", "recruiter_tip": "Retry the conversation."
        }


async def generate_shortlist_summary(results: list) -> str:
    if not api_key or not results:
        return "Top candidates ranked by combined Match + Interest score."
    top = results[:3]
    summaries = [
        f"#{i+1} {r['candidate']['name']}: Match={r['match_score']:.0f}, "
        f"Interest={r['interest_score']:.0f}, Final={r['final_score']:.0f}"
        for i, r in enumerate(top)
    ]
    prompt = f"""You are an AI talent analyst. Write a 2-sentence executive summary for a recruiter:

{chr(10).join(summaries)}

Highlight who to prioritize and why. Be direct and actionable. Return only the summary text.
"""
    try:
        return (await _call_gemini(prompt, temperature=0.5)).strip()
    except Exception:
        return "Candidates ranked by combined match and interest score. Prioritize scores above 80."