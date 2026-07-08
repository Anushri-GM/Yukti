from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.core.config import settings
from app.db.session import engine, Base, get_db
from app.db.seed import seed_db
from app.db import models
from app.schemas import schemas
from app.engines import priority
from app.core import gemini

# Auto-create tables and seed initial data
Base.metadata.create_all(bind=engine)
seed_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For MVP, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to YUKTI Decision Support API"}

from uuid import UUID

# --- CITIZEN PORTAL ENDPOINTS ---

@app.post(f"{settings.API_V1_STR}/citizens/submit", response_model=schemas.CitizenSubmissionOut, status_code=status.HTTP_201_CREATED)
async def submit_grievance(
    text: Optional[str] = Form(None),
    ward: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Read image bytes if present
    image_bytes = None
    if image:
        image_bytes = await image.read()
        
    # Analyze with Gemini
    analysis = gemini.analyze_citizen_submission(text or "", image_bytes)
    
    # Save submission
    db_submission = models.Suggestion(
        title="Citizen Grievance",
        description=text or "Grievance submitted via portal.",
        raw_submission=text or "Grievance submitted via portal.",
        user_selected_category=analysis.get("category", "Other"),
        latitude=latitude,
        longitude=longitude,
        address=ward or "Ward C (Subhash Nagar)",
        status="pending",
        verification_status="Pending",
        ai_category=analysis.get("category", "Other"),
        priority_score=float(analysis.get("urgency", 3)) * 20.0,
        ai_summary=analysis.get("summary", ""),
        confidence_score=analysis.get("confidence", 1.0)
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    return db_submission

@app.get(f"{settings.API_V1_STR}/citizens/submissions", response_model=List[schemas.CitizenSubmissionOut])
def get_submissions(db: Session = Depends(get_db)):
    return db.query(models.Suggestion).order_by(models.Suggestion.created_at.desc()).all()


# --- OFFICER PORTAL ENDPOINTS ---

@app.put(f"{settings.API_V1_STR}/officers/submissions/{{submission_id}}/verify", response_model=schemas.CitizenSubmissionOut)
def verify_submission(
    submission_id: UUID,
    status: str,  # "verified" or "rejected"
    category: Optional[str] = None,
    urgency: Optional[int] = None,
    convert_to_project: bool = False,
    db: Session = Depends(get_db)
):
    submission = db.query(models.Suggestion).filter(models.Suggestion.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    submission.status = status
    if category:
        submission.user_selected_category = category
        submission.ai_category = category
    if urgency is not None:
        submission.priority_score = float(urgency) * 20.0
        
    if convert_to_project and status == "verified":
        # Check if project already exists for this submission to avoid duplicates
        existing = db.query(models.DevelopmentProject).filter(models.DevelopmentProject.submission_id == submission_id).first()
        if not existing:
            # Estimate a mock cost (e.g. based on category and urgency)
            urgency_val = urgency or int((submission.priority_score or 60.0) / 20.0)
            cost_estimate = 1000000.0 * float(urgency_val)
            new_project = models.DevelopmentProject(
                title=f"Repair / Reconstruction: {submission.address or 'Local Infra'}",
                description=f"Action initiated from verified citizen request: {submission.ai_summary}",
                category=submission.category or "General",
                cost=cost_estimate,
                affected_population=1500 * urgency_val,
                ward=submission.address or "Ward B (Ambedkar Nagar)",
                urgency_score=urgency_val,
                submission_id=submission.id,
                status="proposed"
            )
            db.add(new_project)
            submission.status = "converted"

    db.commit()
    db.refresh(submission)
    return submission


# --- MP DASHBOARD ENDPOINTS ---

@app.get(f"{settings.API_V1_STR}/wards", response_model=List[schemas.DemographicStatsOut])
def get_wards(db: Session = Depends(get_db)):
    return db.query(models.DemographicStats).all()

@app.get(f"{settings.API_V1_STR}/projects", response_model=List[schemas.DevelopmentProjectOut])
def get_projects(db: Session = Depends(get_db)):
    projects = db.query(models.DevelopmentProject).all()
    demographics = db.query(models.DemographicStats).all()
    demographics_map = {d.ward: d.vulnerability_index for d in demographics}
    
    # Calculate default priority scores
    default_weights = schemas.WeightWeights()
    results = []
    
    for p in projects:
        vuln = demographics_map.get(p.ward, 0.5)
        score, justification = priority.calculate_project_score(
            cost=p.cost,
            affected_population=p.affected_population,
            urgency_score=p.urgency_score,
            vulnerability_index=vuln,
            weights=default_weights,
            category=p.category
        )
        p.priority_score = score
        p.justification = justification
        results.append(p)
        
    return results

@app.post(f"{settings.API_V1_STR}/mps/simulate", response_model=schemas.SimulationResult)
def simulate_scenario(req: schemas.SimulationRequest, db: Session = Depends(get_db)):
    projects_models = db.query(models.DevelopmentProject).all()
    demographics = db.query(models.DemographicStats).all()
    demographics_map = {d.ward: d.vulnerability_index for d in demographics}
    
    # Prepare projects dictionary for solver
    projects_list = []
    for p in projects_models:
        projects_list.append({
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "category": p.category,
            "cost": p.cost,
            "affected_population": p.affected_population,
            "ward": p.ward,
            "urgency_score": p.urgency_score,
            "submission_id": p.submission_id,
            "status": p.status,
            "created_at": p.created_at
        })
        
    if not projects_list:
        return schemas.SimulationResult(
            total_cost=0.0,
            total_impact_score=0.0,
            projects=[],
            explanation="No projects available to run simulation."
        )
        
    total_cost, total_impact, optimized = priority.run_knapsack_optimization(
        projects=projects_list,
        ward_vulnerability_map=demographics_map,
        budget=req.budget,
        weights=req.weights,
        priority_focus=req.priority_focus,
        vulnerability_multiplier=req.vulnerability_multiplier
    )
    
    # Separate selected and rejected for Gemini explanation
    selected = [p for p in optimized if p["is_selected"]]
    rejected = [p for p in optimized if not p["is_selected"]]
    
    explanation = gemini.generate_scenario_explanation(
        budget=req.budget,
        focus=req.priority_focus,
        selected=selected,
        rejected=rejected
    )
    
    return schemas.SimulationResult(
        total_cost=total_cost,
        total_impact_score=total_impact,
        projects=optimized,
        explanation=explanation
    )

