#!/usr/bin/env node

// index.js — basic Node.js entrypoint
// - Starts a small HTTP server on PORT (default 3000)
// - GET / returns minimal repo/package info as JSON
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

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index')) {
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
