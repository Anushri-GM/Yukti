from sqlalchemy.orm import Session
from app.db.session import engine, Base, SessionLocal
from app.db.models import DemographicStats, DevelopmentProject, CitizenSubmission

def seed_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if we already have data
    if db.query(DemographicStats).first() is not None:
        db.close()
        return
        
    print("Seeding database with MVP dummy data...")
    
    # 1. Seed Wards Demographics
    wards = [
        DemographicStats(
            ward="Ward A (Gandhi Nagar)",
            population=12000,
            literacy_rate=82.5,
            vulnerability_index=0.35,
            water_access_pct=90.0,
            road_connectivity_pct=85.0,
            health_center_distance_km=1.5
        ),
        DemographicStats(
            ward="Ward B (Ambedkar Nagar)",
            population=18000,
            literacy_rate=65.0,
            vulnerability_index=0.75,
            water_access_pct=45.0,
            road_connectivity_pct=50.0,
            health_center_distance_km=6.2
        ),
        DemographicStats(
            ward="Ward C (Subhash Nagar)",
            population=15000,
            literacy_rate=78.0,
            vulnerability_index=0.45,
            water_access_pct=75.0,
            road_connectivity_pct=80.0,
            health_center_distance_km=3.0
        ),
        DemographicStats(
            ward="Ward D (Nehru Basti)",
            population=22000,
            literacy_rate=58.0,
            vulnerability_index=0.85,
            water_access_pct=30.0,
            road_connectivity_pct=40.0,
            health_center_distance_km=8.5
        ),
        DemographicStats(
            ward="Ward E (Rajendra Nagar)",
            population=9500,
            literacy_rate=88.0,
            vulnerability_index=0.20,
            water_access_pct=95.0,
            road_connectivity_pct=90.0,
            health_center_distance_km=1.0
        ),
    ]
    db.add_all(wards)
    
    # 2. Seed Development Projects
    projects = [
        DevelopmentProject(
            title="Clean Water Pipeline Hookup",
            description="Install direct piped water supply pipelines to underserved households in Nehru Basti to reduce waterborne diseases.",
            category="Water",
            cost=2500000.0,  # 25 Lakhs
            affected_population=8000,
            ward="Ward D (Nehru Basti)",
            urgency_score=5,
            status="proposed"
        ),
        DevelopmentProject(
            title="Ward B Primary Health Clinic Setup",
            description="Construct a primary healthcare sub-center to serve local residents who currently travel over 6km for primary care.",
            category="Healthcare",
            cost=4500000.0,  # 45 Lakhs
            affected_population=12000,
            ward="Ward B (Ambedkar Nagar)",
            urgency_score=4,
            status="proposed"
        ),
        DevelopmentProject(
            title="Pothole Repair & Main Road Asphalt Sheet",
            description="Resurface the main connector road from Ward C to Ward A, currently heavily potholed and accident-prone.",
            category="Roads",
            cost=1500000.0,  # 15 Lakhs
            affected_population=6000,
            ward="Ward C (Subhash Nagar)",
            urgency_score=3,
            status="proposed"
        ),
        DevelopmentProject(
            title="Nehru Basti Secondary School Upgrades",
            description="Upgrade school building with safety compound walls, library room, and gender-segregated sanitation blocks.",
            category="Education",
            cost=3000000.0,  # 30 Lakhs
            affected_population=4000,
            ward="Ward D (Nehru Basti)",
            urgency_score=3,
            status="proposed"
        ),
        DevelopmentProject(
            title="Gandhi Nagar Community Hall Solar Grid",
            description="Install a local solar microgrid for constant power supply to public libraries and community centers.",
            category="Sanitation",
            cost=1200000.0,  # 12 Lakhs
            affected_population=3000,
            ward="Ward A (Gandhi Nagar)",
            urgency_score=2,
            status="proposed"
        ),
        DevelopmentProject(
            title="Smart Street Lighting Installation",
            description="Install high-intensity smart LED street lights at high-risk pedestrian crossings and dark corridors to boost safety.",
            category="Safety",
            cost=800000.0,  # 8 Lakhs
            affected_population=10000,
            ward="Ward B (Ambedkar Nagar)",
            urgency_score=4,
            status="proposed"
        )
    ]
    db.add_all(projects)
    
    # 3. Seed Citizen Submissions
    submissions = [
        CitizenSubmission(
            text="The main drinking water tap in Nehru Basti has been contaminated with sewer leakage for the past 3 days. Many children are falling sick.",
            category="Water",
            urgency=5,
            summary="Contaminated water supply in Nehru Basti causing illness.",
            affected_infrastructure="Public Drinking Water Tap",
            confidence=0.98,
            status="verified",
            ward="Ward D (Nehru Basti)"
        ),
        CitizenSubmission(
            text="Potholes on Subhash Nagar main road are massive. Yesterday a scooterist fell down and fractured their hand. Needs urgent patching.",
            category="Roads",
            urgency=4,
            summary="Dangerous potholes on Subhash Nagar road causing accidents.",
            affected_infrastructure="Subhash Nagar Connector Road",
            confidence=0.96,
            status="verified",
            ward="Ward C (Subhash Nagar)"
        )
    ]
    db.add_all(submissions)
    
    db.commit()
    db.close()
    print("Database seeding completed.")

if __name__ == "__main__":
    seed_db()
