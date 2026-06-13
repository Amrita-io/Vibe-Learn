import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Ensure backend folder is in path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

app = FastAPI(title="Vibe Learn Backend", description="Local Codebase Parser and Mission Generator")

# Enable CORS for the VS Code Webview
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Webviews have unique local origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import models & analyzer engines
from analyzer.models import AnalyzeRequest, EvaluateRequest, AnalyzeResponse, EvaluateResponse
from analyzer.gemini_analyzer import GeminiAnalyzer
from analyzer.local_analyzer import LocalAnalyzer
from analyzer.scoring import evaluate_task

@app.get("/health")
def health_check():
    api_key_set = bool(os.getenv("GEMINI_API_KEY"))
    return {
        "status": "healthy",
        "api_key_configured": api_key_set,
        "mode": "Gemini-powered" if api_key_set else "Local Offline Rule-Based"
    }

import json
from datetime import datetime

def get_progress_filepath(workspace_path: str) -> str:
    return os.path.join(workspace_path, ".vibe-learn", "progress.json")

def load_progress_file(workspace_path: str) -> dict:
    filepath = get_progress_filepath(workspace_path)
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_progress_file(workspace_path: str, data: dict):
    filepath = get_progress_filepath(workspace_path)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[Vibe Learn] Failed to write progress file: {str(e)}")

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_codebase(req: AnalyzeRequest):
    if not os.path.exists(req.workspace_path):
        raise HTTPException(status_code=404, detail="Workspace path does not exist on local disk.")
    
    api_key = os.getenv("GEMINI_API_KEY")
    
    try:
        # 1. Run Architecture analysis (which gives the base features and component map)
        if api_key:
            print("[Vibe Learn] Running Gemini-powered Architecture analysis...")
            arch_analyzer = GeminiAnalyzer(api_key=api_key)
        else:
            print("[Vibe Learn] Running Local Offline Architecture analysis...")
            arch_analyzer = LocalAnalyzer()
            
        features = arch_analyzer.analyze(req.workspace_path)
        
        # 2. Run System Logic analysis
        from analyzer.system_logic_analyzer import SystemLogicAnalyzer
        sys_analyzer = SystemLogicAnalyzer(api_key=api_key)
        sys_missions = sys_analyzer.analyze(req.workspace_path)
        
        # 3. Find important files for File and Function logic
        from analyzer.importance import get_important_files
        important_files = get_important_files(req.workspace_path, limit=15)
        
        # 4. Run File Logic analysis
        from analyzer.file_logic_analyzer import FileLogicAnalyzer
        file_analyzer = FileLogicAnalyzer(api_key=api_key)
        file_missions = file_analyzer.analyze(req.workspace_path, important_files)
        
        # 5. Run Function Logic analysis
        from analyzer.function_logic_analyzer import FunctionLogicAnalyzer
        func_analyzer = FunctionLogicAnalyzer(api_key=api_key)
        func_missions = func_analyzer.analyze(req.workspace_path, important_files)
        
        # 6. Run Syntax analysis
        from analyzer.syntax_analyzer import SyntaxAnalyzer
        syntax_analyzer = SyntaxAnalyzer(api_key=api_key)
        syntax_missions = syntax_analyzer.analyze(req.workspace_path, important_files)

        # 7. Run Engineering Decisions analysis
        from analyzer.engineering_analyzer import EngineeringAnalyzer
        eng_analyzer = EngineeringAnalyzer(api_key=api_key)
        eng_missions = eng_analyzer.analyze(req.workspace_path)

        # 8. Run Concept analysis
        from analyzer.concept_analyzer import ConceptAnalyzer
        concept_analyzer = ConceptAnalyzer(api_key=api_key)
        concept_graph = concept_analyzer.analyze(req.workspace_path)

        # Load progress from progress.json if it exists to merge statuses
        progress = load_progress_file(req.workspace_path)
        concept_statuses = progress.get("concept_statuses", {})
        concept_mastery_scores = progress.get("concept_mastery_scores", {})
        completed_tasks = progress.get("completed_tasks", [])

        for node in concept_graph.nodes:
            if node.id in concept_statuses:
                node.status = concept_statuses[node.id]
            if node.id in concept_mastery_scores:
                node.mastery_score = concept_mastery_scores[node.id]
            for t in node.tasks:
                if t.id in completed_tasks:
                    t.isCompleted = True

        # Save/initialize progress file
        if not progress:
            progress = {
                "workspace": os.path.basename(req.workspace_path),
                "last_analyzed": datetime.utcnow().isoformat() + "Z",
                "understanding_score": {
                    "architecture": 0.0,
                    "system_logic": 0.0,
                    "file_logic": 0.0,
                    "function_logic": 0.0,
                    "syntax": 0.0,
                    "engineering_decisions": 0.0,
                    "concepts": 0.0,
                    "overall": 0.0
                },
                "xp": 0,
                "level": 1,
                "streak": {
                    "current_streak": 0,
                    "longest_streak": 0,
                    "last_active_date": "",
                    "total_missions_completed": 0,
                    "total_xp_earned": 0,
                    "daily_goal": 3,
                    "daily_completed_today": 0
                },
                "completed_missions": [],
                "completed_tasks": [],
                "concept_statuses": {node.id: node.status for node in concept_graph.nodes},
                "concept_mastery_scores": {node.id: 0.0 for node in concept_graph.nodes}
            }
            save_progress_file(req.workspace_path, progress)
        else:
            progress["last_analyzed"] = datetime.utcnow().isoformat() + "Z"
            for node in concept_graph.nodes:
                if node.id not in progress["concept_statuses"]:
                    progress["concept_statuses"][node.id] = node.status
                if node.id not in progress["concept_mastery_scores"]:
                    progress["concept_mastery_scores"][node.id] = 0.0
            save_progress_file(req.workspace_path, progress)

        # 9. Distribute the generated missions to the corresponding features
        if features:
            for m in sys_missions:
                target_feat = features.get("backend-services") or features.get("workspace-core") or list(features.values())[0]
                if m.id not in [om.id for om in target_feat.missions]:
                    target_feat.missions.append(m)

            for m in file_missions:
                target_feat = list(features.values())[0]
                for fid, feat in features.items():
                    if fid == "frontend-ui" and any("frontend" in t.id or "src/" in t.id for t in m.tasks):
                        target_feat = feat
                        break
                    elif fid == "backend-services" and any("backend" in t.id or "app.py" in t.id for t in m.tasks):
                        target_feat = feat
                        break
                if m.id not in [om.id for om in target_feat.missions]:
                    target_feat.missions.append(m)

            for m in func_missions:
                target_feat = list(features.values())[0]
                for fid, feat in features.items():
                    if fid == "frontend-ui" and any("frontend" in t.id or "src/" in t.id for t in m.tasks):
                        target_feat = feat
                        break
                    elif fid == "backend-services" and any("backend" in t.id or "app.py" in t.id for t in m.tasks):
                        target_feat = feat
                        break
                if m.id not in [om.id for om in target_feat.missions]:
                    target_feat.missions.append(m)

            for m in syntax_missions:
                target_feat = list(features.values())[0]
                for fid, feat in features.items():
                    if fid == "frontend-ui" and any("frontend" in t.id or "src/" in t.id or "App.tsx" in t.id for t in m.tasks):
                        target_feat = feat
                        break
                    elif fid == "backend-services" and any("backend" in t.id or "app.py" in t.id or "main.py" in t.id for t in m.tasks):
                        target_feat = feat
                        break
                if m.id not in [om.id for om in target_feat.missions]:
                    target_feat.missions.append(m)

            for m in eng_missions:
                target_feat = features.get("backend-services") or features.get("workspace-core") or list(features.values())[0]
                if m.id not in [om.id for om in target_feat.missions]:
                    target_feat.missions.append(m)
                    
        return AnalyzeResponse(features=features, concept_graph=concept_graph)
    except Exception as e:
        print(f"[Vibe Learn] Error analyzing codebase: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Codebase analysis failed: {str(e)}")

@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate_submission(req: EvaluateRequest):
    try:
        evaluation = evaluate_task(
            feature_id=req.feature_id,
            mission_id=req.mission_id,
            task_id=req.task_id,
            task_type=req.task_type,
            task_content=req.task_content,
            submission=req.submission
        )
        return EvaluateResponse(
            isCorrect=evaluation["isCorrect"],
            xpGained=evaluation["xpGained"],
            scoreReward=evaluation["scoreReward"],
            feedback=evaluation["feedback"]
        )
    except Exception as e:
        print(f"[Vibe Learn] Evaluation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Submission evaluation failed: {str(e)}")

@app.get("/progress")
def get_progress(workspace_path: str):
    if not os.path.exists(workspace_path):
        raise HTTPException(status_code=404, detail="Workspace path not found.")
    progress = load_progress_file(workspace_path)
    if not progress:
        return {
            "workspace": os.path.basename(workspace_path),
            "last_analyzed": "",
            "understanding_score": {
                "architecture": 0.0,
                "system_logic": 0.0,
                "file_logic": 0.0,
                "function_logic": 0.0,
                "syntax": 0.0,
                "engineering_decisions": 0.0,
                "concepts": 0.0,
                "overall": 0.0
            },
            "xp": 0,
            "level": 1,
            "streak": {
                "current_streak": 0,
                "longest_streak": 0,
                "last_active_date": "",
                "total_missions_completed": 0,
                "total_xp_earned": 0,
                "daily_goal": 3,
                "daily_completed_today": 0
            },
            "completed_missions": [],
            "completed_tasks": [],
            "concept_statuses": {},
            "concept_mastery_scores": {}
        }
    return progress

@app.post("/concept/unlock")
def unlock_concept(concept_id: str, workspace_path: str):
    progress = load_progress_file(workspace_path)
    if not progress:
        progress = {"concept_statuses": {}}
    
    if "concept_statuses" not in progress:
        progress["concept_statuses"] = {}
        
    progress["concept_statuses"][concept_id] = "completed"
    
    from analyzer.concept_analyzer import CONCEPT_TEMPLATES
    
    unlocked = []
    # Check downstream concepts to see if their prerequisites are all met
    for cid, t in CONCEPT_TEMPLATES.items():
        current_status = progress["concept_statuses"].get(cid, "locked")
        if current_status == "locked":
            prereqs = t.get("prerequisites", [])
            # All prereqs must be completed
            if prereqs and all(progress["concept_statuses"].get(p) == "completed" for p in prereqs):
                progress["concept_statuses"][cid] = "available"
                unlocked.append(cid)
                
    save_progress_file(workspace_path, progress)
    return {"unlocked": unlocked}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
