import os
import json
import google.generativeai as genai
from typing import Dict, List
from analyzer.base import BaseAnalyzer
from analyzer.models import Feature
from analyzer.local_analyzer import LocalAnalyzer

class GeminiAnalyzer(BaseAnalyzer):
    def __init__(self, api_key: str):
        self.api_key = api_key
        genai.configure(api_key=self.api_key)

    def analyze(self, workspace_path: str) -> Dict[str, Feature]:
        try:
            # 1. Gather files and structure
            ignored_dirs = {
                'node_modules', '.git', '__pycache__', 'dist', 'build', 
                'out', '.gemini', 'artifacts', '.vscode', 'venv', 'env'
            }
            
            file_tree = []
            file_contents = {}
            
            # Read first few lines of configuration/major files to give context to Gemini
            vital_extensions = ('.json', '.sql', '.py', '.js', '.ts', '.tsx', '.html', '.css', '.go', '.rs')
            
            for root, dirs, files in os.walk(workspace_path):
                dirs[:] = [d for d in dirs if d not in ignored_dirs]
                for file in files:
                    rel_path = os.path.relpath(os.path.join(root, file), workspace_path)
                    web_path = rel_path.replace("\\", "/")
                    file_tree.append(web_path)
                    
                    # Read sample text from important files for semantic details
                    if len(file_contents) < 15 and file.endswith(vital_extensions):
                        full_path = os.path.join(root, file)
                        try:
                            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                                # Read first 150 lines to keep context window light but highly informative
                                content = "".join([f.readline() for _ in range(150)])
                                file_contents[web_path] = content
                        except Exception:
                            pass

            if not file_tree:
                print("[GeminiAnalyzer] Empty workspace. Falling back to LocalAnalyzer.")
                return LocalAnalyzer().analyze(workspace_path)

            # 2. Query Gemini with structured prompt and JSON enforcement
            # Using gemini-1.5-flash as the fast, cost-effective MVP analysis engine
            model = genai.GenerativeModel(
                'gemini-1.5-flash',
                generation_config={"response_mime_type": "application/json"}
            )
            
            prompt = f"""
You are an expert Codebase Architecture Analyzer. Your goal is to scan a codebase and generate an interactive game-based Architecture Mission.
The user's code features should be grouped into logical structural components (e.g. frontend client, REST endpoints, backend worker, database tables).

Here is the directory tree:
{json.dumps(file_tree, indent=2)}

Here are some core file contents to analyze for architecture details, connections, data flows, and boundaries:
{json.dumps(file_contents, indent=2)}

Your output must be a single JSON object containing a dictionary under the key "features", where the keys are feature IDs (strings like "auth-system", "dashboard") and values match this JSON schema structure:
{{
  "id": "unique-feature-id",
  "name": "Human Readable Feature Name",
  "description": "Short explanation of the feature and what role it plays.",
  "completionPercent": 100,
  "understandingScore": {{
    "architecture": 0,
    "systemLogic": 0,
    "fileLogic": 0,
    "functionLogic": 0,
    "syntax": 0,
    "engineeringDecisions": 0,
    "concepts": 0,
    "overall": 0
  }},
  "missions": [
    {{
      "id": "mission-id",
      "pillar": "architecture",
      "title": "Explore Architecture Mission",
      "description": "Short description of what the user is exploring.",
      "status": "active",
      "xpReward": 100,
      "scoreReward": 30,
      "tasks": [
        {{
          "id": "task-match",
          "type": "component-match",
          "prompt": "Match these components to their correct code responsibility:",
          "isCompleted": false,
          "content": {{
            "matchingItems": [
              {{
                "id": "item-1",
                "name": "filename.js or folder/name",
                "responsibility": "What role does this file play in the system?"
              }}
            ]
          }}
        }},
        {{
          "id": "task-boundary",
          "type": "boundary-sort",
          "prompt": "Determine which elements are internal core logic and which are external boundaries:",
          "isCompleted": false,
          "content": {{
            "boundaryItems": [
              {{
                "id": "b-1",
                "name": "filename.js or Third Party API / CDN",
                "isInternal": true,
                "description": "Brief description of its role"
              }}
            ]
          }}
        }},
        {{
          "id": "task-sequence",
          "type": "flow-sequence",
          "prompt": "Order the sequence of operations for an API request or user workflow:",
          "isCompleted": false,
          "content": {{
            "flowSteps": [
              {{
                "id": "s-1",
                "stepNumber": 1,
                "text": "What happens in this step?",
                "component": "Which component or file handles it?"
              }}
            ]
          }}
        }},
        {{
          "id": "task-connect",
          "type": "connection-identify",
          "prompt": "Select the pairs of components that directly communicate with each other:",
          "isCompleted": false,
          "content": {{
            "nodes": ["compA.py", "compB.js", "ExternalDB"],
            "correctConnections": [
              ["compB.js", "compA.py"]
            ]
          }}
        }}
      ]
    }}
  ],
  "lockedConcepts": [
    {{
      "id": "concept-id",
      "name": "General Programming Concept (e.g. Asynchronous I/O, JWTs, CORS, Relational Integrity)",
      "category": "Backend",
      "description": "Brief description of the concept and why it matters here."
    }}
  ]
}}

Make sure:
1. All task structures are fully populated with actual elements derived from the code tree and contents.
2. The user will drag, drop, sort, and match these tasks, so make the descriptions and connections accurate.
3. Keep the JSON schema strictly valid. Do not return markdown wraps other than the JSON itself.
"""

            response = model.generate_content(prompt)
            data = json.loads(response.text)
            
            # Map raw dictionary to Pydantic Feature models
            features = {}
            for k, v in data.get("features", {}).items():
                features[k] = Feature(**v)
                
            if not features:
                print("[GeminiAnalyzer] No features returned. Falling back to LocalAnalyzer.")
                return LocalAnalyzer().analyze(workspace_path)
                
            return features
            
        except Exception as e:
            print(f"[GeminiAnalyzer] Failed calling Gemini API: {str(e)}. Falling back to LocalAnalyzer.")
            import traceback
            traceback.print_exc()
            return LocalAnalyzer().analyze(workspace_path)
