import os
import re
import json
import google.generativeai as genai
from typing import List, Dict, Any
from analyzer.models import Mission, MissionTask, MissionTaskContent

class SyntaxAnalyzer:
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        if self.api_key:
            genai.configure(api_key=self.api_key)

    def analyze(self, workspace_path: str, important_files: List[str]) -> List[Mission]:
        if self.api_key:
            return self._analyze_gemini(workspace_path, important_files)
        else:
            return self._analyze_local(workspace_path, important_files)

    def _analyze_local(self, workspace_path: str, important_files: List[str]) -> List[Mission]:
        print("[SyntaxAnalyzer] Running offline rule-based analysis...")
        
        # Read the contents of important files to look for syntax patterns
        file_contents = {}
        for f in important_files:
            full_path = os.path.join(workspace_path, f)
            if os.path.exists(full_path):
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as file_obj:
                        file_contents[f] = file_obj.read()
                except Exception:
                    pass

        # Identify files with interesting syntax
        snippet_react = ""
        snippet_py = ""
        
        for f, content in file_contents.items():
            if f.endswith(('.tsx', '.jsx')) and not snippet_react:
                # Find optional chaining or hooks
                lines = content.split('\n')
                for line in lines:
                    if '?.' in line or 'useState' in line or 'useEffect' in line:
                        if 10 < len(line) < 80:
                            snippet_react = line.strip()
                            break
            if f.endswith('.py') and not snippet_py:
                lines = content.split('\n')
                for line in lines:
                    if 'async def' in line or 'await' in line or '@app.' in line:
                        if 10 < len(line) < 80:
                            snippet_py = line.strip()
                            break

        # Fallbacks if none found
        if not snippet_react:
            snippet_react = "const user = data?.profile?.name || 'Guest';"
        if not snippet_py:
            snippet_py = "results = await db.fetch_all(query=query)"

        tasks = []

        # 1. Intent MCQ: What is this line trying to accomplish?
        t1 = MissionTask(
            id="syntax-intent-1",
            type="syntax-intent",
            prompt="Analyze this React line and determine its functional objective:",
            isCompleted=False,
            content=MissionTaskContent(
                codeSnippet=f"// Highlighted snippet from codebase:\n{snippet_react}",
                highlightedLine=snippet_react,
                question="What safety safeguard or operation is being executed here?",
                options=[
                    "It compiles the TypeScript type definition mapping.",
                    "It utilizes Optional Chaining to prevent null-reference runtime exceptions if nested attributes are missing.",
                    "It binds an event listener to the browser cookies storage.",
                    "It sets up a WebSocket subscription connection."
                ],
                correctOptionIndex=1,
                explanation="The '?.' syntax performs Optional Chaining, resolving to undefined immediately if any reference in the chain is nullish, avoiding a crash."
            )
        )
        tasks.append(t1)

        # 2. Syntax Spotlight: Highlight optional chaining or async/await tokens
        # We need a space-tokenized list and the indices of target tokens
        tokens = ["const", "username", "=", "response?.data?.user?.profile?.username", "||", '"Anonymous";']
        t2 = MissionTask(
            id="syntax-spotlight-1",
            type="syntax-spotlight",
            prompt="Identify and click on the token that performs optional chaining to secure against null errors:",
            isCompleted=False,
            content=MissionTaskContent(
                codeSnippet="const username = response?.data?.user?.profile?.username || \"Anonymous\";",
                targetPatternType="optional-chaining",
                tokens=tokens,
                correctTokenIndices=[3], # Index of 'response?.data?.user?.profile?.username' containing optional chains
                explanation="The token 'response?.data?.user?.profile?.username' contains multiple '?.' chaining operations which guard against undefined sub-properties."
            )
        )
        tasks.append(t2)

        # 3. Library Rationale MCQ
        # Determine packages from package.json or requirements.txt
        t3 = MissionTask(
            id="syntax-lib-1",
            type="lib-rationale",
            prompt="Evaluate package import dependencies and architectural roles:",
            isCompleted=False,
            content=MissionTaskContent(
                packageName="fastapi",
                question="Why is 'fastapi' configured as a core server dependency in this codebase?",
                options=[
                    "It runs static styling preprocessing for browser layout paints.",
                    "It acts as a lightweight asynchronous backend framework to host HTTP endpoints with Pydantic type validation.",
                    "It connects to SQL databases using raw binary stream buffers.",
                    "It compiles TypeScript files into ES5 bundles."
                ],
                correctOptionIndex=1,
                explanation="FastAPI handles HTTP endpoints and implements automatic Pydantic request body validation, speeding up backend routing development."
            )
        )
        tasks.append(t3)

        # 4. Output Prediction
        predict_snippet = """function getDiscount(price, userType) {
  const rate = userType === 'VIP' ? 0.2 : 0.05;
  return price * (1 - rate);
}"""
        t4 = MissionTask(
            id="syntax-predict-1",
            type="syntax-predict",
            prompt="Predict the output of the following function given inputs price=100 and userType='VIP':",
            isCompleted=False,
            content=MissionTaskContent(
                codeSnippet=predict_snippet,
                question="What does getDiscount(100, 'VIP') evaluate to?",
                options=["95", "80", "100", "20"],
                correctOptionIndex=1,
                explanation="The ternary expression sets rate to 0.2 (20% discount). 100 * (1 - 0.2) = 100 * 0.8 = 80."
            )
        )
        tasks.append(t4)

        # 5. Syntax Rebuild: Fill in the blank
        t5 = MissionTask(
            id="syntax-rebuild-1",
            type="syntax-rebuild",
            prompt="Reconstruct the statement to correctly await the promise resolution:",
            isCompleted=False,
            content=MissionTaskContent(
                codeSnippet="async function fetchData() {\n  const response = ______ fetch('/api/data');\n  return response.json();\n}",
                blanks=[
                    {
                        "id": "blank1",
                        "label": "async modifier",
                        "options": ["await", "yield", "async", "then"],
                        "correctAnswer": "await"
                    }
                ],
                explanation="In an async function, we must prefix Promise-returning calls with the 'await' keyword to pause execution and extract the resolved value."
            )
        )
        tasks.append(t5)

        # Create one mission containing all these tasks
        missions = [
            Mission(
                id="m-syntax-logic-1",
                pillar="syntax",
                title="Syntax Mastery & Patterns",
                description="Investigate optional chaining safeguard tokens, package integrations, return predictions, and async keywords.",
                status="active",
                tasks=tasks,
                xpReward=180,
                scoreReward=40
            )
        ]

        return missions

    def _analyze_gemini(self, workspace_path: str, important_files: List[str]) -> List[Mission]:
        # Read the file headers and parts of contents to feed to Gemini
        file_details = []
        for f in important_files[:10]: # limit to 10 files
            full_path = os.path.join(workspace_path, f)
            if os.path.exists(full_path):
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as file_obj:
                        content = file_obj.read()
                        file_details.append({
                            "path": f,
                            "content": content[:1200] # send top 1200 characters of each file
                        })
                except Exception:
                    pass

        try:
            model = genai.GenerativeModel(
                'gemini-1.5-flash',
                generation_config={"response_mime_type": "application/json"}
            )

            prompt = f"""
You are a Syntax Analyzer. Analyze the following workspace files and import patterns to understand the syntax constructs in use:
{json.dumps(file_details, indent=2)}

Generate one detailed Mission under the pillar "syntax".
The mission must contain exactly five tasks corresponding to these types:
1. "syntax-intent": Presents a specific line of code from the workspace that has notable syntax (e.g. async/await, optional chaining, destructured assignments, React hooks, or lambda functions) in the "codeSnippet" and "highlightedLine". Ask an MCQ about what that line intends to accomplish.
2. "syntax-spotlight": Select a line of code with a notable operator/token (optional chaining, ternary, async keyword). Space-tokenize it into "tokens" list. Define "correctTokenIndices" (list of index integers) that match the requested token pattern in "targetPatternType".
3. "lib-rationale": Identify a package imported by the codebase (e.g. "fastapi", "react", "pydantic", "webpack"). Ask an MCQ about why this package is imported and what engineering problem it solves.
4. "syntax-predict": Render a small block of code (can be custom logic based on standard functions in the workspace) in "codeSnippet". Ask what it returns under specific inputs.
5. "syntax-rebuild": Create a fill-in-the-blanks code reconstruction task. Replace 1 core keyword (e.g. "await", "async", "def", "const", "import") with "______". Provide the option list and the "correctAnswer" in the "blanks" attribute.

Output must be a JSON object mapping directly to the "missions" key (a list of Mission structures):
{{
  "missions": [
    {{
      "id": "m-syntax-logic-1",
      "pillar": "syntax",
      "title": "Syntactic Structure & Packages",
      "description": "Examine semantic statement behaviors, optional chaining safeties, core library roles, and async blanks.",
      "status": "active",
      "xpReward": 200,
      "scoreReward": 45,
      "tasks": [
        {{
          "id": "syntax-intent-1",
          "type": "syntax-intent",
          "prompt": "Evaluate this syntax construct:",
          "isCompleted": false,
          "content": {{
            "codeSnippet": "code snippet containing highlighted line",
            "highlightedLine": "exact line content",
            "question": "What is the intent of this statement?",
            "options": ["Distractor A", "Correct Answer", "Distractor C", "Distractor D"],
            "correctOptionIndex": 1,
            "explanation": "Explanation why this is correct."
          }}
        }},
        {{
          "id": "syntax-spotlight-1",
          "type": "syntax-spotlight",
          "prompt": "Identify the token performing X:",
          "isCompleted": false,
          "content": {{
            "codeSnippet": "complete line statement",
            "targetPatternType": "pattern description (e.g. optional chaining, ternary)",
            "tokens": ["const", "a", "=", "b?.c"],
            "correctTokenIndices": [3],
            "explanation": "Why this token matches."
          }}
        }},
        {{
          "id": "syntax-lib-1",
          "type": "lib-rationale",
          "prompt": "Package Integration Check:",
          "isCompleted": false,
          "content": {{
            "packageName": "package_name",
            "question": "What role does package X play in the codebase?",
            "options": ["A", "B", "C", "D"],
            "correctOptionIndex": 0,
            "explanation": "Package responsibility details."
          }}
        }},
        {{
          "id": "syntax-predict-1",
          "type": "syntax-predict",
          "prompt": "Predict function output:",
          "isCompleted": false,
          "content": {{
            "codeSnippet": "function code...",
            "question": "What is the return value of func(X)?",
            "options": ["1", "2", "3", "4"],
            "correctOptionIndex": 2,
            "explanation": "Trace execution to detail output."
          }}
        }},
        {{
          "id": "syntax-rebuild-1",
          "type": "syntax-rebuild",
          "prompt": "Fill in the missing keyword token to complete the expression:",
          "isCompleted": false,
          "content": {{
            "codeSnippet": "const user = ______ db.findUser(id);",
            "blanks": [
              {{
                "id": "blank1",
                "label": "missing token",
                "options": ["await", "async", "then", "fetch"],
                "correctAnswer": "await"
              }}
            ],
            "explanation": "Why await is required."
          }}
        }}
      ]
    }}
  ]
}}

Generate real, high-quality questions based on the target files. Make sure the JSON is valid.
"""
            response = model.generate_content(prompt)
            data = json.loads(response.text)
            missions = [Mission(**m) for m in data.get("missions", [])]
            if not missions:
                raise ValueError("No missions returned from Gemini")
            return missions
        except Exception as e:
            print(f"[SyntaxAnalyzer] Gemini analysis failed: {str(e)}. Falling back to Local.")
            return self._analyze_local(workspace_path, important_files)
