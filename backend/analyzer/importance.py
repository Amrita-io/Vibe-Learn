import os
import re
from typing import List, Dict

def count_imports(file_path: str, all_contents: Dict[str, str]) -> int:
    """
    Counts how many times a given file is imported by other files in the codebase.
    """
    base_name = os.path.basename(file_path)
    name_no_ext, _ = os.path.splitext(base_name)
    if not name_no_ext:
        return 0
        
    count = 0
    # Simple regexes to detect imports of this file name
    patterns = [
        re.compile(r"import\s+.*\s+from\s+['\"].*" + re.escape(name_no_ext) + r"['\"]"),
        re.compile(r"require\(\s*['\"].*" + re.escape(name_no_ext) + r"['\"]\s*\)"),
        re.compile(r"import\s+.*" + re.escape(name_no_ext)),
        re.compile(r"from\s+.*\s+import\s+.*" + re.escape(name_no_ext))
    ]

    for other_path, content in all_contents.items():
        if other_path == file_path:
            continue
        for pattern in patterns:
            if pattern.search(content):
                count += 1
                break
    return count

def get_important_files(workspace_path: str, limit: int = 15) -> List[str]:
    """
    Returns the top N files prioritized by logical importance to the system layout.
    """
    ignored_dirs = {
        'node_modules', '.git', '__pycache__', 'dist', 'build', 
        'out', '.gemini', 'artifacts', '.vscode', 'venv', 'env'
    }
    
    file_list = []
    file_contents = {}
    
    # Read files first
    for root, dirs, files in os.walk(workspace_path):
        dirs[:] = [d for d in dirs if d not in ignored_dirs]
        for file in files:
            rel_path = os.path.relpath(os.path.join(root, file), workspace_path)
            web_path = rel_path.replace("\\", "/")
            
            # Focus on source code files
            if file.endswith(('.py', '.js', '.ts', '.tsx', '.jsx', '.go', '.rs', '.java', '.cs')):
                file_list.append(web_path)
                full_path = os.path.join(root, file)
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        file_contents[web_path] = f.read()
                except Exception:
                    file_contents[web_path] = ""

    scored_files = []
    for fpath in file_list:
        content = file_contents.get(fpath, "")
        score = 0
        path_lower = fpath.lower()
        content_lower = content.lower()
        
        # 1. Route Handlers / API gateways (+40)
        if any(keyword in path_lower for keyword in ["route", "router", "controller", "api"]) or \
           any(decorator in content_lower for decorator in ["@app.post", "@app.get", "@app.route", "router.get", "express.router"]):
            score += 40
            
        # 2. Controllers & Services (+35)
        elif any(keyword in path_lower for keyword in ["service", "logic", "handler"]) or \
             "class " in content and any(keyword in content_lower for keyword in ["service", "controller"]):
            score += 35
            
        # 3. Domain & Data Models / Schemas (+25)
        elif any(keyword in path_lower for keyword in ["model", "schema", "entity", "database", "db"]):
            score += 25
            
        # 4. Utility / Helper Files (+10)
        elif any(keyword in path_lower for keyword in ["util", "helper", "common"]):
            score += 10
            
        # 5. Import centrality tie-breaker (+15 max)
        centrality = count_imports(fpath, file_contents)
        score += min(15, centrality * 3)
        
        scored_files.append((fpath, score))
        
    # Sort files by score descending
    scored_files.sort(key=lambda x: x[1], reverse=True)
    
    # Return top N file paths
    result = [x[0] for x in scored_files[:limit]]
    print(f"[Vibe Learn] Evaluated file importance. Top files: {result}")
    return result
