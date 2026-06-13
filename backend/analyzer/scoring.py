import os
import json
import re
from typing import Dict, Any
import google.generativeai as genai
from analyzer.models import MissionTaskContent
from analyzer.xp_config import XP_TABLE

def evaluate_task(
    feature_id: str,
    mission_id: str,
    task_id: str,
    task_type: str,
    task_content: MissionTaskContent,
    submission: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Grading engine for all Vibe Learn tasks (Phase 1, 2, 3 & 4).
    """
    is_correct = False
    feedback = ""
    xp_reward = XP_TABLE.get(task_type, 40)
    score_reward = 25 # Pillar percentage increase

    # ==================== PHASE 1 TASK EVALUATIONS ====================

    # 1. Component matching
    if task_type == "component-match":
        matches = submission.get("matches", {})
        correct = True
        incorrect_items = []
        items = task_content.matchingItems or []
        for item in items:
            item_id = item.get("id")
            if matches.get(item_id) != item_id:
                correct = False
                incorrect_items.append(item.get("name", "Unknown"))
        is_correct = correct
        if is_correct:
            feedback = "Legendary! You correctly aligned all codebase components with their technical duties."
            xp_reward = 50
            score_reward = 30
        else:
            feedback = f"Incorrect matching. Review the code structure responsibilities for: {', '.join(incorrect_items)}."
            xp_reward = 10
            score_reward = 0

    # 2. Boundary sorting
    elif task_type == "boundary-sort":
        sorts = submission.get("sorts", {})
        correct = True
        incorrect_items = []
        items = task_content.boundaryItems or []
        for item in items:
            item_id = item.get("id")
            submitted_val = sorts.get(item_id)
            expected_val = item.get("isInternal", True)
            if submitted_val is None or bool(submitted_val) != bool(expected_val):
                correct = False
                incorrect_items.append(item.get("name", "Unknown"))
        is_correct = correct
        if is_correct:
            feedback = "Boundary Secured! You successfully separated internal modules from third-party services."
            xp_reward = 50
            score_reward = 25
        else:
            feedback = f"System boundary sorting failed. Check classification of: {', '.join(incorrect_items)}."
            xp_reward = 10
            score_reward = 0

    # 3. Flow sequencing
    elif task_type == "flow-sequence":
        sequence = submission.get("sequence", [])
        steps = task_content.flowSteps or []
        correct_steps = sorted(steps, key=lambda x: x.get("stepNumber", 0))
        correct_order = [s.get("id") for s in correct_steps]
        is_correct = (list(sequence) == correct_order)
        if is_correct:
            feedback = "Sequence Synced! You traced the request lifecycle perfectly from initialization to response handler."
            xp_reward = 60
            score_reward = 35
        else:
            feedback = "Logical flow error. The request components are executed in a different order."
            xp_reward = 15
            score_reward = 0

    # 4. Connection identification
    elif task_type == "connection-identify":
        connections = submission.get("connections", [])
        correct_connections = task_content.correctConnections or []
        submitted_set = {tuple(sorted(c)) for c in connections if len(c) == 2}
        correct_set = {tuple(sorted(c)) for c in correct_connections if len(c) == 2}
        is_correct = (submitted_set == correct_set)
        if is_correct:
            feedback = "Connections Mapped! You identified the exact network & import dependencies."
            xp_reward = 60
            score_reward = 30
        else:
            feedback = "Dependency map mismatch. You identified extra or missing connection paths."
            xp_reward = 15
            score_reward = 0

    # ==================== PHASE 2 TASK EVALUATIONS ====================

    # 5. Path tracing (System Logic)
    elif task_type == "trace-path":
        sequence = submission.get("sequence", []) # List of step IDs in user order
        steps = task_content.steps or []
        correct_steps = sorted(steps, key=lambda x: x.get("order", 0))
        correct_order = [s.get("id") for s in correct_steps]
        total_steps = len(correct_order)
        
        # Calculate correctly placed steps
        correctly_placed = 0
        for i in range(min(len(sequence), total_steps)):
            if sequence[i] == correct_order[i]:
                correctly_placed += 1
                
        score = int((correctly_placed / total_steps) * 100) if total_steps > 0 else 0
        is_correct = (score == 100)
        score_reward = int(25 * (score / 100)) # Scale score reward
        
        if is_correct:
            feedback = "Workflow Synchronized! You traced the end-to-end event steps with 100% precision."
            xp_reward = 80
            score_reward = 30
        else:
            feedback = f"Partial Credit: {correctly_placed}/{total_steps} steps in correct order. Try adjusting the misplaced steps."
            xp_reward = int(40 * (correctly_placed / total_steps))
            score_reward = int(25 * (correctly_placed / total_steps))

    # 6. Event MCQ (System Logic MCQ, Missing step, Failure check)
    elif task_type == "event-mcq":
        option_index = submission.get("optionIndex")
        correct_index = task_content.correctOptionIndex
        is_correct = (option_index == correct_index)
        
        if is_correct:
            feedback = f"Correct! {task_content.explanation or ''}"
            xp_reward = 50
            score_reward = 20
        else:
            feedback = "Incorrect decision. Think about the execution causality and retry."
            xp_reward = 10
            score_reward = 0

    # 7. File Investigator progressive questionnaire
    elif task_type == "file-investigator":
        sub_q1 = submission.get("q1") # Index chosen
        sub_q2 = submission.get("q2") # Index chosen
        sub_q3 = submission.get("q3", []) # List of dependencies chosen

        q_list = task_content.questionsList or []
        correct_q1 = q_list[0]["correct"] if len(q_list) > 0 else 0
        correct_q2 = q_list[1]["correct"] if len(q_list) > 1 else 0
        correct_q3 = q_list[2]["correct"] if len(q_list) > 2 else []

        q1_score = 100 if sub_q1 == correct_q1 else 0
        q2_score = 100 if sub_q2 == correct_q2 else 0
        q3_score = 100 if set(sub_q3) == set(correct_q3) else 0

        # Weighted score: 30% / 30% / 40%
        score = int(0.3 * q1_score + 0.3 * q2_score + 0.4 * q3_score)
        is_correct = (score == 100)
        
        if is_correct:
            feedback = "Investigation Complete! You accurately identified the file's duties, separation rationale, and import dependencies."
            xp_reward = 70
            score_reward = 35
        else:
            feedback = f"Investigation incomplete. Match rate: {score}%. Verify which imports are outgoing and check your MCQ responses."
            xp_reward = int(30 * (score / 100))
            score_reward = 0

    # 8. Dependency Map (Dependent -> Dependency Edge Drawing)
    elif task_type == "dependency-map":
        edges = submission.get("edges", []) # list of [from, to]
        correct_edges = task_content.correctEdges or []
        
        submitted_set = {tuple(e) for e in edges if len(e) == 2}
        correct_set = {tuple(e) for e in correct_edges if len(e) == 2}
        
        correct_count = 0
        wrong_direction_count = 0
        
        for edge in submitted_set:
            if edge in correct_set:
                correct_count += 1
            elif (edge[1], edge[0]) in correct_set:
                # User drew it backward: Dependency -> Dependent instead of Dependent -> Dependency
                wrong_direction_count += 1
                
        total_edges = len(correct_set)
        if total_edges > 0:
            # Wrong direction yields 50% credit penalty for that specific edge
            score = int(((correct_count + (wrong_direction_count * 0.5)) / total_edges) * 100)
            score = max(0, min(100, score))
        else:
            score = 100
            
        is_correct = (score == 100)
        if is_correct:
            feedback = "Dependency Map Complete! You plotted all imports and dependent directions perfectly."
            xp_reward = 80
            score_reward = 30
        else:
            feedback = f"Imports map incomplete (Score: {score}%). "
            if wrong_direction_count > 0:
                feedback += f"Heads up: {wrong_direction_count} connections were drawn in the WRONG direction (Dependency -> Dependent instead of Dependent -> Dependency)."
            else:
                feedback += "Identify which components are import targets of others and retry."
            xp_reward = int(40 * (score / 100))
            score_reward = int(25 * (score / 100))

    # 9. Function Reconstructor (3 phases)
    elif task_type == "func-rebuild":
        sub = submission # contains phase1, phase2, phase3 structures
        
        # Phase 1: Inputs
        phase1_correct = (set(sub.get("phase1", {}).get("inputs", [])) == set(task_content.correctInputs or []))
        p1_score = 100 if phase1_correct else 0
        
        # Phase 2: Chronological steps
        p2_seq = sub.get("phase2", {}).get("sequence", [])
        correct_p2_steps = sorted(task_content.steps or [], key=lambda x: x.get("order", 0))
        correct_p2_order = [s.get("id") for s in correct_p2_steps]
        p2_placed = 0
        for i in range(min(len(p2_seq), len(correct_p2_order))):
            if p2_seq[i] == correct_p2_order[i]:
                p2_placed += 1
        p2_score = int((p2_placed / len(correct_p2_order)) * 100) if correct_p2_order else 100
        
        # Phase 3: Error Matching
        p3_matches = sub.get("phase3", {}).get("errorMatches", {})
        p3_correct = True
        err_items = task_content.errorList or []
        for item in err_items:
            err_type = item.get("type")
            err_when = item.get("when")
            if p3_matches.get(err_type) != err_when:
                p3_correct = False
        p3_score = 100 if p3_correct else 0

        score = int((p1_score + p2_score + p3_score) / 3)
        is_correct = (score == 100)
        
        if is_correct:
            feedback = "Function Reconstructed! You mapped parameters, step sequences, and exception boundaries perfectly."
            xp_reward = 90
            score_reward = 35
        else:
            feedback = f"Reconstruction incomplete (Avg Score: {score}%). Phase 1: {p1_score}%, Phase 2: {p2_score}%, Phase 3: {p3_score}%."
            xp_reward = int(45 * (score / 100))
            score_reward = int(25 * (score / 100))

    # 10. IO Identifier (Inputs/Outputs matching + Return MCQ)
    elif task_type == "io-mapper":
        sub_inputs = set(submission.get("inputs", []))
        sub_outputs = set(submission.get("outputs", []))
        sub_return = submission.get("returnType", "")
        
        correct_inputs = set(task_content.correctInputs or [])
        correct_outputs = set(task_content.correctOutputs or [])
        correct_return = task_content.correctReturnType
        
        total_vars = len(correct_inputs) + len(correct_outputs)
        correct_placements = 0
        
        for val in sub_inputs:
            if val in correct_inputs:
                correct_placements += 1
        for val in sub_outputs:
            if val in correct_outputs:
                correct_placements += 1
                
        placement_score = (correct_placements / total_vars) * 100 if total_vars > 0 else 100
        return_score = 100 if sub_return == correct_return else 0
        
        score = int(0.8 * placement_score + 0.2 * return_score)
        is_correct = (score == 100)
        
        if is_correct:
            feedback = "Variable scopes verified! You accurately isolated input parameters, outcome mutations, and call signatures."
            xp_reward = 70
            score_reward = 30
        else:
            feedback = f"Scope sorting mismatch (Score: {score}%). Verify which variables are arguments vs return identifiers."
            xp_reward = int(35 * (score / 100))
            score_reward = 0

    # 11. Reconstruct Text (Explain in your own words - Active Recall)
    elif task_type == "reconstruct-text":
        user_explanation = submission.get("explanation", "")
        expected_concepts = task_content.expectedConcepts or []
        sample_sol = task_content.sampleSolution or ""
        
        api_key = os.getenv("GEMINI_API_KEY")
        
        if api_key:
            # Gemini-powered semantic review
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel(
                    'gemini-1.5-flash',
                    generation_config={"response_mime_type": "application/json"}
                )
                prompt = f"""
You are an AI programming tutor reviewing a developer's text explanation of a codebase logic.
The user is asked: "Explain in your own words how this codebase logic performs its operations."

User explanation: "{user_explanation}"
Key technical concepts/terms that MUST be referenced or explained: {json.dumps(expected_concepts)}
Sample solution for reference: "{sample_sol}"

Evaluate the response. If the user's description is semantically correct and addresses the core ideas, give a high score.
Be encouraging but strict. Do not award full score for generic or empty responses.

Output ONLY a JSON block matching this structure:
{{
  "score": 85,
  "feedback": "Encouraging comments explaining why they did well or what is missing."
}}
"""
                response = model.generate_content(prompt)
                res_data = json.loads(response.text)
                
                score = res_data.get("score", 0)
                feedback = res_data.get("feedback", "Completed evaluation.")
                is_correct = (score >= 70) # 70% passing threshold for recall
                
            except Exception as e:
                # Fallback to local regex check if API error
                is_correct, score, feedback = evaluate_reconstruct_text_local(user_explanation, expected_concepts)
        else:
            # Offline regex check
            is_correct, score, feedback = evaluate_reconstruct_text_local(user_explanation, expected_concepts)

        if is_correct:
            xp_reward = int(60 * (score / 100))
            score_reward = int(40 * (score / 100))
        else:
            xp_reward = int(30 * (score / 100))
            score_reward = 0

    # ==================== PHASE 3 TASK EVALUATIONS ====================

    # 12. Syntax MCQ (`syntax-intent`)
    elif task_type == "syntax-intent":
        option_index = submission.get("optionIndex")
        correct_index = task_content.correctOptionIndex
        is_correct = (option_index == correct_index)
        if is_correct:
            feedback = f"Correct! {task_content.explanation or ''}"
            xp_reward = 50
            score_reward = 20
        else:
            feedback = "Incorrect interpretation of syntax. Think about what this code structure prevents or executes."
            xp_reward = 10
            score_reward = 0

    # 13. Syntax Spotlight (`syntax-spotlight`)
    elif task_type == "syntax-spotlight":
        selected_indices = submission.get("selectedTokenIndices", [])
        if not selected_indices and submission.get("selectedTokenIndex") is not None:
            selected_indices = [submission.get("selectedTokenIndex")]
        correct_indices = task_content.correctTokenIndices or []
        is_correct = set(selected_indices) == set(correct_indices)
        if is_correct:
            feedback = f"Correct token identified! {task_content.explanation or ''}"
            xp_reward = 60
            score_reward = 25
        else:
            feedback = f"Incorrect token highlighted. Search carefully for the {task_content.targetPatternType or 'construct'} operator."
            xp_reward = 15
            score_reward = 0

    # 14. Library Rationale MCQ (`lib-rationale`)
    elif task_type == "lib-rationale":
        option_index = submission.get("optionIndex")
        correct_index = task_content.correctOptionIndex
        is_correct = (option_index == correct_index)
        if is_correct:
            feedback = f"Correct! {task_content.explanation or ''}"
            xp_reward = 50
            score_reward = 20
        else:
            feedback = f"Incorrect library description. Think about why the system imports {task_content.packageName}."
            xp_reward = 10
            score_reward = 0

    # 15. Syntax Predict (`syntax-predict`)
    elif task_type == "syntax-predict":
        option_index = submission.get("optionIndex")
        correct_index = task_content.correctOptionIndex
        is_correct = (option_index == correct_index)
        if is_correct:
            feedback = f"Correct prediction! {task_content.explanation or ''}"
            xp_reward = 60
            score_reward = 25
        else:
            feedback = "Incorrect output prediction. Trace the code execution paths under the specified inputs."
            xp_reward = 10
            score_reward = 0

    # 16. Syntax Rebuild (`syntax-rebuild`)
    elif task_type == "syntax-rebuild":
        answers = submission.get("answers", {})
        blanks = task_content.blanks or []
        correct = True
        for b in blanks:
            bid = b.get("id")
            correct_val = b.get("correctAnswer")
            if answers.get(bid) != correct_val:
                correct = False
                break
        is_correct = correct
        if is_correct:
            feedback = f"Reconstruction successful! {task_content.explanation or ''}"
            xp_reward = 70
            score_reward = 30
        else:
            feedback = "Incorrect keyword filled in. Review language syntax rules."
            xp_reward = 15
            score_reward = 0

    # 17. Engineering Problem MCQ (`eng-problem`)
    elif task_type == "eng-problem":
        option_index = submission.get("optionIndex")
        correct_index = task_content.correctOptionIndex
        is_correct = (option_index == correct_index)
        if is_correct:
            feedback = f"Correct choice! {task_content.explanation or ''}"
            xp_reward = 50
            score_reward = 20
        else:
            feedback = "Incorrect architectural choice. Review constraints and bottleneck causes."
            xp_reward = 10
            score_reward = 0

    # 18. Decision Simulator (`eng-simulator`)
    elif task_type == "eng-simulator":
        choice_index = submission.get("choiceIndex")
        rationale_index = submission.get("rationaleIndex")
        justification = submission.get("justification", "")
        
        choices = task_content.choices or []
        
        if choice_index is not None and 0 <= choice_index < len(choices):
            selected_choice = choices[choice_index]
            choice_correct = selected_choice.get("isRecommended", False)
            rationale_correct = (rationale_index == selected_choice.get("correctRationaleIndex"))
        else:
            choice_correct = False
            rationale_correct = False
            selected_choice = {}

        req_keywords = task_content.requiredKeywords or []
        justification_correct = False
        keyword_matches = []
        if req_keywords:
            text_lower = justification.lower()
            for kw in req_keywords:
                if kw.lower() in text_lower:
                    keyword_matches.append(kw)
            justification_correct = (len(keyword_matches) >= len(req_keywords) * 0.5)
        else:
            justification_correct = True
            
        is_correct = choice_correct and rationale_correct and justification_correct
        
        api_key = os.getenv("GEMINI_API_KEY")
        if is_correct and api_key and justification:
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel(
                    'gemini-1.5-flash',
                    generation_config={"response_mime_type": "application/json"}
                )
                prompt = f"""
You are an AI Architecture Reviewer evaluating an engineering justification.
Scenario: "{task_content.scenario}"
Chosen tech: "{selected_choice.get('techName')}"
User justification: "{justification}"
Required keywords: {json.dumps(req_keywords)}

Verify if the justification makes sense. Output JSON only:
{{
  "is_valid": true,
  "feedback": "Why the rationale fits."
}}
"""
                response = model.generate_content(prompt)
                res_data = json.loads(response.text)
                if not res_data.get("is_valid", False):
                    is_correct = False
                    feedback = f"Choice and rationale matched, but written justification was insufficient: {res_data.get('feedback')}"
            except Exception:
                pass
                
        if is_correct:
            feedback = f"Architecture Decision Approved! {task_content.explanation or ''}"
            xp_reward = 90
            score_reward = 35
        else:
            if not choice_correct:
                feedback = "Failed Constraint Simulation. The chosen component violates project constraints."
            elif not rationale_correct:
                feedback = "Stack choice correct, but selected rationale mismatch. Make sure explanation aligns with tech properties."
            else:
                feedback = f"Justification too weak. Ensure you explain why this choice solves the scenario using terms like: {', '.join(req_keywords)} (Matched: {len(keyword_matches)}/{len(req_keywords)})."
            xp_reward = 15
            score_reward = 0

    # 19. Failure Analysis (`eng-failure`)
    elif task_type == "eng-failure":
        diagnosis_index = submission.get("diagnosisIndex")
        mitigation_index = submission.get("mitigationIndex")
        
        diag_correct = (diagnosis_index == task_content.correctDiagnosisIndex)
        mit_correct = (mitigation_index == task_content.correctMitigationIndex)
        
        is_correct = diag_correct and mit_correct
        if is_correct:
            feedback = f"Root cause resolved! {task_content.explanation or ''}"
            xp_reward = 80
            score_reward = 30
        else:
            if not diag_correct and not mit_correct:
                feedback = "Incorrect diagnosis and mitigation options selected. Re-read the logs carefully."
            elif not diag_correct:
                feedback = "Incorrect root cause diagnosis. Check database connections leaks."
            else:
                feedback = "Diagnosis correct, but selected mitigation fails to prevent the leak from happening. Select the cleanup context manager."
            xp_reward = 15
            score_reward = 0

    # 20. Tradeoffs Sorter (`eng-tradeoffs`)
    elif task_type == "eng-tradeoffs":
        sub_benefits = submission.get("benefits", [])
        sub_drawbacks = submission.get("drawbacks", [])
        
        correct_benefits = set(task_content.benefits or [])
        correct_drawbacks = set(task_content.drawbacks or [])
        
        is_correct = (set(sub_benefits) == correct_benefits) and (set(sub_drawbacks) == correct_drawbacks)
        if is_correct:
            feedback = "Trade-offs sorted correctly! You balanced benefits and limitations perfectly."
            xp_reward = 60
            score_reward = 25
        else:
            feedback = "Incorrect tradeoffs classification. Review what is a benefit versus what is a drawback."
            xp_reward = 10
            score_reward = 0

    # 21. Alternative Ranker (`alternative-ranker` or `eng-alternative-ranker`)
    elif task_type == "alternative-ranker" or task_type == "eng-alternative-ranker":
        ranking = submission.get("ranking", [])
        justification = submission.get("justification", "")
        correct_ranking = task_content.correctRanking or []
        
        ranking_correct = (list(ranking) == list(correct_ranking))
        
        req_keywords = task_content.requiredKeywords or []
        keyword_matches = []
        if req_keywords:
            text_lower = justification.lower()
            for kw in req_keywords:
                if kw.lower() in text_lower:
                    keyword_matches.append(kw)
            justification_correct = (len(keyword_matches) >= len(req_keywords) * 0.5)
        else:
            justification_correct = True
            
        is_correct = ranking_correct and justification_correct
        if is_correct:
            feedback = f"Ranking Approved! {task_content.explanation or ''}"
            xp_reward = 80
            score_reward = 30
        else:
            if not ranking_correct:
                feedback = "Incorrect ranking order. Consider resilience and scalability constraints."
            else:
                feedback = f"Ranking order correct, but explanation is missing keywords. Write a detailed justification utilizing terms: {', '.join(req_keywords)}."
            xp_reward = 15
            score_reward = 0

    # ==================== PHASE 4 CONCEPT TASK EVALUATIONS ====================

    elif task_type == "concept-discovery":
        option_index = submission.get("optionIndex")
        correct_index = task_content.correctOptionIndex
        is_correct = (option_index == correct_index)
        if is_correct:
            feedback = f"Discovery Successful! {task_content.explanation or ''}"
            xp_reward = 80
            score_reward = 20
        else:
            feedback = "Incorrect file choice. Review the concept keywords and locate where it is applied."
            xp_reward = 10
            score_reward = 0

    elif task_type == "concept-mcq":
        q_idx = submission.get("questionIndex", 0)
        option_index = submission.get("optionIndex")
        q_list = task_content.questionsList or []
        if 0 <= q_idx < len(q_list):
            correct_val = q_list[q_idx].get("correct")
            is_correct = (option_index == correct_val)
            if is_correct:
                feedback = f"Correct! Stage {q_idx + 1} comprehension secured."
                xp_reward = 33
                score_reward = 10
            else:
                feedback = "Incorrect answer. Think about the concept properties and try again."
                xp_reward = 5
                score_reward = 0
        else:
            is_correct = False
            feedback = "Invalid question index submitted."
            xp_reward = 0
            score_reward = 0

    elif task_type == "concept-prereq-map":
        user_selection = submission.get("selectedConcepts", [])
        user_order = submission.get("orderedPath", [])
        correct_selection = task_content.correctSelection or []
        correct_order = task_content.correctOrder or []
        selection_correct = (set(user_selection) == set(correct_selection))
        order_correct = (list(user_order) == list(correct_order))
        score = 0
        if selection_correct:
            score += 50
        if order_correct:
            score += 50
        is_correct = (score == 100)
        xp_reward = int(80 * (score / 100))
        score_reward = int(20 * (score / 100))
        if is_correct:
            feedback = f"Prerequisite Path Verified! {task_content.explanation or ''}"
        else:
            if not selection_correct:
                feedback = f"Prerequisite Map Mismatch (Score: {score}%). The selected concepts do not match the true prerequisites."
            else:
                feedback = f"Selection correct, but chronological ordering is incorrect (Score: {score}%). Arrange prerequisites before their downstream target."

    elif task_type == "concept-apply":
        option_index = submission.get("optionIndex")
        correct_index = task_content.correctOptionIndex
        is_correct = (option_index == correct_index)
        if is_correct:
            feedback = f"Application Mastery Secured! {task_content.explanation or ''}"
            xp_reward = 150
            score_reward = 30
        else:
            feedback = "Incorrect bug diagnosis. Inspect the code snippet's logic and retry."
            xp_reward = 20
            score_reward = 0

    elif task_type == "concept-reconstruction":
        user_explanation = submission.get("explanation", "")
        expected_concepts = task_content.expectedConcepts or []
        sample_sol = task_content.sampleSolution or ""
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel(
                    'gemini-1.5-flash',
                    generation_config={"response_mime_type": "application/json"}
                )
                prompt = f"""
You are an AI programming tutor evaluating a developer's free-text recall of a programming concept.
Concept: "{task_content.targetConcept}"
User explanation: "{user_explanation}"
Key terms/ideas that should be referenced: {json.dumps(expected_concepts)}
Sample answer: "{sample_sol}"

Evaluate the response. If the user's description is semantically correct, give a high score.
Output ONLY a JSON block:
{{
  "score": 85,
  "feedback": "Encouraging comments explaining why they did well or what is missing."
}}
"""
                response = model.generate_content(prompt)
                res_data = json.loads(response.text)
                score = res_data.get("score", 0)
                feedback = res_data.get("feedback", "Completed recall review.")
                is_correct = (score >= 70)
            except Exception:
                is_correct, score, feedback = evaluate_reconstruct_text_local(user_explanation, expected_concepts)
        else:
            is_correct, score, feedback = evaluate_reconstruct_text_local(user_explanation, expected_concepts)
        xp_reward = int(150 * (score / 100))
        score_reward = int(30 * (score / 100))

    # Apply retry penalty
    attempt = submission.get("attempt", 1)
    if is_correct:
        if attempt == 2:
            xp_reward = max(1, xp_reward // 2)
            score_reward = max(1, score_reward // 2)
            feedback = f"[Retry Correct - 50% Penalty] {feedback}"
        elif attempt > 2:
            xp_reward = 0
            score_reward = 0
            feedback = f"[Exceeded Retries - 0% Score] {feedback}"

    return {
        "isCorrect": is_correct,
        "xpGained": xp_reward,
        "scoreReward": score_reward,
        "feedback": feedback
    }

def evaluate_reconstruct_text_local(user_text: str, expected_concepts: List[str]) -> tuple:
    """
    Offline keyword regex matcher for text explanations.
    """
    if not expected_concepts:
        return True, 100, "Offline evaluation complete. Nice description!"
        
    text_lower = user_text.lower()
    matched = []
    
    for concept in expected_concepts:
        if concept.lower() in text_lower:
            matched.append(concept)
            
    score = int((len(matched) / len(expected_concepts)) * 100)
    is_correct = (score >= 60) # 60% passing threshold offline
    
    feedback = f"[Offline Evaluator] Matching concepts found: {len(matched)}/{len(expected_concepts)} ({', '.join(matched)}). "
    if is_correct:
        feedback += "Great description! You covered the core logic concepts."
    else:
        feedback += f"Explanation too brief or missing core components. Ensure you explain: {', '.join(expected_concepts)}."
        
    return is_correct, score, feedback
