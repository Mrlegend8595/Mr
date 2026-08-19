#!/usr/bin/env node

// index.js — Redesigned dashboard (feat/dashboard-redesign merged).
// - Serves a modern dashboard UI with charts and controls
// - Adds /api/metrics and POST /api/bot/action (token protected via DASHBOARD_TOKEN)

'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const botModule = require('./Bot');

const PORT = process.env.PORT || 3000;
const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN || '';

function getPackageInfo() {
  try {
    const pkgPath = path.join(__dirname, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;
    const raw = fs.readFileSync(pkgPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

const pkg = getPackageInfo();

// In-memory metrics (server samples periodically)
const METRICS = {
  uptimeSeries: [], // { t: timestamp, v: seconds }
  healthSeries: [], // { t, v }
  samples: 0,
  maxPoints: 120
};

function sampleMetrics() {
  const t = Date.now();
  const uptime = Math.floor(process.uptime());
  const botStatus = botModule.getBotStatus ? botModule.getBotStatus() : null;
  const health = botStatus && typeof botStatus.health === 'number' ? botStatus.health : null;

  METRICS.uptimeSeries.push({ t, v: uptime });
  if (health !== null) METRICS.healthSeries.push({ t, v: health });
  METRICS.samples++;

  // trim
  if (METRICS.uptimeSeries.length > METRICS.maxPoints) METRICS.uptimeSeries.shift();
  if (METRICS.healthSeries.length > METRICS.maxPoints) METRICS.healthSeries.shift();
}

// sample every 5 seconds
setInterval(sampleMetrics, 5000);
// initial sample
sampleMetrics();

const htmlTemplate = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Mr - Bot Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
:root{--bg:#0b1020;--card:#0f1724;--muted:#94a3b8;--accent:#7c3aed;--glass:rgba(255,255,255,0.04)}
*{box-sizing:border-box}
html,body{height:100%;margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial}
body{background:linear-gradient(180deg,#071021 0%,#0b1020 50%);color:#e6eef8}
.app{display:flex;height:100vh;gap:18px;padding:18px}
.sidebar{width:88px;background:linear-gradient(180deg,rgba(255,255,255,0.02),transparent);border-radius:12px;padding:12px;display:flex;flex-direction:column;align-items:center}
.logo{width:56px;height:56px;background:linear-gradient(135deg,var(--accent),#5eead4);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#071021}
.nav{margin-top:14px;display:flex;flex-direction:column;gap:10px;width:100%}
.nav button{background:transparent;border:none;color:var(--muted);padding:10px;border-radius:10px;cursor:pointer;width:100%}
.nav button.active{background:var(--glass);color:#fff}
.main{flex:1;display:flex;flex-direction:column}
.topbar{height:64px;display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,0.02),transparent)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:16px}
.card{background:linear-gradient(180deg,rgba(255,255,255,0.02),transparent);border-radius:12px;padding:16px;min-height:120px}
.metrics{display:flex;gap:12px}
.metric{flex:1;background:linear-gradient(180deg,rgba(255,255,255,0.01),transparent);padding:12px;border-radius:10px}
.console{height:360px;display:flex;flex-direction:column}
.console-logs{flex:1;overflow:auto;padding:12px;background:#06101a;border-radius:8px;border:1px solid rgba(255,255,255,0.02)}
.controls{display:flex;gap:8px;margin-top:8px}
.btn{background:linear-gradient(90deg,var(--accent),#4f46e5);border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
.btn.ghost{background:transparent;border:1px solid rgba(255,255,255,0.06)}
.panel{display:flex;flex-direction:column;gap:12px}
.footer{margin-top:auto;padding:10px;text-align:center;color:var(--muted)}
@media(max-width:900px){.grid{grid-template-columns:1fr}.sidebar{display:none}.topbar{border-radius:8px}}
</style>
</head>
<body>
<div class="app">
  <aside class="sidebar" aria-hidden>
    <div class="logo">MR</div>
    <nav class="nav">
      <button id="nav-dashboard" class="active">Dash</button>
      <button id="nav-console">Console</button>
      <button id="nav-settings">Settings</button>
    </nav>
  </aside>
  <main class="main">
    <header class="topbar">
      <div style="display:flex;gap:12px;align-items:center">
        <h2 style="margin:0">Mr — Bot Dashboard</h2>
        <div style="color:var(--muted);font-size:13px">${pkg?.name || 'Mr'} • v${pkg?.version || '1.0.0'}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button id="refreshBtn" class="btn btn-small">Refresh</button>
        <div id="connectionBadge" style="padding:8px 10px;background:#05202a;border-radius:8px;color:#7eead0;font-weight:600">Connecting...</div>
      </div>
    </header>

    <section id="dashboardView">
      <div class="grid">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>Live Metrics</strong>
            <small style="color:var(--muted)">Updated every 5s</small>
          </div>
          <div class="metrics" style="margin-top:12px">
            <div class="metric">
              <div style="color:var(--muted);font-size:12px">Uptime</div>
              <div id="uptimeLarge" style="font-size:18px;font-weight:800">--</div>
            </div>
            <div class="metric">
              <div style="color:var(--muted);font-size:12px">Bot Health</div>
              <div id="healthLarge" style="font-size:18px;font-weight:800">--</div>
            </div>
            <div class="metric">
              <div style="color:var(--muted);font-size:12px">Players</div>
              <div id="playersLarge" style="font-size:18px;font-weight:800">--</div>
            </div>
          </div>
          <canvas id="uptimeChart" style="margin-top:12px;max-height:160px"></canvas>
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>Bot Status</strong>
            <small style="color:var(--muted)">Realtime</small>
          </div>
          <div style="margin-top:12px">
            <div id="botInfo" style="color:var(--muted);font-size:13px">Loading...</div>
            <div style="margin-top:12px">
              <button class="btn" onclick="botAction('reconnect')">Reconnect</button>
              <button class="btn ghost" onclick="botAction('start')">Start</button>
              <button class="btn ghost" onclick="botAction('stop')">Stop</button>
            </div>
          </div>
        </div>

        <div class="card console">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>Console</strong>
            <div style="display:flex;gap:8px;align-items:center">
              <input id="filterLog" placeholder="filter" style="padding:6px;border-radius:8px;background:#06131a;border:1px solid rgba(255,255,255,0.02);color:#cfe8ff" />
              <button class="btn ghost" id="clearBtn">Clear</button>
            </div>
          </div>
          <div class="console-logs" id="consoleLogs">Loading logs...</div>
          <div class="controls">
            <input id="cmdInput" placeholder="Enter command (not wired)" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.02);background:#06131a;color:#e6eef8" />
            <button class="btn" id="sendCmd">Send</button>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:16px;margin-top:16px">
        <div class="card" style="flex:1">
          <strong>Health History</strong>
          <canvas id="healthChart" style="margin-top:8px;max-height:140px"></canvas>
        </div>
        <div class="card" style="width:360px">
          <strong>Settings</strong>
          <div class="panel" style="margin-top:12px">
            <label style="font-size:13px;color:var(--muted)">Dashboard token (for controls)</label>
            <input id="tokenInput" placeholder="enter token to enable" style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.02);background:#071728;color:#e6eef8" />
            <small style="color:var(--muted)">Token is compared to DASHBOARD_TOKEN env on server</small>
          </div>
        </div>
      </div>
    </section>

    <footer class="footer">Built-in dashboard • Merge: feat/dashboard-redesign</footer>
  </main>
</div>

<script>
const state = { token: '' };

function humanTime(s){
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return h + 'h ' + m + 'm ' + sec + 's';
}

async function fetchBot() {
  try{
    const res = await fetch('/api/bot');
    if (!res.ok) throw new Error('failed');
    return await res.json();
  }catch(e){return null}
}

async function fetchMetrics(){
  try{
    const res = await fetch('/api/metrics');
    return res.ok ? await res.json() : null;
  }catch(e){return null}
}

let uptimeChart, healthChart;

function initCharts(){
  const ctx = document.getElementById('uptimeChart').getContext('2d');
  uptimeChart = new Chart(ctx,{type:'line',data:{labels:[],datasets:[{label:'Uptime (s)',data:[],borderColor:'#60a5fa',backgroundColor:'rgba(96,165,250,0.08)',tension:0.3}]},options:{scales:{x:{d[...]

  const ctx2 = document.getElementById('healthChart').getContext('2d');
  healthChart = new Chart(ctx2,{type:'line',data:{labels:[],datasets:[{label:'Health',data:[],borderColor:'#34d399',backgroundColor:'rgba(34,197,94,0.06)',tension:0.3}]},options:{scales:{x:{displ[...]
}

function updateCharts(metrics){
  if (!metrics) return;
  const upLabels = metrics.uptimeSeries.map(p=>new Date(p.t).toLocaleTimeString());
  const upData = metrics.uptimeSeries.map(p=>p.v);
  uptimeChart.data.labels = upLabels; uptimeChart.data.datasets[0].data = upData; uptimeChart.update();

  const hLabels = metrics.healthSeries.map(p=>new Date(p.t).toLocaleTimeString());
  const hData = metrics.healthSeries.map(p=>p.v);
  healthChart.data.labels = hLabels; healthChart.data.datasets[0].data = hData; healthChart.update();
}

async function refreshAll(){
  const bot = await fetchBot();
  if (bot && bot.status){
    const s = bot.status;
    document.getElementById('uptimeLarge').textContent = s.connected ? 'Connected' : 'Disconnected';
    document.getElementById('healthLarge').textContent = (s.health || 0) + ' ❤️';
    document.getElementById('playersLarge').textContent = '--';
    document.getElementById('botInfo').textContent = 'User: ' + (s.username || '--') + ' • Status: ' + (s.status || '--');
    document.getElementById('connectionBadge').textContent = s.connected ? 'Connected' : 'Disconnected';
  }

  const metrics = await fetchMetrics();
  updateCharts(metrics);

  const logs = bot && bot.logs ? bot.logs : (bot && bot.logs) || [];
  renderLogs(logs);
}

function renderLogs(logs){
  const el = document.getElementById('consoleLogs');
  el.innerHTML = '';
  if (!logs || logs.length===0) { el.textContent = 'No logs yet'; return; }
  const filter = document.getElementById('filterLog').value.toLowerCase();
  logs.slice().reverse().forEach(l=>{
    const txt = '[' + (l.timestamp || '') + '] ' + (l.type && l.type.toUpperCase ? l.type.toUpperCase() : (l.type || '')) + ' ' + (l.message || '');
    if (filter && !txt.toLowerCase().includes(filter)) return;
    const row = document.createElement('div');
    row.textContent = txt; row.style.padding='6px 0'; row.style.borderBottom='1px solid rgba(255,255,255,0.02)';
    el.appendChild(row);
  });
  el.scrollTop = el.scrollHeight;
}

async function botAction(action){
  try{
    const res = await fetch('/api/bot/action',{
      method:'POST',headers:{'Content-Type':'application/json','x-dashboard-token': state.token },body: JSON.stringify({ action })
    });
    const data = await res.json();
    alert(data.message || 'ok');
    await refreshAll();
  }catch(e){alert('Action failed: '+e.message)}
}

function wireUI(){
  document.getElementById('refreshBtn').addEventListener('click', refreshAll);
  document.getElementById('clearBtn').addEventListener('click', ()=>{document.getElementById('consoleLogs').innerHTML='';});
  document.getElementById('filterLog').addEventListener('input', refreshAll);
  document.getElementById('tokenInput').addEventListener('change', (e)=>{ state.token = e.target.value; });
  document.getElementById('sendCmd').addEventListener('click', ()=>{ alert('Command sending not implemented'); });
}

// initial
initCharts(); wireUI(); refreshAll();
setInterval(refreshAll,5000);
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  // CORS-safe preflight handler for API requests from the same origin
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Dashboard-Token'
    });
    res.end();
    return;
  }

  // POST /api/bot/action — control actions: start|stop|reconnect
  if (req.method === 'POST' && req.url === '/api/bot/action') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const token = req.headers['x-dashboard-token'] || req.headers['x-dashboard-token'.toLowerCase()];
        if (DASHBOARD_TOKEN && token !== DASHBOARD_TOKEN) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid token' }));
          return;
        }

        const payload = body ? JSON.parse(body) : {};
        const action = payload.action;
        if (!action) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'missing action' }));
          return;
        }

        if (action === 'reconnect') {
          if (botModule && botModule.createBot) {
            botModule.createBot();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'reconnect triggered' }));
            return;
          }
        }

        if (action === 'start') {
          if (botModule && botModule.createBot) {
            botModule.createBot();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'start triggered' }));
            return;
          }
        }

        if (action === 'stop') {
          try {
            if (botModule && botModule.bot && botModule.bot.end) {
              botModule.bot.end();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'stop triggered' }));
              return;
            }
          } catch (e) {}
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unknown action' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'server error', details: err.message }));
      }
    });
    return;
  }

  // GET /api/metrics
  if (req.method === 'GET' && req.url === '/api/metrics') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(METRICS));
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/index')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlTemplate);
    return;
  }

  if (req.method === 'GET' && req.url === '/api') {
    const info = {
      name: (pkg && pkg.name) || 'Mr',
      description: (pkg && pkg.description) || 'A Node.js repository',
      version: (pkg && pkg.version) || '0.0.0',
      pid: process.pid,
      uptime: process.uptime(),
      env: process.env.NODE_ENV || 'development'
    };

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(info, null, 2));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/bot') {
    const botStatus = botModule.getBotStatus();
    const consoleLogs = botModule.getConsoleLogs ? botModule.getConsoleLogs() : [];

    const info = {
      status: botStatus,
      logs: consoleLogs
    };

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(info, null, 2));
    return;
  }

  // health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ok');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}/`);
  });
}

module.exports = server;
