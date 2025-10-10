# live-app-temp-reel-ex-Finale
projet finale de terry marrot


## Partie 1 – Théorie (1h00 – 30 points)

Répondez de manière argumentée (10 à 15 lignes maximum par question).

---

### **Question 1 – Les technologies temps réel**

Comparez **Polling long**, **Server-Sent Events (SSE)** et **WebSockets** en indiquant :

* Le **principe de fonctionnement** de chacun,
* Le **sens de communication** (client → serveur / serveur → client / bidirectionnel),
* Leurs **avantages et limites**,
* Un **cas d’usage typique** pour chaque technologie.

---

**Polling long*** fonctionne comme une requête classique avec le client qui émet une requête au serveur
La différence, c’est que le serveur ne répond pas tout de suite : il garde la connexion ouverte jusqu’à ce qu’une nouvelle donnée soit disponible
Une fois que la donnée change, le serveur renvoie la réponse, et le client relance une requête pour “rester à l’écoute”
C’est donc un échange unidirectionnel (serveur → client pour la donnée, mais c’est toujours le client qui initie la communication)

avantage: très simple à mettre, compatible avec la plupart des serveur et navigateurs, pas besoin de protocoles particuliers
Limites : pas très efficace, car il y a toujours une latence entre deux requêtes et peu adapté en cas de mise à jour tres fréquentes
Cas d’usage typique : un système de notification ou de messagerie simple, où les mises à jour ne sont pas ultra fréquentes

**Server-Sent Events (SSE)**, c’est une connexion HTTP un peu speciale que le client ouvre une fois vers le serveur.
Cette connexion reste ouverte, et le serveur peut envoyer des messages au fur et à mesure, sans que le client ait besoin de redemander
C’est donc une communication unidirectionnel (serveur → client uniquement).

Avantages : plus léger que WebSocket, fonctionne très bien avec HTTP/HTTPS classique, facile à gérer côté navigateur
Limites : le client ne peut pas envoyer de messages via ce canal 
Cas d’usage typique : flux de données en temps réel comme des notifications, un tableau de bord qui se met à jour automatiquement, ou un suivi de progression.

**WebSockets**, eux, fonctionnent différemment : le client établit une connexion persistante avec le serveur, qui reste ouverte tant que nécessaire.
Une fois la connexion établie, la communication devient bidirectionnelle, c’est-à-dire que le client et le serveur peuvent s’envoyer des messages à tout moment.

Avantages : très réactif, idéal pour les échanges fréquents et rapides, sans overhead HTTP à chaque message.
Limites : plus complexe à mettre en place, nécessite un serveur compatible WebSocket, et la gestion des connexions multiple peut devenir lourde.
Cas d’usage typique : applications de chat en temps réel, jeux en ligne, ou tout système nécessitant des échanges rapides dans les deux sens.

### **Question 2 – Les fondements de Socket.IO**

Expliquez le rôle et l’intérêt de ces trois mécanismes dans Socket.IO :

* **Namespaces**,
* **Rooms**,
* **Broadcast**.

Illustrez chacun avec un exemple concret.

---

namespace : c'est un espace de communication séparé à l’intérieur du serveur comme ex /, /admin, /chat, etc. ça permet de séparer 
les accès au différent espace et eviter améliorer la securité car on peut empecher l'accès à admin par exemple
Rooms : des “sous-groupes” à l’intérieur d’un namespace. un client peut rejoindre une ou plusieurs rooms, et le serveur peut envoyer 
un message uniquement aux membres de cette room. ça permet de mieux cible les destinataires
```pseudo 
io.on('connection', socket => {
  socket.join('room1');

  socket.on('message', msg => {
    io.to('room1').emit('message', msg);
  });
  ```
Broadcast : c'est lorsqu'on envoie à tout le monde sauf à soit même, utile pour diffuser une information au autres clients
```pseudo 
    socket.broadcast.emit('textWrite', text);
```
### **Question 3 – Scalabilité et Redis Pub/Sub**

Une application Socket.IO est déployée sur **plusieurs instances** derrière un **load balancer**.

1. Pourquoi les messages émis depuis une instance peuvent-ils ne pas atteindre tous les clients ?
2. Comment **Redis Pub/Sub** résout-il ce problème ?
3. Représentez (sous forme d’un schéma texte ou diagramme) une architecture typique utilisant **Socket.IO + Redis Adapter**.

---

1. car quand on est sur plusieurs instances, un message n'est diffusé que sur l'instance du client et donc que les clients connecté à cette instance
2. Redis fait une passerelle entre toutes les instances donc quand on l'utilise et qu'on fait io.emit() tout les clients le recoive car le message est envoyé sur redis et pas sur l'instance
3. #todo à la fin

### **Question 4 – Sécurité et Monitoring**

1. Citez **3 risques de sécurité** dans une application temps réel (Socket.IO, WebSocket).
2. Décrivez **3 bonnes pratiques** pour limiter ces risques.
3. Indiquez **3 métriques ou indicateurs** à surveiller pour assurer le bon fonctionnement d’une application temps réel.
4. Citez **au moins un outil** ou une technique simple de monitoring applicable (ex : console, Prometheus, métriques internes, logs).

---
Usurpation d’identité ou connexions non authentifiées 
Injection ou émission de messages non autorisés
Déni de service (DoS) 

utilisé des JWT contre le CSF
filtré les donnnées reçus contre les injections (never trust user)
limiter les ressources pour chaque utilisateurs 

les logs serveur, la latence serveur et les connexion/deconnexion

Logs et console interne : simple mais efficace pour suivre les connexions et événements : console.log
Prometheus et Grafana : pour collecter et visualiser les métriques (connexions, CPU, latence, ...)


### **Question 5 – Bonnes pratiques**

Donnez 5 bonnes pratiques pour assurer la fiabilité et la performance d’une application web temps réel (côté serveur et client).

---



## 💻 **Partie 2 – Développement pratique (3h00 – 70 points + bonus)**

## Commande de lancement 
node server/index.js



Pour l'architecture serveur, elle s'articule autour de trois fonctions 
join room permet de rejoindre une room si le token est bons.

create room  verifie qu'une room avec un nom identique n'existe pas deja 

modification text qui renvoie le texte une fois modifié

Dans le serveur il y a ```let rooms = {}``` qui stock les rooms avec 

http://localhost:3000 l'applications 
http://localhost:3000/status json avec les infos de suivi 

j'ai localisé un probleme autour de la connexion 