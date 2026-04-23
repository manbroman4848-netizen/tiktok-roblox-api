const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const activeConnections = new Map();
const connectionState = new Map();

app.get('/likes/:username', async (req, res) => {
    const username = req.params.username;
    
    try {
        let connection = activeConnections.get(username);
        let state = connectionState.get(username);
        
        if (!state) {
            state = {
                likeCount: 0,
                lastGift: null,
                lastGiftTime: 0
            };
            connectionState.set(username, state);
        }
        
        if (!connection) {
            connection = new WebcastPushConnection(username);
            activeConnections.set(username, connection);
            
            // Debug ALL events
            connection.on('like', (data) => {
                console.log('LIKE EVENT:', JSON.stringify(data));
                if (data.likeCount !== undefined) {
                    state.likeCount = data.likeCount;
                } else if (data.totalLikes !== undefined) {
                    state.likeCount = data.totalLikes;
                } else if (typeof data === 'number') {
                    state.likeCount = data;
                }
            });
            
            connection.on('gift', (data) => {
                console.log('GIFT EVENT:', JSON.stringify(data));
                state.lastGift = {
                    giftName: data.giftName,
                    repeatCount: data.repeatCount || 1
                };
                state.lastGiftTime = Date.now();
            });
            
            // Catch all other events
            connection.on('roomUser', (data) => {
                console.log('ROOM USER EVENT:', JSON.stringify(data));
            });
            
            connection.on('chat', (data) => {
                console.log('CHAT EVENT:', JSON.stringify(data));
            });
            
            await connection.connect();
            console.log(`Connected to ${username}'s live`);
        }
        
        res.json({ 
            likeCount: state.likeCount,
            lastGift: state.lastGift,
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
        connectionState.delete(username);
        console.log(`Disconnected from ${username}'s live`);
        res.json({ status: 'disconnected' });
    } else {
        res.json({ status: 'not connected' });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'online' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
