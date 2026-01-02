const { WebSocketServer } = require('ws');

const port = process.env.PORT || 3000;
const wss = new WebSocketServer({ port });

const rooms = new Map();

wss.on('connection', (ws) => {
    let currentRoom = null;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'join') {
            currentRoom = data.room;
            if (!rooms.has(currentRoom)) {
                rooms.set(currentRoom, new Set());
            }
            rooms.get(currentRoom).add(ws);
            
            const peerCount = rooms.get(currentRoom).size;
            
            // Уведомляем всех в комнате, включая вошедшего
            rooms.get(currentRoom).forEach(client => {
                client.send(JSON.stringify({ 
                    type: 'peer_joined', 
                    count: peerCount 
                }));
            });
            console.log(`User joined room: ${currentRoom}. Total: ${peerCount}`);
        }

        if (data.type === 'signal') {
            // Пересылаем сигнал всем остальным в комнате
            if (rooms.has(currentRoom)) {
                rooms.get(currentRoom).forEach(client => {
                    if (client !== ws && client.readyState === 1) {
                        client.send(JSON.stringify(data));
                    }
                });
            }
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).delete(ws);
            const peerCount = rooms.get(currentRoom).size;
            
            if (peerCount === 0) {
                rooms.delete(currentRoom);
            } else {
                rooms.get(currentRoom).forEach(client => {
                    client.send(JSON.stringify({ 
                        type: 'peer_left', 
                        count: peerCount 
                    }));
                });
            }
            console.log(`User left room: ${currentRoom}. Remaining: ${peerCount}`);
        }
    });
});

console.log(`Signaling server running on ws://localhost:${port}`);
