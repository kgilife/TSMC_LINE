# MGM 系統架構升級需求書 (v2)

本次升級目標為支援多組推廣網址、批量產生專屬連結，並引入「數位指紋 (Digital Fingerprint)」進行去重複點擊統計，同時確保跳轉過程極速且穩定。

## 1. 業務邏輯確認
- **使用者代碼唯一性**：同一位業務員只會推廣一個網址，因此「使用者代碼」(User Code) 在系統中是唯一的，可以用來精準對應唯一的「網址編號」(URL ID)。
- **短網址生成策略**：採用 `is.gd` 短網址服務。系統會優先嘗試將短網址結尾設定為「使用者代碼」（例如 `https://is.gd/A001`）。若該代碼已被全球其他使用者佔用，則自動降級產生隨機字串的短網址，確保連結一定能生成成功。

## 2. 系統架構與資料庫設計 (Google Sheet)

系統將於現有的 Google Sheet 中建立與維護以下三個工作表。
**(重要提醒：請在 GAS 編輯器中手動執行 `initSystem()` 函數，以確保所有工作表與欄位正確初始化)**

### 2.1 `urls` 工作表 (目標網址管理)
用來管理多組推廣目標網址。
- **URL_ID**: 網址編號 (例如 1, 2, 3，作為主鍵)
- **Target_URL**: 實際目標網址 (例如 https://...)
- **Created_At**: 建立時間

### 2.2 `links` 工作表 (推廣連結映射表)
用來儲存批量生成的專屬連結對應關係。
- **User_Code**: 使用者代碼/業務員代碼 (例如 A001，作為主鍵)
- **URL_ID**: 關聯的網址編號
- **Short_URL**: 系統為其生成的專屬短網址 (is.gd 或隨機備用)
- **Created_At**: 生成時間
- **Name**: 業務員姓名 (選填)

### 2.3 `clicks` 工作表 (點擊記錄流水帳)
升級現有紀錄表，加入數位指紋與對應的網址編號。
- **Time**: 點擊時間
- **Code**: 使用者代碼
- **URL_ID**: 該次點擊跳轉的目標網址編號
- **IP**: 使用者 IP
- **Fingerprint**: 數位指紋 (HTML5 Canvas + UserAgent)
- **Browser**: 瀏覽器
- **OS**: 作業系統
- **Device**: 裝置類型
- **Referer**: 來源網址

---

## 3. 功能模組修改計畫

### 3.1 後端 API (Google Apps Script)
1. **系統初始化腳本**：提供 `initSystem()` 函式，由管理員於首次部署時執行，自動檢測並生成 `urls` 與 `links` 表，並將舊有 `clicks` 表頭擴充 `URL_ID` 與 `Fingerprint` 欄位。
2. **跳轉邏輯升級**：接收到 `code` 參數後，於 `links` 表查出對應的 `URL_ID`，再至 `urls` 表取得 `Target_URL`，最後返回帶有跳轉語法的 HTML。跳轉邏輯皆在前端背景極速完成。
3. **數位指紋上報**：跳轉 HTML 植入 Canvas Fingerprinting 技術，計算出裝置專屬指紋後隨 Log 請求上報。
4. **新增網址管理 API**：
   - `action=addUrl`：新增目標網址。
   - `action=deleteUrl`：刪除目標網址。
   - `action=getUrls`：取得現有目標網址列表。
5. **新增生成連結管理 API**：
   - `action=getLinks`：取得已生成短網址清單。
   - `action=deleteLink`：刪除已生成的指定業務員連結。
6. **新增批量生成 API (`action=generateBatch`)**：
   - 接收 JSON 陣列 (包含 URL_ID 與 User_Code)。
   - 呼叫 `is.gd` API 進行短網址縮短。
   - 寫入 `links` 資料表，並將結果回傳給前端。
7. **統計邏輯修改 (`action=stats`)**：以 `Fingerprint` 為 KEY 進行去重複點擊 (Unique Clicks) 計算，確保同一裝置多次點擊只計算一次。同時回傳 `URL_ID` 所對應的真實 `Target_URL`。

### 3.2 前端管理頁面 (`admin/index.html`)
1. **推廣網址管理區塊**：提供介面讓管理者可以新增與刪除目標網址 (`URL_ID` 與 `Target_URL`)。
2. **批量生成連結區塊**：提供文字輸入框 (Textarea)，讓管理者可以直接貼上從 Excel/Google Sheet 複製來的三欄資料 (第一欄為網址編號，第二欄為使用者代碼，第三欄為姓名)。解析後呼叫後端 API 進行生成。
3. **已生成連結管理區塊**：提供列表顯示所有已生成的 `User_Code` 對應 `Short_URL` 及 `Name`，並提供「刪除」與「複製」功能。

### 3.3 前端統計頁面 (`stats/index.html`)
分為兩大分頁 (Tab) 進行展示：
1. **排行榜分頁 (Leaderboard)**：包含「業務推廣排行榜 (基於去重複點擊)」與「點擊明細日誌 (最新100筆)」。排行榜會同時顯示業務員代碼與姓名，圖表與排行榜改以「去重複點擊數」為基準進行排序與展示。
2. **統計數據分頁 (Analytics)**：包含總覽數據卡片 (總去重複點擊、總點擊次數、累計推廣業務員數) 以及最近 7 天的每日點擊走勢圖。

---

## 4. 全自動 CLI / REST API 部署規範 (Automated GAS Deployment Pipeline)

為了達到「完全零手動、全自動化部署」的目標，系統內建了 Python REST API 部署腳本，禁止任何手動複製貼上或介面點擊：

1. **部署指令**：
   ```powershell
   C:\Users\cyt18\anaconda3\python.exe scripts/deploy_gas.py
   ```
2. **部署自動化四步驟**：
   - **Step 1 (認證)**：自動讀取本地 `C:\Users\cyt18\.clasprc.json` 憑證並向 Google OAuth2 換取最新 `access_token`。
   - **Step 2 (同步)**：將本地 [Code.js](file:///g:/%E6%88%91%E7%9A%84%E9%9B%B2%E7%AB%AF%E7%A1%AC%E7%A2%9F/%E4%BD%9C%E5%93%81/MGM2/Code.js) 與 [appsscript.json](file:///g:/%E6%88%91%E7%9A%84%E9%9B%B2%E7%AB%AF%E7%A1%AC%E7%A2%9F/%E4%BD%9C%E5%93%81/MGM2/appsscript.json) 內容推送到 Google Apps Script 雲端。
   - **Step 3 (版本化)**：於 GAS 建立新版號 (Immutable Version Number)。
   - **Step 4 (發布)**：過濾出正式的 Web App 部署 ID，發送 `PUT` 請求更新 `deploymentConfig`（必須包含 `manifestFileName: "appsscript"` 欄位），實現秒級全自動發布上線。
