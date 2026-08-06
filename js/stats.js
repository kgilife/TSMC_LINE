// MGM Link Hub - Statistics Dashboard Logic (stats page only)

document.addEventListener('DOMContentLoaded', () => {
  
  const hasGasUrl = typeof CONFIG !== 'undefined' && CONFIG.GAS_WEB_APP_URL && CONFIG.GAS_WEB_APP_URL.startsWith('http');
  if (!hasGasUrl) {
    const banner = document.getElementById('setup-banner');
    if (banner) banner.classList.remove('hidden');
    return; // Stop execution if GAS URL is missing
  }

  const gasUrl = CONFIG.GAS_WEB_APP_URL;

  // ==========================================
  // 1. Theme Toggle
  // ==========================================
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    if (window.trendChartInstance) renderTrendChart(window.lastChartData);
  });

  function updateThemeIcon(theme) {
    const icon = themeToggleBtn.querySelector('i');
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }

  // ==========================================
  // 2. Statistics
  // ==========================================
  let allLeaderboard = [];
  let allLogs = [];
  
  const refreshBtn = document.getElementById('refresh-data-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', fetchStats);
  }

  async function fetchStats() {
    const refreshIcon = refreshBtn ? refreshBtn.querySelector('i') : null;
    if (refreshIcon) refreshIcon.classList.add('fa-spin');

    try {
      const response = await fetch(`${gasUrl}?action=stats`);
      const resData = await response.json();

      if (resData && resData.success) {
        const stats = resData.data;
        
        animateValue('stat-unique-clicks', stats.metrics.totalUniqueClicks || 0);
        animateValue('stat-total-clicks', stats.metrics.totalClicks);
        animateValue('stat-active-sales', stats.metrics.uniqueSalespersons);

        window.lastChartData = stats.byDay;
        renderTrendChart(stats.byDay);

        allLeaderboard = stats.bySalesperson || [];
        updateLeaderboardTable(allLeaderboard);

        allLogs = stats.recentLogs || [];
        updateLogsTable(allLogs);
      }
    } catch (err) {
      console.error('統計 API 連線失敗:', err);
    } finally {
      if (refreshIcon) setTimeout(() => refreshIcon.classList.remove('fa-spin'), 500);
    }
  }

  function animateValue(id, endValue) {
    const obj = document.getElementById(id);
    if (!obj) return;
    const end = parseInt(endValue, 10) || 0;
    const start = parseInt(obj.textContent, 10) || 0;
    if (start === end) return (obj.textContent = end);
    const duration = 800;
    let startTimestamp = null;
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      obj.textContent = Math.floor(progress * (end - start) + start);
      if (progress < 1) window.requestAnimationFrame(step);
      else obj.textContent = end;
    };
    window.requestAnimationFrame(step);
  }

  function renderTrendChart(trendData) {
    const ctx = document.getElementById('trendChart');
    if(!ctx) return;
    
    if (!trendData || trendData.length === 0) return;

    const labels = trendData.map(item => {
      const parts = item.date.split('-');
      return parts.length === 3 ? `${parts[1]}/${parts[2]}` : item.date;
    });
    const values = trendData.map(item => item.clicks);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#9ca3af' : '#4b5563';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    
    if (window.trendChartInstance) window.trendChartInstance.destroy();

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    if (isDark) {
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
      gradient.addColorStop(1, 'rgba(236, 72, 153, 0.0)');
    } else {
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
      gradient.addColorStop(1, 'rgba(236, 72, 153, 0.0)');
    }

    window.trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '點擊次數',
          data: values,
          borderColor: '#6366f1',
          borderWidth: 3,
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: isDark ? '#0b0f19' : '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          tension: 0.4,
          fill: true,
          backgroundColor: gradient
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, precision: 0 }, min: 0 }
        }
      }
    });
  }

  const leaderboardTableBody = document.querySelector('#leaderboard-table tbody');
  const leaderboardSearch = document.getElementById('leaderboard-search');

  function updateLeaderboardTable(data) {
    if(!leaderboardTableBody) return;
    leaderboardTableBody.innerHTML = '';
    
    if (data.length === 0) {
      leaderboardTableBody.innerHTML = '<tr class="empty-row"><td colspan="4" class="text-center">暫無排名數據</td></tr>';
      return;
    }

    data.forEach((row, index) => {
      const rank = index + 1;
      let rankBadge = `<span class="badge-rank other">${rank}</span>`;
      if (rank === 1) rankBadge = '<span class="badge-rank gold">1</span>';
      else if (rank === 2) rankBadge = '<span class="badge-rank silver">2</span>';
      else if (rank === 3) rankBadge = '<span class="badge-rank bronze">3</span>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center">${rankBadge}</td>
        <td style="font-weight: 600;">${row.salesperson_code}</td>
        <td class="text-right"><span class="badge-clicks">${row.unique_clicks}</span> 次</td>
        <td style="color: var(--text-secondary); font-size: 12px;">${formatDateTime(row.last_clicked_at)}</td>
      `;
      leaderboardTableBody.appendChild(tr);
    });
  }

  if (leaderboardSearch) {
    leaderboardSearch.addEventListener('input', (e) => {
      const keyword = e.target.value.trim().toUpperCase();
      const filtered = allLeaderboard.filter(row => row.salesperson_code.includes(keyword));
      updateLeaderboardTable(filtered);
    });
  }

  const logsTableBody = document.querySelector('#logs-table tbody');
  const logsSearch = document.getElementById('logs-search');

  function updateLogsTable(data) {
    if(!logsTableBody) return;
    logsTableBody.innerHTML = '';
    
    if (data.length === 0) {
      logsTableBody.innerHTML = '<tr class="empty-row"><td colspan="6" class="text-center">暫無點擊日誌</td></tr>';
      return;
    }

    data.forEach(row => {
      let osIcon = '<i class="fa-solid fa-laptop"></i>';
      const os = (row.os||'').toLowerCase();
      if (os.includes('ios') || os.includes('mac')) osIcon = '<i class="fa-brands fa-apple"></i>';
      else if (os.includes('android')) osIcon = '<i class="fa-brands fa-android" style="color:#22c55e"></i>';
      else if (os.includes('windows')) osIcon = '<i class="fa-brands fa-windows" style="color:#0ea5e9"></i>';

      const fpStr = row.fingerprint ? row.fingerprint.substring(0, 8) + '...' : '-';
      
      let targetUrlHtml = '-';
      if (row.target_url) {
        targetUrlHtml = `<a href="${row.target_url}" target="_blank" style="color: #6366f1; text-decoration: none;">點此前往</a>`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color: var(--text-secondary); font-size: 12px;">${formatDateTime(row.clicked_at)}</td>
        <td style="font-weight: 600;">${row.salesperson_code}</td>
        <td>${targetUrlHtml}</td>
        <td style="font-size: 12px;" title="${row.fingerprint}">${fpStr}</td>
        <td style="font-size: 12px;">${osIcon} ${row.os}</td>
        <td style="font-size: 12px;">${row.browser}</td>
      `;
      logsTableBody.appendChild(tr);
    });
  }

  if(logsSearch) {
    logsSearch.addEventListener('input', (e) => {
      const keyword = e.target.value.trim().toUpperCase();
      const filtered = allLogs.filter(row => {
        return (row.salesperson_code||'').includes(keyword) || 
               (row.os||'').toUpperCase().includes(keyword) || 
               (row.browser||'').toUpperCase().includes(keyword) ||
               (row.url_id||'').includes(keyword);
      });
      updateLogsTable(filtered);
    });
  }

  function formatDateTime(isoString) {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    } catch (e) {
      return isoString;
    }
  }

  // init — only fetch stats
  fetchStats();
});
