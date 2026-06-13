import os
import sys

# Ensure backend folder is in path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import analyze_codebase, evaluate_submission
from analyzer.models import AnalyzeRequest, EvaluateRequest, MissionTaskContent
from analyzer.syntax_analyzer import SyntaxAnalyzer
from analyzer.engineering_analyzer import EngineeringAnalyzer

def test_syntax_analyzer():
    print("[TEST] Running Syntax Analyzer test...")
    workspace_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    analyzer = SyntaxAnalyzer() # Offline mode
    missions = analyzer.analyze(workspace_path, ["backend/main.py", "webview-ui/src/App.tsx"])
    
    assert len(missions) > 0
    mission = missions[0]
    assert mission.pillar == "syntax"
    assert len(mission.tasks) == 5
    
    task_types = [t.type for t in mission.tasks]
    assert "syntax-intent" in task_types
    assert "syntax-spotlight" in task_types
    assert "lib-rationale" in task_types
    assert "syntax-predict" in task_types
    assert "syntax-rebuild" in task_types
    print("[SUCCESS] Syntax Analyzer offline mode verified.")

def test_engineering_analyzer():
    print("[TEST] Running Engineering Analyzer test...")
    workspace_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    analyzer = EngineeringAnalyzer() # Offline mode
    missions = analyzer.analyze(workspace_path)
    
    assert len(missions) > 0
    mission = missions[0]
    assert mission.pillar == "engineering_decisions"
    assert len(mission.tasks) == 5
    
    task_types = [t.type for t in mission.tasks]
    assert "eng-problem" in task_types
    assert "eng-simulator" in task_types
    assert "eng-failure" in task_types
    assert "eng-tradeoffs" in task_types
    assert "alternative-ranker" in task_types
    print("[SUCCESS] Engineering Analyzer offline mode verified.")

def test_scoring_syntax_tasks():
    print("[TEST] Running Syntax Tasks scoring evaluation test...")
    
    # 1. syntax-intent MCQ
    t_intent = MissionTaskContent(correctOptionIndex=1)
    req = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t1",
        task_type="syntax-intent", task_content=t_intent,
        submission={"optionIndex": 1}
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    assert res.scoreReward == 20

    # 2. syntax-spotlight token clicking
    t_spotlight = MissionTaskContent(correctTokenIndices=[3])
    req = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t2",
        task_type="syntax-spotlight", task_content=t_spotlight,
        submission={"selectedTokenIndices": [3]}
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    assert res.scoreReward == 25

    # 3. syntax-rebuild fill-in-the-blanks
    t_rebuild = MissionTaskContent(blanks=[{"id": "b1", "correctAnswer": "await"}])
    req = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t3",
        task_type="syntax-rebuild", task_content=t_rebuild,
        submission={"answers": {"b1": "await"}}
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    assert res.scoreReward == 30
    print("[SUCCESS] Syntax scoring evaluations verified.")

def test_scoring_engineering_tasks():
    print("[TEST] Running Engineering Tasks scoring evaluation test...")
    
    # 1. eng-simulator
    t_sim = MissionTaskContent(
        choices=[
            {"techName": "SQLite", "isRecommended": True, "correctRationaleIndex": 0},
            {"techName": "Postgres", "isRecommended": False, "correctRationaleIndex": 1}
        ],
        requiredKeywords=["budget", "hosting"]
    )
    # Correct choices & justification
    req = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t4",
        task_type="eng-simulator", task_content=t_sim,
        submission={
            "choiceIndex": 0,
            "rationaleIndex": 0,
            "justification": "This choice fits the zero budget constraints because hosting files is free."
        }
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    assert res.scoreReward == 35

    # 2. eng-failure
    t_failure = MissionTaskContent(correctDiagnosisIndex=1, correctMitigationIndex=1)
    req = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t5",
        task_type="eng-failure", task_content=t_failure,
        submission={"diagnosisIndex": 1, "mitigationIndex": 1}
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    assert res.scoreReward == 30

    # 3. eng-tradeoffs
    t_tradeoffs = MissionTaskContent(benefits=["BenefitA"], drawbacks=["DrawbackB"])
    req = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t6",
        task_type="eng-tradeoffs", task_content=t_tradeoffs,
        submission={"benefits": ["BenefitA"], "drawbacks": ["DrawbackB"]}
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    assert res.scoreReward == 25

    # 4. alternative-ranker
    t_ranker = MissionTaskContent(correctRanking=[0, 1, 2], requiredKeywords=["resilient"])
    req = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t7",
        task_type="alternative-ranker", task_content=t_ranker,
        submission={"ranking": [0, 1, 2], "justification": "Distributed cache is highly resilient."}
    )
    res = evaluate_submission(req)
    assert res.isCorrect is True
    assert res.scoreReward == 30
    print("[SUCCESS] Engineering scoring evaluations verified.")

def test_retry_penalties():
    print("[TEST] Running Retry Penalties test...")
    t_intent = MissionTaskContent(correctOptionIndex=1)

    # First attempt: 100%
    req1 = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t1",
        task_type="syntax-intent", task_content=t_intent,
        submission={"optionIndex": 1, "attempt": 1}
    )
    res1 = evaluate_submission(req1)
    assert res1.isCorrect is True
    assert res1.scoreReward == 20
    assert res1.xpGained == 50

    # Second attempt: 50%
    req2 = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t1",
        task_type="syntax-intent", task_content=t_intent,
        submission={"optionIndex": 1, "attempt": 2}
    )
    res2 = evaluate_submission(req2)
    assert res2.isCorrect is True
    assert res2.scoreReward == 10
    assert res2.xpGained == 25
    assert "[Retry Correct - 50% Penalty]" in res2.feedback

    # Third attempt: 0%
    req3 = EvaluateRequest(
        feature_id="f1", mission_id="m1", task_id="t1",
        task_type="syntax-intent", task_content=t_intent,
        submission={"optionIndex": 1, "attempt": 3}
    )
    res3 = evaluate_submission(req3)
    assert res3.isCorrect is True
    assert res3.scoreReward == 0
    assert res3.xpGained == 0
    assert "[Exceeded Retries - 0% Score]" in res3.feedback
    print("[SUCCESS] Retry penalties verified.")

if __name__ == "__main__":
    print("====================================================")
    print("   STARTING VIBE LEARN PHASE 3 BACKEND TESTS        ")
    print("====================================================")
    try:
        test_syntax_analyzer()
        test_engineering_analyzer()
        test_scoring_syntax_tasks()
        test_scoring_engineering_tasks()
        test_retry_penalties()
        print("====================================================")
        print("    ALL PHASE 3 BACKEND TESTS PASSED SUCCESSFULLY   ")
        print("====================================================")
    except AssertionError as e:
        print(f"\n[TEST FAILED] Assertion Error: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[TEST FAILED] Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
