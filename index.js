#!/usr/bin/env node

// index.js — Node.js server with Bot Console Dashboard
// - Starts a small HTTP server on PORT (default 3000)
// - GET / returns an attractive dashboard with bot console
// - GET /api returns minimal repo/package info as JSON
// - GET /api/bot returns bot status and console logs

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const botModule = require('./Bot');

const PORT = process.env.PORT || 3000;

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

const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mr - Minecraft Bot Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 50px 40px;
            text-align: center;
            margin-bottom: 30px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            position: relative;
            overflow: hidden;
        }

        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -10%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 50px 50px;
            animation: float 20s linear infinite;
        }

        @keyframes float {
            0% { transform: translate(0, 0); }
            50% { transform: translate(30px, 30px); }
            100% { transform: translate(0, 0); }
        }

        .header-content {
            position: relative;
            z-index: 2;
        }

        .header h1 {
            font-size: 60px;
            margin-bottom: 10px;
            font-weight: 800;
            text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.3);
            letter-spacing: 2px;
        }

        .header p {
            font-size: 20px;
            opacity: 0.95;
            font-weight: 300;
        }

        .main-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: rgba(255, 255, 255, 0.98);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
            padding: 30px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(102, 126, 234, 0.2);
            transition: transform 0.3s, box-shadow 0.3s;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }

        .info-card {
            background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            transition: all 0.3s;
            border: 2px solid rgba(102, 126, 234, 0.2);
            position: relative;
            overflow: hidden;
        }

        .info-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
        }

        .info-card:hover {
            transform: translateY(-5px) scale(1.02);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
            border-color: rgba(102, 126, 234, 0.5);
        }

        .info-card:hover::before {
            left: 100%;
        }

        .info-label {
            color: #667eea;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 8px;
            letter-spacing: 1.5px;
        }

        .info-value {
            color: #333;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 0.5px;
        }

        .status-badge {
            display: inline-block;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 700;
            margin-top: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
            position: relative;
            overflow: hidden;
        }

        .status-badge.connected {
            background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
            color: #1a4d2e;
            box-shadow: 0 5px 15px rgba(132, 250, 176, 0.4);
        }

        .status-badge.disconnected {
            background: linear-gradient(135deg, #fa8072 0%, #ff6347 100%);
            color: white;
            box-shadow: 0 5px 15px rgba(250, 128, 114, 0.4);
        }

        .status-badge::after {
            content: '';
            position: absolute;
            top: 50%;
            left: -100%;
            width: 10px;
            height: 10px;
            background: rgba(255,255,255,0.5);
            border-radius: 50%;
            animation: pulse-dot 2s infinite;
        }

        @keyframes pulse-dot {
            0%, 100% { left: -100%; opacity: 0; }
            50% { opacity: 1; }
            100% { left: 100%; opacity: 0; }
        }

        .card-title {
            color: #667eea;
            margin-bottom: 25px;
            font-size: 22px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .console-container {
            background: #0d1117;
            border-radius: 15px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            max-height: 600px;
            border: 2px solid #667eea;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            grid-column: 1 / -1;
        }

        .console-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 18px 20px;
            font-weight: 700;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 16px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .console-logs {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 13px;
            line-height: 1.8;
            background: #0d1117;
        }

        .console-logs::-webkit-scrollbar {
            width: 8px;
        }

        .console-logs::-webkit-scrollbar-track {
            background: #1c2128;
        }

        .console-logs::-webkit-scrollbar-thumb {
            background: #667eea;
            border-radius: 4px;
        }

        .log-entry {
            padding: 6px 0;
            display: flex;
            gap: 12px;
            border-bottom: 1px solid #21262d;
            animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-10px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .log-timestamp {
            color: #8b949e;
            min-width: 110px;
            font-weight: 600;
        }

        .log-type {
            min-width: 65px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: 4px;
            text-align: center;
            font-size: 11px;
        }

        .log-message {
            flex: 1;
            word-break: break-word;
            color: #c9d1d9;
        }

        .log-type.info { 
            background: #0969da20;
            color: #58a6ff;
        }

        .log-type.success { 
            background: #2da44e20;
            color: #3fb950;
        }

        .log-type.error { 
            background: #da373c20;
            color: #f85149;
        }

        .log-type.warning { 
            background: #d29922ff30;
            color: #d29922;
        }

        .log-type.debug { 
            background: #7928ca20;
            color: #bc8ef7;
        }

        .console-footer {
            background: #161b22;
            padding: 15px 20px;
            border-top: 1px solid #21262d;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .console-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 10px 18px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 700;
            transition: all 0.3s;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .console-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
        }

        .console-btn:active {
            transform: translateY(0);
        }

        .features {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 25px;
            border-radius: 15px;
            margin-top: 20px;
            border: 1px solid rgba(102, 126, 234, 0.2);
        }

        .features h3 {
            color: #667eea;
            margin-bottom: 18px;
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .feature-list {
            list-style: none;
        }

        .feature-list li {
            color: #333;
            padding: 12px 0;
            border-bottom: 1px solid rgba(102, 126, 234, 0.2);
            display: flex;
            align-items: center;
            font-size: 15px;
            font-weight: 600;
            transition: all 0.3s;
        }

        .feature-list li:last-child {
            border-bottom: none;
        }

        .feature-list li:hover {
            padding-left: 10px;
            color: #667eea;
        }

        .feature-list li:before {
            content: "✓";
            color: #667eea;
            font-weight: 900;
            margin-right: 15px;
            font-size: 18px;
        }

        .refresh-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            background: #3fb950;
            border-radius: 50%;
            margin-left: 10px;
            animation: blink 1s infinite;
            box-shadow: 0 0 10px rgba(63, 185, 80, 0.5);
        }

        @keyframes blink {
            0%, 50%, 100% { opacity: 1; }
            25%, 75% { opacity: 0.5; }
        }

        @media (max-width: 768px) {
            .main-grid {
                grid-template-columns: 1fr;
            }

            .console-container {
                grid-column: 1;
            }

            .info-grid {
                grid-template-columns: 1fr;
            }

            .header h1 {
                font-size: 42px;
            }

            .console-logs {
                font-size: 11px;
            }

            .log-entry {
                gap: 8px;
            }

            .log-timestamp {
                min-width: 85px;
            }

            .log-type {
                min-width: 55px;
                font-size: 10px;
            }
        }

        .empty-console {
            color: #666;
            text-align: center;
            padding: 40px;
            opacity: 0.6;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <h1>⚙️ MR</h1>
                <p>🎮 Minecraft Bot Dashboard & Control Panel</p>
            </div>
        </div>

        <div class="main-grid">
            <div class="card">
                <div class="card-title">📊 Server Status</div>
                <div class="info-grid">
                    <div class="info-card">
                        <div class="info-label">Application</div>
                        <div class="info-value">${pkg?.name || 'Mr'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Version</div>
                        <div class="info-value">${pkg?.version || '1.0.0'}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Process ID</div>
                        <div class="info-value">${process.pid}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Uptime</div>
                        <div class="info-value" id="uptime">--</div>
                    </div>
                </div>
                <div style="text-align: center;">
                    <div class="status-badge connected">✓ Server Running</div>
                </div>
                <div class="features">
                    <h3>🎯 Features</h3>
                    <ul class="feature-list">
                        <li>🔄 Auto-Reconnection (15s)</li>
                        <li>⏰ Anti-AFK System (45s)</li>
                        <li>📡 Real-time Console</li>
                        <li>🎮 Bot Monitoring</li>
                        <li>❤️ Health Tracking</li>
                    </ul>
                </div>
            </div>

            <div class="card">
                <div class="card-title">🤖 Bot Status</div>
                <div class="info-grid">
                    <div class="info-card">
                        <div class="info-label">Connection</div>
                        <div class="info-value" id="botConnection" style="font-size: 18px;">--</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Username</div>
                        <div class="info-value" id="botUsername">--</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Health</div>
                        <div class="info-value" id="botHealth">--</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Food</div>
                        <div class="info-value" id="botFood">--</div>
                    </div>
                </div>
                <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); padding: 20px; border-radius: 12px; margin-top: 15px; border-left: 4px solid #667eea; border: 2px solid rgba(102, 126, 234, 0.2);">
                    <p style="color: #667eea; font-size: 13px; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">📍 Position</p>
                    <p style="color: #333; font-size: 16px; margin-bottom: 12px; font-weight: 600;" id="botPosition">--</p>
                    <p style="color: #667eea; font-size: 13px; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">🎮 Game Mode</p>
                    <p style="color: #333; font-size: 16px; font-weight: 600;" id="botGameMode">--</p>
                </div>
            </div>

            <div class="console-container">
                <div class="console-header">
                    <span>🖥️ Bot Console <span class="refresh-indicator"></span></span>
                    <span style="font-size: 12px; opacity: 0.8;">LIVE ACTIVITY</span>
                </div>
                <div class="console-logs" id="consoleLogs">
                    <div class="empty-console">🔄 Loading bot console...</div>
                </div>
                <div class="console-footer">
                    <button class="console-btn" onclick="scrollToBottom()">⬇️ Scroll to Bottom</button>
                    <button class="console-btn" onclick="clearConsole()">🗑️ Clear Console</button>
                    <button class="console-btn" onclick="exportLogs()">💾 Export Logs</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        async function updateBotStatus() {
            try {
                const response = await fetch('/api/bot');
                const data = await response.json();
                
                if (data.status) {
                    const status = data.status;
                    document.getElementById('botConnection').textContent = status.connected ? '✓ Connected' : '✗ Offline';
                    document.getElementById('botConnection').style.color = status.connected ? '#3fb950' : '#f85149';
                    document.getElementById('botUsername').textContent = status.username || '--';
                    document.getElementById('botHealth').textContent = (status.health || 0).toFixed(1) + ' ❤️';
                    document.getElementById('botFood').textContent = (status.food || 0).toFixed(1) + ' 🍖';
                    
                    if (status.position) {
                        document.getElementById('botPosition').textContent = 
                            \`X: \${status.position.x} | Y: \${status.position.y} | Z: \${status.position.z}\`;
                    } else {
                        document.getElementById('botPosition').textContent = '-- Connecting --';
                    }
                    
                    document.getElementById('botGameMode').textContent = status.gameMode || '--';
                }

                if (data.logs && data.logs.length > 0) {
                    const consoleLogs = document.getElementById('consoleLogs');
                    consoleLogs.innerHTML = '';
                    
                    data.logs.forEach(log => {
                        const logDiv = document.createElement('div');
                        logDiv.className = 'log-entry';
                        logDiv.innerHTML = \`
                            <span class="log-timestamp">\${log.timestamp}</span>
                            <span class="log-type \${log.type}">\${log.type}</span>
                            <span class="log-message">\${escapeHtml(log.message)}</span>
                        \`;
                        consoleLogs.appendChild(logDiv);
                    });
                    
                    scrollToBottom();
                } else {
                    if (document.getElementById('consoleLogs').innerHTML.includes('Loading')) {
                        document.getElementById('consoleLogs').innerHTML = '<div class="empty-console">Waiting for bot activity...</div>';
                    }
                }
            } catch (err) {
                console.error('Error updating status:', err);
            }
        }

        function escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        }

        function scrollToBottom() {
            const consoleLogs = document.getElementById('consoleLogs');
            consoleLogs.scrollTop = consoleLogs.scrollHeight;
        }

        function clearConsole() {
            document.getElementById('consoleLogs').innerHTML = '<div class="empty-console">Console cleared by user</div>';
        }

        function exportLogs() {
            const consoleLogs = document.getElementById('consoleLogs').innerText;
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(consoleLogs));
            element.setAttribute('download', 'bot_logs_' + new Date().toISOString().slice(0, 10) + '.txt');
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }

        function updateUptime() {
            fetch('/api')
                .then(res => res.json())
                .then(data => {
                    const h = Math.floor(data.uptime / 3600);
                    const m = Math.floor((data.uptime % 3600) / 60);
                    const s = Math.floor(data.uptime % 60);
                    document.getElementById('uptime').textContent = 
                        \`\${h}h \${m}m \${s}s\`;
                });
        }
        
        // Initial load
        updateBotStatus();
        updateUptime();
        
        // Update every second
        setInterval(updateBotStatus, 1000);
        setInterval(updateUptime, 1000);
    </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
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
    const consoleLogs = botModule.getConsoleLogs();

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
