// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const bcrypt = require('bcrypt'); // pour hasher le token
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    pingInterval: 10000,
    pingTimeout: 5000
});
app.use(express.static("client"));

/* --------- Persist: SQLite local (fichier local) --------- */
const db = new sqlite3.Database('./data.sqlite3');

// Initialisation des tables si besoin
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS rooms (
        name TEXT PRIMARY KEY,
        text TEXT DEFAULT '',
          token_hash TEXT NOT NULL,
        created_by TEXT,
        created_at INTEGER
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS logs (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             ts INTEGER,
             type TEXT,
             room TEXT,
             username TEXT,
             details TEXT
        )
    `);
});

/* --------- In-memory cache + monitoring --------- */
let rooms = {}; // cache: { room1: { text: "", users: [], tokenHash: "" } }
let activeConnections = 0;
let eventsPerMinute = 0;
let editsPerUser = {}; // rate limit tracker: { username: [timestamp, ...] }
let syncLogs = []; // small in-memory buffer of recent sync logs

// reset events per minute every minute
setInterval(() => { eventsPerMinute = 0; }, 60000);

function loadRoomsFromDB() {
    db.all(`SELECT name, text, token_hash FROM rooms`, (err, rows) => {
        if (err) {
            console.error("Erreur DB load rooms:", err);
            return;
        }
        rows.forEach(r => {
            rooms[r.name] = { text: r.text || '', users: [], tokenHash: r.token_hash };
        });
        console.log("Rooms chargées depuis DB:", Object.keys(rooms));
    });
}
loadRoomsFromDB();

const sanitize = (s) => {
    //il evite les injection sql
    if (typeof s !== 'string') return '';
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

const isValidName = (s) => typeof s === 'string' && /^[A-Za-z0-9_\-]{2,30}$/.test(s);
const isValidRoom = (s) => typeof s === 'string' && /^[A-Za-z0-9_\-]{1,50}$/.test(s);

// Rate limit : max 30 modifications par minutes et personne
const MAX_EDITS_PAR_MIN = 30;
function canEdit(username) {
    const now = Date.now();
    if (!editsPerUser[username]) editsPerUser[username] = [];
    editsPerUser[username] = editsPerUser[username].filter(t => now - t < 60000);
    if (editsPerUser[username].length >= MAX_EDITS_PAR_MIN) return false;
    editsPerUser[username].push(now);
    return true;
}


function logAction(type, room, username, details) {
    const ts = Date.now();
    db.run(`INSERT INTO logs (ts, type, room, username, details) VALUES (?, ?, ?, ?, ?)`,
        [ts, type, room || '', username || '', details || ''], (err) => {
            if (err) console.error("Erreur insert log:", err);
        });
    syncLogs.push({ ts, type, room, username, details });
    if (syncLogs.length > 200) syncLogs.shift();
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/status', (req, res) => {
    res.json({
        UserCount: activeConnections,
        rooms: Object.keys(rooms),
        eventsPerMinute,
        recentLogs: syncLogs.slice(-20)
    });
});

io.on('connection', (socket) => {
    console.log('Un utilisateur est connecté', socket.id);
    activeConnections++;
    eventsPerMinute++;

    socket.on('latency-pong', (clientTs) => {
        const rtt = Date.now() - clientTs;
        socket.emit('latency-estimate', { rtt }); // renvoyer estimation au client
    });

    function refreshRoomFromDB(room) {
        db.get(`SELECT text FROM rooms WHERE name = ?`, [room], (err, row) => {
            if (!err && row) {
                rooms[room].text = row.text || '';
            }
        });
    }

    socket.on('create room', async (data, callback) => {
        eventsPerMinute++;
        try {
            const username = sanitize(data.username);
            const room = sanitize(data.room);
            const token = data.token;

            if (!isValidName(username) || !isValidRoom(room) || typeof token !== 'string' || token.length < 6) {
                if (token.length < 6) {
                    return callback({ ok: false, error: "clé trop courte elle doit faire au moins 6 caractère" });

                }
                else {
                 return callback({ ok: false, error: "Données invalides (validation serveur)" });
            }}

            if (rooms[room]) {
                return callback({ ok: false, error: "Room déjà existante" });
            }

            const saltRounds = 10;
            const tokenHash = await bcrypt.hash(token, saltRounds);

            const createdAt = Date.now();
            db.run(`INSERT INTO rooms (name, text, token_hash, created_by, created_at) VALUES (?, ?, ?, ?, ?)`,
                [room, '', tokenHash, username, createdAt], (err) => {
                    if (err) {
                        console.error("Erreur DB insert room:", err);
                        return callback({ ok: false, error: "Erreur serveur" });
                    }
                    rooms[room] = { text: "", users: [username], tokenHash };
                    socket.join(room);
                    socket.data.username = username;
                    socket.data.room = room;

                    socket.emit('modification text', {
                        username: 'Serveur',
                        room,
                        update: rooms[room].text
                    });
                    io.to(room).emit('room message', { message: `${username} a créé le salon ${room}.` });
                    console.log(`${username} a créé le salon ${room}`);
                    logAction('create_room', room, username, 'room created');
                    return callback({ ok: true });
                });
        } catch (e) {
            console.error(e);
            return callback({ ok: false, error: "Erreur serveur (create room)" });
        }
    });

    socket.on('join room', (data, callback) => {
        eventsPerMinute++;
        (async () => {
            try {
                const username = sanitize(data.username);
                const room = sanitize(data.room);
                const token = data.token;

                if (!isValidName(username) || !isValidRoom(room) || typeof token !== 'string') {
                    return callback({ ok: false, error: "Données invalides (validation serveur)" });
                }

                if (!rooms[room]) {
                    db.get(`SELECT token_hash, text FROM rooms WHERE name = ?`, [room], async (err, row) => {
                        if (err || !row) {
                            return callback({ ok: false, error: "Room inexistante" });
                        }
                        rooms[room] = { text: row.text || '', users: [], tokenHash: row.token_hash };
                        // continue verification below via recursion-like pattern: call join again with cached room
                        socket.emit('server-temporary', { msg: 'Room loaded from DB, retrying join' });
                        // no recursion loop because now rooms[room] exists
                        // verify token:
                        const match = await bcrypt.compare(token, rooms[room].tokenHash);
                        if (!match) return callback({ ok: false, error: "Token invalide" });

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
                        logAction('join_room', room, username, 'joined');
                        return callback({ ok: true });
                    });
                    return;
                }

                const match = await bcrypt.compare(token, rooms[room].tokenHash);
                if (!match) {
                    return callback({ ok: false, error: "Token invalide" });
                }

                socket.join(room);
                if (!rooms[room].users.includes(username)) rooms[room].users.push(username);
                socket.data.username = username;
                socket.data.room = room;

                socket.emit('modification text', {
                    username: 'Serveur',
                    room,
                    update: rooms[room].text
                });
                io.to(room).emit('room message', { message: `${username} a rejoint le salon ${room}.` });
                console.log(`${username} a rejoint le salon ${room}`);
                logAction('join_room', room, username, 'joined');
                return callback({ ok: true });
            } catch (e) {
                console.error(e);
                return callback({ ok: false, error: "Erreur serveur (join room)" });
            }
        })();
    });

    socket.on('modification text', (data, callback) => {
        eventsPerMinute++;
        try {
            // validation
            const username = sanitize(data.username);
            const room = sanitize(data.room);
            let update = data.update;
            if (typeof update !== 'string') update = String(update);

            if (!username || !room || !rooms[room]) {
                if (callback) callback({ ok: false, error: "Invalid request or room not found" });
                return;
            }

            // rate-limit per user
            if (!canEdit(username)) {
                if (callback) callback({ ok: false, error: "Rate limit exceeded" });
                return;
            }

            // sanitize update to avoid injection / XSS
            const safeUpdate = sanitize(update);

            // server-side validation: limit length
            if (safeUpdate.length > 20000) {
                if (callback) callback({ ok: false, error: "Update trop long" });
                return;
            }



            rooms[room].text = safeUpdate;
            db.run(`UPDATE rooms SET text = ? WHERE name = ?`, [safeUpdate, room], (err) => {
                if (err) console.error("Erreur DB update room text:", err);
            });

            // broadcast
            io.to(room).emit('modification text', {
                username,
                room,
                update: safeUpdate
            });
            console.log(`[${room}] ${username}: ${safeUpdate.substring(0,60)}${safeUpdate.length>60?'...':''}`);
            logAction('modification_text', room, username, `len:${safeUpdate.length}`);

            if (callback) callback({ ok: true });
        } catch (e) {
            console.error(e);
            if (callback) callback({ ok: false, error: "Erreur serveur (modification text)" });
        }
    });


    socket.on('leave room', () => {
        const username = socket.data.username;
        const room = socket.data.room;
        if (rooms[room]) {
            rooms[room].users = rooms[room].users.filter(u => u !== username);

            if (rooms[room].users.length === 0) {
                delete rooms[room];
            }



            io.to(room).emit('room message', { message: `${username} a quitté la room` });
            logAction('leave_room', room, username, 'left');
        }
        console.log(`${username} a quitté le salon ${room}`);
        eventsPerMinute++;
    });

    socket.on('reconnect-attach', (data, callback) => {
        // data: { username, room, token }
        eventsPerMinute++;
        (async () => {
            try {
                const username = sanitize(data.username);
                const room = sanitize(data.room);
                const token = data.token;
                if (!username || !room || !token) return callback({ ok: false, error: 'Invalid' });

                if (!rooms[room]) {
                    // attempt load from DB
                    db.get(`SELECT token_hash, text FROM rooms WHERE name = ?`, [room], async (err, row) => {
                        if (err || !row) return callback({ ok: false, error: 'Room inexistante' });
                        rooms[room] = { text: row.text || '', users: [], tokenHash: row.token_hash };
                        const match = await bcrypt.compare(token, rooms[room].tokenHash);
                        if (!match) return callback({ ok: false, error: 'Token invalide' });

                        socket.join(room);
                        if (!rooms[room].users.includes(username)) rooms[room].users.push(username);
                        socket.data.username = username;
                        socket.data.room = room;
                        logAction('reconnect_attach', room, username, 'reattached');
                        return callback({ ok: true, update: rooms[room].text });
                    });
                    return;
                }

                const match = await bcrypt.compare(token, rooms[room].tokenHash);
                if (!match) return callback({ ok: false, error: 'Token invalide' });

                socket.join(room);
                if (!rooms[room].users.includes(username)) rooms[room].users.push(username);
                socket.data.username = username;
                socket.data.room = room;
                logAction('reconnect_attach', room, username, 'reattached');
                return callback({ ok: true, update: rooms[room].text });
            } catch (e) {
                console.error(e);
                return callback({ ok: false, error: 'Erreur serveur' });
            }
        })();
    });

    socket.on('disconnect', () => {
        const username = socket.data.username;
        const room = socket.data.room;
        activeConnections--;
        eventsPerMinute++;
        if (username && room) {
            if (rooms[room]) {
                rooms[room].users = rooms[room].users.filter(u => u !== username);
                if (rooms[room].users.length === 0) {
                    delete rooms[room];
                }
                io.to(room).emit('room message', { message: `${username} a quitté la room` });
            }
            console.log(`${username} a quitté le salon ${room}`);
            logAction('disconnect', room, username, 'socket disconnect');
        }
        console.log('Utilisateur déconnecté:', socket.id);
    });
});

app.get('/logs', (req, res) => { //monitoring de base
    db.all(`SELECT id, ts, type, room, username, details FROM logs ORDER BY ts DESC LIMIT 200`, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erreur DB logs' });
        res.json({ logs: rows });
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT} ( http://localhost:${PORT})`);
});
