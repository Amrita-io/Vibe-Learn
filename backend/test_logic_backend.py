import os
import sys

# Ensure backend folder is in path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import analyze_codebase, evaluate_submission
from analyzer.models import AnalyzeRequest, EvaluateRequest, MissionTaskContent
from analyzer.importance import get_important_files
from analyzer.system_logic_analyzer import SystemLogicAnalyzer
from analyzer.file_logic_analyzer import FileLogicAnalyzer
from analyzer.function_logic_analyzer import FunctionLogicAnalyzer

def test_importance_scorer():
    print("[TEST] Running Heuristic Importance Scorer test...")
    workspace_path = os.path.dirname(os.path.abspath(__file__))
    top_files = get_important_files(workspace_path, limit=5)
    
    assert len(top_files) > 0, "Should extract important files"
    # main.py, scoring.py, etc. should be highly rated since they have route declarations or central logic
    assert any("main.py" in f for f in top_files), "main.py should be in top files"
    print(f"[SUCCESS] Importance scorer prioritized: {top_files}")

def test_system_logic_analyzer():
    print("[TEST] Running System Logic Analyzer test...")
    workspace_path = os.path.dirname(os.path.abspath(__file__))
    analyzer = SystemLogicAnalyzer() # Offline mode
    missions = analyzer.analyze(workspace_path)
    
    assert len(missions) > 0
    mission = missions[0]
    assert mission.pillar == "system_logic"
    assert len(mission.tasks) == 4
    
    task_types = [t.type for t in mission.tasks]
    assert "trace-path" in task_types
    assert "event-mcq" in task_types
    assert "reconstruct-text" in task_types
    print("[SUCCESS] System Logic analyzer generated correct mission types.")

def test_file_logic_analyzer():
    print("[TEST] Running File Logic Analyzer test...")
    workspace_path = os.path.dirname(os.path.abspath(__file__))
    analyzer = FileLogicAnalyzer()
    
    important_files = ["main.py", "analyzer/models.py"]
    missions = analyzer.analyze(workspace_path, important_files)
    
    assert len(missions) > 0
    mission = missions[0]
    assert mission.pillar == "file_logic"
    
    task_types = [t.type for t in mission.tasks]
    assert "dependency-map" in task_types
    assert "file-investigator" in task_types
    assert "event-mcq" in task_types
    assert "reconstruct-text" in task_types
    print("[SUCCESS] File Logic analyzer generated correct mission tasks.")

def test_function_logic_analyzer():
    print("[TEST] Running Function Logic Analyzer test...")
    workspace_path = os.path.dirname(os.path.abspath(__file__))
    analyzer = FunctionLogicAnalyzer()
    
    important_files = ["analyzer/scoring.py"]
    missions = analyzer.analyze(workspace_path, important_files)
    
    assert len(missions) > 0
    mission = missions[0]
    assert mission.pillar == "function_logic"
    
    task_types = [t.type for t in mission.tasks]
    assert "func-rebuild" in task_types
    assert "io-mapper" in task_types
    assert "event-mcq" in task_types
    assert "reconstruct-text" in task_types
    print("[SUCCESS] Function Logic analyzer generated correct mission tasks.")

def test_trace_path_scoring():
    print("[TEST] Running Trace Path sequence grading test...")
    task_content = MissionTaskContent(
        steps=[
            {"id": "s1", "order": 1, "component": "Client", "action": ""},
            {"id": "s2", "order": 2, "component": "Router", "action": ""},
            {"id": "s3", "order": 3, "component": "Handler", "action": ""}
        ]
    )
    
    # 1. 100% correct placement
    req_full = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t1",
        task_type="trace-path", task_content=task_content,
        submission={"sequence": ["s1", "s2", "s3"]}
    )
    res_full = evaluate_submission(req_full)
    assert res_full.isCorrect is True
    assert res_full.scoreReward == 30
    
    # 2. Partial correct placement (1 out of 3 correct)
    req_partial = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t1",
        task_type="trace-path", task_content=task_content,
        submission={"sequence": ["s1", "s3", "s2"]}
    )
    res_partial = evaluate_submission(req_partial)
    assert res_partial.isCorrect is False
    assert res_partial.scoreReward == int(25 * (1/3))
    print("[SUCCESS] Trace Path partial credit scoring verified.")

def test_file_investigator_scoring():
    print("[TEST] Running File Investigator grading test...")
    task_content = MissionTaskContent(
        questionsList=[
            {"id": "q1", "type": "mcq", "correct": 1},
            {"id": "q2", "type": "mcq", "correct": 2},
            {"id": "q3", "type": "multi-select", "correct": ["a.py", "b.py"]}
        ]
    )
    
    # Correct answers
    req = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t1",
        task_type="file-investigator", task_content=task_content,
        submission={"q1": 1, "q2": 2, "q3": ["a.py", "b.py"]}
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    
    # Partially correct (q1 correct, q2 incorrect, q3 correct)
    req_part = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t1",
        task_type="file-investigator", task_content=task_content,
        submission={"q1": 1, "q2": 0, "q3": ["a.py", "b.py"]}
    )
    res_part = evaluate_submission(req_part)
    assert res_part.isCorrect is False
    assert res_part.scoreReward == 0 # Score increases only on full decrypt
    print("[SUCCESS] File Investigator progressive scoring verified.")

def test_dependency_map_scoring():
    print("[TEST] Running Dependency Map edge grading test...")
    task_content = MissionTaskContent(
        correctEdges=[
            ("main.py", "models.py"),
            ("main.py", "scoring.py")
        ]
    )
    
    # Correct mapping
    req = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t1",
        task_type="dependency-map", task_content=task_content,
        submission={"edges": [["main.py", "models.py"], ["main.py", "scoring.py"]]}
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    
    # Mapped with incorrect direction (1 correct, 1 wrong direction)
    req_wrong = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t1",
        task_type="dependency-map", task_content=task_content,
        submission={"edges": [["main.py", "models.py"], ["scoring.py", "main.py"]]}
    )
    res_wrong = evaluate_submission(req_wrong)
    assert res_wrong.isCorrect is False
    # Correct = 1, Wrong direction = 1 (gets 0.5 points). Total credit = 1.5 / 2 = 75%
    assert res_wrong.scoreReward == int(25 * 0.75)
    print("[SUCCESS] Dependency Map wrong direction penalty verified.")

def test_active_recall_scoring():
    print("[TEST] Running Active Recall regex keyword matching test...")
    task_content = MissionTaskContent(
        expectedConcepts=["jwt", "token", "validate"],
        sampleSolution=""
    )
    
    # Correct (contains all 3 concepts)
    req = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t1",
        task_type="reconstruct-text", task_content=task_content,
        submission={"explanation": "This system validates the JWT authentication token."}
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    assert res.scoreReward == 40
    
    # Partially correct (contains only 1 concept - misses token/validate)
    req_wrong = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t1",
        task_type="reconstruct-text", task_content=task_content,
        submission={"explanation": "Raw password hashing is not using JWT here."}
    )
    res_wrong = evaluate_submission(req_wrong)
    assert res_wrong.isCorrect is False
    assert res_wrong.scoreReward == 0
    print("[SUCCESS] Active Recall keyword grader verified.")

if __name__ == "__main__":
    print("====================================================")
    print("     STARTING VIBE LEARN LOGIC ENGINE TESTS         ")
    print("====================================================")
    try:
        test_importance_scorer()
        test_system_logic_analyzer()
        test_file_logic_analyzer()
        test_function_logic_analyzer()
        test_trace_path_scoring()
        test_file_investigator_scoring()
        test_dependency_map_scoring()
        test_active_recall_scoring()
        print("====================================================")
        print("    ALL LOGIC PILLAR BACKEND TESTS PASSED SUCCESSFULLY ")
        print("====================================================")
    except AssertionError as e:
        print(f"\n[TEST FAILED] Assertion Error: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[TEST FAILED] Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
