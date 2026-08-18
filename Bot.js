const mineflayer = require('mineflayer');

// Store console logs
let consoleLogs = [];
const MAX_LOGS = 100;

// Configuration details
const config = {
    host: process.env.MC_SERVER_HOST || 'YOUR_SERVER_IP_OR_ADDRESS',
    port: process.env.MC_SERVER_PORT || 25565,
    username: process.env.MC_BOT_USERNAME || 'GuardBot',
    version: false
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

function createBot() {
    logToConsole(`🤖 Starting bot: Connecting to ${config.host}:${config.port}...`, 'info');
    
    try {
        bot = mineflayer.createBot({
            host: config.host,
            port: config.port,
            username: config.username,
            version: config.version
        });

        // Triggers when the bot successfully logs into the server
        bot.on('spawn', () => {
            logToConsole('✅ Bot successfully spawned in the world!', 'success');
            logToConsole(`Bot position: X=${Math.floor(bot.entity.position.x)} Y=${Math.floor(bot.entity.position.y)} Z=${Math.floor(bot.entity.position.z)}`, 'debug');
            startAntiAFK();
        });

        // Triggers if the bot is kicked or the server closes
        bot.on('end', (reason) => {
            logToConsole(`Bot disconnected. Reason: ${reason}`, 'warning');
            clearInterval(antiAFKInterval);
            
            // Clear existing reconnect timer
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
            }
            
            logToConsole(`🔄 Attempting to reconnect in 15 seconds...`, 'info');
            reconnectTimer = setTimeout(() => {
                createBot();
            }, RECONNECT_DELAY);
        });

        // Triggers if a connection error happens
        bot.on('error', (err) => {
            logToConsole(`Connection error: ${err.message}`, 'error');
            clearInterval(antiAFKInterval);
            
            // Clear existing reconnect timer
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
            }
            
            logToConsole(`🔄 Attempting to reconnect in 15 seconds...`, 'info');
            reconnectTimer = setTimeout(() => {
                createBot();
            }, RECONNECT_DELAY);
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

    } catch (err) {
        logToConsole(`Failed to create bot: ${err.message}`, 'error');
        
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }
        
        reconnectTimer = setTimeout(() => {
            createBot();
        }, RECONNECT_DELAY);
    }
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
                    bot.swingArm('right');
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
    createBot
};
