// breedj-config.js — URL de l'app chat pour l'agent Breedj.
// Pointe vers le nouveau front Vite/React (yeekai-embed-ai-front sur Vercel),
// qui remplace l'ancienne app Flutter Web pour le MVP Breedj. ESMT et Bakeli
// continuent d'utiliser leurs configs respectives (config.js, bakeli-config.js).
// Le nom de variable `FLUTTER_APP_URL` est conservé pour ne pas toucher
// app.js — c'est juste une URL d'iframe pour le code consommateur.

window.FLUTTER_APP_URL = "https://yeekai-embed-ai-front.vercel.app";
