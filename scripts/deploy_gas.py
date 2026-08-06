"""
MGM System - Automated Google Apps Script (GAS) CLI / REST API Deployment Tool
Usage:
    C:\\Users\\cyt18\\anaconda3\\python.exe scripts/deploy_gas.py
"""

import json
import urllib.request
import urllib.parse
import os
import sys

CLASPRC_PATH = r"C:\Users\cyt18\.clasprc.json"
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CODE_JS_PATH = os.path.join(PROJECT_DIR, "Code.js")
APPSSCRIPT_JSON_PATH = os.path.join(PROJECT_DIR, "appsscript.json")
CLASP_JSON_PATH = os.path.join(PROJECT_DIR, ".clasp.json")

def load_config():
    script_id = "1unVP4Q-vjCT-_5oD61hEBSZxIsGQcdovdBexqSguafM-ORDjA4TEaCZ7"
    if os.path.exists(CLASP_JSON_PATH):
        try:
            with open(CLASP_JSON_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if data.get('scriptId'):
                    script_id = data.get('scriptId')
        except Exception:
            pass
    return script_id

def get_access_token():
    if not os.path.exists(CLASPRC_PATH):
        raise FileNotFoundError(f"Missing OAuth credentials file at {CLASPRC_PATH}")

    with open(CLASPRC_PATH, 'r', encoding='utf-8') as f:
        clasprc = json.load(f)
    
    tokens = clasprc.get('tokens', {}).get('default', {})
    client_id = tokens.get('client_id')
    client_secret = tokens.get('client_secret')
    refresh_token = tokens.get('refresh_token')

    url = "https://oauth2.googleapis.com/token"
    data = urllib.parse.urlencode({
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }).encode('utf-8')

    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        return res.get('access_token')

def deploy():
    script_id = load_config()
    token = get_access_token()
    print(f"[GAS Deployer] OAuth Token acquired for Script ID: {script_id}")

    # 1. Read source files
    with open(CODE_JS_PATH, 'r', encoding='utf-8') as f:
        code_js = f.read()
    with open(APPSSCRIPT_JSON_PATH, 'r', encoding='utf-8') as f:
        appsscript = f.read()

    # 2. Push content to Google Apps Script
    print("[GAS Deployer] Pushing Code.js & appsscript.json...")
    content_url = f"https://script.googleapis.com/v1/projects/{script_id}/content"
    content_payload = {
        "files": [
            {"name": "Code", "type": "SERVER_JS", "source": code_js},
            {"name": "appsscript", "type": "JSON", "source": appsscript}
        ]
    }
    req_content = urllib.request.Request(
        content_url,
        data=json.dumps(content_payload).encode('utf-8'),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="PUT"
    )
    with urllib.request.urlopen(req_content) as resp:
        print("[GAS Deployer] Source code updated successfully.")

    # 3. Create a new version
    print("[GAS Deployer] Creating new version...")
    version_url = f"https://script.googleapis.com/v1/projects/{script_id}/versions"
    req_version = urllib.request.Request(
        version_url,
        data=json.dumps({"description": "Automated CLI Release"}).encode('utf-8'),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req_version) as resp:
        v_res = json.loads(resp.read().decode('utf-8'))
        version_num = v_res.get('versionNumber')
        print(f"[GAS Deployer] Version #{version_num} created.")

    # 4. Fetch existing deployments and update versioned Web App deployment
    print("[GAS Deployer] Fetching deployments...")
    dep_list_url = f"https://script.googleapis.com/v1/projects/{script_id}/deployments"
    req_deps = urllib.request.Request(dep_list_url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req_deps) as resp:
        d_res = json.loads(resp.read().decode('utf-8'))
        deployments = d_res.get('deployments', [])

    versioned_deps = []
    for dep in deployments:
        dep_config = dep.get('deploymentConfig', {})
        if 'versionNumber' in dep_config:
            versioned_deps.append(dep)

    if versioned_deps:
        for dep in versioned_deps:
            dep_id = dep.get('deploymentId')
            print(f"[GAS Deployer] Updating Web App Deployment [{dep_id}] to Version #{version_num}...")
            update_dep_url = f"https://script.googleapis.com/v1/projects/{script_id}/deployments/{dep_id}"
            dep_payload = {
                "deploymentConfig": {
                    "scriptId": script_id,
                    "versionNumber": version_num,
                    "manifestFileName": "appsscript",
                    "description": f"Automated Release v{version_num}"
                }
            }
            req_update = urllib.request.Request(
                update_dep_url,
                data=json.dumps(dep_payload).encode('utf-8'),
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                method="PUT"
            )
            with urllib.request.urlopen(req_update) as resp:
                print(f"[GAS Deployer] Web App Deployment [{dep_id}] successfully updated to Version #{version_num}!")
    else:
        print("[GAS Deployer] Warning: No versioned deployment found to update.")

    print("[GAS Deployer] ALL OPERATIONS COMPLETED SUCCESSFULLY.")

if __name__ == "__main__":
    try:
        deploy()
    except Exception as e:
        print(f"[GAS Deployer ERROR] {e}", file=sys.stderr)
        sys.exit(1)
