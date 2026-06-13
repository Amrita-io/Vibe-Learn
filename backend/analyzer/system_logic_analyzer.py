import os
import json
import google.generativeai as genai
from typing import Dict, List, Any
from analyzer.models import Feature, Mission, MissionTask, MissionTaskContent
from analyzer.local_analyzer import LocalAnalyzer

class SystemLogicAnalyzer:
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        if self.api_key:
            genai.configure(api_key=self.api_key)

    def analyze(self, workspace_path: str, component_map: Dict[str, Any] = None) -> List[Mission]:
        if self.api_key:
            return self._analyze_gemini(workspace_path, component_map)
        else:
            return self._analyze_local(workspace_path, component_map)

    def _analyze_local(self, workspace_path: str, component_map: Dict[str, Any] = None) -> List[Mission]:
        print("[SystemLogicAnalyzer] Running offline rule-based analysis...")
        
        # We will synthesize two typical system flows based on architecture context
        missions = []

        # Flow 1: User Request-Response Lifecycle
        flow1_steps = [
            {"id": "s1", "order": 1, "component": "Frontend UI", "action": "Triggers fetch request on user click"},
            {"id": "s2", "order": 2, "component": "Backend Router", "action": "Interceptors catch incoming request & check CORS"},
            {"id": "s3", "order": 3, "component": "Auth Middleware", "action": "Verifies session token headers"},
            {"id": "s4", "order": 4, "component": "Service Handler", "action": "Queries database for requested records"},
            {"id": "s5", "order": 5, "component": "Database Layer", "action": "Executes SELECT query and yields cursor"},
            {"id": "s6", "order": 6, "component": "Backend Router", "action": "Serializes payload and emits HTTP 200 response"}
        ]
        
        # Task 1: Trace the path
        t1 = MissionTask(
            id="sys-trace-1",
            type="trace-path",
            prompt="Re-sequence the request execution flow in the correct order:",
            isCompleted=False,
            content=MissionTaskContent(
                workflowName="REST HTTP API Request Lifecycle",
                triggerDescription="Client calls server endpoint to fetch protected dashboard stats.",
                steps=flow1_steps
            )
        )

        # Task 2: Missing Step Detection
        # Omit step 3 (Auth Middleware checks session headers)
        omitted_step = flow1_steps[2]
        t2 = MissionTask(
            id="sys-missing-1",
            type="event-mcq", # We leverage MCQ engine for missing step select
            prompt="Below is the API query workflow, but one critical step has been bypassed! Identify the missing security step:",
            isCompleted=False,
            content=MissionTaskContent(
                workflowName="REST HTTP API Request Lifecycle (Bypassed)",
                question="Which step is missing between 'Backend Router Interceptors' and 'Service Handler Database Query'?",
                options=[
                    "Write logs to local disk",
                    "Auth Middleware: Verifies session token headers",
                    "Compile TypeScript files to JavaScript",
                    "Initialize global state cache"
                ],
                correctOptionIndex=1,
                explanation="Bypassing session header verification permits unauthenticated users to perform data queries, creating a severe security boundary flaw."
            )
        )

        # Task 3: Workflow Failure Analysis
        t3 = MissionTask(
            id="sys-failure-1",
            type="event-mcq",
            prompt="Analyze the workflow resilience to DB timeouts:",
            isCompleted=False,
            content=MissionTaskContent(
                workflowName="REST HTTP API Request Lifecycle (DB Outage)",
                question="What happens immediately if the Database Layer fails to yield a cursor at Step 5?",
                options=[
                    "The client retries every 10ms causing a DDOS loop",
                    "The backend router raises an unhandled timeout error and hangs the socket",
                    "The service handler catches the DatabaseException and returns an error payload",
                    "The database engine self-restarts and wipes session tokens"
                ],
                correctOptionIndex=2,
                explanation="Gracefully catching DB exceptions in the service handler ensures the server can respond with a meaningful error message (e.g. HTTP 503) instead of leaking stack traces."
            )
        )

        # Task 4: Active Recall Explanation
        t4 = MissionTask(
            id="sys-recall-1",
            type="reconstruct-text",
            prompt="Explain in your own words why input validation should occur at the Frontend boundary before triggering the Backend route:",
            isCompleted=False,
            content=MissionTaskContent(
                expectedConcepts=["bandwidth", "api", "load", "user experience", "validation"],
                sampleSolution="Frontend validation provides immediate user feedback without making a roundtrip network request, reducing backend API server load and saving user bandwidth."
            )
        )

        missions.append(Mission(
            id="m-sys-logic-1",
            pillar="system_logic",
            title="System Flow & Causality",
            description="Trace user HTTP lifecycles, identify omitted safety gates, and analyze database timeout events.",
            status="active",
            tasks=[t1, t2, t3, t4],
            xpReward=150,
            scoreReward=40
        ))

        return missions

    def _analyze_gemini(self, workspace_path: str, component_map: Dict[str, Any] = None) -> List[Mission]:
        # Gather directory details to provide to Gemini
        ignored_dirs = {'node_modules', '.git', '__pycache__', 'dist', 'build', 'out'}
        file_tree = []
        for root, dirs, files in os.walk(workspace_path):
            dirs[:] = [d for d in dirs if d not in ignored_dirs]
            for file in files:
                rel_path = os.path.relpath(os.path.join(root, file), workspace_path)
                file_tree.append(rel_path.replace("\\", "/"))

        try:
            model = genai.GenerativeModel(
                'gemini-1.5-flash',
                generation_config={"response_mime_type": "application/json"}
            )
            
            prompt = f"""
You are a System Logic & Causality Analyzer. Analyze the files in the workspace:
{json.dumps(file_tree, indent=2)}

Generate one detailed Mission under the pillar "system_logic".
The mission must contain exactly four tasks corresponding to these types:
1. "trace-path": User must sort workflow steps chronologically. Identify a major user-triggered workflow (e.g. database query, auth login, file save) and break it into 5-6 steps with 'component' and 'action' details.
2. "event-mcq" (Missing Step): Present the steps but omit one. Ask which step was omitted.
3. "event-mcq" (Failure Analysis): Ask what happens if a specific step fails or times out.
4. "reconstruct-text": Prompt the user to explain in their own words why a specific workflow design decision was made (e.g., why token authentication is used instead of session cookies, or why background queues handle tasks). Provide a list of "expectedConcepts" (key phrases/keywords) to look for.

Output must be a JSON object mapping directly to the "missions" key (a list of Mission structures):
{{
  "missions": [
    {{
      "id": "m-sys-logic-1",
      "pillar": "system_logic",
      "title": "Workflow Tracing & Causal Analysis",
      "description": "Analyze request lifecycles, workflow omissions, and runtime failures.",
      "status": "active",
      "xpReward": 180,
      "scoreReward": 45,
      "tasks": [
        {{
          "id": "sys-trace-1",
          "type": "trace-path",
          "prompt": "Arrange the steps of the [name] workflow in chronological order:",
          "isCompleted": false,
          "content": {{
            "workflowName": "Workflow Name",
            "triggerDescription": "Trigger Description",
            "steps": [
              {{ "id": "s1", "order": 1, "component": "Component name", "action": "Action description" }}
            ]
          }}
        }},
        {{
          "id": "sys-missing-1",
          "type": "event-mcq",
          "prompt": "Identify the missing step in this sequence:",
          "isCompleted": false,
          "content": {{
            "workflowName": "Workflow Name",
            "question": "What is the missing step?",
            "options": ["Option A", "Correct Answer Option", "Option C", "Option D"],
            "correctOptionIndex": 1,
            "explanation": "Why this is correct."
          }}
        }},
        {{
          "id": "sys-failure-1",
          "type": "event-mcq",
          "prompt": "Analyze failure scenarios for this workflow:",
          "isCompleted": false,
          "content": {{
            "workflowName": "Workflow Name",
            "question": "If component X crashes at step N, what happens?",
            "options": ["A", "B", "C", "D"],
            "correctOptionIndex": 0,
            "explanation": "Detail the runtime consequence."
          }}
        }},
        {{
          "id": "sys-recall-1",
          "type": "reconstruct-text",
          "prompt": "Explain in your own words why...",
          "isCompleted": false,
          "content": {{
            "expectedConcepts": ["keyword1", "keyword2", "keyword3"],
            "sampleSolution": "Representative solution description."
          }}
        }}
      ]
    }}
  ]
}}

Generate actual content based on the codebase structure. Ensure the JSON is valid.
"""
            response = model.generate_content(prompt)
            data = json.loads(response.text)
            missions = [Mission(**m) for m in data.get("missions", [])]
            if not missions:
                raise ValueError("No missions returned from Gemini")
            return missions
        except Exception as e:
            print(f"[SystemLogicAnalyzer] Gemini analysis failed: {str(e)}. Falling back to Local.")
            return self._analyze_local(workspace_path, component_map)
