#!/usr/bin/env node

// index.js — basic Node.js entrypoint with attractive UI
// - Starts a small HTTP server on PORT (default 3000)
// - GET / returns an attractive dashboard
// - GET /api returns minimal repo/package info as JSON
// - Exports the server (useful for tests)

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

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
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 800px;
            width: 100%;
            overflow: hidden;
            backdrop-filter: blur(10px);
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
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

        .content {
            padding: 40px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .info-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            transition: transform 0.3s, box-shadow 0.3s;
            border: 2px solid rgba(102, 126, 234, 0.1);
        }

        .info-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.2);
        }

        .info-label {
            color: #667eea;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 8px;
            letter-spacing: 1px;
        }

        .info-value {
            color: #333;
            font-size: 24px;
            font-weight: 700;
        }

        .status-badge {
            display: inline-block;
            background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
            color: #2d5016;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 10px;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        .features {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 15px;
            margin: 30px 0;
        }

        .features h3 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 20px;
        }

        .feature-list {
            list-style: none;
        }

        .feature-list li {
            color: #555;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            align-items: center;
            font-size: 16px;
        }

        .feature-list li:last-child {
            border-bottom: none;
        }

        .feature-list li:before {
            content: "✓";
            color: #667eea;
            font-weight: bold;
            margin-right: 12px;
            font-size: 18px;
        }

        .footer {
            background: #f0f0f0;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
            border-top: 1px solid #e0e0e0;
        }

        .api-link {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.3s;
        }

        .api-link:hover {
            color: #764ba2;
            text-decoration: underline;
        }

        .version-tag {
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            margin-left: 10px;
            font-weight: 600;
        }

        @media (max-width: 600px) {
            .header h1 {
                font-size: 36px;
            }

            .content {
                padding: 20px;
            }

            .info-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚙️ Mr</h1>
            <p>Minecraft Bot Dashboard</p>
        </div>

        <div class="content">
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

            <div class="status-badge">✓ Server Running</div>

            <div class="features">
                <h3>📋 Features</h3>
                <ul class="feature-list">
                    <li>Minecraft Bot Integration</li>
                    <li>Auto-Reconnection (15s cooldown)</li>
                    <li>Anti-AFK System (45s interval)</li>
                    <li>Real-time Status Monitoring</li>
                    <li>RESTful API Endpoints</li>
                </ul>
            </div>

            <div style="background: #f0f7ff; padding: 20px; border-radius: 15px; border-left: 4px solid #667eea;">
                <h3 style="color: #667eea; margin-bottom: 10px;">📡 API Endpoints</h3>
                <p style="color: #555; margin-bottom: 8px;">
                    <code style="background: #e8f0fe; padding: 2px 6px; border-radius: 4px; color: #667eea;">GET /api</code> - Get application info
                </p>
                <p style="color: #555;">
                    <code style="background: #e8f0fe; padding: 2px 6px; border-radius: 4px; color: #667eea;">GET /health</code> - Health check
                </p>
            </div>
        </div>

        <div class="footer">
            Environment: <strong>${process.env.NODE_ENV || 'development'}</strong> | 
            <a href="/api" class="api-link">View API Data</a>
        </div>
    </div>

    <script>
        function updateUptime() {
            const uptime = Math.floor(process.uptime ? process.uptime() : 0);
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;
            
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
        
        updateUptime();
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
