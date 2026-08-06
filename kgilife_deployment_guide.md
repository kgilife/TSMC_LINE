# TSMC_LINE 專案發佈與 Secrets 設定指南 (kgilife 帳號)

本文件紀錄將 MGM2 / TSMC_LINE 專案發佈至 [kgilife/TSMC_LINE](https://github.com/kgilife/TSMC_LINE) 的網頁與 Secrets 管理設定。

---

## 1. 網頁發佈 (GitHub Pages)

本專案的前端網頁 (`index.html`, `404.html`, `js/`, `css/`) 支援直接透過 GitHub Pages 靜態託管發佈：

1. 開啟 GitHub 倉庫設置：[https://github.com/kgilife/TSMC_LINE/settings/pages](https://github.com/kgilife/TSMC_LINE/settings/pages)
2. 在 **Build and deployment** -> **Source** 選擇 `Deploy from a branch`
3. Branch 選擇 **`main`** / **`/ (root)`** 並點選 **Save**
4. 發佈完成後，網頁正式網址為：`https://kgilife.github.io/TSMC_LINE/`

---

## 2. Secrets 與環境變數設定 (Secrets & Environment Variables)

為了保護敏感資訊（Google OAuth、試算表 ID、GAS Deploy Token），專案中的實體 Secrets 檔案預設不直接推送到 GitHub。

### 關鍵 Secrets 檔案說明：

| 檔案名稱 | 作用 | 是否推送到 Git | 範本檔案 |
|---|---|---|---|
| `.env` | 本地或伺服器環境變數 (PORT, TARGET_URL) | ❌ 否 (`.gitignore`) | `.env.example` |
| `.clasp.json` | Google Apps Script 指向 (scriptId, parentId) | ❌ 否 (`.gitignore`) | `.clasp.json.example` |
| `C:\Users\cyt18\.clasprc.json` | Google OAuth 存取 Token | ❌ 否 (全域系統層級) | - |

### 初始化全新環境 Secrets 步驟：

1. **複製範本檔**：
   ```bash
   cp .env.example .env
   cp .clasp.json.example .clasp.json
   ```
2. **編輯 `.env`**：
   - `PORT`: 服務預設埠號（例: `3000`）
   - `TARGET_URL`: LINE OA / 轉址目標網址

3. **編輯 `.clasp.json`**：
   - `scriptId`: 您的 Google Apps Script 專案 ID
   - `parentId`: 對應的 Google Sheet 試算表 ID

---

## 3. Google Apps Script 自動化部署指令

本專案遵守嚴格自動化部署規範，無需手動複製貼上 Code.js：

```bash
C:\Users\cyt18\anaconda3\python.exe scripts/deploy_gas.py
```

- **自動化流程**：
  1. 自動讀取 `~/.clasprc.json` 之 Google OAuth Credentials。
  2. 透過 REST API 更新 `Code.js` 與 `appsscript.json` 到 GAS。
  3. 自動建立新 Version 並更新所有 Active Web App Deployments。
