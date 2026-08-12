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
        model_version="rf_v1"
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
        fallback_explanations[cluster.cluster_id] = f"Your trait profile shows alignment with the {cluster.cluster_id} field based on our offline model."
        
    if not gemini_client:
        return ExplainResponse(explanations=fallback_explanations)
        
    prompt = f"""
    You are a career guidance counselor for a {request.age_band} year old.
    Language: {request.language}
    
    The ML model has assigned the following confidence scores to these career clusters:
    """
    for cluster in request.ranked_clusters:
        prompt += f"- {cluster.cluster_id}: {cluster.confidence}\n"
        
    prompt += """
    Write a short, encouraging 2-sentence explanation for EACH cluster explaining why it might be a good fit based purely on these numeric scores. 
    Do NOT suggest that you made this decision, attribute it to the user's trait profile.
    Return ONLY a valid JSON object where keys are the exact cluster_ids and values are the explanation text strings.
    """
    
    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        explanations = json.loads(response.text)
        
        final_explanations = {}
        for cluster in request.ranked_clusters:
            cid = cluster.cluster_id
            final_explanations[cid] = explanations.get(cid, fallback_explanations[cid])
            
        return ExplainResponse(explanations=final_explanations)
        
    except Exception as e:
        print(f"Gemini explain failed: {e}")
        return ExplainResponse(explanations=fallback_explanations)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
