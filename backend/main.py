from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Any
import joblib
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import firebase_admin
from firebase_admin import credentials

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
    from google import genai
    from google.genai import types
    API_KEY = os.environ.get("GEMINI_API_KEY")
    gemini_client = genai.Client(api_key=API_KEY) if API_KEY else None
except Exception as e:
    print(f"Error initializing Gemini client: {e}")
    gemini_client = None

app = FastAPI(title="Pehchaan API")

# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the model
try:
    clf = joblib.load("career_model.joblib")
    model_loaded = True
except Exception as e:
    print(f"Error loading model: {e}")
    model_loaded = False

FEATURES = ["R","I","A","S","E","C","numerical_reasoning","analytical_thinking",
            "creativity","communication","risk_tolerance","domain_exposure"]

class PredictRequest(BaseModel):
    trait_vector: Dict[str, float]

class ClusterConfidence(BaseModel):
    cluster_id: str
    confidence: float

class PredictResponse(BaseModel):
    ranked_clusters: List[ClusterConfidence]
    model_version: str

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
@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    if not model_loaded:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    vector = request.trait_vector
    # Extract features in the correct order
    input_data = []
    for f in FEATURES:
        input_data.append(vector.get(f, 0.0))
        
    df = pd.DataFrame([input_data], columns=FEATURES)
    
    # Get probabilities
    probas = clf.predict_proba(df)[0]
    classes = clf.classes_
    
    # Map probabilities to classes
    results = []
    for cls, prob in zip(classes, probas):
        results.append(ClusterConfidence(cluster_id=cls, confidence=round(float(prob), 4)))
        
    # Sort by confidence descending
    results.sort(key=lambda x: x.confidence, reverse=True)
    
    # Return top 5
    return PredictResponse(
        ranked_clusters=results[:5],
        model_version="rf_v2"
    )

@app.post("/score")
def score(request: ScoreRequest):
    fallback_response = {dim: 0.5 for dim in request.rubric}
    
    if not gemini_client:
        return fallback_response

    prompt = f"""
    You are an AI scoring engine. 
    Activity: {request.activity_id}
    Response text: "{request.response_text}"
    Rubric dimensions: {', '.join(request.rubric)}
    
    Score the response text against each rubric dimension on a scale of 0.0 to 1.0.
    Return ONLY a valid JSON object where keys are the rubric dimensions and values are the numeric scores.
    """
    
    # Try calling Gemini with 1 retry on invalid output
    for attempt in range(2):
        try:
            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            scores = json.loads(response.text)
            
            # Validate output matches rubric
            final_scores = {}
            for dim in request.rubric:
                val = scores.get(dim, 0.5)
                try:
                    val = float(val)
                    val = max(0.0, min(1.0, val))
                except (ValueError, TypeError):
                    val = 0.5
                final_scores[dim] = round(val, 2)
                
            return final_scores
        except Exception as e:
            print(f"Gemini score attempt {attempt+1} failed: {e}")
            
    return fallback_response

@app.post("/explain")
def explain(request: ExplainRequest):
    fallback_explanations = {}
    for cluster in request.ranked_clusters:
        fallback_explanations[cluster.cluster_id] = (
            f"Your trait profile aligns with {cluster.cluster_id.replace('_', ' ').title()} "
            f"with a model confidence of {round(cluster.confidence * 100)}%. "
            f"This field matches the combination of interests, cognitive strengths, and behavioral tendencies you demonstrated."
        )
    fallback = ExplainResponse(explanations=fallback_explanations)

    if not gemini_client:
        return fallback

    # Build a richly structured prompt from the numeric data
    cluster_lines = "\n".join(
        [f"  - {c.cluster_id.replace('_', ' ').title()}: {round(c.confidence * 100, 1)}% model confidence"
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

A student has just completed a comprehensive, multi-stage behavioral and cognitive assessment. Below are their results from the RandomForest ML model, trained on RIASEC psychometric theory. Your task is to write a detailed, warm, and genuinely insightful career analysis FOR THIS SPECIFIC STUDENT based purely on the numeric data below.

---
STUDENT PROFILE
Age Band: {request.age_band}{riasec_lines}{big_five_lines}

ML CAREER PREDICTIONS (RandomForest model, confidence scores):
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

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
        data = json.loads(response.text)

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
        print(f"Gemini explain failed: {e}")
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
    interests: Dict[str, float]  # e.g. {"architecture": 0.9, "arts": 0.8}
    abilities: Dict[str, float]  # e.g. {"logical_reasoning": 0.85, "creativity": 0.6}
    career_values: List[str]

# Simple Career Knowledge Base (Cold-Start Taxonomy)
CAREER_TAXONOMY = {
    "Data Science": {
        "required_skills": {"logical_reasoning": 0.9, "numerical_reasoning": 0.85, "pattern_recognition": 0.9},
        "related_interests": ["technology", "research", "science"]
    },
    "Architecture": {
        "required_skills": {"spatial_reasoning": 0.9, "creativity": 0.8, "logical_reasoning": 0.7},
        "related_interests": ["architecture", "arts", "design"]
    },
    "UX/UI Design": {
        "required_skills": {"creativity": 0.9, "empathy": 0.8, "pattern_recognition": 0.7},
        "related_interests": ["arts", "technology", "design", "psychology"]
    },
    "Software Engineering": {
        "required_skills": {"logical_reasoning": 0.9, "problem_solving": 0.9, "persistence": 0.85},
        "related_interests": ["technology"]
    },
    "Medicine": {
        "required_skills": {"logical_reasoning": 0.8, "memory": 0.9, "empathy": 0.8, "persistence": 0.9},
        "related_interests": ["medicine", "science", "helping_people"]
    }
}

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
def recommend_careers(profile: UserProfile):
    """
    Cold-Start Career Recommendation Engine.
    Combines Interest and Ability to recommend careers without ML.
    Compatibility = (Interest Match * 0.4) + (Ability Match * 0.6)
    """
    results = []
    
    for career, data in CAREER_TAXONOMY.items():
        # 1. Calculate Interest Match
        interest_match = 0.0
        for interest in profile.interests.keys():
            if interest in data["related_interests"]:
                interest_match += profile.interests[interest]
        # Normalize interest match (max 1.0)
        interest_match = min(1.0, interest_match)
        
        # 2. Calculate Ability Match
        ability_match = 0.0
        required_skills = data["required_skills"]
        if required_skills:
            total_weight = sum(required_skills.values())
            earned_weight = 0.0
            for skill, weight in required_skills.items():
                user_skill_level = profile.abilities.get(skill, 0.5) # Default 0.5 if unknown
                earned_weight += (user_skill_level * weight)
            ability_match = earned_weight / total_weight if total_weight > 0 else 0.0
            
        # 3. Final Compatibility Score
        compatibility = (interest_match * 0.4) + (ability_match * 0.6)
        
        # Calculate a pseudo-confidence based on how many required skills the user actually has in their profile
        known_skills_count = sum(1 for s in required_skills.keys() if s in profile.abilities)
        confidence = known_skills_count / len(required_skills) if required_skills else 0.5
        
        results.append({
            "career": career,
            "compatibility": round(compatibility * 100, 1),
            "confidence": round(confidence * 100, 1)
        })
        
    # Sort by compatibility descending
    results.sort(key=lambda x: x["compatibility"], reverse=True)
    
    return {"recommendations": results[:3]}

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
    
    if not gemini_client:
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
    
    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        data = json.loads(response.text)
        return data
    except Exception as e:
        print(f"Gemini comprehensive explain failed: {e}")
        return fallback_response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
