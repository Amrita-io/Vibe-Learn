import os
import re
import json
import google.generativeai as genai
from typing import List, Dict, Any
from analyzer.models import Mission, MissionTask, MissionTaskContent

class EngineeringAnalyzer:
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        if self.api_key:
            genai.configure(api_key=self.api_key)

    def analyze(self, workspace_path: str) -> List[Mission]:
        if self.api_key:
            return self._analyze_gemini(workspace_path)
        else:
            return self._analyze_local(workspace_path)

    def _analyze_local(self, workspace_path: str) -> List[Mission]:
        print("[EngineeringAnalyzer] Running offline rule-based analysis...")
        
        # We will scan files in workspace_path to gather clues
        has_fastapi = False
        has_react = False
        has_sqlite = False
        has_cors = False

        ignored_dirs = {'node_modules', '.git', '__pycache__', 'dist', 'build', 'out'}
        for root, dirs, files in os.walk(workspace_path):
            dirs[:] = [d for d in dirs if d not in ignored_dirs]
            for file in files:
                if file == "package.json":
                    has_react = True
                if file == "requirements.txt":
                    has_fastapi = True
                if file.endswith(('.py', '.ts', '.tsx', '.js')):
                    full_path = os.path.join(root, file)
                    try:
                        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read().lower()
                            if 'sqlite' in content:
                                has_sqlite = True
                            if 'cors' in content or 'allow_origins' in content:
                                has_cors = True
                    except Exception:
                        pass

        tasks = []

        # 1. Problem-Driven MCQ (eng-problem)
        t1 = MissionTask(
            id="eng-problem-1",
            type="eng-problem",
            prompt="Analyze architectural options for resolving database traffic bottlenecks:",
            isCompleted=False,
            content=MissionTaskContent(
                scenario="The application database server is experiencing CPU usage spikes (above 95%) under heavy query loads because the client application constantly fetches the identical configuration list from the `/api/config` route.",
                question="Which architectural pattern directly alleviates this database CPU bottleneck?",
                options=[
                    "Implement a client-side polling timer to fetch data every 500ms.",
                    "Set up an in-memory cache (like Redis) on the API layer and serve the config from cache with a suitable TTL.",
                    "Increase database connections pool size to 500.",
                    "Convert database schema tables to MongoDB Collections."
                ],
                correctOptionIndex=1,
                explanation="Serving static or low-churn configurations from in-memory cache shields the database from repetitive queries, instantly reducing database CPU usage."
            )
        )
        tasks.append(t1)

        # 2. Decision Simulator (eng-simulator)
        # 2-stage simulator: correct tech choice, rationale match, and justification free-text containing keywords
        t2 = MissionTask(
            id="eng-simulator-1",
            type="eng-simulator",
            prompt="Simulate an engineering decision under strict constraints:",
            isCompleted=False,
            content=MissionTaskContent(
                scenario="Your team is building a microservice prototype. Constraints: Only 1 developer is available, launch must occur within 48 hours, database hosting budget is zero dollars ($0).",
                constraints=["1 developer", "48-hour launch deadline", "Zero ($0) hosting budget"],
                choices=[
                    {
                        "techName": "SQLite (Local File-based Database)",
                        "isRecommended": True,
                        "rationaleOptions": [
                            "Serverless file-based storage operates in-process and requires zero configuration or hosting fees.",
                            "Allows multi-region horizontal write sharding to balance user throughput."
                        ],
                        "correctRationaleIndex": 0
                    },
                    {
                        "techName": "PostgreSQL Multi-Node Cluster",
                        "isRecommended": False,
                        "rationaleOptions": [
                            "Requires independent server hosting resources and setups which violates the zero budget and speed constraints.",
                            "Is lightweight and runs in-process inside the python thread."
                        ],
                        "correctRationaleIndex": 0
                    }
                ],
                requiredKeywords=["overhead", "hosting", "file", "setup", "budget"],
                explanation="Under a $0 budget and 48hr deadline, setting up PostgreSQL server clusters adds hosting costs and operational complexity. SQLite is a serverless, file-based SQL store that runs in-process, meeting all constraints."
            )
        )
        tasks.append(t2)

        # 3. Failure Analysis (eng-failure)
        t3 = MissionTask(
            id="eng-failure-1",
            type="eng-failure",
            prompt="Diagnose the root failure pattern in this production scenario:",
            isCompleted=False,
            content=MissionTaskContent(
                failureScenario="After deploying a new public endpoint, the backend API logs hundreds of concurrent request timeouts. The database dashboard reports maxed connection limit pools. Thread traces show that every request is opening a database session but never executing a `db.close()` or yielding the connection back to the pool.",
                diagnosisOptions=[
                    "The client browser is corrupting HTTP headers.",
                    "The API server is leaking database connections because routes fail to close or release db sessions back to the pool.",
                    "The server requires Docker container orchestration.",
                    "The database tables lack indexes."
                ],
                correctDiagnosisIndex=1,
                mitigationOptions=[
                    "Implement a rate-limiter on the client side.",
                    "Wrap the database session lifecycle in a context manager (e.g. FastAPI's Depends with yield, or contextlib.contextmanager) to guarantee sessions are closed on requests finish.",
                    "Rewrite database schemas using NoSQL models.",
                    "Increase client timeout settings to 120 seconds."
                ],
                correctMitigationIndex=1,
                explanation="Leaking database connections exhausts the available pool quickly, causing subsequent requests to wait indefinitely and time out. Context managers ensure cleanup routines execute even if exceptions occur."
            )
        )
        tasks.append(t3)

        # 4. Tradeoff Sorter (eng-tradeoffs)
        # Drag and drop statements into Benefits vs Drawbacks
        t4 = MissionTask(
            id="eng-tradeoffs-1",
            type="eng-tradeoffs",
            prompt="Analyze trade-offs for JWT Stateless Authentication:",
            isCompleted=False,
            content=MissionTaskContent(
                patternName="JWT Stateless Authentication",
                benefits=[
                    "No database lookup required per HTTP request since the token contains encrypted claims.",
                    "Horizontally scalable because any backend instance can verify the signature independently."
                ],
                drawbacks=[
                    "Cannot be easily revoked before expiration without building a blacklist store.",
                    "Increases network payload overhead because tokens must be transmitted in every HTTP header."
                ],
                allStatements=[
                    "No database lookup required per HTTP request since the token contains encrypted claims.",
                    "Cannot be easily revoked before expiration without building a blacklist store.",
                    "Horizontally scalable because any backend instance can verify the signature independently.",
                    "Increases network payload overhead because tokens must be transmitted in every HTTP header."
                ]
            )
        )
        tasks.append(t4)

        # 5. Alternative Ranker (alternative-ranker)
        t5 = MissionTask(
            id="eng-ranker-1",
            type="alternative-ranker",
            prompt="Rank alternative caching approaches based on complexity and performance requirements:",
            isCompleted=False,
            content=MissionTaskContent(
                scenario="Rank the following caching approaches for a production deployment with high-availability requirements (Rank from Best/Most Resilient to Worst/Least Resilient):",
                optionsToRank=[
                    "Distributed Redis cache cluster (independent from API servers)",
                    "In-memory local dictionary cache (inside API process memory)",
                    "No cache (read directly from database on every request)"
                ],
                correctRanking=[0, 1, 2], # Index 0 (Distributed Redis) is best, Index 1 (In-memory dict) is second, Index 2 (No cache) is worst
                requiredKeywords=["scalable", "resilient", "redis", "database", "memory"],
                explanation="A distributed Redis cluster is highly resilient, surviving API restarts. Local in-memory caches disappear on restart and cause inconsistent values across multi-instance nodes. No caching floods the database with requests."
            )
        )
        tasks.append(t5)

        # Create one mission containing all these tasks
        missions = [
            Mission(
                id="m-eng-decisions-1",
                pillar="engineering_decisions",
                title="Engineering Architecture & Tradeoffs",
                description="Simulate constraint-driven database selection, diagnose connection leaks, sort JWT tradeoffs, and rank caching solutions.",
                status="active",
                tasks=tasks,
                xpReward=200,
                scoreReward=40
            )
        ]

        return missions

    def _analyze_gemini(self, workspace_path: str) -> List[Mission]:
        # Collect directory manifests and configurations to pass to Gemini
        manifest_files = []
        for file in ["package.json", "requirements.txt", "pnpm-lock.yaml", "package-lock.json", "tsconfig.json", "webpack.config.js"]:
            full_path = os.path.join(workspace_path, file)
            if os.path.exists(full_path):
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        manifest_files.append({
                            "fileName": file,
                            "content": f.read()[:2000] # limit size
                        })
                except Exception:
                    pass

        try:
            model = genai.GenerativeModel(
                'gemini-1.5-flash',
                generation_config={"response_mime_type": "application/json"}
            )

            prompt = f"""
You are an Engineering Decisions Analyzer. Analyze these project manifests and config files:
{json.dumps(manifest_files, indent=2)}

Generate one detailed Mission under the pillar "engineering_decisions".
The mission must contain exactly five tasks corresponding to these types:
1. "eng-problem": Presents an architectural problem (e.g. scaling databases, CORS issues, token verification, state desynchronization) based on the dependencies detected. The user must choose the correct solution.
2. "eng-simulator": A 2-stage simulator containing:
   - "scenario": Project scenario detailing strict team size, speed, or cost constraints.
   - "constraints": list of constraints.
   - "choices": list of two option dictionary objects. Each has "techName", "isRecommended" (bool), "rationaleOptions" (list of strings), and "correctRationaleIndex" (integer).
   - "requiredKeywords": list of words (e.g. "budget", "cost", "overhead") to grade the user's free-text justification.
3. "eng-failure": A failure diagnosis scenario. Provide "failureScenario" (e.g. connection pool exhaustion, memory leaks, unhandled middleware crashes), "diagnosisOptions" (list of MCQs), "correctDiagnosisIndex", "mitigationOptions" (list of MCQs), and "correctMitigationIndex".
4. "eng-tradeoffs": Drag-and-drop statements sorting task. Provide "patternName" (e.g. "REST vs GraphQL", "SQLite vs Postgres", "React Context vs Redux"), "benefits" (list of strings), "drawbacks" (list of strings), and "allStatements" (list containing all benefits and drawbacks combined).
5. "alternative-ranker": User must rank options. Provide "scenario" (e.g. ranking database choices, auth protocols, or bundling strategies), "optionsToRank" (list of options), "correctRanking" (list of integers matching the indices sorted from best to worst), "requiredKeywords" (list of strings), and "explanation".

Output must be a JSON object mapping directly to the "missions" key (a list of Mission structures):
{{
  "missions": [
    {{
      "id": "m-eng-decisions-1",
      "pillar": "engineering_decisions",
      "title": "Architectural Analysis & Simulators",
      "description": "Simulate real architectural trade-offs, solve scale limitations, and diagnose server leaks.",
      "status": "active",
      "xpReward": 220,
      "scoreReward": 45,
      "tasks": [
        {{
          "id": "eng-problem-1",
          "type": "eng-problem",
          "prompt": "Evaluate options to address this bottleneck:",
          "isCompleted": false,
          "content": {{
            "scenario": "scenario description",
            "question": "What is the correct approach?",
            "options": ["A", "B", "C", "D"],
            "correctOptionIndex": 1,
            "explanation": "Why this is correct."
          }}
        }},
        {{
          "id": "eng-simulator-1",
          "type": "eng-simulator",
          "prompt": "Select the stack and write your rationale:",
          "isCompleted": false,
          "content": {{
            "scenario": "detailed scenario...",
            "constraints": ["constraint A", "constraint B"],
            "choices": [
              {{
                "techName": "Option A",
                "isRecommended": true,
                "rationaleOptions": ["Rationale A1", "Rationale A2"],
                "correctRationaleIndex": 0
              }},
              {{
                "techName": "Option B",
                "isRecommended": false,
                "rationaleOptions": ["Rationale B1", "Rationale B2"],
                "correctRationaleIndex": 1
              }}
            ],
            "requiredKeywords": ["word1", "word2"],
            "explanation": "Why recommended choice is best."
          }}
        }},
        {{
          "id": "eng-failure-1",
          "type": "eng-failure",
          "prompt": "Diagnose this failure:",
          "isCompleted": false,
          "content": {{
            "failureScenario": "details of crash...",
            "diagnosisOptions": ["Diag A", "Diag B", "Diag C", "Diag D"],
            "correctDiagnosisIndex": 1,
            "mitigationOptions": ["Mit A", "Mit B", "Mit C", "Mit D"],
            "correctMitigationIndex": 0,
            "explanation": "Diagnosis breakdown details."
          }}
        }},
        {{
          "id": "eng-tradeoffs-1",
          "type": "eng-tradeoffs",
          "prompt": "Sort benefits and drawbacks:",
          "isCompleted": false,
          "content": {{
            "patternName": "Concept name",
            "benefits": ["Benefit 1", "Benefit 2"],
            "drawbacks": ["Drawback 1", "Drawback 2"],
            "allStatements": ["Benefit 1", "Drawback 1", "Benefit 2", "Drawback 2"]
          }}
        }},
        {{
          "id": "eng-ranker-1",
          "type": "alternative-ranker",
          "prompt": "Rank alternatives and explain:",
          "isCompleted": false,
          "content": {{
            "scenario": "ranking scenario details",
            "optionsToRank": ["Opt A", "Opt B", "Opt C"],
            "correctRanking": [0, 1, 2],
            "requiredKeywords": ["keyword1", "keyword2"],
            "explanation": "Why this ranking makes architectural sense."
          }}
        }}
      ]
    }}
  ]
}}

Generate real, high-quality questions based on the manifests. Make sure the JSON is valid.
"""
            response = model.generate_content(prompt)
            data = json.loads(response.text)
            missions = [Mission(**m) for m in data.get("missions", [])]
            if not missions:
                raise ValueError("No missions returned from Gemini")
            return missions
        except Exception as e:
            print(f"[EngineeringAnalyzer] Gemini analysis failed: {str(e)}. Falling back to Local.")
            return self._analyze_local(workspace_path)
