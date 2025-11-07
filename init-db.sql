-- tables: users, rooms, messages, logs
CREATE TABLE IF NOT EXISTS users (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     username TEXT UNIQUE NOT NULL,
                                     token_hash TEXT NOT NULL,
                                     created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     name TEXT UNIQUE NOT NULL,
                                     owner_username TEXT NOT NULL,
                                     room_token_hash TEXT, -- optionnel: room-level token hashed if private
                                     text TEXT DEFAULT '',
                                     created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        room_name TEXT NOT NULL,
                                        username TEXT NOT NULL,
                                        content TEXT NOT NULL,
                                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    type TEXT NOT NULL,
                                    username TEXT,
                                    room_name TEXT,
                                    details TEXT,
                                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
