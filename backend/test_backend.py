import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.engines.priority import calculate_project_score, run_knapsack_optimization
from app.schemas.schemas import WeightWeights

def test_priority_engine():
    print("Testing Priority Engine...")
    weights = WeightWeights(urgency=0.4, impact=0.3, demographics=0.2, cost_efficiency=0.1)
    
    score, justification = calculate_project_score(
        cost=1000000.0,
        affected_population=5000,
        urgency_score=5,
        vulnerability_index=0.8,
        weights=weights,
        category="Water"
    )
    print(f"Calculated Score: {score}")
    print(f"Justification: {justification}")
    assert score > 0.0, "Score should be positive"

def test_optimization():
    print("Testing OR-Tools Optimization Solver...")
    weights = WeightWeights(urgency=0.4, impact=0.3, demographics=0.2, cost_efficiency=0.1)
    
    projects = [
        {"title": "Proj A", "category": "Water", "cost": 500000.0, "affected_population": 4000, "urgency_score": 4, "ward": "Ward 1"},
        {"title": "Proj B", "category": "Roads", "cost": 800000.0, "affected_population": 12000, "urgency_score": 5, "ward": "Ward 2"},
        {"title": "Proj C", "category": "Health", "cost": 1500000.0, "affected_population": 2000, "urgency_score": 3, "ward": "Ward 1"},
    ]
    
    vulnerability_map = {"Ward 1": 0.8, "Ward 2": 0.4}
    
    # Run optimization with budget 1,000,000 (should fit Proj A and maybe Proj B but not C or A+B+C)
    total_cost, total_impact, optimized = run_knapsack_optimization(
        projects=projects,
        ward_vulnerability_map=vulnerability_map,
        budget=1000000.0,
        weights=weights
    )
    
    print(f"Optimal Budget Spent: {total_cost}")
    print(f"Total Impact Score: {total_impact}")
    for p in optimized:
        print(f"- {p['title']}: Selected={p['is_selected']}, Cost={p['cost']}, Score={p['priority_score']:.2f}")
        
    assert total_cost <= 1000000.0, "Total cost must not exceed budget"
    print("All tests passed successfully!")

if __name__ == "__main__":
    test_priority_engine()
    test_optimization()
