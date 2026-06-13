import os
import sys
import shutil

# Ensure backend folder is in path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app, get_progress_filepath

client = TestClient(app)

def test_health_check():
    print("[TEST] Testing /health check endpoint...")
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    print("[SUCCESS] /health check verified.")

def test_progress_and_concept_unlock():
    print("[TEST] Testing /progress and /concept/unlock endpoints...")
    workspace_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    progress_file = get_progress_filepath(workspace_path)
    
    # Backup existing progress.json if any
    backup_path = progress_file + ".bak"
    has_backup = False
    if os.path.exists(progress_file):
        shutil.copyfile(progress_file, backup_path)
        has_backup = True
        
    try:
        # Run analyze first to initialize progress
        print("  - Running analysis to initialize workspace progress...")
        res_analyze = client.post("/analyze", json={"workspace_path": workspace_path})
        assert res_analyze.status_code == 200
        
        # Test progress endpoint
        response = client.get(f"/progress?workspace_path={encode_param(workspace_path)}")
        assert response.status_code == 200
        progress_data = response.json()
        assert progress_data["workspace"] == os.path.basename(workspace_path)
        assert "concept_statuses" in progress_data
        
        # Select a locked concept node to test unlock
        concept_graph = res_analyze.json().get("concept_graph", {})
        nodes = concept_graph.get("nodes", [])
        assert len(nodes) > 0
        
        test_node = nodes[0]
        test_node_id = test_node["id"]
        
        # Call unlock endpoint
        print(f"  - Testing unlock of concept node: {test_node_id}")
        unlock_res = client.post(f"/concept/unlock?concept_id={test_node_id}&workspace_path={encode_param(workspace_path)}")
        assert unlock_res.status_code == 200
        unlock_data = unlock_res.json()
        assert "unlocked" in unlock_data
        
        # Verify status is now completed
        response_new = client.get(f"/progress?workspace_path={encode_param(workspace_path)}")
        progress_new = response_new.json()
        assert progress_new["concept_statuses"].get(test_node_id) == "completed"
        print("[SUCCESS] /progress and /concept/unlock verified.")
    finally:
        # Restore backup
        if os.path.exists(progress_file):
            os.remove(progress_file)
        if has_backup:
            shutil.copyfile(backup_path, progress_file)
            os.remove(backup_path)

def encode_param(param: str) -> str:
    import urllib.parse
    return urllib.parse.quote(param)

if __name__ == "__main__":
    print("====================================================")
    print("   STARTING VIBE LEARN PHASE 5 BACKEND TESTS        ")
    print("====================================================")
    try:
        test_health_check()
        test_progress_and_concept_unlock()
        print("====================================================")
        print("    ALL PHASE 5 BACKEND TESTS PASSED SUCCESSFULLY   ")
        print("====================================================")
    except AssertionError as e:
        print(f"\n[TEST FAILED] Assertion Error: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[TEST FAILED] Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
