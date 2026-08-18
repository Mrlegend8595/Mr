const mineflayer = require('mineflayer');

// Configuration details
const config = {
    host: 'YOUR_SERVER_IP_OR_ADDRESS', // e.g., 'myserver.aternos.me'
    port: 25565,                       // Default Minecraft port
    username: 'GuardBot',              // Name of your bot
    version: false                     // 'false' auto-detects server version
};

let bot;

function createBot() {
    console.log(`🤖 Starting bot: Connecting to ${config.host}...`);
    
    bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        version: config.version
    });

    // Triggers when the bot successfully logs into the server
    bot.on('spawn', () => {
        console.log('✅ Bot successfully spawned in the world!');
        startAntiAFK();
    });

    // Triggers if the bot is kicked or the server closes
    bot.on('end', (reason) => {
        console.log(`❌ Bot disconnected. Reason: ${reason}`);
        console.log('🔄 Attempting to reconnect in 15 seconds...');
        setTimeout(createBot, 15000); // 15-second cooldown to prevent spamming
    });

    // Triggers if a connection error happens
    bot.on('error', (err) => {
        console.error('⚠️ Connection error encountered:', err.message);
    });
}

// Simulated human activity to bypass basic idle detection
function startAntiAFK() {
    setInterval(() => {
        if (!bot || !bot.entity) return;

        // Pick a random movement style
        const actions = ['jump', 'lookAround', 'swingArm'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];

        switch (randomAction) {
            case 'jump':
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 500);
                break;

            case 'lookAround':
                const yaw = (Math.random() * 360 - 180) * (Math.PI / 180);
                const pitch = (Math.random() * 90 - 45) * (Math.PI / 180);
                bot.look(yaw, pitch, true);
                break;

            case 'swingArm':
                bot.swingArm('right');
                break;
        }
    }, 45000); // Triggers every 45 seconds to keep activities random but persistent
}

// Start the sequence
createBot();
