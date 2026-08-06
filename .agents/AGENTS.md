# AGENTS.md - System Directives & Rules for MGM System

## MANDATORY: GAS Deployment Policy & Directives
- **NEVER** ask the user to manually copy code, log into Google, or click anything in the Google Apps Script Web UI.
- **ALWAYS** deploy Google Apps Script changes 100% automatically via the Python CLI tool:
  ```bash
  C:\Users\cyt18\anaconda3\python.exe scripts/deploy_gas.py
  ```
- **Deployment Script Architecture (`scripts/deploy_gas.py`)**:
  1. Reads OAuth credentials automatically from `C:\Users\cyt18\.clasprc.json`.
  2. Pushes `Code.js` and `appsscript.json` to Google Apps Script API via `PUT https://script.googleapis.com/v1/projects/{scriptId}/content`.
  3. Creates a new immutable version via `POST https://script.googleapis.com/v1/projects/{scriptId}/versions`.
  4. Updates all active Web App deployments to the newly created version number via `PUT https://script.googleapis.com/v1/projects/{scriptId}/deployments/{deploymentId}` with `manifestFileName: "appsscript"`.
  5. Verifies live deployment.

## Repository & Target Deployment Binding
- **Project Repository**: Bound to `https://github.com/kgilife/TSMC_LINE.git` (`origin`).
- **GitHub Pages**: Bound to `https://kgilife.github.io/TSMC_LINE/`.
- **Default Git Push Target**: All `git push` commands in this project MUST push to `origin` (`kgilife/TSMC_LINE`).

