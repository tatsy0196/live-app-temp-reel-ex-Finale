let socket = io({reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000});
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

const latencySpan = document.createElement("span");
latencySpan.style.fontSize = "12px";
latencySpan.style.color = "#777";
userInfo.appendChild(latencySpan);

function addMessage(msg) {
    const p = document.createElement("p");
    p.textContent = msg;
    messages.appendChild(p);
    messages.scrollTop = messages.scrollHeight;
}

function verifChamps() {
    if (!username || !room || !token) {
        alert("Veuillez remplir tous les champs !");
        return false
    }
    return true

}

// créer
createBtn.addEventListener("click", () => {
    username = document.getElementById("username").value.trim();
    room = document.getElementById("room").value.trim();
    token = document.getElementById("token").value.trim();

    if( !verifChamps()) {
        return;
    }
    socket.emit("create room", { username, room, token }, (ack) => {
        if (ack && ack.ok) {
            loginDiv.classList.add("hidden");
            boardDiv.classList.remove("hidden");
            startLatencyPing();
            startMonitoring();
        } else alert(ack.error);
    });
});

// rejoindre
joinBtn.addEventListener("click", () => {
    username = document.getElementById("username").value.trim();
    room = document.getElementById("room").value.trim();
    token = document.getElementById("token").value.trim();

    if( !verifChamps()) {
        return;
    }
    socket.emit("join room", { username, room, token }, (ack) => {
        if (ack && ack.ok) {
            loginDiv.classList.add("hidden");
            boardDiv.classList.remove("hidden");
            startLatencyPing();
            startMonitoring();
        } else alert(ack.error);
    });
});

// déconnexion
leaveBtn.addEventListener("click", () => {
    socket.emit("leave room", {username:username, room: room });
    sharedText.value = "";
    messages.innerHTML = "";
    boardDiv.classList.add("hidden");
    loginDiv.classList.remove("hidden");
});

socket.on("connect", () => {
    addMessage(" Connecté au serveur.");
});
socket.on("reconnect", () => {
    addMessage("Tentative de reconnexion...");
    if (username && room && token) {
        socket.emit("reconnect-attach", { username, room, token }, (ack) => {
            if (ack && ack.ok) {
                addMessage("Reconnecté à la room !");
                sharedText.value = ack.update || "";
                startLatencyPing();
            } else {
                addMessage("Reconnexion échouée : " + (ack?.error || "inconnue"));
            }
        });
    }
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


// --- Synchronisation du texte ---
sharedText.addEventListener("input", throttle(() => {
    if (socket && socket.connected) {
        socket.emit("modification text", {
            username,
            room,
            update: sharedText.value
        });
    }
},500));



let latencyInterval;
function startLatencyPing() {
    clearInterval(latencyInterval);
    latencyInterval = setInterval(() => {
        if (socket.connected) {
            socket.emit("latency-pong", Date.now());
        }
    }, 3000);
}

socket.on("latency-estimate", (data) => {
    if (data && typeof data.rtt === "number") {
        latencySpan.textContent = `Latence estimée : ${data.rtt} ms`;
    }
});

let monitoringInterval;
function startMonitoring() {
    clearInterval(monitoringInterval);
    monitoringInterval = setInterval(async () => {
        try {
            const res = await fetch("/status");
            const status = await res.json();
            if (status) {
                latencySpan.textContent =
                    `${status.UserCount} utilisateurs | Rooms: ${status.rooms.length} | Latence estimée: ${latencySpan.textContent.split(': ')[1] || "?"} | Événements/min: ${status.eventsPerMinute}`;
            }
        } catch (e) {
            console.warn("Erreur monitoring:", e);
        }
    }, 5000);
}

function throttle(fn, limit) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= limit) { // Si le délai est passé
            lastCall = now;
            fn.apply(this, args); // Exécute la fonction
        }
    };
}