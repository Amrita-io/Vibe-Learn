import os
import sys

# Ensure backend folder is in path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import analyze_codebase, evaluate_submission
from analyzer.models import AnalyzeRequest, EvaluateRequest, MissionTaskContent

def test_local_analysis():
    print("[TEST] Running local codebase analysis test...")
    workspace_path = os.path.dirname(os.path.abspath(__file__)) # Point to backend folder itself
    req = AnalyzeRequest(workspace_path=workspace_path)
    
    response = analyze_codebase(req)
    features = response.features
    
    assert len(features) > 0, "Should generate at least one feature."
    print(f"[SUCCESS] Found {len(features)} features: {list(features.keys())}")
    
    for fid, feat in features.items():
        assert feat.id == fid
        assert len(feat.missions) > 0, f"Feature {fid} must have missions."
        assert len(feat.lockedConcepts) > 0, f"Feature {fid} must have locked concept previews."
        print(f"  - Feature '{feat.name}' has {len(feat.missions)} missions and {len(feat.lockedConcepts)} locked concepts.")
        
        for mission in feat.missions:
            assert len(mission.tasks) > 0, f"Mission {mission.id} must have tasks."
            print(f"    - Mission '{mission.title}' has {len(mission.tasks)} tasks.")
            for task in mission.tasks:
                assert task.type in [
                    "component-match", "boundary-sort", "flow-sequence", "connection-identify",
                    "trace-path", "event-mcq", "file-investigator", "dependency-map",
                    "func-rebuild", "io-mapper", "reconstruct-text", "syntax-intent",
                    "syntax-spotlight", "lib-rationale", "syntax-predict", "syntax-rebuild",
                    "eng-problem", "eng-simulator", "eng-failure", "eng-tradeoffs",
                    "alternative-ranker", "eng-alternative-ranker"
                ]
                print(f"      - Task '{task.id}' type '{task.type}' verified.")

def test_scoring_matcher():
    print("[TEST] Running Component Matcher scoring test...")
    task_content = MissionTaskContent(
        matchingItems=[
            {"id": "c1", "name": "app.py", "responsibility": "Handles requests"},
            {"id": "c2", "name": "db.sql", "responsibility": "Stores data"}
        ]
    )
    
    # Test correct match
    req_correct = EvaluateRequest(
        feature_id="test-feat",
        mission_id="test-mission",
        task_id="test-task",
        task_type="component-match",
        task_content=task_content,
        submission={"matches": {"c1": "c1", "c2": "c2"}}
    )
    res_correct = evaluate_submission(req_correct)
    assert res_correct.isCorrect is True
    assert res_correct.xpGained > 0
    assert res_correct.scoreReward > 0
    print("[SUCCESS] Component Matcher correct submission verified.")
    
    # Test incorrect match
    req_incorrect = EvaluateRequest(
        feature_id="test-feat",
        mission_id="test-mission",
        task_id="test-task",
        task_type="component-match",
        task_content=task_content,
        submission={"matches": {"c1": "c2", "c2": "c1"}}
    )
    res_incorrect = evaluate_submission(req_incorrect)
    assert res_incorrect.isCorrect is False
    assert res_incorrect.scoreReward == 0
    print("[SUCCESS] Component Matcher incorrect submission verified.")

def test_scoring_sorter():
    print("[TEST] Running Boundary Sorter scoring test...")
    task_content = MissionTaskContent(
        boundaryItems=[
            {"id": "b1", "name": "app.py", "isInternal": True, "description": ""},
            {"id": "b2", "name": "Stripe API", "isInternal": False, "description": ""}
        ]
    )
    
    # Test correct sort
    req_correct = EvaluateRequest(
        feature_id="test-feat",
        mission_id="test-mission",
        task_id="test-task",
        task_type="boundary-sort",
        task_content=task_content,
        submission={"sorts": {"b1": True, "b2": False}}
    )
    res_correct = evaluate_submission(req_correct)
    assert res_correct.isCorrect is True
    print("[SUCCESS] Boundary Sorter correct submission verified.")
    
    # Test incorrect sort
    req_incorrect = EvaluateRequest(
        feature_id="test-feat",
        mission_id="test-mission",
        task_id="test-task",
        task_type="boundary-sort",
        task_content=task_content,
        submission={"sorts": {"b1": False, "b2": False}}
    )
    res_incorrect = evaluate_submission(req_incorrect)
    assert res_incorrect.isCorrect is False
    print("[SUCCESS] Boundary Sorter incorrect submission verified.")

def test_scoring_sequencer():
    print("[TEST] Running Data Flow Sequencer scoring test...")
    task_content = MissionTaskContent(
        flowSteps=[
            {"id": "s1", "stepNumber": 1, "text": "", "component": ""},
            {"id": "s2", "stepNumber": 2, "text": "", "component": ""},
            {"id": "s3", "stepNumber": 3, "text": "", "component": ""}
        ]
    )
    
    # Test correct sequence
    req_correct = EvaluateRequest(
        feature_id="test-feat",
        mission_id="test-mission",
        task_id="test-task",
        task_type="flow-sequence",
        task_content=task_content,
        submission={"sequence": ["s1", "s2", "s3"]}
    )
    res_correct = evaluate_submission(req_correct)
    assert res_correct.isCorrect is True
    print("[SUCCESS] Data Flow Sequencer correct submission verified.")
    
    # Test incorrect sequence
    req_incorrect = EvaluateRequest(
        feature_id="test-feat",
        mission_id="test-mission",
        task_id="test-task",
        task_type="flow-sequence",
        task_content=task_content,
        submission={"sequence": ["s2", "s1", "s3"]}
    )
    res_incorrect = evaluate_submission(req_incorrect)
    assert res_incorrect.isCorrect is False
    print("[SUCCESS] Data Flow Sequencer incorrect submission verified.")

def test_scoring_connector():
    print("[TEST] Running Connection Identifier scoring test...")
    task_content = MissionTaskContent(
        correctConnections=[
            ("app.py", "db.sql"),
            ("client.js", "app.py")
        ]
    )
    
    # Test correct connections (order-independent)
    req_correct = EvaluateRequest(
        feature_id="test-feat",
        mission_id="test-mission",
        task_id="test-task",
        task_type="connection-identify",
        task_content=task_content,
        submission={"connections": [["db.sql", "app.py"], ["client.js", "app.py"]]}
    )
    res_correct = evaluate_submission(req_correct)
    assert res_correct.isCorrect is True
    print("[SUCCESS] Connection Identifier correct submission verified.")
    
    # Test incorrect connections
    req_incorrect = EvaluateRequest(
        feature_id="test-feat",
        mission_id="test-mission",
        task_id="test-task",
        task_type="connection-identify",
        task_content=task_content,
        submission={"connections": [["client.js", "db.sql"]]}
    )
    res_incorrect = evaluate_submission(req_incorrect)
    assert res_incorrect.isCorrect is False
    print("[SUCCESS] Connection Identifier incorrect submission verified.")

if __name__ == "__main__":
    print("====================================================")
    print("     STARTING VIBE LEARN BACKEND ENGINE TESTS       ")
    print("====================================================")
    try:
        test_local_analysis()
        test_scoring_matcher()
        test_scoring_sorter()
        test_scoring_sequencer()
        test_scoring_connector()
        print("====================================================")
        print("    ALL VIBE LEARN BACKEND TESTS PASSED SUCCESSFULLY ")
        print("====================================================")
    except AssertionError as e:
        print(f"\n[TEST FAILED] Assertion Error: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[TEST FAILED] Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
