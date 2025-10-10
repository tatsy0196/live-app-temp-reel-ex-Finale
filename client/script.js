let socket = null;
let username = "";
let room = "";
let token = "";

const loginDiv = document.getElementById("login");
const boardDiv = document.getElementById("board");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const leaveBtn = document.getElementById("leaveBtn");
const sharedText = document.getElementById("sharedText");
const messages = document.getElementById("messages");
const userInfo = document.getElementById("userInfo");

// --- Fonction utilitaire ---
function addMessage(msg) {
    const p = document.createElement("p");
    p.textContent = msg;
    messages.appendChild(p);
    messages.scrollTop = messages.scrollHeight;
}

// --- Connexion au serveur ---
function connectSocket() {
    if (!username || !room || !token) {
        alert("Veuillez remplir tous les champs !");
        return;
    }

    socket = io();

    setupSocketEvents();

    userInfo.textContent = `Connecté en tant que ${username} (room: ${room})`;
}

// créer
createBtn.addEventListener("click", () => {
    username = document.getElementById("username").value.trim();
    room = document.getElementById("room").value.trim();
    token = document.getElementById("token").value.trim();

    connectSocket();

    socket.emit("create room", { username, room, token }, (ack) => {
        if (ack && ack.ok) {
            loginDiv.classList.add("hidden");
            boardDiv.classList.remove("hidden");
        } else alert("Erreur en créant le salon.");
    });
});

// rejoindre
joinBtn.addEventListener("click", () => {
    username = document.getElementById("username").value.trim();
    room = document.getElementById("room").value.trim();
    token = document.getElementById("token").value.trim();

    connectSocket();

    socket.emit("join room", { username, room, token }, (ack) => {
        if (ack && ack.ok) {
            loginDiv.classList.add("hidden");
            boardDiv.classList.remove("hidden");
        } else alert("Erreur en rejoignant le salon.");
    });
});

// déconnexion
leaveBtn.addEventListener("click", () => {
    if (socket) socket.disconnect();
    socket = null;
    sharedText.value = "";
    messages.innerHTML = "";
    boardDiv.classList.add("hidden");
    loginDiv.classList.remove("hidden");
});

// --- Gestion des événements Socket.IO ---
function setupSocketEvents() {
    socket.on("connect", () => {
        addMessage(" Connecté au serveur.");
    });

    socket.on("disconnect", () => {
        addMessage("Deco du serveur.");
    });

    socket.on("room message", (data) => {
        addMessage(`${data.message}`);
    });

    socket.on("modification text", (data) => {
        if (sharedText.value !== data.update) {
            sharedText.value = data.update;
        }
    });
}

// --- Synchronisation du texte ---
sharedText.addEventListener("input", () => {
    if (socket && socket.connected) {
        socket.emit("modification text", {
            username,
            room,
            update: sharedText.value
        });
    }
});

