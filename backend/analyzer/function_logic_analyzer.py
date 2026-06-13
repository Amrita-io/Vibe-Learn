import os
import re
import json
import google.generativeai as genai
from typing import Dict, List, Any
from analyzer.models import Feature, Mission, MissionTask, MissionTaskContent

class FunctionLogicAnalyzer:
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        if self.api_key:
            genai.configure(api_key=self.api_key)

    def analyze(self, workspace_path: str, important_files: List[str]) -> List[Mission]:
        all_contents = {}
        for file in important_files:
            full_path = os.path.join(workspace_path, file)
            if os.path.exists(full_path):
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        all_contents[file] = f.read()
                except Exception:
                    pass

        if not all_contents:
            return self._analyze_local(workspace_path, important_files, {"backend/main.py": "def analyze(workspace_path): pass"})

        if self.api_key:
            return self._analyze_gemini(workspace_path, important_files, all_contents)
        else:
            return self._analyze_local(workspace_path, important_files, all_contents)

    def _analyze_local(self, workspace_path: str, important_files: List[str], all_contents: Dict[str, str]) -> List[Mission]:
        print("[FunctionLogicAnalyzer] Running offline rule-based analysis...")
        missions = []
        tasks = []

        # Find 1-2 functions across contents using regex
        functions_found = []
        
        py_func_pat = re.compile(r"def\s+(\w+)\s*\((.*?)\)")
        js_func_pat = re.compile(r"(?:async\s+)?function\s+(\w+)\s*\((.*?)\)")
        js_arrow_pat = re.compile(r"(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\((.*?)\)\s*=>")

        for fpath, code in all_contents.items():
            # Search python functions
            for match in py_func_pat.finditer(code):
                name, args = match.groups()
                if name.startswith('_'): continue
                functions_found.append({"name": name, "args": args, "file": fpath, "body": code[match.start():match.start()+1500]})
            # Search JS functions
            for match in js_func_pat.finditer(code):
                name, args = match.groups()
                functions_found.append({"name": name, "args": args, "file": fpath, "body": code[match.start():match.start()+1500]})
            for match in js_arrow_pat.finditer(code):
                name, args = match.groups()
                functions_found.append({"name": name, "args": args, "file": fpath, "body": code[match.start():match.start()+1500]})

        if not functions_found:
            # Fallback mock function
            functions_found.append({
                "name": "authenticateUser",
                "args": "email, password",
                "file": "backend/app.py",
                "body": "def authenticateUser(email, password):\n    # Core auth verification\n    pass"
            })

        for idx, func in enumerate(functions_found[:2]): # limit to 2 functions for readibility
            name = func["name"]
            fpath = func["file"]
            raw_args = func["args"].split(',')
            inputs = [{"name": arg.split(':')[0].strip(), "type": "any", "description": "Parameter variable passed on call"} for arg in raw_args if arg.strip()]
            if not inputs:
                inputs = [{"name": "req", "type": "Request", "description": "HTTP request container"}]

            input_names = [inp["name"] for inp in inputs]
            
            # Synthesize function attributes based on name heuristics
            steps = [
                {"order": 1, "description": f"Validates presence of incoming parameter arguments: {', '.join(input_names)}"},
                {"order": 2, "description": "Checks authorization headers or logs start transaction"},
                {"order": 3, "description": "Queries primary component handlers to compute logic results"},
                {"order": 4, "description": "Serializes result payload and returns it to caller scope"}
            ]

            errors = [
                {"type": "ValueError", "when": "Required parameters are null or invalid type"},
                {"type": "ConnectionError", "when": "Local backend fails to bind socket descriptors"}
            ]

            # 1. Function Reconstructor (Inputs selection -> Step ordering -> Error matching)
            t_rebuild = MissionTask(
                id=f"func-rebuild-{idx}",
                type="func-rebuild",
                prompt=f"Reconstruct the signature and steps of function '{name}' in {os.path.basename(fpath)}:",
                isCompleted=False,
                content=MissionTaskContent(
                    functionSignature=f"{name}({', '.join(input_names)})",
                    functionPurpose=f"Executes core business routing operations for {name}.",
                    inputsList=inputs,
                    steps=steps,
                    errorList=errors,
                    correctInputs=input_names,
                    correctOutputs=[steps[-1]["description"]]
                )
            )
            tasks.append(t_rebuild)

            # 2. Input/Output Identifier
            t_io = MissionTask(
                id=f"func-io-{idx}",
                type="io-mapper",
                prompt=f"Map variables in function '{name}' into their correct inputs or outputs scopes:",
                isCompleted=False,
                content=MissionTaskContent(
                    functionBody=func["body"][:800],
                    variableNames=input_names + ["result", "err"],
                    correctInputs=input_names,
                    correctOutputs=["result"],
                    correctReturnType="Promise" if "async" in func["body"] else "dict/void",
                    options=["Promise", "dict/void", "string", "number"]
                )
            )
            tasks.append(t_io)

            # 3. Outcome Prediction MCQ
            t_predict = MissionTask(
                id=f"func-predict-{idx}",
                type="event-mcq",
                prompt=f"Predict runtime output for function '{name}':",
                isCompleted=False,
                content=MissionTaskContent(
                    workflowName=f"Outcome Check: {name}",
                    question=f"Under normal running conditions, what is returned by calling {name}?",
                    options=[
                        "Null pointer exception",
                        "A payload verifying success/computations",
                        "Raw HTML template code",
                        "Browser cache cookie dictionary"
                    ],
                    correctOptionIndex=1,
                    explanation=f"Calling {name} returns the logical computed outcome object on successful completion."
                )
            )
            tasks.append(t_predict)

        # 4. Recall text description
        t_recall = MissionTask(
            id="func-recall-1",
            type="reconstruct-text",
            prompt=f"Explain in your own words what happens when an exception (error) is thrown inside a function, and how the system behaves if it is not caught:",
            isCompleted=False,
            content=MissionTaskContent(
                expectedConcepts=["exception", "propagate", "crash", "catch", "stack trace"],
                sampleSolution="An uncaught exception propagates up the execution call stack. If no parent block catches it, the process terminates or crashes, outputting a stack trace log."
            )
        )
        tasks.append(t_recall)

        missions.append(Mission(
            id="m-func-logic-1",
            pillar="function_logic",
            title="Function Execution & Errors",
            description="Reconstruct parameters, chronological code block order, inputs/outputs boundaries, and exception results.",
            status="active",
            tasks=tasks,
            xpReward=180,
            scoreReward=40
        ))

        return missions

    def _analyze_gemini(self, workspace_path: str, important_files: List[str], all_contents: Dict[str, str]) -> List[Mission]:
        # Package target files to Gemini
        targets_meta = []
        for file in important_files[:3]: # limit to top 3 files for Gemini context
            targets_meta.append({
                "file": file,
                "content": all_contents.get(file, "")[:1200]
            })

        try:
            model = genai.GenerativeModel(
                'gemini-1.5-flash',
                generation_config={"response_mime_type": "application/json"}
            )
            
            prompt = f"""
You are a Function Logic & Execution Analyzer. Analyze the functions inside these files:
{json.dumps(targets_meta, indent=2)}

Generate one detailed Mission under the pillar "function_logic".
Identify 2 core functions from the target code files. For each function:
1. "func-rebuild" (Function Reconstructor): Extract:
   - "functionSignature" (e.g. `doX(y: str): Promise<z>`)
   - "functionPurpose" (short description)
   - "inputsList" (parameters: name, type, description)
   - "steps" (chronological step order cards)
   - "errorList" (exceptions: type, when condition description)
2. "io-mapper": Specify "functionBody" code (first 30 lines) and variable classifications ("correctInputs", "correctOutputs", "correctReturnType").
3. "event-mcq" (Outcome Prediction): Ask what output returns given specific parameters.
4. Add a final "reconstruct-text" recall question asking the user to explain the main algorithm steps of one of the functions in their own words. Include expected concepts.

Output must be a JSON object mapping directly to the "missions" key (a list of Mission structures):
{{
  "missions": [
    {{
      "id": "m-func-logic-1",
      "pillar": "function_logic",
      "title": "Function Rebuilding & Outputs",
      "description": "Analyze function inputs, execution steps, expected outcomes, and error bounds.",
      "status": "active",
      "xpReward": 180,
      "scoreReward": 40,
      "tasks": [
        {{
          "id": "func-rebuild-0",
          "type": "func-rebuild",
          "prompt": "Reconstruct function X...",
          "isCompleted": false,
          "content": {{
            "functionSignature": "...",
            "functionPurpose": "...",
            "inputsList": [
              {{ "name": "paramName", "type": "string", "description": "descr" }}
            ],
            "steps": [
              {{ "order": 1, "description": "First step details" }}
            ],
            "errorList": [
              {{ "type": "ErrorName", "when": "Condition detail" }}
            ],
            "correctInputs": ["paramName"],
            "correctOutputs": ["First step details"]
          }}
        }},
        {{
          "id": "func-io-0",
          "type": "io-mapper",
          "prompt": "Map variables for X:",
          "isCompleted": false,
          "content": {{
            "functionBody": "code snippet",
            "variableNames": ["a", "b"],
            "correctInputs": ["a"],
            "correctOutputs": ["b"],
            "correctReturnType": "type",
            "options": ["type", "otherType"]
          }}
        }},
        {{
          "id": "func-predict-0",
          "type": "event-mcq",
          "prompt": "Outcome check:",
          "isCompleted": false,
          "content": {{
            "workflowName": "Execution Prediction: X",
            "question": "If X is called with...",
            "options": ["A", "B", "C", "D"],
            "correctOptionIndex": 1,
            "explanation": "Why this is returned."
          }}
        }},
        {{
          "id": "func-recall-1",
          "type": "reconstruct-text",
          "prompt": "Explain in your own words why...",
          "isCompleted": false,
          "content": {{
            "expectedConcepts": ["conceptA", "conceptB"],
            "sampleSolution": "Representative details."
          }}
        }}
      ]
    }}
  ]
}}

Generate real functional content. Verify JSON syntax correctness.
"""
            response = model.generate_content(prompt)
            data = json.loads(response.text)
            missions = [Mission(**m) for m in data.get("missions", [])]
            if not missions:
                raise ValueError("No missions returned from Gemini")
            return missions
        except Exception as e:
            print(f"[FunctionLogicAnalyzer] Gemini analysis failed: {str(e)}. Falling back to Local.")
            return self._analyze_local(workspace_path, important_files, all_contents)
