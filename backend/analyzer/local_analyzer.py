import os
from typing import Dict, List, Any
from analyzer.base import BaseAnalyzer
from analyzer.models import (
    Feature, UnderstandingScore, Mission, MissionTask,
    MissionTaskContent, ConceptPreviewNode
)

class LocalAnalyzer(BaseAnalyzer):
    def __init__(self):
        pass

    def analyze(self, workspace_path: str) -> Dict[str, Feature]:
        features: Dict[str, Feature] = {}
        
        # 1. Walk workspace and collect relevant files
        all_files: List[str] = []
        ignored_dirs = {
            'node_modules', '.git', '__pycache__', 'dist', 'build', 
            'out', '.gemini', 'artifacts', '.vscode', 'venv', 'env'
        }
        
        for root, dirs, files in os.walk(workspace_path):
            dirs[:] = [d for d in dirs if d not in ignored_dirs]
            for file in files:
                rel_path = os.path.relpath(os.path.join(root, file), workspace_path)
                # Replace backslashes for web paths
                all_files.append(rel_path.replace("\\", "/"))

        # If workspace is empty or only contains tasks, supply mock codefiles for demo testing
        if not all_files or len(all_files) < 2:
            all_files = [
                "src/index.html",
                "src/main.js",
                "src/styles.css",
                "backend/app.py",
                "backend/database.sql"
            ]

        # 2. Heuristics to group files into logical Features
        frontend_files = []
        backend_files = []
        database_files = []
        other_files = []

        for file in all_files:
            lower_file = file.lower()
            if any(ext in lower_file for ext in ['.html', '.css', '.tsx', '.jsx', '.ts', 'js']) and 'backend' not in lower_file and 'app.py' not in lower_file:
                frontend_files.append(file)
            elif any(ext in lower_file for ext in ['.py', '.go', '.rs', '.java', '.cs']) or 'backend' in lower_file or 'server' in lower_file:
                backend_files.append(file)
            elif any(ext in lower_file for ext in ['.sql', '.db', 'schema', 'models']):
                database_files.append(file)
            else:
                other_files.append(file)

        # Build Feature objects
        if frontend_files:
            features["frontend-ui"] = self._create_frontend_feature(frontend_files)
        if backend_files:
            features["backend-services"] = self._create_backend_feature(backend_files)
        if database_files:
            features["database-layer"] = self._create_database_feature(database_files)
            
        # Fallback if no specific features could be built
        if not features:
            features["workspace-core"] = self._create_generic_feature(all_files)

        return features

    def _create_frontend_feature(self, files: List[str]) -> Feature:
        # Define component list for tasks
        components = [
            {"id": "c1", "name": files[0] if len(files) > 0 else "index.html", "responsibility": "Serves as the main HTML layout and user interface viewport."},
            {"id": "c2", "name": files[1] if len(files) > 1 else "main.js", "responsibility": "Coordinates local user actions, input validations, and handles backend fetch requests."},
            {"id": "c3", "name": files[2] if len(files) > 2 else "styles.css", "responsibility": "Defines CSS layout, colors, micro-animations, and responsive layouts."}
        ]
        
        # Build tasks
        tasks = [
            MissionTask(
                id="ft-task-match-1",
                type="component-match",
                prompt="Map each UI codebase component to its correct architectural responsibility:",
                isCompleted=False,
                content=MissionTaskContent(matchingItems=components)
            ),
            MissionTask(
                id="ft-task-boundary-1",
                type="boundary-sort",
                prompt="Classify the following elements as Internal to the client layout or External API/CDN assets:",
                isCompleted=False,
                content=MissionTaskContent(boundaryItems=[
                    {"id": "b1", "name": components[0]["name"], "isInternal": True, "description": "Local interface layout file."},
                    {"id": "b2", "name": "Google Fonts CDN", "isInternal": False, "description": "External styling and typography services fetched on load."},
                    {"id": "b3", "name": "Local Storage API", "isInternal": False, "description": "Web platform API used to cache profile values locally."}
                ])
            ),
            MissionTask(
                id="ft-task-sequence-1",
                type="flow-sequence",
                prompt="Sequence the visual client initialization pipeline in the correct logical order:",
                isCompleted=False,
                content=MissionTaskContent(flowSteps=[
                    {"id": "s1", "stepNumber": 1, "text": "Browser loads and parses the structural markup inside the index file", "component": components[0]["name"]},
                    {"id": "s2", "stepNumber": 2, "text": "CSS stylings are read and paint UI cards using default layouts", "component": len(components) > 2 and components[2]["name"] or "CSS"},
                    {"id": "s3", "stepNumber": 3, "text": "JavaScript files activate Event Listeners to register click handlings", "component": len(components) > 1 and components[1]["name"] or "JS"}
                ])
            ),
            MissionTask(
                id="ft-task-connect-1",
                type="connection-identify",
                prompt="Identify which component directly triggers communication with the Local Storage caching boundary:",
                isCompleted=False,
                content=MissionTaskContent(
                    nodes=[components[0]["name"], components[1]["name"], "Local Storage API"],
                    correctConnections=[(components[1]["name"], "Local Storage API")]
                )
            )
        ]

        # Locked concepts
        locked_concepts = [
            ConceptPreviewNode(id="con-fe-1", name="DOM Caching & Rendering", category="Frontend", description="How the browser builds and repaints DOM nodes efficiently."),
            ConceptPreviewNode(id="con-fe-2", name="Client-side Session State", category="Frontend", prerequisiteOf="con-fe-1", description="Managing global React or JavaScript memory across route changes.")
        ]

        mission = Mission(
            id="m-fe-arch",
            pillar="architecture",
            title="Explore Frontend Layout",
            description="Investigate component layers, styling roles, and browser storage interfaces.",
            status="active",
            tasks=tasks,
            xpReward=100,
            scoreReward=35
        )

        return Feature(
            id="frontend-ui",
            name="Frontend Client Interface",
            description="User interface layouts, style variables, and controller files.",
            completionPercent=100,
            understandingScore=UnderstandingScore(),
            missions=[mission],
            lockedConcepts=locked_concepts
        )

    def _create_backend_feature(self, files: List[str]) -> Feature:
        components = [
            {"id": "c1", "name": files[0] if len(files) > 0 else "main.py", "responsibility": "Defines Uvicorn/FastAPI startup routes and configures API bindings."},
            {"id": "c2", "name": files[1] if len(files) > 1 else "analyzer.py", "responsibility": "Processes codebase metrics and translates AST structures into models."},
            {"id": "c3", "name": "GEMINI_API_KEY env", "responsibility": "Provides authorization credentials for third-party semantic API requests."}
        ]

        tasks = [
            MissionTask(
                id="be-task-match-1",
                type="component-match",
                prompt="Match backend handlers to their structural code responsibilities:",
                isCompleted=False,
                content=MissionTaskContent(matchingItems=components)
            ),
            MissionTask(
                id="be-task-boundary-1",
                type="boundary-sort",
                prompt="Distinguish between local core backend scripts and external network interfaces:",
                isCompleted=False,
                content=MissionTaskContent(boundaryItems=[
                    {"id": "b1", "name": components[0]["name"], "isInternal": True, "description": "Entry routing script."},
                    {"id": "b2", "name": "Google Gemini API Service", "isInternal": False, "description": "Cloud service providing model completions."},
                    {"id": "b3", "name": "FastAPI Framework Package", "isInternal": False, "description": "Third-party pip dependency providing HTTP request parsing."}
                ])
            ),
            MissionTask(
                id="be-task-sequence-1",
                type="flow-sequence",
                prompt="Arrange the steps of a codebase analysis request chronologically:",
                isCompleted=False,
                content=MissionTaskContent(flowSteps=[
                    {"id": "s1", "stepNumber": 1, "text": "HTTP POST request hits the port 8000 route dispatcher", "component": components[0]["name"]},
                    {"id": "s2", "stepNumber": 2, "text": "Analyzer scans workspace files and parses content", "component": len(components) > 1 and components[1]["name"] or "Analyzer"},
                    {"id": "s3", "stepNumber": 3, "text": "The controller formats results and sends JSON response back", "component": components[0]["name"]}
                ])
            ),
            MissionTask(
                id="be-task-connect-1",
                type="connection-identify",
                prompt="Identify which local component communicates directly with the Google Gemini API service:",
                isCompleted=False,
                content=MissionTaskContent(
                    nodes=[components[0]["name"], components[1]["name"], "Google Gemini API Service"],
                    correctConnections=[(components[1]["name"], "Google Gemini API Service")]
                )
            )
        ]

        locked_concepts = [
            ConceptPreviewNode(id="con-be-1", name="Asynchronous Event Loops", category="Backend", description="Managing high-throughput socket requests using asyncio and uvicorn."),
            ConceptPreviewNode(id="con-be-2", name="API Routing & Middleware", category="Backend", prerequisiteOf="con-be-1", description="Request lifecycle, CORS injections, and secure endpoint parameters.")
        ]

        mission = Mission(
            id="m-be-arch",
            pillar="architecture",
            title="Backend Routing & APIs",
            description="Examine request parsing, local script bindings, and model API boundaries.",
            status="active",
            tasks=tasks,
            xpReward=150,
            scoreReward=40
        )

        return Feature(
            id="backend-services",
            name="Backend Services API",
            description="HTTP routes, business logic analyzer, and environment configurations.",
            completionPercent=100,
            understandingScore=UnderstandingScore(),
            missions=[mission],
            lockedConcepts=locked_concepts
        )

    def _create_database_feature(self, files: List[str]) -> Feature:
        components = [
            {"id": "c1", "name": files[0] if len(files) > 0 else "database.sql", "responsibility": "Declares table structures, keys, constraints, and mock records."},
            {"id": "c2", "name": "sqlite3 engine", "responsibility": "Manages execution of database operations on the local file system."}
        ]

        tasks = [
            MissionTask(
                id="db-task-match-1",
                type="component-match",
                prompt="Map data-layer assets to their functional responsibilities:",
                isCompleted=False,
                content=MissionTaskContent(matchingItems=components)
            ),
            MissionTask(
                id="db-task-boundary-1",
                type="boundary-sort",
                prompt="Identify which database configurations are internal vs system-managed:",
                isCompleted=False,
                content=MissionTaskContent(boundaryItems=[
                    {"id": "b1", "name": components[0]["name"], "isInternal": True, "description": "SQL Schema definition script."},
                    {"id": "b2", "name": "Sqlite3 Library", "isInternal": False, "description": "Local C-based storage library package."}
                ])
            ),
            MissionTask(
                id="db-task-sequence-1",
                type="flow-sequence",
                prompt="Order the database table schema configuration workflow:",
                isCompleted=False,
                content=MissionTaskContent(flowSteps=[
                    {"id": "s1", "stepNumber": 1, "text": "Engine initializes empty DB container file", "component": "sqlite3 engine"},
                    {"id": "s2", "stepNumber": 2, "text": "SQL DDL statements build tables, keys, and foreign constraints", "component": components[0]["name"]},
                    {"id": "s3", "stepNumber": 3, "text": "DML inserts seed the database with starter values", "component": components[0]["name"]}
                ])
            )
        ]

        locked_concepts = [
            ConceptPreviewNode(id="con-db-1", name="Relational Constraints", category="Database", description="Enforcing integrity via foreign keys, cascading deletes, and unique indices."),
            ConceptPreviewNode(id="con-db-2", name="Query Optimizations", category="Database", prerequisiteOf="con-db-1", description="Creating index maps to reduce search complexity.")
        ]

        mission = Mission(
            id="m-db-arch",
            pillar="architecture",
            title="Database Schemas",
            description="Investigate DDL commands, relationships, and engine boundaries.",
            status="active",
            tasks=tasks,
            xpReward=120,
            scoreReward=35
        )

        return Feature(
            id="database-layer",
            name="Database Schema Layer",
            description="Table setups, seeding files, and engine drivers.",
            completionPercent=100,
            understandingScore=UnderstandingScore(),
            missions=[mission],
            lockedConcepts=locked_concepts
        )

    def _create_generic_feature(self, files: List[str]) -> Feature:
        # A generic backup feature if directory is empty
        components = [
            {"id": "c1", "name": files[0] if len(files) > 0 else "main.py", "responsibility": "Hosts workspace application structures."},
            {"id": "c2", "name": "Local VS Code IDE", "responsibility": "Interprets configuration states and displays panels to developers."}
        ]

        tasks = [
            MissionTask(
                id="gen-task-match-1",
                type="component-match",
                prompt="Identify component duties in this workspace:",
                isCompleted=False,
                content=MissionTaskContent(matchingItems=components)
            ),
            MissionTask(
                id="gen-task-boundary-1",
                type="boundary-sort",
                prompt="Determine internal workspace code vs external IDE boundaries:",
                isCompleted=False,
                content=MissionTaskContent(boundaryItems=[
                    {"id": "b1", "name": components[0]["name"], "isInternal": True, "description": "Local workspace file code."},
                    {"id": "b2", "name": "VS Code Extension Host", "isInternal": False, "description": "API platform hosting plugins."}
                ])
            )
        ]

        locked_concepts = [
            ConceptPreviewNode(id="con-gen-1", name="Modular Structure", category="DevOps", description="Splitting workspace elements into clean directories.")
        ]

        mission = Mission(
            id="m-gen-arch",
            pillar="architecture",
            title="Workspace Architecture",
            description="Deconstruct files and boundary interactions.",
            status="active",
            tasks=tasks,
            xpReward=80,
            scoreReward=30
        )

        return Feature(
            id="workspace-core",
            name="Workspace Core Components",
            description="General configuration layout and code modules.",
            completionPercent=100,
            understandingScore=UnderstandingScore(),
            missions=[mission],
            lockedConcepts=locked_concepts
        )
