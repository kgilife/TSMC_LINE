/**
 * MGM 業務推廣連結系統 - Google Apps Script (GAS) 雲端資料庫腳本
 * 
 * 此程式碼由 Antigravity AI 自動生成並部署。
 */

function initSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 初始化 urls 工作表
  let sheetUrls = ss.getSheetByName("urls");
  if (!sheetUrls) {
    sheetUrls = ss.insertSheet("urls");
    sheetUrls.appendRow(["URL_ID", "Target_URL", "Created_At"]);
    sheetUrls.setFrozenRows(1);
  }
  
  // 2. 初始化 links 工作表
  let sheetLinks = ss.getSheetByName("links");
  if (!sheetLinks) {
    sheetLinks = ss.insertSheet("links");
    sheetLinks.appendRow(["User_Code", "URL_ID", "Short_URL", "Created_At"]);
    sheetLinks.setFrozenRows(1);
  }

  // 3. 初始化或更新 clicks 工作表
  let sheetClicks = ss.getSheetByName("clicks");
  const newHeaders = ["Time", "Code", "URL_ID", "IP", "Fingerprint", "Browser", "OS", "Device", "Referer"];
  
  if (!sheetClicks) {
    sheetClicks = ss.insertSheet("clicks");
    sheetClicks.appendRow(newHeaders);
    sheetClicks.setFrozenRows(1);
  } else {
    // 檢查現有的表頭，如果發現是舊版 (沒有 URL_ID 或 Fingerprint)，則替換為新版表頭
    const currentHeaders = sheetClicks.getRange(1, 1, 1, sheetClicks.getLastColumn() || 1).getValues()[0];
    if (currentHeaders.length < newHeaders.length || !currentHeaders.includes("Fingerprint")) {
      // 為了安全起見，若使用者已有舊資料，我們將舊的 A1 替換成新表頭
      // 若原先是 7 欄，現在擴充為 9 欄
      sheetClicks.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
    }
  }
  
  return "System Initialization Complete";
}

function doGet(e) {
  const JSON_OUTPUT = function(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  };
  
  const TEXT_OUTPUT = function(text) {
    return ContentService.createTextOutput(text)
      .setMimeType(ContentService.MimeType.TEXT);
  };

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetUrls = ss.getSheetByName("urls");
    let sheetLinks = ss.getSheetByName("links");
    let sheetClicks = ss.getSheetByName("clicks");
    
    // 如果工作表不存在，代表還沒初始化，自動呼叫 initSystem()
    if (!sheetUrls || !sheetLinks || !sheetClicks) {
      initSystem();
      sheetUrls = ss.getSheetByName("urls");
      sheetLinks = ss.getSheetByName("links");
      sheetClicks = ss.getSheetByName("clicks");
    }
    
    const action = e.parameter.action;
    const code = (e.parameter.code || '').trim().toUpperCase();

    // 0. 前端 API 直連跳轉機制 (Client-side Direct API Redirection)
    if (action === 'get_target' || action === 'redirect_api') {
      const referer = e.parameter.referer || '';
      const userAgent = e.parameter.userAgent || '';
      const fp = e.parameter.fp || '';
      const timestamp = new Date().toISOString();

      let targetUrl = "https://r.botbonnie.com/H52rK"; // 預設官方 LINE OA 網址降級
      let urlId = "";
      
      const linksData = sheetLinks.getDataRange().getValues();
      const urlsData = sheetUrls.getDataRange().getValues();
      
      let foundUrlId = null;
      for (let i = 1; i < linksData.length; i++) {
        if (linksData[i][0] === code) {
          foundUrlId = linksData[i][1];
          break;
        }
      }
      
      if (foundUrlId) {
        urlId = foundUrlId;
        for (let i = 1; i < urlsData.length; i++) {
          if (urlsData[i][0] == foundUrlId) {
            if (urlsData[i][1] && urlsData[i][1] !== "#") {
              targetUrl = urlsData[i][1];
            }
            break;
          }
        }
      }
      
      // 記錄點擊事件
      if (code) {
        const uaParsed = parseUserAgent(userAgent);
        sheetClicks.appendRow([
          timestamp,
          code,
          urlId,
          "", // IP placeholder
          fp,
          uaParsed.browser,
          uaParsed.os,
          uaParsed.device,
          referer
        ]);
      }

      return JSON_OUTPUT({
        success: true,
        code: code,
        urlId: urlId,
        targetUrl: targetUrl
      });
    }

    // 1. 客戶跳轉核心防護機制 (Direct HTML Fallback)
    if (code && !action) {
      const scriptUrl = ScriptApp.getService().getUrl();
      
      // 找出這個 code 對應的 URL_ID 和 Target URL
      let targetUrl = "https://r.botbonnie.com/H52rK"; // 預設官方 LINE OA 網址降級
      let urlId = "";
      
      const linksData = sheetLinks.getDataRange().getValues();
      const urlsData = sheetUrls.getDataRange().getValues();
      
      let foundUrlId = null;
      for (let i = 1; i < linksData.length; i++) {
        if (linksData[i][0] === code) {
          foundUrlId = linksData[i][1];
          break;
        }
      }
      
      if (foundUrlId) {
        urlId = foundUrlId;
        for (let i = 1; i < urlsData.length; i++) {
          if (urlsData[i][0] == foundUrlId) {
            if (urlsData[i][1] && urlsData[i][1] !== "#") {
              targetUrl = urlsData[i][1];
            }
            break;
          }
        }
      }
      
      const html = `<!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <base target="_top">
        <title>正在跳轉至推廣頁面...</title>
        <style>
          body { background-color: #0b0f19; color: #f3f4f6; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
          .loader { border: 4px solid rgba(255, 255, 255, 0.1); width: 48px; height: 48px; border-radius: 50%; border-left-color: #6366f1; animation: spin 1s linear infinite; margin-bottom: 24px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
        <script>
          // 簡易前端指紋生成 (Canvas + UserAgent)
          function generateFingerprint() {
            try {
              let stored = localStorage.getItem('mgm_fp');
              if (stored) return stored;
              
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              ctx.textBaseline = "top";
              ctx.font = "14px 'Arial'";
              ctx.textBaseline = "alphabetic";
              ctx.fillStyle = "#f60";
              ctx.fillRect(125,1,62,20);
              ctx.fillStyle = "#069";
              ctx.fillText("Fingerprint,MGM", 2, 15);
              ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
              ctx.fillText("Fingerprint,MGM", 4, 17);
              
              const b64 = canvas.toDataURL().replace("data:image/png;base64,","");
              const bin = atob(b64);
              let crc = 0;
              for (let i = 0; i < bin.length; i++) {
                  crc = ((crc << 5) - crc) + bin.charCodeAt(i);
                  crc = crc & crc;
              }
              const fp = Math.abs(crc).toString(16) + "-" + Date.now().toString(36);
              localStorage.setItem('mgm_fp', fp);
              return fp;
            } catch (e) {
              return "fallback-" + Math.random().toString(36).substring(2);
            }
          }
        </script>
      </head>
      <body>
        <div class="loader"></div>
        <h2>正在為您跳轉...</h2>
        <a id="redirect-link" href="${targetUrl}" target="_top" style="display:none;">跳轉中...</a>
        
        <script>
          (function() {
            const targetUrl = "${targetUrl}";
            const fp = generateFingerprint();
            
            const logUrl = "${scriptUrl}?action=log" +
              "&code=${encodeURIComponent(code)}" +
              "&urlId=${encodeURIComponent(urlId)}" +
              "&fp=" + encodeURIComponent(fp) +
              "&referer=" + encodeURIComponent(document.referrer || "") +
              "&userAgent=" + encodeURIComponent(navigator.userAgent || "");
            
            let redirected = false;
            function doRedirect() {
              if (redirected) return;
              redirected = true;
              try {
                const link = document.getElementById('redirect-link');
                if (link) link.click(); else window.top.location = targetUrl;
              } catch (e) {
                try { window.top.location = targetUrl; } catch (e2) { window.location.href = targetUrl; }
              }
            }

            const beacon = new Image();
            beacon.onload = doRedirect;
            beacon.onerror = doRedirect;
            beacon.src = logUrl;
            
            setTimeout(doRedirect, 400);
          })();
        </script>
      </body>
      </html>`;
      return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // 2. 處理記錄點擊 (Log Click)
    if (action === 'log') {
      const ip = e.parameter.ip || '';
      const referer = e.parameter.referer || '';
      const userAgent = e.parameter.userAgent || '';
      const fp = e.parameter.fp || '';
      const urlId = e.parameter.urlId || '';
      const timestamp = new Date().toISOString();

      const uaParsed = parseUserAgent(userAgent);

      sheetClicks.appendRow([
        timestamp,
        code,
        urlId,
        ip,
        fp,
        uaParsed.browser,
        uaParsed.os,
        uaParsed.device,
        referer
      ]);

      return TEXT_OUTPUT("SUCCESS");
    }

    // 網址管理 API (Target URLs)
    if (action === 'getUrls') {
      const data = sheetUrls.getDataRange().getValues().slice(1).map(row => ({
        url_id: row[0],
        target_url: row[1],
        created_at: row[2]
      }));
      return JSON_OUTPUT({ success: true, data: data });
    }

    if (action === 'addUrl') {
      const payloadStr = e.postData ? e.postData.contents : e.parameter.payload;
      let urlId = e.parameter.urlId;
      let targetUrl = e.parameter.targetUrl;
      
      if (payloadStr) {
        try {
          const json = JSON.parse(payloadStr);
          urlId = json.urlId;
          targetUrl = json.targetUrl;
        } catch(e) {}
      }
      
      if (!urlId || !targetUrl) return JSON_OUTPUT({ success: false, error: "Missing parameters" });
      
      const timestamp = new Date().toISOString();
      sheetUrls.appendRow([urlId, targetUrl, timestamp]);
      return JSON_OUTPUT({ success: true });
    }

    if (action === 'deleteUrl') {
      const payloadStr = e.postData ? e.postData.contents : e.parameter.payload;
      let urlId = e.parameter.urlId;
      
      if (payloadStr) {
        try {
          const json = JSON.parse(payloadStr);
          urlId = json.urlId;
        } catch(e) {}
      }

      const data = sheetUrls.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == urlId) {
          sheetUrls.deleteRow(i + 1);
          return JSON_OUTPUT({ success: true });
        }
      }
      return JSON_OUTPUT({ success: false, error: "URL ID not found" });
    }

    // [新增] 生成的連結管理 API (Generated Links)
    if (action === 'getLinks') {
      const data = sheetLinks.getDataRange().getValues().slice(1).map(row => ({
        user_code: row[0],
        url_id: row[1],
        short_url: row[2],
        created_at: row[3]
      }));
      return JSON_OUTPUT({ success: true, data: data });
    }

    if (action === 'deleteLink') {
      const payloadStr = e.postData ? e.postData.contents : e.parameter.payload;
      let userCode = e.parameter.userCode;
      
      if (payloadStr) {
        try {
          const json = JSON.parse(payloadStr);
          userCode = json.userCode;
        } catch(e) {}
      }

      const data = sheetLinks.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == userCode) {
          sheetLinks.deleteRow(i + 1);
          return JSON_OUTPUT({ success: true });
        }
      }
      return JSON_OUTPUT({ success: false, error: "User Code not found" });
    }


    // 批量生成短網址
    if (action === 'generateBatch') {
      const payloadStr = e.postData ? e.postData.contents : e.parameter.payload;
      if (!payloadStr) return JSON_OUTPUT({ success: false, error: "No payload" });
      
      let items;
      try { items = JSON.parse(payloadStr); } catch(err) { return JSON_OUTPUT({ success: false, error: "Invalid JSON payload" }); }
      
      const scriptUrl = ScriptApp.getService().getUrl();
      const results = [];
      const timestamp = new Date().toISOString();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const userCode = (item.user_code || '').trim().toUpperCase();
        const urlId = item.url_id;
        
        if (!userCode || !urlId) continue;
        
        // 統一使用 GitHub Pages 中繼站品牌短網址 (直接掛載根域名，省略 mgm2 資料夾)
        const finalShortUrl = "https://hub-google.github.io/?c=" + encodeURIComponent(userCode);
        
        // 寫入 links 表 (先檢查是否已存在，若存在則更新，否則新增)
        const linksData = sheetLinks.getDataRange().getValues();
        let found = false;
        for (let r = 1; r < linksData.length; r++) {
          if (linksData[r][0] === userCode) {
            sheetLinks.getRange(r + 1, 2).setValue(urlId);
            sheetLinks.getRange(r + 1, 3).setValue(finalShortUrl);
            sheetLinks.getRange(r + 1, 4).setValue(timestamp);
            found = true;
            break;
          }
        }
        if (!found) {
          sheetLinks.appendRow([userCode, urlId, finalShortUrl, timestamp]);
        }
        
        results.push({ user_code: userCode, url_id: urlId, short_url: finalShortUrl });
      }
      
      return JSON_OUTPUT({ success: true, data: results });
    }

    // 3. 處理獲取統計數據 (Get Stats)
    if (action === 'stats') {
      const dataRange = sheetClicks.getDataRange();
      const rows = dataRange.getValues();
      const headers = rows[0];
      const records = rows.slice(1);

      // 建立 URL Map，讓統計日誌可以知道 target_url
      const urlsData = sheetUrls.getDataRange().getValues();
      const urlMap = {};
      for (let i = 1; i < urlsData.length; i++) {
        urlMap[urlsData[i][0]] = urlsData[i][1];
      }

      // 檢查是否為新版或舊版資料表以對應正確的欄位 index
      let fpIndex = -1, codeIndex = 1, ipIndex = -1, urlIdIndex = 2;
      for (let i = 0; i < headers.length; i++) {
        if (headers[i] === 'Fingerprint') fpIndex = i;
        if (headers[i] === 'Code') codeIndex = i;
        if (headers[i] === 'IP') ipIndex = i;
        if (headers[i] === 'URL_ID') urlIdIndex = i;
      }

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const uniqueSales = new Set();
      let clicksToday = 0;
      
      const uniqueFpMap = new Set();
      const fpMapByCode = {};

      records.forEach(row => {
        const clickedTime = new Date(row[0]);
        const code = row[codeIndex];
        let fp = "unknown";
        if (fpIndex !== -1 && row[fpIndex]) {
          fp = row[fpIndex];
        } else if (ipIndex !== -1 && row[ipIndex]) {
          fp = row[ipIndex];
        }
        
        if (code) {
          uniqueSales.add(code);
          if (!fpMapByCode[code]) fpMapByCode[code] = new Set();
          fpMapByCode[code].add(fp);
        }
        
        uniqueFpMap.add(fp);

        if (clickedTime >= startOfToday) {
          clicksToday++;
        }
      });

      const uniqueSalespersons = uniqueSales.size;
      const totalUniqueClicks = uniqueFpMap.size;
      const totalClicks = records.length;

      // 業務員排行榜 (基於 Unique Clicks)
      const salespersonMap = {};
      records.forEach(row => {
        const code = row[codeIndex];
        const clickedTime = row[0];
        if (!code) return;
        
        if (!salespersonMap[code]) {
          salespersonMap[code] = { 
            salesperson_code: code, 
            clicks: 0, 
            unique_clicks: fpMapByCode[code].size, 
            last_clicked_at: clickedTime 
          };
        }
        salespersonMap[code].clicks += 1;
        if (new Date(clickedTime) > new Date(salespersonMap[code].last_clicked_at)) {
          salespersonMap[code].last_clicked_at = clickedTime;
        }
      });

      const bySalesperson = Object.values(salespersonMap)
        .sort((a, b) => b.unique_clicks - a.unique_clicks)
        .slice(0, 50);

      const trendDays = [];
      const trendMap = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        trendDays.push(dateStr);
        trendMap[dateStr] = 0;
      }

      records.forEach(row => {
        const clickedTime = new Date(row[0]);
        const dateStr = clickedTime.toISOString().split('T')[0];
        if (dateStr in trendMap) {
          trendMap[dateStr] += 1;
        }
      });

      const byDay = trendDays.map(date => ({
        date: date,
        clicks: trendMap[date]
      }));

      // 明細日誌 (最新 100 筆)
      const recentLogs = records
        .slice(-100)
        .reverse()
        .map(row => {
          const uId = row[urlIdIndex];
          let logObj = { 
            clicked_at: row[0], 
            salesperson_code: row[codeIndex],
            url_id: uId,
            target_url: urlMap[uId] || ''
          };
          if (fpIndex !== -1) {
            logObj.ip_address = row[3];
            logObj.fingerprint = row[4];
            logObj.browser = row[5];
            logObj.os = row[6];
            logObj.device = row[7];
            logObj.referer = row[8];
          } else {
            // 舊版
            logObj.ip_address = row[2];
            logObj.browser = row[3];
            logObj.os = row[4];
            logObj.device = row[5];
            logObj.referer = row[6];
          }
          return logObj;
        });

      return JSON_OUTPUT({
        success: true,
        data: {
          metrics: {
            totalClicks: totalClicks,
            totalUniqueClicks: totalUniqueClicks,
            uniqueSalespersons: uniqueSalespersons,
            clicksToday: clicksToday
          },
          bySalesperson: bySalesperson,
          byDay: byDay,
          recentLogs: recentLogs
        }
      });
    }

    // 預設重定向
    const fallbackUrl = "#";
    return HtmlService.createHtmlOutput(`<script>try { window.top.location = "${fallbackUrl}"; } catch(e) { window.location.href = "${fallbackUrl}"; }</script>`);

  } catch (err) {
    return JSON_OUTPUT({ success: false, error: err.toString() });
  }
}

/**
 * 簡易 User-Agent 解析器
 */
function parseUserAgent(ua) {
  ua = ua || "";
  let browser = "Unknown";
  let os = "Unknown";
  let device = "desktop";

  if (ua.indexOf("Windows") !== -1) os = "Windows";
  else if (ua.indexOf("iPhone") !== -1) { os = "iOS"; device = "mobile"; }
  else if (ua.indexOf("iPad") !== -1) { os = "iOS"; device = "tablet"; }
  else if (ua.indexOf("Macintosh") !== -1 || ua.indexOf("Mac OS") !== -1) os = "macOS";
  else if (ua.indexOf("Android") !== -1) { os = "Android"; device = "mobile"; }
  else if (ua.indexOf("Linux") !== -1) os = "Linux";

  if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
  else if (ua.indexOf("Edge") !== -1 || ua.indexOf("Edg/") !== -1) browser = "Edge";
  else if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
  else if (ua.indexOf("Safari") !== -1) browser = "Safari";
  else if (ua.indexOf("MSIE") !== -1 || ua.indexOf("Trident/") !== -1) browser = "Internet Explorer";

  return { browser: browser, os: os, device: device };
}

function doPost(e) {
  return doGet(e);
}
