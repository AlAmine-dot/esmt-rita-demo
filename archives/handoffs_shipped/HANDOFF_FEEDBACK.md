# Feedback Sub-sprint D — Embed JS standalone

Salut,

J'ai relu le handoff `HANDOFF_SUBSPRINT_D_EMBED_JS_STANDALONE.md` en intégralité et vérifié l'état réel du repo + l'API en prod. Le doc est **solide à 90%** : précédence config carrée, fail-soft bien pensé, idempotence du script Python prévue, pitfalls réels identifiés. Vraiment du bon boulot.

Voici les **points à ajuster** avant qu'on lance le code. Trois catégories : une décision archi qui change la trajectoire, des incohérences techniques à fixer, et quelques ajouts UX/dev.

---

## 1. Décision archi — Le client veut un repo séparé

C'est le point qui change le plus de choses : @AlAmine veut **isoler l'embed dans un repo dédié**, pas un sous-dossier de `esmt-rita-demo`.

> *"ça ne doit pas rester dans le même repository que là où on gère les clones"*

Le handoff actuel recommande Option B (tout dans `esmt-rita-demo`) ou Option A (sous-dossier `embed-dist/` du même repo). Les deux ne conviennent pas.

**Structure que je propose** :

| Repo | Contenu | Déploiement |
|---|---|---|
| **`yeekai-embed-js`** (nouveau) | `embed.js`, `vercel.json`, `README.md`, `examples/` (1-2 HTML de démo) | Vercel standalone → `https://yeekai-embed.vercel.app/v1/embed.js` |
| **`esmt-rita-demo`** (existant) | Clones (esmt, bakeli, breedj, futurs), `scripts/inject_embed.py` qui pointe vers la CDN URL externe | Inchangé |

**Bénéfices** :
- Bumper l'embed est indépendant du push des clones (qui sont lourds — breedj fait 959 Mo)
- Cache CDN globalement plus clean (un sous-domaine dédié)
- Le repo embed peut être confié/auditer/open-sourcer sans exposer les clones démo
- Le déploiement Vercel sur le sous-dossier `embed-dist/` aurait été un cheval de Troie : à chaque push du clone Bakeli (HTML, images), build Vercel inutile sur l'embed

**Conséquences sur ton handoff** :
- Step 5 entièrement à réécrire (deploy = nouveau projet Vercel pointant sur le nouveau repo)
- Step 6 plus léger (on supprime juste les legacy de `esmt-rita-demo`, l'embed naît directement propre dans son repo)
- Le `scripts/inject_embed.py` reste dans `esmt-rita-demo` (il agit sur les clones, pas sur l'embed), mais il accepte `--embed-cdn` qui pointe vers le nouveau Vercel

---

## 2. Incohérences techniques à fixer

### a. Chemin CDN mélangé

Le doc est inconsistant :
- Architecture diagram (l.89) : `embed.yeekaidemo.cloud/v1/embed.js`
- vercel.json (l.542) : configure les deux (`/embed.js` ET `/v1/embed.js`)
- Done criteria (l.601) : `curl …/embed.js` tout court

→ **Trancher une fois** : je propose `/v1/embed.js` (versioning explicite, on pourra publier `/v2/` lors d'un breaking change sans casser les clients existants).

### b. Regex legacy script trop strict (Step 4)

```python
LEGACY_SCRIPT_PATTERN = re.compile(
    r'<script\\s+src="\\.\\./(?:bakeli-config|...)\\.js">...',
    re.IGNORECASE,
)
```

Le pattern ne match que les pages à **profondeur 1** (`../bakeli-config.js`). Or `breedj-clone/` a des pages à profondeur 3-4 où le src devient `../../../bakeli-config.js`. Le script va manquer ces cas.

→ Pattern plus tolérant :
```python
r'<script[^>]*src="[^"]*(bakeli-config|breedj-config|config|app)\.js"[^>]*>\s*</script>\s*'
```

### c. Échappes markdown dans le code Python

Tous les `\\s+` dans tes blocs Python sont doublés à cause du rendu markdown. L'agent qui transcrit doit penser à n'en garder qu'un seul (`\s+`) dans le vrai fichier. À mentionner explicitement OU réécrire en bloc-fence sans doublage.

### d. Volumes sous-estimés dans les Done criteria

- Doc dit `~30 HTML files` pour bakeli-clone → **réel = 228** (7× plus)
- Doc dit `~500 HTML files` pour breedj-clone → **réel = 1454** (3× plus)

Vérifié à la commande :
```bash
$ find breedj-clone -name "*.html" | wc -l
1454
$ find bakeli-clone -name "*.html" | wc -l
228
```

→ Le script Python doit gérer 1454 fichiers. Sur ma machine en local le test dry-run prend ~1.5s, donc pas un blocker, mais le done criterion "bien tester" mérite un benchmark explicite (genre < 5s sur breedj).

---

## 3. Ajouts UX / dev que je propose

### a. FAB en rendering optimiste (race condition avec le fetch)

Aujourd'hui le doc dit :
```js
async function init() {
  if (config.tenantId && !config.skipAutoFetch) {
    const fromAPI = await fetchTenantConfigFromAPI(...);  // ← peut prendre 3s
    config = Object.assign(...);
  }
  // ... rendering FAB ...
}
```

Conséquence : pendant **1 à 3 secondes**, AUCUN widget n'est visible. Si l'utilisateur arrive sur la page et clique vite, il rate Yeekai.

**Fix** : render le FAB IMMÉDIATEMENT avec defaults + `data-*`, puis mettre à jour `style.background`, `img.src` (avatar), etc. quand l'API répond. Le FAB est visible dès t=0, et "se peint aux couleurs du tenant" au moment du `then`.

### b. `data-debug="true"` mode verbose

Sur les sites clients (ESMT, Bakeli, Breedj, futurs), si quelque chose foire, on n'aura pas accès à un inspecteur sous la main. Un mode debug qui log dans la console toutes les étapes (config inline lue, data-attrs lus, response API, config finale appliquée) sauvera des heures de support.

```js
const DEBUG = config.debug || script.dataset.debug === 'true';
function dbg(...args) { if (DEBUG) console.log('[yeekai-embed]', ...args); }
```

### c. Version stamp

Header commenté en haut de `embed.js` + `window.Yeekai.version = "1.0.0"`. Quand on demandera "tu charges quelle version ?", la réponse est immédiate.

### d. Customizable disclaimer text + wording neutre

Le wording actuel : `⚠️ Ceci est un clone de démo Yeekai, pas le site officiel.`

Le `⚠️` rouge alarme est anti-marketing sur une démo qu'on veut "vendeuse". Suggestion plus douce :

> *"Démo Yeekai sur clone — Site officiel →"*

Et permettre l'override via `data-disclaimer-text` au cas où.

### e. Done criterion fail-soft explicite

Tu mentionnes le fail-soft mais pas dans les Done criteria. À ajouter :

> [ ] Test : pointer `data-tenant-api-base-url` vers une URL morte (`https://dead.example.com`) → l'embed doit charger normalement avec data-* + defaults. Aucun message d'erreur bloquant côté UX, juste un `console.warn`.

---

## 4. Questions ouvertes que tu punt à @AlAmine

Le doc dit "demander @AlAmine" sur deux points — autant les trancher dans le handoff avant de coder.

### a. L'index.html racine + esmt-clone (démo ESMT historique)

Aujourd'hui utilise `styles.css` (399 lignes) + `app.js` (365 lignes) + iframe wrapper. Pas du tout le pattern embed.

**Ma proposition** : **laisser intact comme musée**. C'est l'histoire du projet, un "avant/après" qui prouve l'évolution. Conséquence pour le cleanup Step 6 : on ne supprime PAS `styles.css` ni `app.js` ni `index.html`. On supprime juste `config.js`, `bakeli-config.js`, `breedj-config.js`, `bakeli.html`, `rita-widget.css`, `khady-theme.css`.

Si @AlAmine veut migrer aussi, c'est un Sub-sprint séparé (parce que le pattern de l'embed dans index.html racine est différent de l'embed dans un clone wget — pas de wrapper iframe par exemple).

### b. Chemin CDN final

`/v1/embed.js` ou `/embed.js` ? Je propose `/v1/`. À confirmer par @AlAmine.

---

## Plan d'action proposé

1. **Toi (auteur du handoff)** : valider/contester ce feedback, mettre à jour le doc avec les corrections (struct repo, regex, volumes, ajouts UX, questions tranchées).
2. **Moi (agent)** : une fois le doc updated, je peux soit :
   - Réécrire la version finale du doc pour faire matcher avec la nouvelle archi
   - Passer direct au code : init du repo `yeekai-embed-js`, migration embed.js, config Vercel, puis `scripts/inject_embed.py` côté `esmt-rita-demo`

@AlAmine, à toi de décider de l'ordre.

Cordialement,
— L'agent qui a fait le review
