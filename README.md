# MGM 業務推廣連結系統 (MGM Link Hub)

一個為業務員開發的 MGM (Member Get Member) 活動推廣連結生成器與實時數據統計儀表板。支援 **免伺服器雲端運行 (GitHub Pages + Google Sheets)** 與 **本地開發/私有伺服器部署 (Express + SQLite/JSON)**。

*   **GitHub Pages 儀表板入口**：`https://hub-google.github.io/admin/` (已隱蔽安全分流)
*   **Google 試算表點擊資料庫**：請參閱專案內部設定檔與 `.env` 配置
*   **Google Apps Script 後台管理**：請於您的 Google 雲端硬碟開啟綁定試算表的 Apps Script 專案

---

## 1. 系統運作原理 (System Architecture)

為了達到「零託管成本、數據高隱蔽、防窺探」的目標，系統將管理後台放置在 GitHub Pages 的私密子目錄下（`/admin/`），並以 Google Apps Script Web App 代替 GitHub Pages 作為跳轉中繼站。

```
                              ┌────────────────────────┐
                              │  Google Apps Script    │
                              │ (HTML跳轉器與寫入處理)  │
                              └───────────┬────────────┘
                                          │
                        (點擊上報 / 寫入) │(重新導向)
                                          ▼
  ┌────────────────────────┐  (HTTPS API) ┌────────────────────────┐
  │     Google 試算表      │◄─────────────┤    LINE OA 邀請連結    │
  │     (clicks 工作表)    │              │ (LINE OA 邀請連結)        │
  └────────────────────────┘              └────────────────────────┘
              ▲
              │(查詢統計 JSON)
  ┌───────────┴────────────┐
  │     GitHub Pages       │
  │  (/admin/ 隱密後台面板)  │
  └────────────────────────┘
```

### 專屬邀請連結生成原理
- **統一 GitHub Pages 品牌短網址**：邀請網址統一使用簡潔乾淨的 GitHub Pages 域名中繼格式：`https://hub-google.github.io/?c=10000000`。
- **免依賴第三方 API**：完全不需要調用 `is.gd` 或 `TinyURL` 等外部短網址 API，格式 100% 統一且極具品牌感，永不失效或跳出長網址。

### 客戶點擊記錄與跳轉原理
1. **點擊品牌網址**：客戶點擊 `https://hub-google.github.io/?c=10000000` 連結，GitHub Pages 在毫秒間將 `c=10000000` 轉發至 GAS 伺服器。
2. **收集與寫入**：GAS 接收後傳回隱形載入頁面，讀取作業系統、瀏覽器、設備指紋與來源網址，向 GAS 上報寫入 Google 試算表。
3. **秒級重定向**：背景上報完成的同時，半秒內將客戶導向 LINE OA，完成加好友。
4. **防窺防護**：客戶手動造訪根網址 `https://hub-google.github.io/` 時，會自動跳轉至 LINE OA，保護後端管理系統安全。

---

## 2. 本地開發與私有伺服器部署 (Express Mode)

如果您希望在本地電腦運行或將其部署至專屬的伺服器（如 Node.js 主機），系統同樣內建了 Express 後端與 SQLite / JSON 本地資料庫雙模支援。

### 啟動指令
1. 安裝本地端依賴：
   ```bash
   npm install
   ```
2. 啟動伺服器：
   ```bash
   node server.js
   ```
3. 本地後台網址：[http://localhost:3000/admin/](http://localhost:3000/admin/)
4. 本地專屬跳轉連結測試：[http://localhost:3000/TEST_CODE](http://localhost:3000/TEST_CODE)

---

## 3. Google Apps Script (GAS) 首次啟用一鍵授權

1. 開啟您的 **Apps Script 後台**。
2. 確認上方下拉選單選擇了 `doGet` 函式。
3. 點選工具列上的 **執行 (Run)** 按鈕。
4. 此時會彈出「需要授權」視窗，請點選 **核對權限 (Review Permissions)**。
5. 選擇您目前的 Google 帳戶（即建立此試算表的帳號）。
6. 當出現安全性警告時，點選 **「進階」 (Advanced)** -> 再點選 **「前往 MGM2_Database (不安全)」**。
7. 點選 **允許 (Allow)** 即可完成啟用！
8. **重要**：點選右上角 **部署 (Deploy)** -> **管理部署 (Manage deployments)** -> 點選最上方第 4 版（最新的 `MGM2_Web_App_v3_redirect`）旁邊的 **「編輯 (鉛筆)」** -> 將 **「誰有權限存取」 (Who has access)** 改成 **「所有人」 (Anyone)**，點選 **部署** 儲存。
