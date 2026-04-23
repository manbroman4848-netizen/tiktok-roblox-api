const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const activeConnections = new Map();

app.get('/likes/:username', async (req, res) => {
    const username = req.params.username;
    
    try {
        let connection = activeConnections.get(username);
        
        if (!connection) {
            connection = new WebcastPushConnection(username);
            activeConnections.set(username, connection);
            await connection.connect();
            console.log(`Connected to ${username}'s live`);
        }
        
        let likeCount = 0;
        let lastGift = null;
        
        connection.on('like', (data) => {
            likeCount = data.likeCount;
        });
        
        connection.on('gift', (data) => {
            lastGift = {
                giftName: data.giftName,
                repeatCount: data.repeatCount || 1
            };
            console.log(`${username} received gift: ${data.giftName} x${data.repeatCount || 1}`);
        });
        
        // Wait 2 seconds to collect data
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        res.json({ 
            likeCount: likeCount,
            lastGift: lastGift,
            username: username,
            status: 'connected'
        });
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.json({ 
            likeCount: 0,
            lastGift: null,
            username: username,
            status: 'error',
            error: error.message
        });
    }
});

app.get('/stop/:username', (req, res) => {
    const username = req.params.username;
    const connection = activeConnections.get(username);
    
    if (connection) {
        connection.disconnect();
        activeConnections.delete(username);
        console.log(`Disconnected from ${username}'s live`);
        res.json({ status: 'disconnected' });
    } else {
        res.json({ status: 'not connected' });
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'online', endpoints: ['/likes/:username', '/stop/:username'] });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
