# 🛡️ Vibe Learn

> **Stop Vibing. Start Understanding.**
>
> Vibe Learn is a gamified VS Code extension that parses AI-generated codebases and creates interactive learning missions. Turn unverified code into a personalized RPG-style decryption roadmap, level up your engineering skills, and master codebase logic.

---

## 🌌 The Concept: Bridge the AI Knowledge Gap

When AI models build entire feature branches, developer understanding drops. Vibe Learn provides a structured **decryption path** using 5 engineering pillars:

| Pillar | Focus Area | Core Interactive Tasks |
|---|---|---|
| **🏰 Architecture** | Component boundaries & interactions | Component Matching, Boundary Sorting, Data Flow Sequencing, Connection Identifiers |
| **⚡ Logic** | Workflows & function internals | Execution Path Tracing, Event MCQs, Input/Output Mappers, Function Reconstructors |
| **🔍 Syntax** | Language nuances & library callbacks | Syntax Spotlight, Intent Detection, Blank Rebuilders, Library Breakdowns |
| **⚖️ Engineering Decisions** | Architectural trade-offs & failures | Trade-off Analyzers, Failure Diagnosticians, Mitigation Simulators, Alternatives Rankers |
| **🌳 Concepts** | Knowledge trees & dependencies | Prerequisite Mapping, Interactive Concept Graph Tree, Active Recall Blanks |

---

## 🛠️ Project Architecture

```mermaid
graph TD
    A[VS Code Extension Host] <-->|postMessage API| B[Vite + React Webview UI]
    B <-->|HTTP REST Requests| C[FastAPI Local Server: Port 8000]
    C <-->|Google GenAI Client| D[Gemini 1.5 Flash API]
    C <-->|AST & Custom Heuristics| E[Offline Rule-Based Analyzer]
```

### 1. VS Code Extension ([src/](file:///c:/Users/Amrita/OneDrive/Desktop/vibe%20learn/src/))
- **`extension.ts`**: Handles command registration, status bar integration, user settings configuration, and report exports.
- **`webview-provider.ts`**: Manages Webview View registration, mounts Vite builds, and provides secure message-routing.

### 2. Frontend UI ([webview-ui/](file:///c:/Users/Amrita/OneDrive/Desktop/vibe%20learn/webview-ui/))
- Powered by **React, Vite, and TypeScript**.
- Custom component ecosystem representing the 30+ gamified task varieties.
- RPG Dashboard tracks Level, XP, Daily Streaks, and overall understanding percentage.

### 3. Backend Engine ([backend/](file:///c:/Users/Amrita/OneDrive/Desktop/vibe%20learn/backend/))
- Powered by **FastAPI and Pydantic**.
- Features an offline AST parsing heuristic fallback when no API key is present.
- Integrates with Gemini 1.5 Flash via `google-generativeai` to perform semantic codebase analysis and question generation.

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Node.js** (v16+)
- **Python** (v3.9+)
- **VS Code**

---

### 🔑 1. Configure the Gemini API Key
Configure your Gemini API key in the backend. In `backend/` directory, create or modify the `.env` file:

```env
GEMINI_API_KEY=AIzaSyDECUK-FuVETmjf4mm1duQVO7FkP_r86PE
```

*Note: If no API key is specified, the backend will automatically fall back to **Local Offline Rule-Based** mode.*

---

### 🐍 2. Run the FastAPI Backend Server
Navigate to the `backend` directory, install requirements, and run the server using `uvicorn`:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Verify it is running by visiting the health endpoint at `http://127.0.0.1:8000/health`.

---

### 🎨 3. Compile the Webview & Extension
Install Node dependencies and build the assets:

```bash
# Install root extension and Webview UI dependencies
npm install
cd webview-ui && npm install && cd ..

# Compile the React app and Webpack bundle
npm run build-all
```

---

### 🚀 4. Launch in VS Code
1. Open the project folder in VS Code.
2. Open the **Run & Debug** panel (`Ctrl+Shift+D` or `Cmd+Shift+D`).
3. Run the **"Run Vibe Learn Extension"** launch configuration (or press `F5`).
4. A new Extension Development Host window will open with Vibe Learn active in the sidebar.

---

## 🧪 Running Tests
You can run the full suite of backend analysis and logic tests using python:

```bash
cd backend
python test_backend.py
python test_logic_backend.py
python test_phase3_backend.py
python test_phase4_backend.py
python test_phase5_backend.py
```
