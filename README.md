# esmt-rita-demo — Clones de sites prospects + démo musée ESMT

Repo qui héberge :
- **Les clones wget des sites de prospects** (Bakeli, Breedj, Le Grand Frère, Afrodemy…) — chacun intègre l'agent IA Yeekai via 1 script tag pointant vers `yeekai-embed-js` (CDN).
- **Le script d'injection** `scripts/inject_embed.py` qui automatise l'ajout du widget Yeekai dans tous les HTML d'un clone fraîchement wgetté (idempotent).
- **Le clone statique d'ESMT** + sa démo Rita historique (`index.html` racine, "musée" — pattern legacy intact pour référence).

L'embed JS lui-même ne vit PAS ici (il est dans le repo séparé [`yeekai-embed-js`](https://github.com/AlAmine-dot/yeekai-embed-js), déployé sur Vercel à `https://yeekai-embed-js.vercel.app/v1/embed.js`).

Un repo parmi 5 dans l'écosystème Yeekai — cf [`yeebot-2.0/ECOSYSTEM.md`](https://github.com/AlAmine-dot/yeebot-2.0/blob/yeebot-v2/ECOSYSTEM.md) pour la vue d'ensemble.

---

## Démarrage rapide

| Tu es... | Lis en premier |
|---|---|
| **CTO / nouveau dev** sur l'écosystème complet | [`yeebot-2.0/ECOSYSTEM.md`](https://github.com/AlAmine-dot/yeebot-2.0/blob/yeebot-v2/ECOSYSTEM.md) puis [`ONBOARDING.md`](ONBOARDING.md) |
| **Dev** qui veut comprendre le pattern clone + injection | [`ONBOARDING.md`](ONBOARDING.md) directement |
| Tu veux **ajouter un nouveau clone prospect** | [`templates/SCAFFOLD_TENANT_CLONE.md`](templates/SCAFFOLD_TENANT_CLONE.md) |

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

## Clones disponibles

| Slug | Site cible | HTML | Taille | Status | URL Pages |
|---|---|---|---|---|---|
| `esmt` (musée) | [esmt.sn](https://www.esmt.sn) | — | — | Pattern legacy, intact comme exemple historique | [Pages](https://alamine-dot.github.io/esmt-rita-demo/) |
| `bakeli` | [bakeli.tech](https://www.bakeli.tech) | 228 | ~40 Mo | ✅ Tenant en DB, agent Khady opérationnel | [Pages](https://alamine-dot.github.io/esmt-rita-demo/bakeli-clone/) |
| `breedj` | [breedj.com](https://www.breedj.com) | 1454 | ~959 Mo | ✅ Tenant en DB, front IA opérationnel | [Pages](https://alamine-dot.github.io/esmt-rita-demo/breedj-clone/) |
| `legrandfrere` | [legrandfrere.africa](https://legrandfrere.africa) | 871 | ~484 Mo | 🟡 Pré-cloné, attente POC complet (commit local seulement) | — |
| `afrogroup` (clone `afrodemy-clone/`) | [afrogroup-sn.com/fr](https://afrogroup-sn.com/fr) | 3 | ~4.3 Mo | ✅ Tenant opérationnel, agent Bassirou pack-first (3 packs B2C + 2 packs B2B) | [Pages](https://alamine-dot.github.io/esmt-rita-demo/afrodemy-clone/) |

**Légende status** :
- ✅ Tenant provisionné en DB Supabase + front IA shippé → widget fonctionnel
- 🟡 Pré-clone shippé, en attente du tenant côté backend / front IA

**Notes spéciales** :
- `afrogroup` (dossier `afrodemy-clone/`) : site Next.js avec SSR partiel. wget n'a chopé que la home + page register parce que le routing interne est client-side. Suffisant pour la démo visuelle. Pour exploration profonde du site, prévoir Playwright headless (Phase 3). Note : le dossier garde son ancien nom `afrodemy-clone/` (historique wget) mais le slug runtime est `afrogroup` (nom de l'entreprise mère, alors qu'Afrodemy est juste le produit app).
- `legrandfrere` : 484 Mo, commit local non-pushé pour ne pas saturer GitHub. Disponible en local pour la démo cold reach.

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
| `main` | État stable, suivi par Vercel + GitHub Pages auto-deploy |
| `safety/pre-subsprint-d-2026-05` | Rollback avant la migration Sub-sprint D (embed standalone) |
| `safety/pre-clone-afrodemy-2026-05` | Rollback avant le pré-clone Afrodemy |
| `feat/subsprint-d-migrate-to-standalone-embed` | Travail Sub-sprint D (mergé sur main) |
| `feat/poc-legrandfrere-clone` | Pré-clone Le Grand Frère (local seulement, 484 Mo non-pushé) |
| `feat/pre-clone-afrodemy` | Pré-clone Afrodemy (mergé sur main) |

---

## Liens

- Embed source : [github.com/AlAmine-dot/yeekai-embed-js](https://github.com/AlAmine-dot/yeekai-embed-js) (à créer côté GitHub)
- CDN embed : `https://yeekai-embed-js.vercel.app/v1/embed.js` (Vercel à connecter)
- Front IA (iframe target) : [`yeekai-embed-ai-front`](https://yeekai-embed-ai-front.vercel.app)
- Backend tenants config : [`yeebot-2.0`](https://yeebot-2-0.onrender.com) → endpoint `/api/tenants/<slug>/config`
