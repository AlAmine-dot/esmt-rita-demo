# Handoff — ESMT Rita Demo (HTML/CSS/JS)

Document de passation pour la prochaine session Claude qui reprend le travail sur le **site démo statique** (clone ESMT + widget Rita).

---

## 1. Contexte global

**But du projet** : démontrer l'intégration du chatbot Rita (app Flutter Yeekai) dans le site web de l'ESMT, façon Mongoose Harmony — un FAB en bas à droite ouvre un panneau latéral contenant l'app Flutter en iframe.

**Pourquoi un repo standalone** : avant, le site démo vivait dans `web/websitedemo/` du repo Flutter `yeebus_filthy_mvp`. Ça créait du couplage (77 Mo de HTML clonés copiés à chaque build Flutter, déploiements liés). Le site est maintenant **extrait** dans `~/StudioProjects/esmt-rita-demo/` pour un déploiement Vercel indépendant.

**Stack** : 100% statique. Pas de build step, pas de framework, pas de package manager. Juste du HTML/CSS/JS vanilla servi tel quel.

---

## 2. Layout du repo

```
~/StudioProjects/esmt-rita-demo/
├── index.html        ← page démo (iframe ESMT + teaser + FAB + panneau Rita)
├── styles.css        ← thème Yeekai (bleu #0066cc → #00a3ff), FAB, panneau, teaser
├── app.js            ← logique panneau (open/close, preload iframe, teaser)
├── config.js         ← window.FLUTTER_APP_URL (à switcher dev/prod)
├── assets/
│   ├── rita-icon.png ← icône du FAB (cercle bleu intégré dans l'asset)
│   └── rita-light.png← avatar du header du panneau
├── esmt-clone/       ← 77 Mo, clone wget de www.esmt.sn (chargé dans #esmt-frame)
├── README.md         ← doc utilisateur (dev local, deploy Vercel, regen clone)
├── HANDOFF.md        ← ce fichier
└── .gitignore
```

**Repo Git** : initialisé localement. Un seul commit pour l'instant (`5a21ff5 — feat: initial standalone demo extracted from yeebus_filthy_mvp`). **Pas encore de remote configuré, pas encore poussé sur GitHub, pas encore déployé sur Vercel.** Modifications en cours non committées (teaser bubble + ajustements config).

---

## 3. État actuel

### ✅ Fait
- Extraction depuis le repo Flutter (HTML/CSS/JS + assets Rita + clone ESMT)
- Thème Yeekai (gradient bleu) appliqué au header du panneau
- FAB Rita avec halo pulse, drop-shadow qui suit l'alpha de l'asset (pas de rectangle)
- Panneau latéral plein-hauteur avec animation slide+fade
- Iframe Rita préchargée en arrière-plan via `requestIdleCallback` (ouverture instantanée)
- Teaser bubble "Salut ! Je suis là pour t'aider à trouver tout ce que tu cherches" qui apparaît 1.2s après load, dismiss persisté en `localStorage` (`rita-teaser-dismissed`)
- Triangle CSS qui pointe du teaser vers le FAB
- Mobile (≤480px) : panneau plein-écran, teaser caché (≤600px)
- Mode dev : `config.js` pointe vers `http://localhost:52022/` (port Flutter verrouillé)
- Mode prod : `config.js` pointe vers `https://yeekai-sneaky-mvp.alamine2902.workers.dev` (Cloudflare Workers, déjà déployé côté Flutter)

### 🔄 En cours / non committé
État `git status` au moment du handoff :
```
modified: README.md
modified: app.js
modified: config.js
modified: index.html
modified: styles.css
```
→ Ces modifs incluent notamment l'ajout du teaser. À reviewer avant commit.

### ⏳ Pending
Voir section [§5 Tâches restantes](#5-tâches-restantes).

---

## 4. Comment dev / tester en local

### Lancer l'app Flutter (iframe cible)
```bash
cd ~/StudioProjects/yeebus_filthy_mvp
./scripts/run_web.sh           # port verrouillé à 52022
# ou via VS Code : config "Flutter Web (port 52022)"
```

⚠️ **Le port doit rester 52022** (config.js pointe dessus en dev). Le wrapper `scripts/run_web.sh` du repo Flutter le verrouille déjà.

### Servir le site démo
```bash
cd ~/StudioProjects/esmt-rita-demo
python3 -m http.server 8080
```

Ouvrir [http://localhost:8080/](http://localhost:8080/).

**Pour re-tester le teaser après l'avoir fermé** :
```js
// console navigateur
localStorage.removeItem('rita-teaser-dismissed');
// puis reload
```

---

## 5. Tâches restantes

### 5.1. Déploiement Vercel (priorité 1)
Le site n'est **pas encore en ligne**. Étapes :

1. Vérifier que `config.js` pointe sur l'URL prod (déjà fait : `https://yeekai-sneaky-mvp.alamine2902.workers.dev`)
2. Commit les modifs en cours (teaser + ajustements)
3. Créer un repo GitHub + déployer :
   ```bash
   gh repo create esmt-rita-demo --private --source=. --remote=origin --push
   vercel --prod
   ```
   Ou connecter le repo GitHub à Vercel via leur UI pour deploys auto sur push.
4. Tester le déploiement : ouvrir l'URL Vercel, vérifier que (a) le clone ESMT charge, (b) le FAB est visible, (c) le teaser s'affiche, (d) le clic ouvre l'app Flutter de prod dans le panneau.

⚠️ **Demander confirmation à l'user avant push GitHub / deploy Vercel** — l'user a déjà déployé l'app Flutter sur Cloudflare Workers, il préfère pousser lui-même les déploiements (cf. session précédente). L'user a explicitement demandé `peux-tu push sur la branche pour déployer ?` pour le repo Flutter — donc ne pas pousser sans qu'il le demande.

### 5.2. Cleanup du repo Flutter (priorité 2, **différé**)
Une fois le site démo en ligne sur Vercel et validé :
```bash
cd ~/StudioProjects/yeebus_filthy_mvp
git rm -r web/websitedemo
git commit -m "chore: remove websitedemo (extracted to esmt-rita-demo repo)"
```
**Ne pas faire avant validation Vercel** — c'est le filet de sécurité actuel.

### 5.3. Pistes possibles (à proposer à l'user, pas faire d'office)
- **i18n du teaser bubble** : le texte est figé en FR. Si un jour l'app cible des visiteurs anglophones, prévoir un mécanisme (détection `navigator.language` ou querystring `?lang=en`).
- **Postmessage parent ↔ iframe** : actuellement, zéro communication entre le site et l'app Flutter. Pourrait servir à : passer la langue du visiteur, fermer le panneau depuis l'app Flutter (bouton "retour au site"), tracker les conversions, etc.
- **Headers Vercel** : ajouter un `vercel.json` avec cache long sur `assets/` et `esmt-clone/` (les fichiers ne bougent pas) si besoin de perf.
- **CSP iframe** : vérifier que l'app Flutter (Cloudflare Workers) ne renvoie pas `X-Frame-Options: DENY` ou `frame-ancestors` restrictif. À tester depuis le déploiement Vercel (origines différentes).

---

## 6. Architecture côté code

### `index.html`
Structure DOM :
- `<iframe id="esmt-frame">` plein écran chargeant `./esmt-clone/index.html`
- `<div id="rita-teaser">` bulle avec texte + bouton ✕
- `<button id="rita-fab">` icône Rita en bas à droite
- `<div id="rita-backdrop">` voile sombre quand panneau ouvert
- `<aside id="rita-panel">` contient header (avatar + "Rita / Assistant ESMT") + `<iframe id="rita-frame">`
- Scripts : `config.js` **avant** `app.js` (config.js définit `window.FLUTTER_APP_URL` lu par app.js)

### `styles.css`
Sections (commentées avec séparateurs `/* ─── ... ─── */`) :
- Variables `:root` (couleurs Yeekai, ombres)
- `#esmt-frame` (iframe ESMT plein écran)
- `#rita-teaser` + `::after` triangle + `#rita-teaser-close`
- `#rita-fab` + `::after` halo pulse + `@keyframes rita-pulse`
- `#rita-backdrop`
- `#rita-panel` + animation slide-in
- `.panel-header` (gradient bleu, avatar, titre + sous-titre, point vert "online")
- `#rita-frame`
- Media queries mobile

**Conventions** :
- Variables CSS dans `:root` pour couleurs (`--rita-blue-start`, `--rita-blue-end`, `--rita-blue-shadow`, `--rita-online`)
- Pas de framework CSS, pas de Tailwind
- `isolation: isolate` + z-index sur le FAB pour gérer l'empilement halo / image

### `app.js`
IIFE encapsulant toute la logique. Sections :
- Récupération des éléments DOM
- Constantes : `TEASER_KEY = 'rita-teaser-dismissed'`, `TEASER_DELAY = 1200`
- `showTeaser()` / `hideTeaser({persist})` — gère l'affichage et la persistance du dismiss
- `loadFrame()` — set le `src` de l'iframe Flutter (idempotent via flag `frameLoaded`)
- `openPanel()` / `closePanel()` — toggle classes `is-open` / `is-hidden`
- Listeners : FAB click, close btn, backdrop click, ESC key, teaser close btn
- `schedulePreload()` — `requestIdleCallback` (fallback `setTimeout 1500ms`) pour précharger l'iframe Flutter sans bloquer le thread principal
- `scheduleTeaser()` — `setTimeout 1200ms` pour montrer la bulle après que la page principale soit chargée

### `config.js`
Une ligne, une variable globale. **Ne jamais committer avec une URL localhost active si c'est ce qui sera déployé** — actuellement, la ligne dev est commentée et la prod active.

---

## 7. Préférences utilisateur observées

- **Langue** : tout en français (UI, commits, commentaires de code)
- **Style code** : commentaires en français, séparateurs visuels `/* ─── ... ─── */` en CSS
- **Performance** : très sensible aux problèmes de lag / latence (cf. fix `requestIdleCallback` pour préchargement iframe)
- **UX** : soigneuse — itérations multiples sur les détails visuels du FAB (halo, ombre alpha, ripple derrière l'image, etc.)
- **Workflow déploiement** : préfère pousser/déployer lui-même. Toujours demander avant `git push`, `vercel --prod`, ou toute action visible côté external (cf. règle système)
- **Pas de surengineering** : le site est volontairement statique simple, pas de build, pas de bundler. Ne pas proposer Webpack/Vite/etc. sans qu'il le demande.
- **Synchronisation deux repos** : pendant la phase d'extraction, l'user a fait modifier les deux copies (standalone + `web/websitedemo/` du repo Flutter) pour pouvoir basculer. Une fois Vercel validé, on supprimera le miroir du repo Flutter (cf. §5.2).

---

## 8. Liens utiles

- **Repo Flutter (parent)** : `~/StudioProjects/yeebus_filthy_mvp/` — contient l'app Flutter Yeekai, déployée sur Cloudflare Workers via wrangler
- **App Flutter en prod** : https://yeekai-sneaky-mvp.alamine2902.workers.dev
- **Site ESMT original** : https://www.esmt.sn (refuse l'iframe via `X-Frame-Options`, d'où le clone wget)
- **Wrapper port fixe** : `~/StudioProjects/yeebus_filthy_mvp/scripts/run_web.sh`
- **Config VS Code** : `~/StudioProjects/yeebus_filthy_mvp/.vscode/launch.json` → "Flutter Web (port 52022)"

---

## 9. Pièges connus

- **Cross-origin iframe** : parent (Vercel) ≠ iframe (Cloudflare). `localStorage` isolé. Pas de communication parent ↔ iframe sans `postMessage`.
- **Firebase dans iframe cross-origin** : peut throw (third-party storage bloqué). Côté Flutter, `Firebase.initializeApp` est wrappé dans un try/catch dans `lib/main.dart` pour éviter de planter le boot. Si tu touches au boot Flutter, ne pas casser ce try/catch.
- **Teaser sur mobile** : caché via `@media (max-width: 600px)`. Si on veut le réactiver, repenser la position (le FAB descend à `bottom: 16px right: 16px` en mobile, le teaser à `bottom: 44px right: 110px` en desktop).
- **`config.js` en prod** : si jamais l'URL Cloudflare change, il faut redeploy le site démo (Vercel) pour que la nouvelle URL soit prise en compte. Pas de fetch dynamique.

---

*Document généré 2026-04-28. Prochaine session : ne pas re-faire l'audit complet, lire ce fichier + `README.md` et démarrer là où on s'est arrêtés (§5).*
