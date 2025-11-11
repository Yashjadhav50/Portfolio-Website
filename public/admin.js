(async function(){
  // ===== API wrappers =====
  async function adminLogin(username, password){
    const res = await fetch('/api/admin/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, password })
    });
    return res.ok;
  }
  async function adminLogout(){ await fetch('/api/admin/logout', {method:'POST'}); }

  async function loadUsers(q=''){
    const res = await fetch('/api/admin/users' + (q ? ('?q='+encodeURIComponent(q)) : ''));
    if(!res.ok){ throw new Error('Not authorized'); }
    return await res.json();
  }
  async function loadSummary(){
    const res = await fetch('/api/admin/stats/summary'); if(!res.ok) throw 0; return res.json();
  }
  async function loadDaily(days=30){
    const res = await fetch('/api/admin/stats/daily?days='+days); if(!res.ok) throw 0; return res.json();
  }
  async function loadAgents(){
    const res = await fetch('/api/admin/stats/agents'); if(!res.ok) throw 0; return res.json();
  }

  // ===== UI helpers =====
  function render(users){
    const tbody = document.querySelector('#tbl tbody');
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.phone || ''}</td>
        <td><span class="pill">${new Date(u.created_at).toLocaleString()}</span></td>
        <td style="max-width:340px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.user_agent || ''}</td>
      </tr>`).join('');
  }

  function toCSV(rows){
    const header = Object.keys(rows[0]||{id:'',name:'',email:'',phone:'',created_at:'',user_agent:''});
    return [header.join(','), ...rows.map(r => header.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  }

  // ===== Charts =====
  let dailyChart, agentChart;
  function renderCharts(dailyRows, agentRows){
    const dailyCtx = document.getElementById('dailyChart');
    const agentCtx = document.getElementById('agentChart');

    const labels = dailyRows.map(r => r.d);
    const data = dailyRows.map(r => r.c);

    if(dailyChart) dailyChart.destroy();
    dailyChart = new Chart(dailyCtx, {
      type: 'line',
      data: { labels, datasets: [{ label:'Sign-ups', data }] },
      options: { responsive: true, maintainAspectRatio: false }
    });

    if(agentChart) agentChart.destroy();
    agentChart = new Chart(agentCtx, {
      type: 'doughnut',
      data: {
        labels: agentRows.map(r => r.agent),
        datasets: [{ data: agentRows.map(r => r.count) }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // ===== DOM refs =====
  const loginSec = document.getElementById('adminLogin');
  const dash = document.getElementById('dashboard');
  const form = document.getElementById('adminLoginForm');

  // Login handler
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const ok = await adminLogin(
      document.getElementById('adminUsername').value,
      document.getElementById('adminPassword').value
    );
    if(ok){
      loginSec.classList.add('hidden');
      dash.classList.remove('hidden');
      await hydrate();
    } else {
      alert('Wrong username or password');
    }
  });

  document.getElementById('q').addEventListener('input', async (e)=>{
    try{ render(await loadUsers(e.target.value)); }catch(err){ console.error(err); }
  });

  document.getElementById('exportBtn').addEventListener('click', async ()=>{
    const rows = await loadUsers();
    const csv = toCSV(rows);
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'signups.csv'; a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('adminLogoutBtn').addEventListener('click', async ()=>{
    await adminLogout(); window.location.href = '/login.html';
  });

  async function hydrate(){
    const [users, summary, daily, agents] = await Promise.all([
      loadUsers(), loadSummary(), loadDaily(30), loadAgents()
    ]);

    // Table
    render(users);

    // Stats
    document.getElementById('stTotal').textContent = summary.total;
    document.getElementById('st7').textContent = summary.last7;
    document.getElementById('st30').textContent = summary.last30;

    // Charts
    renderCharts(daily, agents);
  }

  // Auto-login hydrate if already authenticated
  try{
    await hydrate();
    loginSec.classList.add('hidden');
    dash.classList.remove('hidden');
  }catch{ /* not logged in */ }

})();
