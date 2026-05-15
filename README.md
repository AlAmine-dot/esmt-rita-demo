# ESMT Rita Demo + multi-tenant clones

Repo qui héberge :
- **Le clone statique d'ESMT** + sa démo Rita historique (`index.html` racine, "musée").
- **Les clones des sites de prospects** (Bakeli, Breedj, futurs Volkeno, etc.) — chacun intègre désormais l'agent IA Yeekai via le nouveau pattern `embed.js` standalone.
- **Le script d'injection** `scripts/inject_embed.py` qui automatise l'ajout du widget Yeekai à tout clone fraîchement wgetté.

L'embed JS lui-même ne vit PAS ici (il est dans le repo séparé [`yeekai-embed-js`](https://github.com/AlAmine-dot/yeekai-embed-js), déployé sur Vercel à `https://yeekai-embed-js.vercel.app/v1/embed.js`).

---

## Structure

```
esmt-rita-demo/
├── index.html              ← MUSÉE : démo ESMT historique (iframe + FAB legacy)
├── styles.css              ← MUSÉE : styles utilisés par index.html
├── app.js                  ← MUSÉE : logique du panneau Rita legacy
├── config.js               ← MUSÉE : window.FLUTTER_APP_URL pour la démo ESMT
├── assets/                 ← icônes Rita / Khady (partagées)
│
├── esmt-clone/             ← clone wget de www.esmt.sn (intact, MUSÉE)
│
├── bakeli-clone/           ← clone wget de www.bakeli.tech (228 HTML, migré embed.js)
├── breedj-clone/           ← clone wget de www.breedj.com (1454 HTML, migré embed.js)
│
├── scripts/
│   └── inject_embed.py     ← injecte le snippet Yeekai dans tous les HTML d'un clone
│
├── HANDOFF_SUBSPRINT_D_EMBED_JS_STANDALONE.md  ← plan d'exécution Sub-sprint D
├── HANDOFF_FEEDBACK.md                          ← review du handoff initial
└── README.md
```

---

## Architecture (post Sub-sprint D)

### Clone wget + script `embed.js` (= Bakeli, Breedj, futurs)

Chaque page HTML d'un clone contient juste **un script tag** vers l'embed CDN :

```html
<!-- Yeekai Embed (injected by scripts/inject_embed.py) -->
<script src="https://yeekai-embed-js.vercel.app/v1/embed.js"
        data-tenant="breedj"
        data-app-url="https://yeekai-embed-ai-front.vercel.app/breedj"
        data-disclaimer-target="https://breedj.com"
        async></script>
```

L'embed (hébergé chez `yeekai-embed-js`) :
1. Lit les `data-*` attributes
2. Fetch `/api/tenants/breedj/config` sur yeebot-2.0 → couleurs, agent_name, avatar du tenant
3. Render le FAB en bas-droite (rendering optimiste — pas d'attente du fetch)
4. Au clic FAB → ouvre un panneau iframe vers `data-app-url`
5. Affiche un disclaimer "Démo Yeekai sur clone — Site officiel →"

### Musée ESMT (`index.html` racine)

Reste sur l'ancien pattern (`config.js` + `app.js` + `styles.css` + iframe wrapper) **intentionnellement**, comme exemple historique avant la migration vers embed standalone.

---

## Ajouter une nouvelle démo de prospect

```bash
# 1. Cloner le site cible
rm -rf newco-clone
wget --mirror --page-requisites --convert-links --adjust-extension \
     --no-parent --domains=newco.com --no-host-directories \
     -U "Mozilla/5.0" \
     -e robots=off -P newco-clone https://www.newco.com

# 2. (Optionnel) Réécrire les liens absolus qui ont échappé à wget --convert-links
#    (cf. scripts existants, ou ad hoc en Python pour le cas particulier)

# 3. Créer la row tenant en DB (Supabase, table `tenants`)
#    cf. yeebot-2.0/HANDOFF_SUBSPRINT_0_FOUNDATION_TENANTS.md

# 4. Injecter le script Yeekai Embed dans tous les HTML
python3 scripts/inject_embed.py \
    --clone-dir newco-clone \
    --tenant newco \
    --app-url https://yeekai-embed-ai-front.vercel.app/newco \
    --disclaimer-target https://newco.com

# 5. Servir localement pour test
python3 -m http.server 8080
# Ouvrir http://localhost:8080/newco-clone/index.html
```

Le `inject_embed.py` :
- Est **idempotent** (re-run = 0 modifications si déjà à jour)
- **Strip automatiquement le legacy** (anciens `<script src="../bakeli-config.js">`, blocs HTML `<aside id="rita-panel">`, etc.) si présents
- Gère **toutes les profondeurs** de chemin relatif (../path, ../../path, ../../../path)

---

## Régénérer le clone ESMT historique

```bash
rm -rf esmt-clone
wget --mirror --page-requisites --convert-links --adjust-extension \
     --no-parent --domains=esmt.sn --no-host-directories \
     -e robots=off -P esmt-clone https://www.esmt.sn
```

(L'ESMT démo musée utilise toujours l'ancien pattern, donc pas besoin d'injecter quoi que ce soit dedans.)

---

## Dev local

### Servir un clone

```bash
python3 -m http.server 8080
# Ouvrir
#   http://localhost:8080/                            (musée ESMT)
#   http://localhost:8080/bakeli-clone/index.html     (Bakeli avec Yeekai)
#   http://localhost:8080/breedj-clone/index.html     (Breedj avec Yeekai)
```

Live Server VS Code (port 5500) marche aussi. Pour tester depuis un téléphone sur le même Wi-Fi : utiliser l'IP locale de la machine (ex. `http://192.168.1.X:5500/...`).

### Override config en dev

Pour forcer un thème ou désactiver le fetch DB pendant les tests :

```html
<script>
  window.YeekaiConfig = {
    primaryColor: '#FF0000',
    skipAutoFetch: true,
    debug: true,
  };
</script>
```

(Ajouter avant le `<script src="...embed.js">` dans la page de test.)

---

## Déploiement Vercel

Le repo `esmt-rita-demo` est connecté à Vercel et redéploie auto sur push de la branche `main`. **Note** : à cause de la taille de `breedj-clone/` (~959 Mo) le push HTTPS GitHub peut timeout. Voir [HANDOFF_FEEDBACK.md](HANDOFF_FEEDBACK.md) pour les options de mitigation (SSH, split commit, etc.).

L'embed JS est **séparément** déployé sur Vercel via le repo [`yeekai-embed-js`](https://github.com/AlAmine-dot/yeekai-embed-js) — c'est lui qui sert `https://yeekai-embed-js.vercel.app/v1/embed.js`.

---

## Branches

| Branche | Usage |
|---|---|
| `main` | État stable, suivi par Vercel auto-deploy |
| `safety/pre-subsprint-d-2026-05` | Filet de rollback avant la migration Sub-sprint D |
| `feat/subsprint-d-migrate-to-standalone-embed` | Branche de travail Sub-sprint D |

---

## Liens

- Embed source : [github.com/AlAmine-dot/yeekai-embed-js](https://github.com/AlAmine-dot/yeekai-embed-js) (à créer côté GitHub)
- CDN embed : `https://yeekai-embed-js.vercel.app/v1/embed.js` (Vercel à connecter)
- Front IA (iframe target) : [`yeekai-embed-ai-front`](https://yeekai-embed-ai-front.vercel.app)
- Backend tenants config : [`yeebot-2.0`](https://yeebot-2-0.onrender.com) → endpoint `/api/tenants/<slug>/config`
