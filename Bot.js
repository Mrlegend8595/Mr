const mineflayer = require('mineflayer');

// Store console logs
let consoleLogs = [];
const MAX_LOGS = 100;

// SIMPLE SERVER CONFIGURATION
// Edit only these values:
const SERVER = {
    host: 'Ghopghip.aternos.me',
    port: 33526,
    username: 'GuardBot',
    // If you know the exact server version, set it here (e.g. '1.21.2' or '1.8.9').
    // If left undefined or set to 'auto', the bot will try auto-detection and fallbacks
    version: undefined
};

let bot;
let reconnectTimer;
const RECONNECT_DELAY = 15000; // 15 seconds
const ANTI_AFK_INTERVAL = 45000; // 45 seconds
let antiAFKInterval;

// Console logging helper
function logToConsole(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
        timestamp,
        type,
        message
    };
    
    consoleLogs.push(logEntry);
    
    // Keep only last 100 logs
    if (consoleLogs.length > MAX_LOGS) {
        consoleLogs.shift();
    }
    
    // Also log to actual console
    const emoji = {
        'info': 'ℹ️',
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'debug': '🔧'
    }[type] || 'ℹ️';
    
    console.log(`${emoji} [${timestamp}] ${message}`);
}

// Expose console logs for API
function getConsoleLogs() {
    return consoleLogs;
}

// Version fallback logic to support both 1.8.x and 1.21.x servers
const FALLBACK_VERSIONS = ['1.21.2', '1.21.1', '1.21.0', '1.8.9'];

function buildVersionsToTry() {
    const list = [];
    if (SERVER.version && SERVER.version !== 'auto') list.push(SERVER.version);
    // try auto-detect early (false means auto) so modern protocols may be detected by the library
    list.push(false);
    // add explicit fallbacks for common targets
    for (const v of FALLBACK_VERSIONS) list.push(v);
    // dedupe while preserving order
    return [...new Set(list)];
}

function tryConnectWithVersions(versions, index = 0) {
    if (index >= versions.length) {
        logToConsole('All version attempts failed. Scheduling reconnect...', 'error');
        scheduleReconnect();
        return;
    }

    const versionToUse = versions[index];
    logToConsole(`Attempting connection using version: ${versionToUse === false ? 'auto-detect' : versionToUse}`, 'info');

    try {
        bot = mineflayer.createBot({
            host: SERVER.host,
            port: SERVER.port,
            username: SERVER.username,
            version: versionToUse
        });
    } catch (err) {
        logToConsole(`Failed to create bot with version ${versionToUse}: ${err.message}`, 'error');
        // If the error mentions unsupported server version, try next
        if (/Server version .* not supported/i.test(err.message) || /not supported/i.test(err.message)) {
            logToConsole(`Version ${versionToUse} not supported by client. Trying next fallback...`, 'warning');
            tryConnectWithVersions(versions, index + 1);
            return;
        }
        // For other errors, attempt next after short delay
        setTimeout(() => tryConnectWithVersions(versions, index + 1), 1000);
        return;
    }

    // Wire up event handlers
    bot.once('spawn', () => {
        logToConsole('✅ Bot successfully spawned in the world!', 'success');
        try {
            logToConsole(`Bot position: X=${Math.floor(bot.entity.position.x)} Y=${Math.floor(bot.entity.position.y)} Z=${Math.floor(bot.entity.position.z)}`, 'debug');
        } catch (e) {
            // ignore
        }
        startAntiAFK();
    });

    bot.on('end', (reason) => {
        logToConsole(`Bot disconnected. Reason: ${reason}`, 'warning');
        clearInterval(antiAFKInterval);
        // If disconnection was due to unsupported protocol, try next version
        if (typeof reason === 'string' && /Server version .* not supported/i.test(reason)) {
            logToConsole('Server/client protocol mismatch detected. Trying next fallback version...', 'info');
            tryConnectWithVersions(versions, index + 1);
            return;
        }
        scheduleReconnect();
    });

    bot.on('error', (err) => {
        logToConsole(`Connection error: ${err.message}`, 'error');
        clearInterval(antiAFKInterval);

        // If the error explicitly states server version is not supported, try next version
        if (err && err.message && /Server version .* not supported/i.test(err.message)) {
            logToConsole('Server version not supported by this client version. Trying next fallback...', 'warning');
            // destroy current bot (some implementations need cleanup)
            try { bot.end && bot.end(); } catch (e) {}
            tryConnectWithVersions(versions, index + 1);
            return;
        }

        // Handle connection refused quickly, then retry same index (server maybe offline)
        if (err.code === 'ECONNREFUSED') {
            logToConsole('Connection refused (ECONNREFUSED). Will retry the same version after delay.', 'warning');
            setTimeout(() => tryConnectWithVersions(versions, index), RECONNECT_DELAY);
            return;
        }

        // For other errors, schedule a reconnect with fallback sequence reset
        scheduleReconnect();
    });

    bot.on('kicked', (reason) => {
        logToConsole(`Bot was kicked: ${reason}`, 'warning');
    });

    bot.on('death', () => {
        logToConsole('Bot died, respawning...', 'warning');
    });

    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        logToConsole(`Chat [${username}]: ${message}`, 'debug');
    });
}

function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    logToConsole(`🔄 Attempting to reconnect in ${RECONNECT_DELAY / 1000} seconds...`, 'info');
    reconnectTimer = setTimeout(() => {
        const versions = buildVersionsToTry();
        tryConnectWithVersions(versions, 0);
    }, RECONNECT_DELAY);
}

function createBot() {
    logToConsole(`🤖 Starting bot: Connecting to ${SERVER.host}:${SERVER.port}...`, 'info');
    const versions = buildVersionsToTry();
    tryConnectWithVersions(versions, 0);
}

// Simulated human activity to bypass basic idle detection
function startAntiAFK() {
    if (antiAFKInterval) {
        clearInterval(antiAFKInterval);
    }
    
    antiAFKInterval = setInterval(() => {
        if (!bot || !bot.entity) return;

        try {
            // Pick a random movement style
            const actions = ['jump', 'lookAround', 'swingArm'];
            const randomAction = actions[Math.floor(Math.random() * actions.length)];

            switch (randomAction) {
                case 'jump':
                    bot.setControlState('jump', true);
                    setTimeout(() => {
                        if (bot) bot.setControlState('jump', false);
                    }, 500);
                    logToConsole('Anti-AFK: Jumping', 'debug');
                    break;

                case 'lookAround':
                    const yaw = (Math.random() * 360 - 180) * (Math.PI / 180);
                    const pitch = (Math.random() * 90 - 45) * (Math.PI / 180);
                    bot.look(yaw, pitch, true);
                    logToConsole('Anti-AFK: Looking around', 'debug');
                    break;

                case 'swingArm':
                    // some older versions use swingArm differently but mineflayer normalizes it
                    try { bot.swingArm('right'); } catch (e) { /* ignore */ }
                    logToConsole('Anti-AFK: Swinging arm', 'debug');
                    break;
            }
        } catch (err) {
            logToConsole(`Anti-AFK error: ${err.message}`, 'error');
        }
    }, ANTI_AFK_INTERVAL);
}

// Get bot status
function getBotStatus() {
    if (!bot) {
        return {
            connected: false,
            status: 'disconnected',
            message: 'Bot not initialized'
        };
    }

    return {
        connected: bot.entity !== null && bot.entity !== undefined,
        username: bot.username,
        status: bot.entity ? 'connected' : 'connecting',
        position: bot.entity ? {
            x: Math.floor(bot.entity.position.x),
            y: Math.floor(bot.entity.position.y),
            z: Math.floor(bot.entity.position.z)
        } : null,
        health: bot.health || 0,
        food: bot.food || 0,
        gameMode: bot.game ? bot.game.mode : null
    };
}

// Start the bot
logToConsole('🚀 Bot Service Initializing...', 'info');
createBot();

// Export for use in main server
module.exports = {
    bot,
    getConsoleLogs,
    getBotStatus,
    createBot,
    serverConfig: SERVER
};
