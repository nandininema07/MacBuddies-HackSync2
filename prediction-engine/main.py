import os
import pandas as pd
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client

app = FastAPI()

# Allow Next.js (port 3000) to talk to this Python API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use the credentials you provided
url = "https://xzoffvskrnhschaaxfdf.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6b2ZmdnNrcm5oc2NoYWF4ZmRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQwODUwNywiZXhwIjoyMDgzOTg0NTA3fQ.lgN7uP0QNZretkxuOPLVi3dhA49IyDa4zDz2CpoMbfQ"
supabase: Client = create_client(url, key)

@app.get("/api/predict")
async def get_predictions():
    # 1. Fetch real data from Supabase
    projects = supabase.table('government_projects').select("*").execute().data
    reports = supabase.table('reports').select("latitude, longitude").execute().data
    reports_df = pd.DataFrame(reports)
    
    current_date = datetime.now()
    results = []
    
    for i, p in enumerate(projects):
        # MOCKING MISSING DATA FOR DEMO
        is_bad_contractor = (i % 2 == 0) # Mock: every 2nd contractor is "bad"
        
        # LOGIC: Corruption Decay Algorithm
        risk_score = 0
        risk_score += 30 # Base age risk
        
        # Spatial Clustering (Check reports within approx 1km)
        if not reports_df.empty:
            nearby = reports_df[
                (reports_df['latitude'].between(p['latitude']-0.01, p['latitude']+0.01)) &
                (reports_df['longitude'].between(p['longitude']-0.01, p['longitude']+0.01))
            ]
            risk_score += min(40, len(nearby) * 8)
        
        if is_bad_contractor:
            risk_score += 30
            
        # Monsoon Multiplier (June-Sept)
        if 6 <= current_date.month <= 9:
            risk_score = min(100, risk_score * 1.5)

        results.append({
            **p,
            "prediction": {
                "score": int(risk_score),
                "label": "CRITICAL" if risk_score > 75 else "MODERATE" if risk_score > 40 else "SAFE",
                "contractor": "Shiv Shakti Infra" if is_bad_contractor else "Reliable Build Co"
            }
        })
    
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)