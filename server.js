const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// TikTok Live connector
const { WebcastPushConnection } = require('tiktok-live-connector');

// Store active connections
const activeConnections = new Map();

app.get('/likes/:username', async (req, res) => {
    const username = req.params.username;
    
    try {
        // Check if already connected
        let connection = activeConnections.get(username);
        
        if (!connection) {
            connection = new WebcastPushConnection(username);
            activeConnections.set(username, connection);
            
            await connection.connect();
            console.log(`Connected to ${username}'s live`);
        }
        
        let likeCount = 0;
        
        connection.on('like', (data) => {
            likeCount = data.likeCount;
            console.log(`${username} likes: ${likeCount}`);
        });
        
        // Wait 2 seconds to collect data
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        res.json({ 
            likeCount: likeCount,
            username: username,
            status: 'connected'
        });
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.json({ 
            likeCount: 0,
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
        res.json({ status: 'disconnected' });
    } else {
        res.json({ status: 'not connected' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
