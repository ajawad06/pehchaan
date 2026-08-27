from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import firebase_admin
from firebase_admin import credentials

# Import O*NET derived taxonomy and scoring functions
from career_taxonomy_onet import (
    CAREER_TAXONOMY as ONET_TAXONOMY,
    riasec_similarity,
    ability_match as onet_ability_match,
    recommend_careers as onet_recommend_careers,
)

try:
    firebase_cred_json = os.environ.get("FIREBASE_CREDENTIALS")
    if firebase_cred_json:
        cred_dict = json.loads(firebase_cred_json)
        cred = credentials.Certificate(cred_dict)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"Error initializing Firebase Admin from env: {e}")

try:
    from groq import Groq
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
    groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
except Exception as e:
    print(f"Error initializing Groq client: {e}")
    groq_client = None

# Model names churn; keep this configurable so a rename is an env change,
# not a code change.
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")


def llm_json(prompt: str, temperature: float = 0.0, attempts: int = 2):
    """
    Single place where the LLM is called. Asks for a JSON object, parses it,
    and retries once on malformed output.

    Returns None on failure — every caller has its own deterministic fallback
    and must never block the student's flow on this succeeding.

    temperature defaults to 0: ranking and scoring must be reproducible, so a
    student who retakes the assessment doesn't get a different answer from the
    same responses. Prose generation passes a higher value explicitly.
    """
    if not groq_client:
        return None

    for attempt in range(attempts):
        try:
            completion = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise scoring and analysis engine. "
                                   "You reply with a single valid JSON object and nothing else.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=temperature,
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"Groq attempt {attempt + 1}/{attempts} failed: {e}")

    return None

app = FastAPI(title="Pehchaan API")

# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The RandomForest that used to serve /predict was trained on synthetic data
# generated from hand-written RIASEC assumptions, so it could only recover what
# was already encoded by hand. Measured against the same data it was beaten by a
# nearest-centroid model 15,000x smaller. Ranking now runs through /rank:
# the O*NET taxonomy scores candidates, an LLM re-ranks them in context.

class ClusterConfidence(BaseModel):
    cluster_id: str
    confidence: float

class ScoreRequest(BaseModel):
    activity_id: str
    response_text: str
    rubric: List[str]

class ExplainRequest(BaseModel):
    ranked_clusters: List[ClusterConfidence]
    language: str
    age_band: str
    trait_vector: Dict[str, float] = {}   # Full 12-feature RIASEC+cognitive vector
    big_five: Dict[str, float] = {}       # Big Five personality scores (0-100)

class ExplainResponse(BaseModel):
    explanations: Dict[str, str]

# ─── /rank ────────────────────────────────────────────────────────────────────
# Two stages, deliberately separated:
#   1. The O*NET taxonomy scores all 21 careers deterministically. This is the
#      auditable part — every number traces to a measured trait and a published
#      occupational profile.
#   2. An LLM re-ranks only the shortlist those scores produced. It can weigh
#      things cosine similarity cannot (age band, stated values, interest vs
#      aptitude conflicts) but it can never introduce a career, because the
#      candidate list is fixed before it is called.
#
# The final score is a blend of both, and both components are returned, so a
# ranking can always be explained rather than asserted.

SHORTLIST_SIZE = 8
RESULTS_RETURNED = 5
TAXONOMY_WEIGHT = 0.6      # deterministic component
LLM_WEIGHT = 0.4           # contextual component


class RankRequest(BaseModel):
    trait_vector: Dict[str, float] = {}
    abilities: Dict[str, float] = {}
    interests: Dict[str, float] = {}
    career_values: List[str] = []
    age_band: str = "16-17"


@app.post("/rank")
def rank(request: RankRequest):
    riasec = {k: request.trait_vector.get(k, 0.0) for k in ["R", "I", "A", "S", "E", "C"]}

    # Abilities come from the explicit field, falling back to whatever
    # non-RIASEC keys the trait vector carries.
    abilities = dict(request.abilities) or {
        k: v for k, v in request.trait_vector.items() if k not in riasec
    }

    scored = onet_recommend_careers(riasec, abilities)
    if not scored:
        raise HTTPException(status_code=500, detail="Taxonomy scoring returned nothing")

    shortlist = scored[:SHORTLIST_SIZE]
    allowed = {c["career"] for c in shortlist}

    def taxonomy_only(reason: str):
        return {
            "ranked_clusters": [
                {
                    "cluster_id": c["career"],
                    "confidence": round(c["compatibility"] / 100, 4),
                    "taxonomy_score": round(c["compatibility"] / 100, 4),
                    "llm_score": None,
                    "reasoning": None,
                }
                for c in shortlist[:RESULTS_RETURNED]
            ],
            "model_version": "taxonomy_v2",
            "engine": "taxonomy_only",
            "note": reason,
        }

    if not groq_client:
        return taxonomy_only("LLM unavailable — deterministic ranking only")

    candidate_lines = chr(10).join(
        f'  - "{c["career"]}" — interest match {c["interest_match"]}%, '
        f'ability match {c["ability_match"]}%, combined {c["compatibility"]}%'
        for c in shortlist
    )
    trait_lines = ", ".join(f"{k}={round(v * 100)}" for k, v in request.trait_vector.items())
    interest_lines = ", ".join(request.interests.keys()) or "none stated"
    values_lines = ", ".join(request.career_values) or "none stated"

    prompt = f"""A student in Pakistan, age band {request.age_band}, completed a series of
aptitude and interest activities. Their measured profile (0-100):
{trait_lines}

They said they are interested in: {interest_lines}
They said they value: {values_lines}

A deterministic O*NET-based engine scored these candidate careers:
{candidate_lines}

Re-rank these candidates for THIS student. You may disagree with the ordering
above where the numbers miss context — for example when a strong interest has
had no chance to develop into measured aptitude yet, or when a high ability
score reflects a general skill rather than genuine fit for that field.

Rules you must follow:
- Choose ONLY from the exact career names listed above. Never invent one.
- Return exactly {RESULTS_RETURNED} careers, best fit first.
- "fit" is your judgement of suitability from 0.0 to 1.0.
- "reasoning" is ONE sentence, addressed to the student as "you", naming the
  specific evidence behind the placement. No flattery, no hedging.

Return ONLY this JSON object:
{{"ranked": [{{"career": "exact name", "fit": 0.0, "reasoning": "one sentence"}}]}}
"""

    data = llm_json(prompt, temperature=0.0)
    if not data or not isinstance(data.get("ranked"), list):
        return taxonomy_only("LLM returned no usable ranking")

    tax_by_name = {c["career"]: c for c in shortlist}
    merged, seen = [], set()

    for item in data["ranked"]:
        name = (item or {}).get("career")
        # Silently drop anything invented or repeated — the taxonomy fills the gap.
        if name not in allowed or name in seen:
            continue
        seen.add(name)
        try:
            llm_fit = max(0.0, min(1.0, float(item.get("fit", 0.5))))
        except (ValueError, TypeError):
            llm_fit = 0.5
        tax_score = tax_by_name[name]["compatibility"] / 100
        merged.append({
            "cluster_id": name,
            "confidence": round(TAXONOMY_WEIGHT * tax_score + LLM_WEIGHT * llm_fit, 4),
            "taxonomy_score": round(tax_score, 4),
            "llm_score": round(llm_fit, 4),
            "reasoning": (item.get("reasoning") or None),
        })

    if not merged:
        return taxonomy_only("LLM named no valid careers")

    # Backfill from taxonomy order if the LLM returned too few.
    for c in shortlist:
        if len(merged) >= RESULTS_RETURNED:
            break
        if c["career"] in seen:
            continue
        tax_score = c["compatibility"] / 100
        merged.append({
            "cluster_id": c["career"],
            "confidence": round(TAXONOMY_WEIGHT * tax_score, 4),
            "taxonomy_score": round(tax_score, 4),
            "llm_score": None,
            "reasoning": None,
        })
        seen.add(c["career"])

    merged.sort(key=lambda x: -x["confidence"])
    return {
        "ranked_clusters": merged[:RESULTS_RETURNED],
        "model_version": "taxonomy_v2+llm",
        "engine": "llm_reranked",
        "note": None,
    }


def career_label(cluster_id: str) -> str:
    """
    Careers now arrive as display names from the taxonomy ("UX/UI Design",
    "Medicine (MBBS)"), not snake_case ids. Title-casing those mangles them
    into "Ux/Ui Design", so only reformat when it actually looks snake_case.
    """
    return cluster_id.replace("_", " ").title() if "_" in cluster_id else cluster_id


@app.post("/score")
def score(request: ScoreRequest):
    fallback_response = {dim: 0.5 for dim in request.rubric}
    
    prompt = f"""
    You are an AI scoring engine. 
    Activity: {request.activity_id}
    Response text: "{request.response_text}"
    Rubric dimensions: {', '.join(request.rubric)}
    
    Score the response text against each rubric dimension on a scale of 0.0 to 1.0.
    Return ONLY a valid JSON object where keys are the rubric dimensions and values are the numeric scores.
    """
    
    # Rubric scoring must be reproducible, so temperature stays at 0.
    scores = llm_json(prompt, temperature=0.0)
    if scores is None:
        return fallback_response

    # Clamp whatever came back into the rubric's shape — a missing or
    # nonsensical dimension falls back to neutral rather than failing.
    final_scores = {}
    for dim in request.rubric:
        val = scores.get(dim, 0.5)
        try:
            val = max(0.0, min(1.0, float(val)))
        except (ValueError, TypeError):
            val = 0.5
        final_scores[dim] = round(val, 2)

    return final_scores

@app.post("/explain")
def explain(request: ExplainRequest):
    fallback_explanations = {}
    for cluster in request.ranked_clusters:
        fallback_explanations[cluster.cluster_id] = (
            f"Your trait profile aligns with {career_label(cluster.cluster_id)} "
            f"with a model confidence of {round(cluster.confidence * 100)}%. "
            f"This field matches the combination of interests, cognitive strengths, and behavioral tendencies you demonstrated."
        )
    fallback = ExplainResponse(explanations=fallback_explanations)

    if not groq_client:
        return fallback

    # Build a richly structured prompt from the numeric data
    cluster_lines = "\n".join(
        [f"  - {career_label(c.cluster_id)}: {round(c.confidence * 100, 1)}% match"
         for c in request.ranked_clusters]
    )

    # Build optional sections for richer prompt
    riasec_lines = ""
    if request.trait_vector:
        riasec_map = {"R": "Realistic", "I": "Investigative", "A": "Artistic", "S": "Social", "E": "Enterprising", "C": "Conventional"}
        riasec_parts = [f"{riasec_map.get(k, k)}: {round(v * 100)}%" for k, v in request.trait_vector.items() if k in riasec_map]
        cognitive_parts = [f"{k.replace('_', ' ').title()}: {round(v * 100)}%" for k, v in request.trait_vector.items() if k not in riasec_map]
        if riasec_parts:
            riasec_lines += f"\nRIASEC Interest Profile: {', '.join(riasec_parts)}"
        if cognitive_parts:
            riasec_lines += f"\nCognitive Scores (0-1 normalized): {', '.join(cognitive_parts)}"

    big_five_lines = ""
    if request.big_five:
        bf_map = {"openness": "Openness", "conscientiousness": "Conscientiousness", "extraversion": "Extraversion", "agreeableness": "Agreeableness", "neuroticism": "Neuroticism (Emotional Instability)"}
        bf_parts = [f"{bf_map.get(k, k)}: {round(v)}%" for k, v in request.big_five.items() if k in bf_map]
        if bf_parts:
            big_five_lines = f"\nBig Five Personality (0-100 scale): {', '.join(bf_parts)}"

    prompt = f"""You are a senior career counselor and psychometrician for Pehchaan, a career-discovery platform for Pakistani students aged 14–24.

A student has just completed a comprehensive, multi-stage behavioral and cognitive assessment. Below are their measured scores, matched against O*NET occupational profiles. Your task is to write a detailed, warm, and genuinely insightful career analysis FOR THIS SPECIFIC STUDENT based purely on the numeric data below.

---
STUDENT PROFILE
Age Band: {request.age_band}{riasec_lines}{big_five_lines}

CAREER MATCHES (O*NET profile match, reviewed in context, with confidence scores):
{cluster_lines}

---
INSTRUCTIONS:
1. For EACH career cluster listed above, write a DETAILED 3–4 sentence explanation that:
   - Says specifically WHY their profile fits this field (reference the confidence score explicitly)
   - Compares this option against the other options (which is stronger fit and why)
   - Identifies what specific traits or RIASEC dimensions drove this prediction
   - Mentions one concrete role in Pakistan they could explore within this field
   
2. Write an "overall_analysis" paragraph (5–6 sentences) that:
   - Synthesizes the full picture of who this student appears to be based on their scores
   - Identifies their dominant cognitive/personality pattern (e.g. "investigative-analytical profile", "creative-social profile")  
   - Honestly compares their top 2 options and explains when someone should choose one vs the other
   - Ends with ONE clear, actionable suggestion they can do THIS WEEK to explore their top match

3. Write an "uncertainty" paragraph (2–3 sentences) that:
   - Honestly states what we cannot yet determine from this assessment alone
   - Suggests 1–2 specific additional activities or real-world experiences that would clarify the picture

TONE: Warm but honest. Scientific but not cold. Do NOT use generic phrases like "your skills align" or "you would do well". Be specific and direct.

CRITICAL: Return ONLY a valid JSON object in this exact schema:
{{
  "explanations": {{
    "career_cluster_id": "Detailed explanation text...",
    ...
  }},
  "overall_analysis": "Full synthesis paragraph...",
  "uncertainty": "Uncertainty paragraph..."
}}

The career_cluster_id keys must EXACTLY match these: {[c.cluster_id for c in request.ranked_clusters]}
"""

    # Prose, not a decision — a little warmth is fine here.
    data = llm_json(prompt, temperature=0.7)
    if data is None:
        return fallback

    try:
        # Validate and fill any missing keys with fallback
        final_explanations = {}
        for cluster in request.ranked_clusters:
            cid = cluster.cluster_id
            final_explanations[cid] = data.get("explanations", {}).get(cid, fallback_explanations[cid])

        return {
            "explanations": final_explanations,
            "overall_analysis": data.get("overall_analysis", ""),
            "uncertainty": data.get("uncertainty", "")
        }

    except Exception as e:
        print(f"explain post-processing failed: {e}")
        return fallback

# --- PHASE 1 PIVOT: Behavioral Telemetry & Cold-Start Recommendation Engine ---

class BehavioralTelemetry(BaseModel):
    response_time_sec: float
    hints_used: int
    accuracy: float
    attempts: int
    completed: bool
    quit: bool

class ActivityAttempt(BaseModel):
    user_id: str
    activity_id: str
    difficulty_level: int
    telemetry: BehavioralTelemetry

class UserProfile(BaseModel):
    user_id: str
    interests: Dict[str, float]        # e.g. {"architecture": 0.9, "arts": 0.8} — onboarding tags
    abilities: Dict[str, float]        # e.g. {"logical_reasoning": 0.85, "creativity": 0.6} — measured 0-1
    career_values: List[str]
    riasec: Optional[Dict[str, float]] = None  # Measured RIASEC from InstinctSwipe {R,I,A,S,E,C}

# Old hand-typed CAREER_TAXONOMY removed.
# The O*NET-sourced taxonomy (21 careers, real RIASEC + ability profiles)
# is imported at the top of this file as ONET_TAXONOMY from career_taxonomy_onet.py.
# That is the single source of truth. Do not add a second dict here.

@app.post("/submit_activity")
def submit_activity(attempt: ActivityAttempt):
    """
    Receives behavioral telemetry from an activity.
    In a full implementation, this would save to Firestore and update the user's ability profile.
    For now, it returns a simulated skill update based on the telemetry.
    """
    # Behavioral Modifiers (Simple Heuristic)
    score_modifier = 0.0
    if attempt.telemetry.accuracy >= 0.8 and attempt.telemetry.response_time_sec < 15.0:
        score_modifier = 0.1  # Fast and accurate bonus
    elif attempt.telemetry.hints_used > 1 or attempt.telemetry.accuracy < 0.5:
        score_modifier = -0.1 # Struggled penalty
        
    return {
        "status": "success",
        "telemetry_received": True,
        "estimated_skill_delta": score_modifier,
        "message": "Telemetry logged for behavioral profiling."
    }

@app.post("/recommend_careers")
def get_career_recommendations(profile: UserProfile):
    """
    Career Recommendation Engine — O*NET Real Data (career_taxonomy_onet.py).

    Always uses onet_recommend_careers():
      ─ When profile.riasec is present (InstinctSwipe completed): full cosine
        similarity against each career's real O*NET RIASEC profile + ability match
        over only the skills the user actually measured (no 0.5 default fill-in).
      ─ When profile.riasec is absent: passes a zero RIASEC vector so the ability
        match still runs correctly — results will be ability-only, which is better
        than the old tag-matching + 0.5 default fallback.

    Scoring (from onet_recommend_careers):
      interest_score < 0.15  →  compatibility = ability_score × 0.15  (suppressed)
      otherwise              →  compatibility = interest × 0.4 + ability × 0.6
    """
    # Use measured RIASEC if available; zero vector otherwise
    user_riasec = profile.riasec or {"R": 0, "I": 0, "A": 0, "S": 0, "E": 0, "C": 0}

    raw = onet_recommend_careers(
        user_riasec=user_riasec,
        user_abilities=profile.abilities,
        taxonomy=ONET_TAXONOMY,
    )

    results = []
    for entry in raw:
        career_data = ONET_TAXONOMY.get(entry["career"], {})
        required = career_data.get("required_skills", {})
        # Confidence = fraction of required skills we actually measured
        known = sum(1 for s in required if s in profile.abilities)
        conf = (known / len(required)) if required else 0.0
        results.append({
            "career":         entry["career"],
            "compatibility":  entry["compatibility"],
            "confidence":     round(conf * 100, 1),
            "interest_match": entry.get("interest_match", 0.0),
            "ability_match":  entry.get("ability_match", 0.0),
            "engine":         "onet_riasec" if (profile.riasec and any(v > 0 for v in profile.riasec.values())) else "onet_ability_only",
        })

    # Already sorted by onet_recommend_careers, but re-sort defensively
    results.sort(key=lambda x: x["compatibility"], reverse=True)
    return {"recommendations": results}

@app.post("/next_activity")
def next_activity(profile: UserProfile):
    """
    Active Learning Engine: Recommends the next activity based on missing data or uncertainty.
    """
    # Find the skill we know the least about that is required by top careers
    # (Simplified for MVP: Just checks if they are missing 'spatial_reasoning' or 'creativity')
    
    missing_skills = []
    for skill in ["spatial_reasoning", "creativity", "logical_reasoning", "numerical_reasoning"]:
        if skill not in profile.abilities:
            missing_skills.append(skill)
            
    if "spatial_reasoning" in missing_skills:
        return {"next_activity_id": "architecture_puzzle", "reason": "We need to measure your spatial reasoning to determine fit for Architecture or Design."}
    elif "creativity" in missing_skills:
        return {"next_activity_id": "creative_uses_brick", "reason": "Let's explore your creative problem-solving approach."}
    
    return {"next_activity_id": "data_detective_sim", "reason": "Let's see how you handle real-world data and logic constraints."}

class ComprehensiveExplainRequest(BaseModel):
    profile: UserProfile
    recommendations: List[Dict[str, Any]]

@app.post("/comprehensive_explain")
def comprehensive_explain(request: ComprehensiveExplainRequest):
    fallback_response = {
        "explanations": {rec["career"]: "Strong match based on your skills." for rec in request.recommendations},
        "overall_summary": "Based on your telemetry, you show strong potential in these fields.",
        "uncertainty": "We still need more data on your other skills to be absolutely sure."
    }
    
    if not groq_client:
        return fallback_response

    prompt = f"""
    You are an expert AI career strategist and UX designer for a platform called Pehchaan.
    We have collected behavioral telemetry on a user.
    
    User Interests (Self-reported): {request.profile.interests}
    User Abilities (Measured via cognitive games): {request.profile.abilities}
    Career Values: {request.profile.career_values}
    
    Our cold-start algorithm recommends these top careers with compatibility and confidence scores:
    {request.recommendations}
    
    Please provide:
    1. A short, highly personalized explanation for EACH recommended career explaining exactly WHY they are a good fit based on the numerical data provided (compare their interests vs their actual measured abilities). 
    2. An 'overall_summary' comparing their top options.
    3. An 'uncertainty' analysis explaining what skills we still need to measure to be more confident.
    
    Return ONLY a valid JSON object with the following schema:
    {{
      "explanations": {{ "Career Name": "Explanation text..." }},
      "overall_summary": "Summary text...",
      "uncertainty": "Uncertainty text..."
    }}
    """
    
    data = llm_json(prompt, temperature=0.7)
    return data if data is not None else fallback_response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
