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
            padding: 40px 20px;
            text-align: center;
            margin-bottom: 30px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .header h1 {
            font-size: 48px;
            margin-bottom: 10px;
            font-weight: 700;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }

        .header p {
            font-size: 18px;
            opacity: 0.9;
            font-weight: 300;
        }

        .main-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 30px;
            backdrop-filter: blur(10px);
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }

        .info-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            transition: transform 0.3s, box-shadow 0.3s;
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
        }

        .info-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }

        .info-label {
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 8px;
            letter-spacing: 1px;
        }

        .info-value {
            color: white;
            font-size: 24px;
            font-weight: 700;
        }

        .status-badge {
            display: inline-block;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 10px;
            animation: pulse 2s infinite;
        }

        .status-badge.connected {
            background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
            color: #2d5016;
        }

        .status-badge.disconnected {
            background: linear-gradient(135deg, #fa8072 0%, #ff6347 100%);
            color: white;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        .console-container {
            background: #0d1117;
            border-radius: 15px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            max-height: 600px;
            border: 2px solid #667eea;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .console-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 18px;
        }

        .console-logs {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            font-family: 'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 13px;
            line-height: 1.7;
            background: #0d1117;
        }

        .log-entry {
            padding: 8px 0;
            border-left: 3px solid transparent;
            padding-left: 10px;
            display: flex;
            gap: 12px;
            margin-bottom: 4px;
        }

        .log-timestamp {
            color: #8b949e;
            min-width: 110px;
            font-weight: 500;
        }

        .log-type {
            min-width: 70px;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 11px;
        }

        .log-message {
            flex: 1;
            word-break: break-word;
            color: #c9d1d9;
        }

        .log-entry.info { border-left-color: #79c0ff; }
        .log-entry.success { border-left-color: #3fb950; }
        .log-entry.error { border-left-color: #f85149; }
        .log-entry.warning { border-left-color: #d29922; }
        .log-entry.debug { border-left-color: #a371f7; }

        .log-type.info { color: #79c0ff; }
        .log-type.success { color: #3fb950; }
        .log-type.error { color: #f85149; }
        .log-type.warning { color: #d29922; }
        .log-type.debug { color: #a371f7; }

        .console-footer {
            background: #161b22;
            padding: 12px 20px;
            border-top: 1px solid #30363d;
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
            font-weight: 600;
            transition: all 0.3s;
            font-size: 13px;
        }

        .console-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .console-btn:active {
            transform: translateY(0);
        }

        .features {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 25px;
            border-radius: 15px;
            margin-top: 20px;
            color: white;
        }

        .features h3 {
            color: white;
            margin-bottom: 15px;
            font-size: 18px;
        }

        .feature-list {
            list-style: none;
        }

        .feature-list li {
            color: rgba(255, 255, 255, 0.9);
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            font-size: 14px;
        }

        .feature-list li:last-child {
            border-bottom: none;
        }

        .feature-list li:before {
            content: "✓";
            color: #84fab0;
            font-weight: bold;
            margin-right: 12px;
            font-size: 16px;
        }

        .console-full {
            grid-column: 1 / -1;
        }

        .stats-section {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }

        .stat-item {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            color: white;
        }

        .stat-label {
            font-size: 11px;
            text-transform: uppercase;
            opacity: 0.8;
            font-weight: 600;
        }

        .stat-value {
            font-size: 22px;
            font-weight: 700;
            margin-top: 5px;
        }

        @media (max-width: 1024px) {
            .main-grid {
                grid-template-columns: 1fr;
            }

            .stats-section {
                grid-template-columns: repeat(2, 1fr);
            }

            .console-full {
                grid-column: 1;
            }
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 36px;
            }

            .stats-section {
                grid-template-columns: 1fr;
            }

            .info-grid {
                grid-template-columns: 1fr;
            }

            .console-container {
                max-height: 400px;
            }
        }

        .refresh-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            background: #84fab0;
            border-radius: 50%;
            margin-left: 10px;
            animation: blink 1s infinite;
        }

        @keyframes blink {
            0%, 50%, 100% { opacity: 1; }
            25%, 75% { opacity: 0.4; }
        }

        .position-info {
            background: rgba(102, 126, 234, 0.1);
            padding: 15px;
            border-radius: 10px;
            margin-top: 15px;
            border-left: 4px solid #667eea;
        }

        .position-info p {
            color: #555;
            font-size: 14px;
            margin-bottom: 8px;
        }

        .position-info p:last-child {
            margin-bottom: 0;
        }

        .position-info strong {
            color: #667eea;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚙️ Mr - Minecraft Bot</h1>
            <p>Professional Bot Management Dashboard</p>
        </div>

        <div class="main-grid">
            <div class="card">
                <h2 style="color: #667eea; margin-bottom: 20px; font-size: 22px;">📊 Server Status</h2>
                <div class="stats-section" style="margin-bottom: 20px;">
                    <div class="stat-item">
                        <div class="stat-label">Application</div>
                        <div class="stat-value">${pkg?.name || 'Mr'}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Version</div>
                        <div class="stat-value" id="appVersion">${pkg?.version || '1.0.0'}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Process ID</div>
                        <div class="stat-value">${process.pid}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Uptime</div>
                        <div class="stat-value" id="uptime">--</div>
                    </div>
                </div>
                <div style="text-align: center;">
                    <div class="status-badge connected">✓ Server Running</div>
                </div>
                <div class="features">
                    <h3>🎯 Features</h3>
                    <ul class="feature-list">
                        <li>Auto-Reconnection (15s)</li>
                        <li>Anti-AFK System (45s)</li>
                        <li>Real-time Console</li>
                        <li>Live Bot Monitoring</li>
                        <li>Health Tracking</li>
                    </ul>
                </div>
            </div>

            <div class="card">
                <h2 style="color: #667eea; margin-bottom: 20px; font-size: 22px;">🤖 Bot Status</h2>
                <div class="info-grid">
                    <div class="info-card">
                        <div class="info-label">Connection</div>
                        <div class="info-value" id="botConnection">--</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Username</div>
                        <div class="info-value" id="botUsername">--</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">❤️ Health</div>
                        <div class="info-value" id="botHealth">--</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">🍖 Food</div>
                        <div class="info-value" id="botFood">--</div>
                    </div>
                </div>
                <div class="position-info">
                    <p><strong>📍 Position:</strong> <span id="botPosition">Not connected</span></p>
                    <p><strong>🎮 Game Mode:</strong> <span id="botGameMode">--</span></p>
                </div>
            </div>

            <div class="card console-full">
                <div class="console-container">
                    <div class="console-header">
                        <span>🖥️ Bot Console <span class="refresh-indicator"></span></span>
                        <span style="font-size: 12px; opacity: 0.8;">Updates every 5s</span>
                    </div>
                    <div class="console-logs" id="consoleLogs">
                        <div style="color: #6e7681; text-align: center; padding: 20px; line-height: 1.8;">
                            📡 Connecting to bot service...<br>
                            <span style="font-size: 11px; color: #8b949e;">Waiting for log stream</span>
                        </div>
                    </div>
                    <div class="console-footer">
                        <button class="console-btn" onclick="clearConsole()">🗑️ Clear Console</button>
                        <button class="console-btn" onclick="scrollToBottom()">⬇️ Scroll to Bottom</button>
                        <button class="console-btn" onclick="exportLogs()">💾 Export Logs</button>
                        <button class="console-btn" onclick="autoScroll()">📌 Auto Scroll</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let autoScrollEnabled = true;
        
        async function updateBotStatus() {
            try {
                const response = await fetch('/api/bot');
                const data = await response.json();
                
                if (data.status) {
                    const status = data.status;
                    document.getElementById('botConnection').textContent = status.connected ? '✅ Connected' : '❌ Disconnected';
                    document.getElementById('botUsername').textContent = status.username || '--';
                    document.getElementById('botHealth').textContent = (status.health || 0).toFixed(1) + '❤️';
                    document.getElementById('botFood').textContent = (status.food || 0).toFixed(1) + '🍖';
                    
                    if (status.position) {
                        document.getElementById('botPosition').textContent = 
                            \`X: \${status.position.x} | Y: \${status.position.y} | Z: \${status.position.z}\`;
                    } else {
                        document.getElementById('botPosition').textContent = 'Not connected';
                    }
                    
                    document.getElementById('botGameMode').textContent = status.gameMode || '--';
                }

                if (data.logs) {
                    const consoleLogs = document.getElementById('consoleLogs');
                    consoleLogs.innerHTML = '';
                    
                    if (data.logs.length === 0) {
                        consoleLogs.innerHTML = '<div style="color: #6e7681; padding: 20px; text-align: center;">No logs yet...</div>';
                    } else {
                        data.logs.forEach(log => {
                            const logDiv = document.createElement('div');
                            logDiv.className = 'log-entry ' + log.type;
                            logDiv.innerHTML = \`
                                <span class="log-timestamp">[\${log.timestamp}]</span>
                                <span class="log-type \${log.type}">\${log.type}</span>
                                <span class="log-message">\${escapeHtml(log.message)}</span>
                            \`;
                            consoleLogs.appendChild(logDiv);
                        });
                        
                        if (autoScrollEnabled) {
                            scrollToBottom();
                        }
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
            setTimeout(() => {
                consoleLogs.scrollTop = consoleLogs.scrollHeight;
            }, 0);
        }

        function clearConsole() {
            document.getElementById('consoleLogs').innerHTML = '<div style="color: #6e7681; padding: 20px;">Console cleared at ' + new Date().toLocaleTimeString() + '</div>';
        }

        function autoScroll() {
            autoScrollEnabled = !autoScrollEnabled;
            alert(autoScrollEnabled ? '📌 Auto scroll enabled' : '📌 Auto scroll disabled');
        }

        function exportLogs() {
            const consoleLogs = document.getElementById('consoleLogs');
            const text = Array.from(consoleLogs.querySelectorAll('.log-entry')).map(entry => {
                return entry.innerText;
            }).join('\\n');
            
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
            element.setAttribute('download', 'bot_logs_' + new Date().toISOString().split('T')[0] + '.txt');
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
        
        // Update every 5 seconds for console and bot status, every 1 second for uptime
        setInterval(updateBotStatus, 5000);
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
