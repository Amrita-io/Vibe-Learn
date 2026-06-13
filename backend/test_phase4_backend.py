import os
import sys

# Ensure backend folder is in path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import analyze_codebase, evaluate_submission
from analyzer.models import AnalyzeRequest, EvaluateRequest, MissionTaskContent
from analyzer.concept_analyzer import ConceptAnalyzer

def test_concept_analyzer():
    print("[TEST] Running Concept Analyzer test...")
    workspace_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    analyzer = ConceptAnalyzer() # Offline mode
    graph = analyzer.analyze(workspace_path)
    
    assert graph is not None
    assert len(graph.nodes) > 0
    assert len(graph.edges) > 0
    
    # Assert there is at least one node with available status
    available_nodes = [n for n in graph.nodes if n.status == "available"]
    assert len(available_nodes) > 0
    
    # Check that nodes have tasks
    node = graph.nodes[0]
    assert len(node.tasks) > 0
    print("[SUCCESS] Concept Analyzer offline mode verified.")

def test_scoring_concept_tasks():
    print("[TEST] Running Concept Tasks scoring evaluation test...")
    
    # 1. concept-discovery
    t_discovery = MissionTaskContent(correctOptionIndex=2, explanation="Located in test file")
    req = EvaluateRequest(
        feature_id="concepts", mission_id="cn_test", task_id="t_disc",
        task_type="concept-discovery", task_content=t_discovery,
        submission={"optionIndex": 2}
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    assert res.scoreReward == 20
    assert res.xpGained == 80

    # 2. concept-mcq
    t_mcq = MissionTaskContent(questionsList=[{"prompt": "Q1", "options": ["A", "B"], "correct": 1}])
    req = EvaluateRequest(
        feature_id="concepts", mission_id="cn_test", task_id="t_mcq",
        task_type="concept-mcq", task_content=t_mcq,
        submission={"questionIndex": 0, "optionIndex": 1}
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    assert res.scoreReward == 10
    assert res.xpGained == 33

    # 3. concept-prereq-map
    t_prereq = MissionTaskContent(correctSelection=["nodeA"], correctOrder=["nodeA"], explanation="Prereq order")
    req = EvaluateRequest(
        feature_id="concepts", mission_id="cn_test", task_id="t_prereq",
        task_type="concept-prereq-map", task_content=t_prereq,
        submission={"selectedConcepts": ["nodeA"], "orderedPath": ["nodeA"]}
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    assert res.scoreReward == 20
    assert res.xpGained == 80

    # 4. concept-apply
    t_apply = MissionTaskContent(correctOptionIndex=0, explanation="Apply option")
    req = EvaluateRequest(
        feature_id="concepts", mission_id="cn_test", task_id="t_apply",
        task_type="concept-apply", task_content=t_apply,
        submission={"optionIndex": 0}
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    assert res.scoreReward == 30
    assert res.xpGained == 150

    # 5. concept-reconstruction
    t_reconstruct = MissionTaskContent(targetConcept="ConceptA", expectedConcepts=["regex", "match"], sampleSolution="use regex to match")
    req = EvaluateRequest(
        feature_id="concepts", mission_id="cn_test", task_id="t_reconstruct",
        task_type="concept-reconstruction", task_content=t_reconstruct,
        submission={"explanation": "regex match is useful"}
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    assert res.scoreReward > 0
    assert res.xpGained > 0
    print("[SUCCESS] Concept scoring evaluations verified.")

if __name__ == "__main__":
    print("====================================================")
    print("   STARTING VIBE LEARN PHASE 4 BACKEND TESTS        ")
    print("====================================================")
    try:
        test_concept_analyzer()
        test_scoring_concept_tasks()
        print("====================================================")
        print("    ALL PHASE 4 BACKEND TESTS PASSED SUCCESSFULLY   ")
        print("====================================================")
    except AssertionError as e:
        print(f"\n[TEST FAILED] Assertion Error: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[TEST FAILED] Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
