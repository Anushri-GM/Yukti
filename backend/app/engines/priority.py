import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from ortools.linear_solver import pywraplp
from app.schemas.schemas import WeightWeights

def calculate_project_score(
    cost: float,
    affected_population: int,
    urgency_score: int,
    vulnerability_index: float,
    weights: WeightWeights,
    category: str,
    priority_focus: Optional[str] = None,
    vulnerability_multiplier: float = 1.0
) -> Tuple[float, str]:
    """
    Deterministically calculates a project's priority score.
    """
    # 1. Urgency Score (1 to 5 scale -> normalized to 0.2 to 1.0)
    s_urgency = float(urgency_score) / 5.0
    
    # 2. Impact Score (Ratio of population affected)
    # A standard multiplier is used to avoid zero impact scores.
    # Clip to max of 1.0 to prevent outlier distortion.
    s_impact = min(float(affected_population) / 5000.0, 1.0)
    
    # 3. Demographics Score (Vulnerability index from ward stats)
    # Boost vulnerability based on scenario parameter if active
    s_demographics = min(vulnerability_index * vulnerability_multiplier, 1.0)
    
    # 4. Cost Efficiency Score (Benefit-to-cost ratio)
    # Benefit = affected_population. Cost = project cost.
    # Score favors cheaper projects with higher reach.
    benefit_cost_ratio = float(affected_population) / max(cost, 1.0)
    # Normalize log-scale or clip to make it a 0.0 to 1.0 score.
    s_cost_efficiency = min(benefit_cost_ratio * 1000.0, 1.0)
    
    # Dynamic Focus Multiplier
    focus_multiplier = 1.0
    if priority_focus and priority_focus.lower() in category.lower():
        focus_multiplier = 1.5
        
    # Calculate weighted priority score
    final_score = (
        (weights.urgency * s_urgency) +
        (weights.impact * s_impact) +
        (weights.demographics * s_demographics) +
        (weights.cost_efficiency * s_cost_efficiency)
    ) * focus_multiplier
    
    # Generate detailed structural explanation of the priority score components
    justification = (
        f"Priority Score: {final_score:.2f}. "
        f"[Urgency Contribution: {weights.urgency * s_urgency:.2f}, "
        f"Citizen Impact: {weights.impact * s_impact:.2f}, "
        f"Ward Vulnerability: {weights.demographics * s_demographics:.2f}, "
        f"Cost Efficiency: {weights.cost_efficiency * s_cost_efficiency:.2f}]."
    )
    if focus_multiplier > 1.0:
        justification += f" (Focus Category Boost applied for {category})."
        
    return final_score, justification

def run_knapsack_optimization(
    projects: List[dict],
    ward_vulnerability_map: Dict[str, float],
    budget: float,
    weights: WeightWeights,
    priority_focus: Optional[str] = None,
    vulnerability_multiplier: float = 1.0
) -> Tuple[float, float, List[dict]]:
    """
    Runs OR-Tools Mixed Integer Programming (MIP) solver to select projects
    maximizing total priority score within the budget limit.
    """
    # Create the MIP solver with the SCIP backend
    solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver:
        # Fallback to GLOP if SCIP is not available (though SCIP is standard with OR-tools)
        solver = pywraplp.Solver.CreateSolver("GLOP")
        
    n_projects = len(projects)
    x = {}
    calculated_scores = []
    justifications = []
    
    for i, project in enumerate(projects):
        # Determine ward vulnerability
        ward = project.get("ward", "")
        vuln = ward_vulnerability_map.get(ward, 0.5)
        
        # Calculate dynamic priority score
        score, justification = calculate_project_score(
            cost=project["cost"],
            affected_population=project["affected_population"],
            urgency_score=project["urgency_score"],
            vulnerability_index=vuln,
            weights=weights,
            category=project["category"],
            priority_focus=priority_focus,
            vulnerability_multiplier=vulnerability_multiplier
        )
        calculated_scores.append(score)
        justifications.append(justification)
        
        # Define binary variable for project selection (0 or 1)
        x[i] = solver.IntVar(0, 1, f"x_{i}")
        
    # Budget Constraint: sum(x[i] * cost[i]) <= budget
    budget_constraint = solver.RowConstraint(0, budget, "budget")
    for i, project in enumerate(projects):
        budget_constraint.SetCoefficient(x[i], project["cost"])
        
    # Objective: Maximize sum(x[i] * priority_score[i])
    objective = solver.Objective()
    for i in range(n_projects):
        objective.SetCoefficient(x[i], calculated_scores[i])
    objective.SetMaximization()
    
    # Solve the problem
    status = solver.Solve()
    
    optimized_projects = []
    total_cost = 0.0
    total_impact = 0.0
    
    for i, project in enumerate(projects):
        is_selected = False
        if status == pywraplp.Solver.OPTIMAL or status == pywraplp.Solver.FEASIBLE:
            is_selected = x[i].solution_value() > 0.5
            
        proj_copy = dict(project)
        proj_copy["priority_score"] = calculated_scores[i]
        proj_copy["justification"] = justifications[i]
        proj_copy["is_selected"] = is_selected
        optimized_projects.append(proj_copy)
        
        if is_selected:
            total_cost += project["cost"]
            total_impact += calculated_scores[i]
            
    return total_cost, total_impact, optimized_projects
