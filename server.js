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
            
            connection.on('like', (data) => {
                if (data.likeCount !== undefined) {
                    state.likeCount = data.likeCount;
                } else if (data.totalLikes !== undefined) {
                    state.likeCount = data.totalLikes;
                } else if (typeof data === 'number') {
                    state.likeCount = data;
                }
                console.log(`${username} likes: ${state.likeCount}`);
            });
            
            connection.on('gift', (data) => {
                state.lastGift = {
                    giftName: data.giftName,
                    repeatCount: data.repeatCount || 1
                };
                state.lastGiftTime = Date.now();
                console.log(`${username} gift: ${data.giftName} x${data.repeatCount || 1}`);
            });
            
            // Auto-disconnect when streamer ends live
            connection.on('disconnected', () => {
                console.log(`${username} stream ended, cleaning up...`);
                activeConnections.delete(username);
                connectionState.delete(username);
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
        // Clean up failed connection
        activeConnections.delete(username);
        connectionState.delete(username);
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
        try {
            connection.disconnect();
        } catch (e) {
            console.error(`Disconnect error: ${e.message}`);
        }
        activeConnections.delete(username);
        connectionState.delete(username);
        console.log(`Disconnected from ${username}'s live`);
        res.json({ status: 'disconnected' });
    } else {
        // Still clean up state even if no active connection
        connectionState.delete(username);
        res.json({ status: 'not connected' });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'online' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
