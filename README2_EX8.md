PARTIE A – Théorie (1h30 – 50 points)
Vos réponses seront données dans un fichier answers.md ou answers.txt

Question 1 – Services cloud temps réel
a) Citez deux services managés permettant la synchro temps réel (hors WebSocket natif).
Firebase Realtime Database et supabase Realtime
b) Comparez ces deux services selon :

modèle de données :
    Firebase est en nosql utilisant un json alors que supapase est basé sur postgressql  
firebase est donc par nature plus flexible mais egalement plus sensible au erreur et complexe pour les requete compliqué
la ou supabase permet une meilleurs structure, est plus robuste et mieilleurs pour les requete complexe par contre elle est dure à faire evoluer
persistance:
Firebase, grâce à son modèle NoSQL, permet une persistance plus fluide et évolutive, 
idéale pour des applications avec des besoins de flexibilité.

Supabase fournit une persistance très fiable avec des regles strictes, 
ce qui le rend adapté pour des applications ayant des besoins de haute intégrité des données.

mode d’écoute:
Firebase utilise une écoute passive qui permet aux clients de se connecter à un service en temps réel 
utilise les fonction de postgreSQL et la fonctionnalité Realtime de Supabase. Il s'agit d'un abonnement en temps réel aux changements de données de la base de données
les deux sont donc assez proche l'un de l'autres sur le resusltat finale mais celle de supabase est peut etres plus eprouvé 
scalabilité:
firebase : verticale
supabase : horizontale
Expliquez vos réponses

c) Donnez un cas d’usage préféré pour chacun.
firebase est preferable pour les applis web et mobile simple comme un tableau de bord collaboratif 
là où Supabase sera plus adapt plus des applications commplexe 

Question 2 – Sécurité temps réel
a) Donnez trois risques liés au temps réel (ex : DDoS via connexions persistantes) et comment s’en protéger.
ddos volontaire : un utilisateur malvaillant peut essayer de surcharger de requete le serveur et la base donné par la meme occasion 
-  solution : Cloudflare ou autre service de protection
conflit : plusieurs utilisateurs modifient un meme element ou la reconnection d'un utilisateur vient modifier quelque chose qui à ete toucher pendant sont absence 
- Éviter les conflits en choisissant bien la granularité des données synchronisées. utiliser un CRDT
la fuite : Les échanges instantanés peuvent être interceptés si la communication n’est pas sécurisée. 
- solution : Utiliser le chiffrement TLS (HTTPS / WSS) sur toutes les connexions. ainsi que de l'authentification avec token 

b) Expliquez l’importance de la gestion des identités en temps réel.

Question 3 – WebSockets vs Webhooks
a) Définissez chaque technologie.

b) Donnez deux avantages et deux limites de chaque.

c) Dans quel cas un Webhook est préférable ? Justifiez.

Question 4 – CRDT & Collaboration
a) Définissez un CRDT.
Conflict-free Replicated Data Types
Structures de données pour la réplication distribuée sans conflits.
Garantissent la convergence naturelle vers un même état final, même avec modifications concurrentes hors ligne.
Évitent tout arbitrage centralisé.

b) Donnez un exemple concret de situation où l’utiliser.
un utilisateur à une connexion instable et n'envoie pas tout de suite les changements qu'il a fait et les donné sont changé par un autres utilisateur dans ce delais 
c) Expliquez pourquoi un CRDT évite les conflits de modifications distribuées.
Un CRDT évite les conflits grâce à sa logique de fusion déterministe :
Chaque opération est commutative : l’ordre dans lequel les changements arrivent n’affecte pas le résultat final.
Les opérations sont idempotentes : rejouer la même mise à jour plusieurs fois ne change pas l’état final.
Les règles de combinaison assurent une convergence automatique vers le même état sur tous les nœuds, sans besoin d’arbitrage ou de résolution manuelle de conflits.

Question 5 – Monitoring temps réel
a) Citez trois métriques clés à surveiller dans une application temps réel.
Latence / temps de réponse , le taux d'erreur , utilisation des ressource
b) Expliquez comment des outils comme Prometheus/Grafana aident dans ce contexte.
Prometheus : collecte et stocke automatiquement les métriques des services en temps réel. Il permet aussi d’émettre des alertes basées sur des seuils 
Grafana : visualise ces métriques à travers des tableaux de bord dynamiques (dashboards).
ils permettent :
de détecter rapidement les anomalies,
de suivre la santé globale du système,
et de réagir en cas de panne 
c) Quelle est la différence entre logs, traces, et métriques ?
les logs sont des message textuele varié comme des erreur levé ou des requete reçus 
traces sont le suivit d'une requete dans plusieurs service 
metrique ce sont des valeur numerique comme gestionaire des tache windows mais pour notre application

Question 6 – Déploiement & Connexions persistantes
a) Expliquez comment les connexions WebSockets impactent :
load balancing :
elles sont persistante et attaché à un seul serveur le load balncing ne peut donc pas les deplacer ou arreter 
scalabilité : 
puisque chaque utilisateur va donc verrouiller de la memoire et du cpu il faut avoir des serveur dimensionner pour les accueillir
b) Pourquoi Kubernetes est souvent utilisé dans ce contexte ?

Kubernetes 
Automatise le déploiement et la montée en charge :
-> ajuste automatiquement le nombre de pods selon la charge (autoscaling).
Gère le load balancing 
Assure la tolérance aux pannes :
 - redémarre automatiquement les pods défaillants, redistribue la charge.
Facilite la mise à jour sans interruption (rolling updates) :
- utile pour garder les connexions WebSocket actives pendant les déploiements.

Question 7 – Stratégies de résilience client
a) Décrivez trois mécanismes côté client pour gérer les déconnexions.
l’exponential backoff voir explication end dessous
offline queue quand l'utilisateur et momentanément deconnecter, le serveur garde en memoire les changement pour les envoyer apres
Détection de l’état de connexion et gestion adaptative de l’interface :
Le client surveille l’état de la connexion (via des heartbeats ou l’API navigator.onLine) et adapte son comportement :
affiche un message “hors ligne”,désactive certaines actions, tente de resynchroniser les données à la reconnexion.

b) Expliquez brièvement le principe d’exponential backoff.
dans les grande ligne on va faire plusieurs tentative de reconnexion mais pour menager les ressource plus le temps passe plus elle seront eloigné les une des autres 
ex 2s puis 4s puis 8s ect 


explication
npm run start pour lancer
http://localhost:3001/logs permet de voire les logs stocker en bdd

chaque salle et proteger par un mot de passe hashé coté serveur 
une fois dans la salle tout les utilisateurs peuvent modifier le texte en temps reel avec un throttle de 0,5s
en cas de déconnexion, le client tente automatiquement de se reconnecter (reconnect-attach)
l'utilisateur vois aussi un affichage de la latence estimée grace au ping pong entre serveur et client ainsi que le nombre de personne connecté

coté server il y comme regle de securité 
une validation coté serveur des informations de connection entrée par l'utilisateur
avec un nettoyage des input utilisateur avec sanitize
une limite 30 modifications par minute a etait mise en place pour chaque utilisateur 
