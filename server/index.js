const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static("client"));

let rooms = {}; // ex: { room1: { text: "", users: [], token: "" } }
let activeConnections = 0
let eventsPerMinute = 0;

setInterval(() => {
    eventsPerMinute = 0;
}, 60000);

// Servir le fichier index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});


app.get('/status', (req, res) => {
    res.json({
        UserCount: activeConnections,
        rooms: Object.keys(rooms),
        eventsPerMinute
    });
});

// Écoute des connexions Socket.IO
io.on('connection', (socket) => {
    console.log('Un utilisateur est connecté');

    // ... dans io.on('connection', (socket) => { ... });
    socket.on('join room', (data,callback) => {
        eventsPerMinute++;
        activeConnections++

        const { username, room, token } = data;

        if (!rooms[room]) {
            return callback({ ok: false, error: "Room inexistante" });
        }

        if (rooms[room].token !== token){
            return callback({ ok: false, error: "Token invalide" });
        }

        socket.join(room);
        rooms[room].users.push(username);
        socket.data.username = username;
        socket.data.room = room;

        socket.emit('modification text', {
            username: 'Serveur',
            room,
            update: rooms[room].text
        });
        io.to(room).emit('room message', { message: `${username} a rejoint le salon ${room}.` });
        console.log(`${username} a rejoint le salon ${room}`);
        callback({ ok: true });
    });


    socket.on('create room', (data,callback) => {
        eventsPerMinute++;
        const { username, room, token } = data;

        if (rooms[room]) {
            return callback({ ok: false, error: "Room déjà existante" });
        }
        rooms[room] = { text: "", users: [username], token: `${token}` };

        socket.join(data.room);
        socket.data.username = data.username;
        socket.data.room = data.room;

        socket.emit('modification text', {
            username: 'Serveur',
            room,
            update: rooms[room].text
        });
        // Notifie tous les membres du salon (y compris le nouveau)
        io.to(data.room).emit('room message', { message: `${data.username} a créé le salon ${data.room}.` });
        console.log(`${data.username} a créé le salon ${data.room}`);
        callback({ ok: true });

    });


    socket.on('modification text', (data) => {
        rooms[data.room].text = data.update;
        io.to(data.room).emit('modification text', {
            username: data.username,
            room: data.room,
            update: data.update
        });
        console.log(`[${data.room}] ${data.username}: ${data.update}`);
        eventsPerMinute++;
    });


    socket.on('leave room', () => {

        const username = socket.data.username;
        const room = socket.data.room;
        activeConnections--

        if (room && rooms[room]) {
            rooms[room].users = rooms[room].users.filter(u => u !== username);

            if (rooms[room].users.length === 0) { //delete si plus personne
                delete rooms[room];
            }

            io.to(room).emit('room message', { message: `${username} a quitté la room` });
        }
        console.log('Un utilisateur est déconnecté');
        eventsPerMinute++;
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT} ( http://localhost:${PORT})`);
});