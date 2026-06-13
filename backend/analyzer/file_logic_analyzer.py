import os
import re
import json
import google.generativeai as genai
from typing import Dict, List, Any, Tuple
from analyzer.models import Feature, Mission, MissionTask, MissionTaskContent
from analyzer.local_analyzer import LocalAnalyzer

class FileLogicAnalyzer:
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        if self.api_key:
            genai.configure(api_key=self.api_key)

    def analyze(self, workspace_path: str, important_files: List[str]) -> List[Mission]:
        # 1. Parse dependencies statically (works offline)
        all_contents = {}
        ignored_dirs = {'node_modules', '.git', '__pycache__', 'dist', 'build', 'out'}
        
        for root, dirs, files in os.walk(workspace_path):
            dirs[:] = [d for d in dirs if d not in ignored_dirs]
            for file in files:
                if file.endswith(('.py', '.js', '.ts', '.tsx', '.jsx')):
                    rel_path = os.path.relpath(os.path.join(root, file), workspace_path)
                    web_path = rel_path.replace("\\", "/")
                    try:
                        with open(os.path.join(root, file), 'r', encoding='utf-8', errors='ignore') as f:
                            all_contents[web_path] = f.read()
                    except Exception:
                        all_contents[web_path] = ""

        # Build imports map
        dependencies_map = {}
        for fpath, content in all_contents.items():
            dependencies_map[fpath] = self._extract_dependencies_static(fpath, content, list(all_contents.keys()))

        # Determine target files to analyze (prioritize the selected important files)
        targets = [f for f in important_files if f in all_contents][:4] # limit to 4 files to keep it readable
        if not targets:
            targets = list(all_contents.keys())[:3]

        if self.api_key:
            return self._analyze_gemini(workspace_path, targets, dependencies_map, all_contents)
        else:
            return self._analyze_local(workspace_path, targets, dependencies_map, all_contents)

    def _extract_dependencies_static(self, file_path: str, content: str, all_files: List[str]) -> List[str]:
        deps = []
        # Match Javascript/Typescript imports: import X from "./path"
        js_patterns = [
            re.compile(r"import\s+.*\s+from\s+['\"](.*?)['\"]"),
            re.compile(r"import\s+['\"](.*?)['\"]"),
            re.compile(r"require\(\s*['\"](.*?)['\"]\s*\)")
        ]
        # Match Python imports: import X, from X import Y
        py_patterns = [
            re.compile(r"import\s+(\w+)"),
            re.compile(r"from\s+(\w+)\s+import")
        ]

        # Extract import strings
        import_strings = []
        if file_path.endswith(('.js', '.ts', '.tsx', '.jsx')):
            for pattern in js_patterns:
                import_strings.extend(pattern.findall(content))
        elif file_path.endswith('.py'):
            for pattern in py_patterns:
                import_strings.extend(pattern.findall(content))

        # Map import paths to actual workspace files
        for imp in import_strings:
            imp_base = os.path.basename(imp)
            # Find file in workspace that matches the import target
            for other_file in all_files:
                if other_file == file_path:
                    continue
                other_base, _ = os.path.splitext(os.path.basename(other_file))
                if imp_base == other_base or other_base in imp:
                    if other_file not in deps:
                        deps.append(other_file)
        return deps

    def _analyze_local(
        self, 
        workspace_path: str, 
        targets: List[str], 
        dependencies_map: Dict[str, List[str]], 
        all_contents: Dict[str, str]
    ) -> List[Mission]:
        print("[FileLogicAnalyzer] Running offline rule-based analysis...")
        missions = []

        # We will generate one File Logic mission containing tasks for target files
        tasks = []
        
        # 1. Dependency mapping task: draw directed arrows
        # We need a list of files (nodes) and correct import edges
        nodes_list = []
        correct_edges: List[Tuple[str, str]] = []
        
        for t in targets:
            if t not in nodes_list:
                nodes_list.append(t)
            for d in dependencies_map.get(t, []):
                if d in targets:
                    if d not in nodes_list:
                        nodes_list.append(d)
                    correct_edges.append((t, d)) # Dependent -> Dependency

        if len(nodes_list) < 2:
            # Fallback mock nodes if the codebase is too small or has no internal imports
            nodes_list = ["backend/main.py", "backend/analyzer/models.py", "backend/analyzer/scoring.py"]
            correct_edges = [
                ("backend/main.py", "backend/analyzer/models.py"),
                ("backend/main.py", "backend/analyzer/scoring.py")
            ]

        t_dep_map = MissionTask(
            id="file-depmap-1",
            type="dependency-map",
            prompt="Draw directed arrows representing import dependencies (from Dependent module to imported Dependency):",
            isCompleted=False,
            content=MissionTaskContent(
                nodesList=nodes_list,
                correctEdges=correct_edges
            )
        )
        tasks.append(t_dep_map)

        # 2. File-by-file investigation and impact tasks
        for idx, target in enumerate(targets[:2]): # limit to 2 files to keep it brief
            # Infer role and impact based on name
            name = os.path.basename(target)
            content_preview = all_contents.get(target, "")[:1000] # first 1000 chars
            
            purpose = f"Defines structural interfaces and handles core logic of {name}."
            why_exists = f"Separates {name} operations to maintain clean separation of concerns."
            impact_err = f"ModuleNotFoundError: Cannot resolve imports to {name}."

            if "main" in name or "app" in name:
                purpose = "Serves as the main gateway hosting the API endpoints and routing instructions."
                why_exists = "Centralizes network interface bindings and app boot sequence configuration."
                impact_err = "The HTTP server fails to bootstrap and bind to local port 8000."
            elif "model" in name or "schema" in name:
                purpose = "Declares the schemas, field types, and validators for application objects."
                why_exists = "Enforces type validation and constraints for request/response payloads."
                impact_err = "ValidationError: Server fails to serialize and validate data payloads."
            elif "test" in name:
                purpose = "Executes automated assertions against the backend parser logic."
                why_exists = "Ensures logic code changes do not break system behaviors."
                impact_err = "Bypasses automated validation, increasing the risk of shipping logical regression bugs."

            t_investigate = MissionTask(
                id=f"file-investigate-{idx}",
                type="file-investigator",
                prompt=f"Investigate the structural code logic and dependencies of {name}:",
                isCompleted=False,
                content=MissionTaskContent(
                    fileName=target,
                    fileContentPreview=content_preview,
                    questionsList=[
                        {
                            "id": "q1",
                            "type": "mcq",
                            "prompt": f"What is the primary responsibility of {name}?",
                            "options": [
                                "Runs styling compile layouts",
                                purpose,
                                "Handles background thread pools",
                                "Synchronizes web socket headers"
                            ],
                            "correct": 1
                        },
                        {
                            "id": "q2",
                            "type": "mcq",
                            "prompt": f"Why does {name} exist separately in the system layout?",
                            "options": [
                                "To bundle all styles",
                                "To bypass security gates",
                                why_exists,
                                "To store local cookies"
                            ],
                            "correct": 2
                        },
                        {
                            "id": "q3",
                            "type": "multi-select",
                            "prompt": f"Identify the outgoing files that {name} depends on (imports directly):",
                            "options": nodes_list,
                            "correct": dependencies_map.get(target, [])
                        }
                    ]
                )
            )
            tasks.append(t_investigate)

            # Impact analysis MCQ task
            t_impact = MissionTask(
                id=f"file-impact-{idx}",
                type="event-mcq",
                prompt=f"Perform a Failure Impact Analysis on {name}:",
                isCompleted=False,
                content=MissionTaskContent(
                    workflowName=f"Integrity Check: {name}",
                    question=f"If {name} is deleted from the codebase, what specific failure occurs?",
                    options=[
                        "CSS classes fail to paint elements",
                        "The application fails to resolve imports, raising: " + impact_err,
                        "API responses are delayed by 5000ms",
                        "Streak trackers reset to zero"
                    ],
                    correctOptionIndex=1,
                    explanation=f"Removing {name} breaks imports of dependent modules, throwing: {impact_err}"
                )
            )
            tasks.append(t_impact)

        # 3. Dependency Reasoning essay
        t_reason = MissionTask(
            id="file-recall-1",
            type="reconstruct-text",
            prompt=f"Explain in your own words why modular file decomposition (splitting code into separate files like {', '.join([os.path.basename(t) for t in targets[:2]])}) is preferred over writing everything in a single file:",
            isCompleted=False,
            content=MissionTaskContent(
                expectedConcepts=["readability", "maintenance", "reuse", "testability", "decouple"],
                sampleSolution="Modular splitting separates concerns, making files smaller and more readable. It decouples components, allowing developers to test and maintain files independently without side effects."
            )
        )
        tasks.append(t_reason)

        missions.append(Mission(
            id="m-file-logic-1",
            pillar="file_logic",
            title="File Roles & Dependencies",
            description="Inspect file responsibility boundaries, build dependency import maps, and analyze code failure impacts.",
            status="active",
            tasks=tasks,
            xpReward=160,
            scoreReward=35
        ))

        return missions

    def _analyze_gemini(
        self, 
        workspace_path: str, 
        targets: List[str], 
        dependencies_map: Dict[str, List[str]], 
        all_contents: Dict[str, str]
    ) -> List[Mission]:
        try:
            model = genai.GenerativeModel(
                'gemini-1.5-flash',
                generation_config={"response_mime_type": "application/json"}
            )
            
            # Pack file details to Gemini
            targets_meta = []
            for t in targets:
                targets_meta.append({
                    "path": t,
                    "preview": all_contents.get(t, "")[:600],
                    "dependencies": dependencies_map.get(t, [])
                })

            prompt = f"""
You are a File Logic & Dependency Analyzer. Analyze the files under investigation:
{json.dumps(targets_meta, indent=2)}

Generate one detailed Mission under the pillar "file_logic".
The mission must contain these task types:
1. "dependency-map": List the file names in "nodesList", and their dependency connections in "correctEdges" (tuples: ["dependent", "dependency"]).
2. For each of the top 2 files:
   - "file-investigator": Define 3 questions. Question 1 (responsibility MCQ), Question 2 (Why separate MCQ), Question 3 (Outgoing imports multi-select).
   - "event-mcq" (Impact analysis): Ask what breaks if this file disappears.
3. "reconstruct-text": Reflection question on why these specific files depend on each other.

Output must be a JSON object mapping directly to the "missions" key (a list of Mission structures):
{{
  "missions": [
    {{
      "id": "m-file-logic-1",
      "pillar": "file_logic",
      "title": "File Roles & Import Networks",
      "description": "Examine file responsibility tags, dependency edges, and code removal failures.",
      "status": "active",
      "xpReward": 170,
      "scoreReward": 40,
      "tasks": [
        {{
          "id": "file-depmap-1",
          "type": "dependency-map",
          "prompt": "Map the code imports:",
          "isCompleted": false,
          "content": {{
            "nodesList": ["main.py", "models.py"],
            "correctEdges": [["main.py", "models.py"]]
          }}
        }},
        {{
          "id": "file-investigate-0",
          "type": "file-investigator",
          "prompt": "Deconstruct file X:",
          "isCompleted": false,
          "content": {{
            "fileName": "filename",
            "fileContentPreview": "first few lines of code",
            "questionsList": [
              {{
                "id": "q1",
                "type": "mcq",
                "prompt": "What is the role of this file?",
                "options": ["A", "B", "C", "D"],
                "correct": 1
              }},
              {{
                "id": "q2",
                "type": "mcq",
                "prompt": "Why is X a separate file?",
                "options": ["A", "B", "C", "D"],
                "correct": 2
              }},
              {{
                "id": "q3",
                "type": "multi-select",
                "prompt": "Which files does X import?",
                "options": ["main.py", "models.py"],
                "correct": ["models.py"]
              }}
            ]
          }}
        }},
        {{
          "id": "file-impact-0",
          "type": "event-mcq",
          "prompt": "Failure analysis of file X:",
          "isCompleted": false,
          "content": {{
            "workflowName": "Integrity Check: X",
            "question": "What happens if X is deleted?",
            "options": ["A", "B", "C", "D"],
            "correctOptionIndex": 1,
            "explanation": "Description of compile/runtime error."
          }}
        }},
        {{
          "id": "file-recall-1",
          "type": "reconstruct-text",
          "prompt": "Explain in your own words why...",
          "isCompleted": false,
          "content": {{
            "expectedConcepts": ["concept1", "concept2"],
            "sampleSolution": "Representative explanation."
          }}
        }}
      ]
    }}
  ]
}}

Generate real content based on the target codes. Ensure the JSON conforms.
"""
            response = model.generate_content(prompt)
            data = json.loads(response.text)
            missions = [Mission(**m) for m in data.get("missions", [])]
            if not missions:
                raise ValueError("No missions returned from Gemini")
            return missions
        except Exception as e:
            print(f"[FileLogicAnalyzer] Gemini analysis failed: {str(e)}. Falling back to Local.")
            return self._analyze_local(workspace_path, targets, dependencies_map, all_contents)
