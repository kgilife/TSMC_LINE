// MGM Link Hub - Admin Application Logic

document.addEventListener('DOMContentLoaded', () => {
  const hasGasUrl = typeof CONFIG !== 'undefined' && CONFIG.GAS_WEB_APP_URL && CONFIG.GAS_WEB_APP_URL.startsWith('http');
  if (!hasGasUrl) {
    const banner = document.getElementById('setup-banner');
    if (banner) banner.classList.remove('hidden');
    return;
  }
  const gasUrl = CONFIG.GAS_WEB_APP_URL;

  // Theme Toggle
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggleBtn.addEventListener('click', () => {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggleBtn.querySelector('i').className = newTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  });
  themeToggleBtn.querySelector('i').className = savedTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';

  // ==========================================
  // 1. URL Management (Target URLs)
  // ==========================================
  const urlsTableBody = document.querySelector('#urls-table tbody');
  const addUrlBtn = document.getElementById('add-url-btn');

  async function loadUrls() {
    try {
      const response = await fetch(`${gasUrl}?action=getUrls&_t=${Date.now()}`);
      const text = await response.text();
      let res;
      try {
        res = JSON.parse(text);
      } catch(err) {
        throw new Error('GAS 傳回非 JSON 回應，請確保已在瀏覽器開啟並授權 GAS Web App。<br><a href="' + gasUrl + '?action=getUrls" target="_blank" style="color:var(--primary);text-decoration:underline;">點此前往 GAS 完成一次性授權</a>');
      }
      if (res.success) {
        renderUrlsTable(res.data);
      } else {
        urlsTableBody.innerHTML = `<tr><td colspan="3" class="text-center error">載入失敗: ${res.error || '未知錯誤'}</td></tr>`;
      }
    } catch (e) {
      urlsTableBody.innerHTML = `<tr><td colspan="3" class="text-center error" style="padding:15px;line-height:1.6;">${e.message}</td></tr>`;
    }
  }

  function renderUrlsTable(urls) {
    urlsTableBody.innerHTML = '';
    if (!urls || urls.length === 0) {
      urlsTableBody.innerHTML = '<tr class="empty-row"><td colspan="3" class="text-center">尚未新增任何目標網址</td></tr>';
      return;
    }
    urls.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600;">${u.url_id}</td>
        <td style="word-break: break-all; font-size: 13px;">${u.target_url}</td>
        <td>
          <button class="btn btn-sm" style="background: var(--card-bg); border: 1px solid #ef4444; color: #ef4444;" onclick="deleteUrl('${u.url_id}')">
            <i class="fa-solid fa-trash"></i> 刪除
          </button>
        </td>
      `;
      urlsTableBody.appendChild(tr);
    });
  }

  addUrlBtn.addEventListener('click', async () => {
    const urlId = document.getElementById('new-url-id').value.trim();
    const targetUrl = document.getElementById('new-target-url').value.trim();
    if (!urlId || !targetUrl) return alert('請輸入網址編號與目標網址');

    addUrlBtn.disabled = true;
    addUrlBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 新增中...';
    try {
      // 改用 URL Query 加上 GET 確保高相容性避免 302 CORS 問題
      const fetchUrl = `${gasUrl}?action=addUrl&urlId=${encodeURIComponent(urlId)}&targetUrl=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(fetchUrl);
      const text = await response.text();
      let res;
      try { res = JSON.parse(text); } catch(err) { throw new Error('授權或回應格式錯誤'); }
      
      if (res.success) {
        document.getElementById('new-url-id').value = '';
        document.getElementById('new-target-url').value = '';
        loadUrls();
      } else {
        alert('新增失敗: ' + res.error);
      }
    } catch (e) {
      alert('請求失敗: ' + e.message);
    } finally {
      addUrlBtn.disabled = false;
      addUrlBtn.innerHTML = '<i class="fa-solid fa-plus"></i> 新增網址';
    }
  });

  window.deleteUrl = async (urlId) => {
    if (!confirm(`確定要刪除網址編號 [${urlId}] 嗎？`)) return;
    try {
      const fetchUrl = `${gasUrl}?action=deleteUrl&urlId=${encodeURIComponent(urlId)}`;
      const response = await fetch(fetchUrl);
      const text = await response.text();
      let res;
      try { res = JSON.parse(text); } catch(err) { throw new Error('授權或回應格式錯誤'); }
      if (res.success) loadUrls();
      else alert('刪除失敗: ' + res.error);
    } catch (e) {
      alert('刪除失敗: ' + e.message);
    }
  };

  // ==========================================
  // 2. Links Management (Generated Links)
  // ==========================================
  const linksTableBody = document.querySelector('#links-table tbody');
  
  async function loadLinks() {
    if (!linksTableBody) return;
    try {
      const response = await fetch(`${gasUrl}?action=getLinks&_t=${Date.now()}`);
      const text = await response.text();
      let res;
      try { res = JSON.parse(text); } catch(e) {}
      if (res && res.success) {
        renderLinksTable(res.data);
      }
    } catch (e) {
      linksTableBody.innerHTML = `<tr><td colspan="4" class="text-center error">載入失敗: ${e.message}</td></tr>`;
    }
  }

  function renderLinksTable(links) {
    linksTableBody.innerHTML = '';
    if (!links || links.length === 0) {
      linksTableBody.innerHTML = '<tr class="empty-row"><td colspan="4" class="text-center">尚未生成任何推廣連結</td></tr>';
      return;
    }
    links.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600;">${u.user_code}</td>
        <td>${u.url_id}</td>
        <td>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="text" value="${u.short_url}" readonly style="flex:1; padding: 6px; border-radius: 4px; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary); font-size: 13px;">
              <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText('${u.short_url}')">複製</button>
            </div>
        </td>
        <td>
          <button class="btn btn-sm" style="background: var(--card-bg); border: 1px solid #ef4444; color: #ef4444;" onclick="deleteLink('${u.user_code}')">
            <i class="fa-solid fa-trash"></i> 刪除
          </button>
        </td>
      `;
      linksTableBody.appendChild(tr);
    });
  }

  window.deleteLink = async (userCode) => {
    if (!confirm(`確定要刪除代碼為 [${userCode}] 的連結紀錄嗎？`)) return;
    try {
      const fetchUrl = `${gasUrl}?action=deleteLink&userCode=${encodeURIComponent(userCode)}`;
      const response = await fetch(fetchUrl);
      const text = await response.text();
      let res;
      try { res = JSON.parse(text); } catch(err) { throw new Error('授權或回應格式錯誤'); }
      if (res && res.success) loadLinks();
      else alert('刪除失敗: ' + (res ? res.error : '未知錯誤'));
    } catch (e) {
      alert('請求失敗: ' + e.message);
    }
  };


  // ==========================================
  // 3. Batch Generator
  // ==========================================
  const batchGenerateBtn = document.getElementById('batch-generate-btn');
  const batchInput = document.getElementById('batch-input');
  
  batchGenerateBtn.addEventListener('click', async () => {
    const text = batchInput.value.trim();
    if (!text) return alert('請先貼上資料');

    const lines = text.split('\n');
    const items = [];
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        items.push({ url_id: parts[0], user_code: parts[1] });
      }
    });

    if (items.length === 0) return alert('解析失敗，請確認格式為：網址編號(空白/Tab)使用者代碼');

    batchGenerateBtn.disabled = true;
    batchGenerateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 生成中...';
    
    try {
      const response = await fetch(`${gasUrl}?action=generateBatch`, {
        method: 'POST',
        body: JSON.stringify(items)
      });
      const res = await response.json();
      if (res.success) {
        batchInput.value = '';
        alert('批量生成成功！請在下方「已生成的推廣連結管理」中檢視。');
        loadLinks(); // 重新載入生成的連結
      } else {
        alert('生成失敗: ' + res.error);
      }
    } catch (e) {
      alert('請求失敗: ' + e.message);
    } finally {
      batchGenerateBtn.disabled = false;
      batchGenerateBtn.innerHTML = '<span class="btn-text">開始批量生成</span><i class="fa-solid fa-arrow-right-long"></i>';
    }
  });

  // init
  loadUrls();
  loadLinks();
});
