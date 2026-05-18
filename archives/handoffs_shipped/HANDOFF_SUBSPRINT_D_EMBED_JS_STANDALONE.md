# Handoff — Sub-sprint D : Embed JS standalone (repo dédié) + migration clones

> 🎯 **Objectif** : créer un nouveau repo `yeekai-embed-js` qui contient uniquement l'embed JS réutilisable, déployé sur CDN à `/v1/embed.js`. Migrer les clones de `esmt-rita-demo` du système legacy (`app.js` + `*-config.js`) vers ce nouvel embed via 1 script tag avec `data-*` attributes + fetch tenant config depuis `yeebot-2.0/api/tenants/<slug>/config` (déjà shippé Sub-sprint 0).
>
> **Pour qui** : agent dédié au chantier embed. Ce sub-sprint **touche 2 repos** :
> - `yeekai-embed-js` (à **CRÉER**) — l'embed lui-même + déploiement Vercel
> - `esmt-rita-demo` (existant, branche `main`) — script d'injection + migration clones + cleanup legacy
>
> **Effort estimé** : ~3-4 jours.
>
> **Pré-requis** :
> - ✅ Sub-sprint 0 **mergé et déployé** sur Render. Vérifié via curl `https://yeebot-2-0.onrender.com/api/tenants/breedj/config` qui retourne du JSON safe.
> - Domaine `yeekaidemo.cloud` acheté (vérification DNS Resend en cours, indépendant de ce sub-sprint).
> - Pas de dépendance sur Sub-sprint A/B/C — **parallélisable** (consomme uniquement l'endpoint public Sub-sprint 0).
>
> **Référence plan global** : [yeebot-2.0/MVP_FINAL_SPRINT_PROBABLY.MD](../yeebot-2.0/MVP_FINAL_SPRINT_PROBABLY.MD) section "Sub-sprint D".
> **Référence Sub-sprint 0** : [yeebot-2.0/HANDOFF_SUBSPRINT_0_FOUNDATION_TENANTS.md](../yeebot-2.0/HANDOFF_SUBSPRINT_0_FOUNDATION_TENANTS.md) — l'endpoint que tu consommes.

---

## ⚠️ Step #0 obligatoires — Safety branches

### Pour `esmt-rita-demo` (existant)

```bash
cd /Users/admin/StudioProjects/esmt-rita-demo
git fetch origin
git checkout main
git pull origin main
git checkout -b safety/pre-subsprint-d-2026-05
git push -u origin safety/pre-subsprint-d-2026-05
git checkout main
git checkout -b feat/subsprint-d-migrate-to-standalone-embed
```

### Pour `yeekai-embed-js` (nouveau repo)

Pas besoin de safety branch (le repo n'existe pas encore). À créer côté GitHub :

```bash
# 1. Sur GitHub : créer un repo vide "yeekai-embed-js" sous le même org/user
#    que les autres repos Yeekai (AlAmine-dot). Privé pour l'instant (on
#    pourra le rendre public plus tard si on veut open-sourcer).
# 2. Cloner en local :
cd ~/Documents/GitHub  # ou ~/StudioProjects selon ta convention
git clone git@github.com:AlAmine-dot/yeekai-embed-js.git
cd yeekai-embed-js
```

→ La safety branch `pre-multitenancy-baseline-2026-05` existante sur `esmt-rita-demo` (créée avant Sub-sprint 0) reste aussi un filet de secours.

---

## Pourquoi le repo séparé

Décision @AlAmine validée : **l'embed ne doit pas vivre dans le repo des clones**. Raisons :

| Critère | Repo séparé (✅ choix) | Sous-dossier de esmt-rita-demo (rejeté) |
|---|---|---|
| Cycle de release | Bumper embed indépendant des clones (qui sont lourds — breedj-clone = ~959 Mo) | Chaque push de clone trigger un Vercel build inutile sur embed |
| Cache CDN | Sous-domaine dédié, headers cache-control faciles à régler globalement | Mélangé avec les assets des clones |
| Audit / sharing | Repo embed peut être confié/open-sourcé sans exposer les clones démo (qui ont des questions légales) | Tout couplé |
| Lisibilité | 1 repo = 1 responsabilité claire | Surcharge cognitive |

---

## État actuel — vérifié

J'ai inspecté le repo `esmt-rita-demo`. Voici les faits précis (différents de ce que `README.md` pourrait suggérer en surface) :

### Le système qui TOURNE actuellement (legacy)

Les clones Bakeli et Breedj utilisent le pattern suivant (vérifié dans `bakeli-clone/index.html:1751-1752` et `breedj-clone/index.html:2243-2244`) :

```html
<!-- Dans chaque clone HTML, vers la fin du <body> : -->
<script src="../bakeli-config.js"></script>
<script src="../app.js"></script>
```

⚠️ **Profondeurs variables** : les clones contiennent des HTML à profondeurs 1 à 4. Par exemple `breedj-clone/blog/some-article/index.html` a un chemin relatif `../../../app.js` (3 niveaux up). Le script d'injection (Step 4) doit gérer toutes les profondeurs.

Fichiers legacy en jeu :
- **`app.js`** (365 lignes) — logique panneau Rita (FAB + iframe + teaser), lit `window.FLUTTER_APP_URL`
- **`config.js`** (5 lignes) — `window.FLUTTER_APP_URL` pour clone ESMT
- **`bakeli-config.js`** (5 lignes) — idem pour Bakeli (URL Cloudflare Workers, legacy Flutter)
- **`breedj-config.js`** (8 lignes) — idem pour Breedj (URL Vercel front IA actuel)
- **`bakeli.html`** (10 lignes) — page racine qui redirige vers `bakeli-clone/index.html`
- **`styles.css`** (372 lignes) — styles partagés démo ESMT
- **`rita-widget.css`** (399 lignes) — styles widget legacy
- **`khady-theme.css`** (14 lignes) — overrides Bakeli theme

### Le fichier `embed.js` existant (396 lignes)

⚠️ **Découverte importante** : `embed.js` existe dans `esmt-rita-demo/embed.js`. Bien structuré, lit `window.YeekaiConfig` avec les clés (tenantId, iaName, iaAvatar, primaryColor, secondaryColor, appUrl, teaserText, teaserDelay, teaserPersistDismiss, mobileBreakpoint, fabSize). FAB + panel + teaser + iframe + scroll lock mobile + API publique `window.Yeekai.{open, close, isOpen}`.

**MAIS** : `grep -rn "embed.js"` sur les HTML retourne **0 résultat**. C'est du code mort — un refactor entamé jamais finalisé.

→ **Ton boulot Sub-sprint D** :
1. **Copier ce `embed.js`** comme base dans le nouveau repo `yeekai-embed-js`
2. **Le finaliser** (data-* attrs, fetch DB, disclaimer, debug, version stamp, optimistic render)
3. **Déployer** sur Vercel à `https://<projet-vercel>.vercel.app/v1/embed.js`
4. **Migrer les clones** `esmt-rita-demo/{bakeli,breedj}-clone/` du legacy vers le nouvel embed via script Python
5. **Cleanup** les fichiers legacy périphériques

### Volumes RÉELS des clones (vérifiés)

| Clone | HTML files | Décision |
|---|---|---|
| `bakeli-clone` | **228** files | Tous à migrer via script |
| `breedj-clone` | **1454** files | Tous à migrer via script (perf benchmark < 5s requis) |
| `esmt-clone` | (inchangé) | **Pas migrer** — la démo ESMT historique reste comme "musée" |

→ Le `inject_embed.py` doit gérer 1454 fichiers en quelques secondes. Lecture/écriture séquentielle suffit (pas besoin de paralléliser).

---

## Architecture cible

```
┌──────────────────────────────────────────────────────────────────────┐
│ Repo: yeekai-embed-js (NOUVEAU)                                       │
│ ─────────────────────────────                                         │
│ embed.js (vanilla JS) + vercel.json + README + examples/              │
│ Déployé sur Vercel → https://yeekai-embed-js.vercel.app/v1/embed.js   │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ servi en CDN avec Cache-Control 1h
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Site cloné (bakeli-clone, breedj-clone, futur volkeno-clone…)         │
│                                                                       │
│ <script                                                               │
│   src="https://yeekai-embed-js.vercel.app/v1/embed.js"                │
│   data-tenant="breedj"                                                │
│   data-app-url="https://yeekai-embed-ai-front.vercel.app/breedj"      │
│   data-disclaimer-target="https://breedj.com"                         │
│   async></script>                                                     │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ 1 fetch initial (cached 5min)
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│ yeebot-2.0/api/tenants/breedj/config (déjà en prod)                  │
│ → JSON safe: { logo_url, primary_color, agent_name, ... }            │
└──────────────────────────────────────────────────────────────────────┘
```

**Précédence de configuration** (du plus prioritaire au moins prioritaire) :
1. `window.YeekaiConfig = {...}` (inline en page, override total — dev/staging)
2. `data-*` attributes sur le script tag (config principale, lue dans HTML)
3. Fetch DB `/api/tenants/<slug>/config` (fallback automatique pour les champs manquants)
4. Defaults hardcoded dans embed.js (filet de sécurité ultime)

---

## Implémentation — Step by step

### Step 1 — Bootstrap du nouveau repo `yeekai-embed-js`

Structure minimale :

```
yeekai-embed-js/
├── embed.js                  ← le code principal (port + extensions de l'existant)
├── vercel.json               ← config Vercel (headers cache + CORS)
├── README.md                 ← usage + 3 examples (data-attrs, window.YeekaiConfig, debug mode)
├── .gitignore                ← node_modules, .vercel, etc. (au cas où)
└── examples/
    ├── minimal.html          ← exemple 1 script tag avec data-tenant
    ├── full-config.html      ← exemple avec window.YeekaiConfig override
    └── debug.html            ← exemple avec data-debug
```

Copier `embed.js` depuis `esmt-rita-demo/embed.js` (396 lignes) comme point de départ, puis appliquer toutes les modifications des Steps 2-5.

### Step 2 — Header version + debug mode

**Tout en haut** de `embed.js`, remplacer le header existant par :

```javascript
/**
 * Yeekai Embed Widget
 * Version: 1.0.0
 * Built:   2026-05-XX
 *
 * Single-file vanilla JS embed pour intégrer un agent IA Yeekai sur
 * n'importe quel site. 0 dépendance runtime.
 *
 * USAGE MINIMAL (recommended):
 *   <script src="https://yeekai-embed-js.vercel.app/v1/embed.js"
 *           data-tenant="breedj"
 *           data-app-url="https://yeekai-embed-ai-front.vercel.app/breedj"
 *           data-disclaimer-target="https://breedj.com"
 *           async></script>
 *
 * USAGE AVANCÉ (override programmatique, pour dev/staging) :
 *   <script>
 *     window.YeekaiConfig = {
 *       tenantId: 'breedj',
 *       primaryColor: '#FF0000',  // override visuel
 *       skipAutoFetch: true,       // pas de fetch DB
 *     };
 *   </script>
 *   <script src="..." async></script>
 *
 * PRÉCÉDENCE config (du plus prioritaire au moins) :
 *   1. window.YeekaiConfig (inline) — wins all
 *   2. data-* attributes sur le script tag
 *   3. Fetch DB /api/tenants/<slug>/config (auto)
 *   4. Defaults hardcoded ci-dessous
 *
 * DEBUG : ajouter data-debug="true" pour console.log des étapes de boot.
 *
 * API publique post-load : window.Yeekai.{open, close, isOpen, version, config}
 */
```

**Près du début de l'IIFE**, ajouter le debug helper :

```javascript
// Lu dès le départ pour permettre le log même de la phase "lecture config"
function readScriptTag() {
  const scripts = document.querySelectorAll('script[src*="embed.js"]');
  return scripts[scripts.length - 1] || null;
}

const scriptTag = readScriptTag();
const DEBUG_MODE = (
  (window.YeekaiConfig && window.YeekaiConfig.debug) ||
  (scriptTag && scriptTag.dataset.debug === 'true')
);
function dbg(...args) {
  if (DEBUG_MODE) console.log('[yeekai-embed]', ...args);
}

dbg('boot', { version: '1.0.0' });
```

**À la toute fin de l'IIFE**, exposer la version dans `window.Yeekai` :

```javascript
window.Yeekai = {
  open: open,
  close: close,
  isOpen: () => panel.classList.contains('is-open'),
  config: () => ({ ...config }),
  version: '1.0.0',
};
```

### Step 3 — Lecture data-* attributes

**Aujourd'hui** (lignes 24-40 de embed.js, à remplacer) : config uniquement depuis `window.YeekaiConfig`.

**Nouveau code** :

```javascript
function pickDefined(obj) {
  const out = {};
  for (const k in obj) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

function readDataAttrs() {
  if (!scriptTag) return {};
  return {
    tenantId: scriptTag.dataset.tenant,
    appUrl: scriptTag.dataset.appUrl,
    iaName: scriptTag.dataset.iaName,
    iaAvatar: scriptTag.dataset.iaAvatar,
    primaryColor: scriptTag.dataset.primaryColor,
    secondaryColor: scriptTag.dataset.secondaryColor,
    teaserText: scriptTag.dataset.teaserText,
    disclaimerTarget: scriptTag.dataset.disclaimerTarget,
    disclaimerText: scriptTag.dataset.disclaimerText,  // override wording optionnel
    tenantApiBaseUrl: scriptTag.dataset.tenantApiBaseUrl,
    skipAutoFetch: scriptTag.dataset.skipAutoFetch === 'true',
  };
}

const fromScriptTag = pickDefined(readDataAttrs());
let config = Object.assign({}, defaults, fromScriptTag, window.YeekaiConfig || {});
dbg('config lu', { fromScriptTag, fromWindow: window.YeekaiConfig, merged: config });
```

⚠️ `config` devient `let` (re-merge avec fetch DB au Step 5).

### Step 4 — Rendering optimiste du FAB + disclaimer

**Important UX** : ne PAS attendre le fetch DB pour render. Sinon pendant 1-3s, le FAB est invisible et l'user peut rater Yeekai.

**Approche** : render IMMÉDIATEMENT avec `config` actuel (defaults + data-* + inline), puis patcher au moment du fetch DB.

Le code de rendering existant dans `embed.js` (création du `style`, `fab`, `panel`, etc.) doit être placé **AVANT** `await fetchTenantConfigFromAPI(...)`. La fonction async `applyTenantConfig(fromAPI)` met à jour les éléments DOM après coup.

**Patch DOM après fetch DB** (à coder, n'existe pas dans embed.js actuel) :

```javascript
function applyTenantConfigFromAPI(fromAPI) {
  // fromAPI = { iaName, iaAvatar, primaryColor, disclaimerTarget }
  // Ne s'applique que sur les fields que data-* / window.YeekaiConfig
  // n'ont pas déjà fourni.
  for (const key in fromAPI) {
    if (fromAPI[key] && config[key] === defaults[key]) {
      // Le field est resté au default = pas surchargé inline → on prend l'API
      config[key] = fromAPI[key];
    }
  }
  dbg('config patched from API', config);

  // Repaint le FAB avec les nouvelles valeurs visuelles
  if (config.iaAvatar) {
    const fabImg = fab.querySelector('img');
    if (fabImg) fabImg.src = config.iaAvatar;
  }
  // Le primaryColor est dans le CSS injecté en string — pour le patch on
  // peut soit (a) injecter un <style> override, soit (b) appliquer
  // directement style.background sur les éléments concernés.
  if (config.primaryColor) {
    document.querySelector('#yk-fab')?.style.setProperty('background', config.primaryColor);
    document.querySelector('.yk-panel-header')?.style.setProperty('background', config.primaryColor);
    // ... toute autre élément qui dépend de primaryColor
  }
  if (config.disclaimerTarget && !document.querySelector('#yk-disclaimer')) {
    // Le disclaimer n'avait pas été injecté (pas de target initial) → on l'ajoute maintenant
    injectDisclaimer();
  }
}
```

→ **Trade-off** : visuellement, on peut voir le FAB "se peindre" 1-2s après le load (passage de la couleur default `#0066cc` à celle du tenant). C'est acceptable et même rassurant ("ah Yeekai a chargé sa config"). Si plus tard tu veux éliminer ce flicker, soit (1) cacher le FAB jusqu'au fetch resolved, soit (2) inliner la config dans le script tag (data-primary-color suffit, pas besoin de fetch).

### Step 5 — Auto-fetch tenant config depuis l'API yeebot-2.0

```javascript
async function fetchTenantConfigFromAPI(tenantId, baseUrl) {
  const base = baseUrl || 'https://yeebot-2-0.onrender.com';
  const url = `${base}/api/tenants/${tenantId}/config`;
  dbg('fetching', url);
  try {
    const resp = await fetch(url, {
      // 3s timeout : si l'API est lente/down, on ne bloque pas le widget
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) {
      dbg('fetch non-OK', resp.status);
      return {};
    }
    const data = await resp.json();
    dbg('fetch response', data);
    // Map API snake_case → embed.js camelCase
    return pickDefined({
      iaName: data.agent_name,
      iaAvatar: data.agent_avatar_widget_url,  // version "widget" sur le FAB
      primaryColor: data.primary_color,
      disclaimerTarget: data.site_url,  // fallback : le site_url officiel
      // `appUrl` n'est PAS dans la response API (volontairement).
      // L'app URL doit toujours venir du data-attribute (= URL Vercel du
      // front IA). On laisse pas le backend décider de l'URL frontend.
    });
  } catch (err) {
    console.warn('[yeekai-embed] fetch tenant config failed — using local config only', err);
    return {};
  }
}

// Init flow :
async function bootFetch() {
  if (!config.tenantId || config.skipAutoFetch) {
    dbg('skip auto-fetch', { tenantId: config.tenantId, skipAutoFetch: config.skipAutoFetch });
    return;
  }
  const fromAPI = await fetchTenantConfigFromAPI(config.tenantId, config.tenantApiBaseUrl);
  if (Object.keys(fromAPI).length > 0) {
    applyTenantConfigFromAPI(fromAPI);
  }
}

// Lancer en arrière-plan, ne pas await — le FAB est déjà render
bootFetch();
```

→ **Important** : `bootFetch()` n'est PAS `await`. Le rendering du FAB s'est déjà fait au-dessus. C'est ça l'optimisme.

### Step 6 — Disclaimer widget (avec wording adoucissant + customizable)

**Nouveau bloc** dans `embed.js`, appelé après le rendering du FAB :

```javascript
function injectDisclaimer() {
  if (!config.disclaimerTarget) return;

  // Si dismissé récemment, skip
  try {
    if (localStorage.getItem('yk-disclaimer-dismissed-v1') === '1') return;
  } catch {}

  const customText = config.disclaimerText;  // override possible via data-disclaimer-text
  const defaultText = 'Démo Yeekai sur clone';  // adouci, pas alarmant
  const text = customText || defaultText;

  const wrapper = document.createElement('div');
  wrapper.id = 'yk-disclaimer';
  wrapper.setAttribute('role', 'note');
  wrapper.innerHTML = `
    <span class="yk-disclaimer-text">${escapeHtml(text)}</span>
    <a class="yk-disclaimer-link" href="${escapeAttr(config.disclaimerTarget)}"
       target="_blank" rel="noopener noreferrer">
      Site officiel <span aria-hidden="true">→</span>
    </a>
    <button class="yk-disclaimer-close" type="button" aria-label="Fermer">×</button>
  `;
  document.body.appendChild(wrapper);

  wrapper.querySelector('.yk-disclaimer-close').addEventListener('click', () => {
    wrapper.remove();
    try { localStorage.setItem('yk-disclaimer-dismissed-v1', '1'); } catch {}
  });
}

// Helpers d'escape pour la sécurité (le texte est customizable via attribute)
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
```

**CSS** (à intégrer dans le bloc `style.textContent` existant de embed.js) :

```css
#yk-disclaimer {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483645;  /* sous le FAB (2147483646) mais au-dessus du site */
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  font: 12px/1.4 system-ui, -apple-system, sans-serif;
  color: #1f2937;
  max-width: calc(100vw - 32px);
  backdrop-filter: blur(8px);
}
.yk-disclaimer-text { white-space: nowrap; }
.yk-disclaimer-link {
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;
}
.yk-disclaimer-link:hover { text-decoration: underline; }
.yk-disclaimer-close {
  background: transparent;
  border: 0;
  color: #6b7280;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 4px;
}
.yk-disclaimer-close:hover { color: #1f2937; }
@media (max-width: 640px) {
  #yk-disclaimer {
    bottom: 8px;
    font-size: 11px;
    padding: 6px 10px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .yk-disclaimer-text { white-space: normal; }
}
```

### Step 7 — Vercel config dans `yeekai-embed-js`

**Fichier** : `vercel.json` à la racine du nouveau repo :

```json
{
  "headers": [
    {
      "source": "/v1/embed.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=3600, s-maxage=3600" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/embed.js",
      "destination": "/v1/embed.js",
      "permanent": false
    }
  ]
}
```

→ Le redirect `/embed.js → /v1/embed.js` évite que les anciens script tags codés sans `/v1/` plantent. Permanent: false pour pouvoir le retirer plus tard.

⚠️ **Setup Vercel project** : sur https://vercel.com/new → connecter le nouveau repo GitHub `yeekai-embed-js`. Aucun framework, root directory = `/`. Le projet va servir `embed.js` au path `/embed.js` ET `/v1/embed.js` (via le redirect).

⚠️ **Subdomain custom** (optionnel post-MVP) : si @AlAmine veut `https://embed.yeekaidemo.cloud/v1/embed.js`, ajouter le domaine custom dans Vercel project settings + créer un CNAME dans Namecheap DNS qui pointe `embed.yeekaidemo.cloud → cname.vercel-dns.com`. Pas obligatoire pour MVP, l'URL `*.vercel.app` marche pour les clones démo.

### Step 8 — Script d'injection automatique côté `esmt-rita-demo`

**Nouveau fichier** : `esmt-rita-demo/scripts/inject_embed.py`

```python
#!/usr/bin/env python3
"""Injecte le script tag Yeekai Embed dans tous les HTML d'un clone.

Idempotent : si le clone contient déjà notre snippet, skip ce fichier
(sauf pour stripper du legacy si présent).

À lancer après chaque clone wget d'un nouveau site.

Usage:
    python scripts/inject_embed.py \\
        --clone-dir bakeli-clone \\
        --tenant bakeli \\
        --app-url https://yeekai-embed-ai-front.vercel.app/bakeli \\
        --disclaimer-target https://bakeli.tech \\
        [--embed-cdn https://yeekai-embed-js.vercel.app/v1/embed.js]

Le script supprime aussi les anciens snippets legacy (app.js + *-config.js)
quand il les trouve, peu importe la profondeur du chemin relatif. La
migration vers le nouveau embed.js est ainsi automatique.
"""
from __future__ import annotations

import argparse
import re
import time
from pathlib import Path

DEFAULT_CDN_URL = "https://yeekai-embed-js.vercel.app/v1/embed.js"

EMBED_SNIPPET_TEMPLATE = """
<!-- Yeekai Embed (injected by scripts/inject_embed.py) -->
<script src="{cdn_url}"
        data-tenant="{tenant}"
        data-app-url="{app_url}"
        data-disclaimer-target="{disclaimer_target}"
        async></script>
<!-- End Yeekai Embed -->
"""

# Pattern tolérant : matche n'importe quelle profondeur (../app.js,
# ../../app.js, ../../../app.js, etc.) ET capture les attributs additionnels
# du tag (type="...", crossorigin, etc.) sans casser.
LEGACY_SCRIPT_PATTERN = re.compile(
    r'<script[^>]*src="[^"]*(?:bakeli-config|breedj-config|config|app)\.js"[^>]*>\s*</script>\s*',
    re.IGNORECASE,
)

# Pattern pour détecter notre embed déjà injecté (idempotence)
ALREADY_INJECTED_MARKER = "Yeekai Embed (injected by"


def process_html(
    html_path: Path,
    tenant: str,
    app_url: str,
    disclaimer_target: str,
    cdn_url: str,
) -> tuple[bool, list[str]]:
    """Returns (modified, changes_log)."""
    content = html_path.read_text(encoding="utf-8")
    changes = []

    # 1. Strip legacy scripts (app.js + *-config.js, toutes profondeurs)
    matches_legacy = LEGACY_SCRIPT_PATTERN.findall(content)
    if matches_legacy:
        content = LEGACY_SCRIPT_PATTERN.sub("", content)
        changes.append(f"removed {len(matches_legacy)} legacy script tag(s)")

    # 2. Skip si déjà injecté
    if ALREADY_INJECTED_MARKER in content:
        if matches_legacy:
            html_path.write_text(content, encoding="utf-8")
            return True, changes + ["legacy stripped, embed already present"]
        return False, []

    # 3. Inject le snippet avant </body> (fallback : avant </html>)
    snippet = EMBED_SNIPPET_TEMPLATE.format(
        cdn_url=cdn_url,
        tenant=tenant,
        app_url=app_url,
        disclaimer_target=disclaimer_target,
    )
    if "</body>" in content:
        content = content.replace("</body>", f"{snippet}\n</body>", 1)
    elif "</html>" in content:
        content = content.replace("</html>", f"{snippet}\n</html>", 1)
    else:
        content = content + snippet

    html_path.write_text(content, encoding="utf-8")
    changes.append("embed injected")
    return True, changes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--clone-dir", required=True, type=Path)
    parser.add_argument("--tenant", required=True)
    parser.add_argument("--app-url", required=True)
    parser.add_argument("--disclaimer-target", required=True)
    parser.add_argument("--embed-cdn", default=DEFAULT_CDN_URL)
    parser.add_argument("--quiet", action="store_true", help="Print only summary")
    args = parser.parse_args()

    if not args.clone_dir.is_dir():
        raise SystemExit(f"Not a directory: {args.clone_dir}")

    html_files = list(args.clone_dir.rglob("*.html"))
    if not html_files:
        raise SystemExit(f"No .html files found in {args.clone_dir}")

    print(f"Found {len(html_files)} HTML files in {args.clone_dir}")
    print(f"Tenant: {args.tenant}, app_url: {args.app_url}")
    print(f"CDN: {args.embed_cdn}")
    print()

    t0 = time.monotonic()
    modified = 0
    for f in html_files:
        rel = f.relative_to(args.clone_dir)
        was_modified, changes = process_html(
            f, args.tenant, args.app_url, args.disclaimer_target, args.embed_cdn,
        )
        if was_modified:
            modified += 1
            if not args.quiet:
                print(f"  ✓ {rel} — {'; '.join(changes)}")

    elapsed = time.monotonic() - t0
    print()
    print(f"Done: {modified}/{len(html_files)} files modified in {elapsed:.2f}s")


if __name__ == "__main__":
    main()
```

⚠️ **Important sur les `\s+`** : dans le code Python ci-dessus, les regex utilisent un **seul** backslash devant `s` (`\s+`), pas double. Si tu copies-colles depuis un viewer Markdown qui doublerait les escapes, vérifie que ton fichier `.py` final a bien `r'\s+'` et pas `r'\\s+'`. Test rapide : `python -c "import re; print(re.match(r'\s+', '   '))"` doit retourner un match.

**Usage post-Sub-sprint D** :

```bash
cd esmt-rita-demo

# Bakeli (228 HTML files attendus)
python scripts/inject_embed.py \
    --clone-dir bakeli-clone \
    --tenant bakeli \
    --app-url https://yeekai-embed-ai-front.vercel.app/bakeli \
    --disclaimer-target https://bakeli.tech

# Breedj (1454 HTML files attendus)
python scripts/inject_embed.py \
    --clone-dir breedj-clone \
    --tenant breedj \
    --app-url https://yeekai-embed-ai-front.vercel.app/breedj \
    --disclaimer-target https://breedj.com
```

### Step 9 — Cleanup legacy côté `esmt-rita-demo`

**À supprimer** après validation visuelle des clones bakeli + breedj migrés :

```bash
git rm config.js bakeli-config.js breedj-config.js bakeli.html
git rm rita-widget.css khady-theme.css
```

⚠️ **À GARDER intacts** (décision @AlAmine — musée de la démo ESMT historique) :
- `index.html` racine — page démo ESMT avec iframe + FAB legacy
- `styles.css` — styles utilisés par index.html
- `app.js` — logique de cette page (l'index racine utilise toujours window.FLUTTER_APP_URL via... attendre, vérifier au moment du cleanup si l'index.html racine référence encore `config.js`. Si oui, soit on update l'index pour pointer ailleurs, soit on garde config.js. À décider à l'exécution.)
- `esmt-clone/` — clone HTML de www.esmt.sn

⚠️ **Cas particulier de l'index.html racine** :

Aujourd'hui `index.html` racine (la "page démo ESMT historique") utilise `app.js` + `styles.css` + `rita-widget.css` + `config.js`. Si on supprime `rita-widget.css` et `config.js`, la page démo casse.

**Options** :
1. **Garder tous les legacy pour le musée** : ne supprimer aucun fichier, juste ajouter le nouvel embed.js dans yeekai-embed-js. Trade-off : repo encombré.
2. **Migrer aussi l'index.html racine** : faire pointer index.html sur le nouvel embed (cas `esmt`). Trade-off : 30 min de boulot supplémentaire.
3. **Supprimer le musée** : retirer index.html racine + esmt-clone + tous les legacy. Trade-off : on perd le passé.

→ **Recommandation** : Option 2 — migrer l'index.html racine aussi. C'est cohérent (tout le repo passe au nouveau pattern) et préserve la démo ESMT en l'incorporant à la nouvelle architecture.

Pour migrer l'index.html racine :
```bash
python scripts/inject_embed.py \
    --clone-dir . \
    --tenant yeekai \
    --app-url https://yeekai-embed-ai-front.vercel.app \
    --disclaimer-target https://www.esmt.sn
```

(Le `--clone-dir .` traite l'index.html racine. Faire attention si on a d'autres HTML racines qui ne sont pas des clones — vérifier qu'on ne touche que index.html.)

→ Si @AlAmine préfère **Option 1** (garder le musée intact), skip la migration de index.html et garde TOUS les fichiers legacy. Simplifie le sub-sprint mais alourdit le repo.

**Mettre à jour le README.md** d'`esmt-rita-demo` avec la nouvelle architecture (script d'injection, URL CDN externe, etc.).

---

## Done criteria

### Repo `yeekai-embed-js`
- [ ] Repo GitHub créé (sous AlAmine-dot, privé pour MVP)
- [ ] Repo cloné localement
- [ ] `embed.js` portée depuis `esmt-rita-demo/embed.js` + finalisé avec :
  - [ ] Header version `1.0.0` + build date + commentaire usage complet
  - [ ] `data-debug="true"` mode → `console.log` des étapes de boot
  - [ ] `window.Yeekai.version` exposé
  - [ ] `data-*` attributes lus du script tag (tenant, appUrl, primaryColor, etc.)
  - [ ] Fetch auto `/api/tenants/<slug>/config` (skippable via `data-skip-auto-fetch="true"`)
  - [ ] **Rendering optimiste** : FAB visible dès t=0 avec defaults/data-attrs, repaint depuis API au resolve
  - [ ] Disclaimer widget injectable + dismissable + override wording via `data-disclaimer-text` + wording par défaut adouci ("Démo Yeekai sur clone")
  - [ ] Escape HTML/attr sur le texte customizable du disclaimer (sécurité XSS)
  - [ ] Fail-soft sur fetch API : warn console, ne bloque pas le widget
- [ ] `vercel.json` : header Cache-Control 1h + CORS * sur `/v1/embed.js`, redirect `/embed.js → /v1/embed.js`
- [ ] `README.md` : usage + 3 examples (`minimal.html`, `full-config.html`, `debug.html`)
- [ ] `examples/` : 3 fichiers HTML dans des cas d'usage variés
- [ ] Projet Vercel connecté → déployé → URL accessible publiquement

### Tests CDN
- [ ] `curl -I https://yeekai-embed-js.vercel.app/v1/embed.js` retourne :
  - `Cache-Control: public, max-age=3600, s-maxage=3600`
  - `Access-Control-Allow-Origin: *`
  - HTTP 200
- [ ] `curl https://yeekai-embed-js.vercel.app/v1/embed.js | head -10` retourne le header avec version
- [ ] `curl -I https://yeekai-embed-js.vercel.app/embed.js` retourne 302/307 → /v1/embed.js

### Script d'injection (`esmt-rita-demo/scripts/inject_embed.py`)
- [ ] Fichier créé et exécutable
- [ ] **Regex tolérante** : matche `../app.js`, `../../app.js`, `../../../app.js` (toutes profondeurs)
- [ ] Idempotent : 2e run sans changement → 0 modifications
- [ ] Supprime les legacy `<script src="../*-config.js"></script>` ET `<script src="../app.js"></script>` tous niveaux de profondeur
- [ ] Marche sur `bakeli-clone/` (228 HTML files attendus, **vérifier le compte exact réel à l'exécution**)
- [ ] Marche sur `breedj-clone/` (1454 HTML files attendus)
- [ ] **Benchmark** : breedj-clone traité en < 5s sur une machine standard
- [ ] Log final affiche `Done: X/Y files modified in Z.ZZs`

### Migration clones
- [ ] `bakeli-clone/index.html` (et ses ~227 autres HTML) : embed.js injecté, app.js + bakeli-config.js supprimés
- [ ] `breedj-clone/index.html` (et ses ~1453 autres HTML) : embed.js injecté, app.js + breedj-config.js supprimés
- [ ] (Si Option 2) `esmt-rita-demo/index.html` racine migré
- [ ] Servir un clone en local : `python -m http.server 8080` → ouvrir le clone dans Chrome → FAB visible avec couleurs/avatar tenant fetched depuis API, disclaimer visible bas-centre, click FAB ouvre panel avec iframe app-url
- [ ] Idem pour Breedj

### Cleanup
- [ ] `config.js`, `bakeli-config.js`, `breedj-config.js`, `bakeli.html`, `rita-widget.css`, `khady-theme.css` supprimés (git rm)
- [ ] (Si Option 2) `app.js` aussi supprimé. Sinon gardé pour le musée.
- [ ] README.md `esmt-rita-demo` mis à jour avec la nouvelle architecture (lien vers `yeekai-embed-js`, instructions clone + inject)
- [ ] Aucune référence orpheline (`grep -rn "config.js\|app.js\|bakeli-config" *.html *-clone/` clean après cleanup)

### Smoke tests
- [ ] **Test fail-soft API down** : éditer un clone, mettre `data-tenant-api-base-url="https://dead.example.com"` → recharger la page → FAB visible avec defaults + data-attrs, console.warn présent, pas d'erreur bloquante UX
- [ ] **Test debug mode** : éditer un clone, ajouter `data-debug="true"` → console montre toutes les étapes de boot (script tag lu, config mergée, fetch URL, response)
- [ ] **Test 4e tenant** :
  - INSERT en DB un tenant `testco` avec `primary_color = '#FF0000'`, `agent_name = 'Testator'`, `site_url = 'https://example.com'`
  - `wget --mirror --convert-links --no-parent https://example.com` puis renommer `example.com → testco-clone`
  - `python scripts/inject_embed.py --clone-dir testco-clone --tenant testco --app-url https://yeekai-embed-ai-front.vercel.app/testco --disclaimer-target https://example.com`
  - Ouvrir le clone → FAB rouge (couleur du testco), disclaimer "Démo Yeekai sur clone — Site officiel → example.com"
- [ ] **Test ouverture WhatsApp dans iframe** : sur un clone migré, click FAB → panel s'ouvre → iframe charge correctement le front IA → quelques messages s'échangent

---

## Pièges connus

### 1. Le `<script src="..." async>` ordering

Le script Yeekai s'exécute async, donc après le DOM ready. Si tu observes un flicker visuel (page chargée sans FAB pendant 200ms), c'est normal. À l'inverse, sans `async` le script bloque le parsing HTML → impact perf. **Garde `async`**.

### 2. `dataset.tenantApiBaseUrl` requires kebab-case HTML

HTML `data-tenant-api-base-url="..."` → JS `script.dataset.tenantApiBaseUrl`. Si le HTML met `data-tenantApi` (camel), le mapping ne marche pas. Toujours kebab-case côté HTML.

### 3. CORS sur l'API tenant config

Vérifier en local :
```bash
curl -H "Origin: https://example.com" -I https://yeebot-2-0.onrender.com/api/tenants/breedj/config
# Doit retourner: access-control-allow-origin: *
```

Sub-sprint 0 a configuré le middleware CORS global (cf `yeebot-2.0/main.py:574-582`). Si KO, fix côté yeebot-2.0.

### 4. localStorage versionné

Le dismiss du disclaimer utilise `yk-disclaimer-dismissed-v1`. Si on change le wording du disclaimer plus tard et qu'on veut que les users dismissés le revoient, bumper la version à `v2`. Inclus dans le code Step 6.

### 5. CSS isolation imparfaite

Le préfixe `#yk-*` / `.yk-*` minimise les collisions mais des sites cloned très agressifs (genre `* { box-sizing: border-box !important }` global) peuvent quand même casser le rendering. Si on tombe sur ça, alternative : Shadow DOM (plus lourd). Pas pour MVP.

### 6. Race condition fetch + click rapide

Si l'user clique sur le FAB **avant** que le fetch API ait résolu, l'iframe se charge avec les defaults (pas la couleur du tenant). Acceptable — l'iframe charge le front IA Vercel qui a sa propre identité. Le panel header peut être un poil moche pendant 200ms, mais l'interaction marche.

### 7. Vercel domain custom requires DNS

Si tu veux `embed.yeekaidemo.cloud` au lieu de `*.vercel.app`, faut configurer le DNS Namecheap (CNAME → cname.vercel-dns.com). C'est une étape humaine côté @AlAmine — pas bloquant pour MVP, l'URL `.vercel.app` marche.

### 8. Le `redirect /embed.js → /v1/embed.js` peut surprendre les caches

Certains caches CDN aggressifs peuvent cacher le 302 et te bloquer si tu veux changer le redirect plus tard. Si problème, set `Cache-Control: no-store` sur la response du redirect. Pour MVP, pas grave.

---

## Hors scope Sub-sprint D

- **Refactor en TypeScript + Vite bundle** : vanilla JS pour MVP. 0 build pipeline, 0 dépendance. Bascule TS si embed.js dépasse 1000 lignes.
- **Shadow DOM isolation** : différé, pattern `#yk-*` suffit pour MVP.
- **Analytics / tracking opens/closes du widget** : différé.
- **Multi-langue du disclaimer** (FR/EN/etc) : différé, FR seul pour MVP (override via `data-disclaimer-text` permet du manuel).
- **A/B test du wording disclaimer** : différé.
- **Versioning automatique semver** : pour MVP, on tag git manuellement avant un push breaking.
- **Embed JS pour des sites client réels** (pas seulement les clones démo) : différé Phase 4. Pour l'instant l'embed est uniquement sur nos clones POC.
- **Service Worker / offline support** : différé.

---

## Tests intégration recommandés post-merge

1. **Cross-browser** : Chrome desktop, Chrome mobile (emulation Devtools), Safari iOS si possible, Firefox. Vérifier FAB, disclaimer, click → panel.

2. **CSP (Content Security Policy)** : si un clone a un `<meta http-equiv="Content-Security-Policy">` agressif, le script externe et l'iframe peuvent être bloqués. Vérifier sur `breedj-clone` qui pourrait avoir hérité d'un CSP de Breedj.com.

3. **Test 4e tenant** (cf done criteria) : prouve que le pipeline complet marche pour un nouveau tenant sans toucher au code.

4. **Test charge sur Vercel** : Vercel free tier a des limites de bandwidth. Avec 1 fetch CDN par session × N visiteurs, on devrait rester sous les limites pour MVP. Monitorer.

---

**Référence handoffs liés** :
- ✅ [yeebot-2.0/HANDOFF_SUBSPRINT_0_FOUNDATION_TENANTS.md](../yeebot-2.0/HANDOFF_SUBSPRINT_0_FOUNDATION_TENANTS.md) — Foundation, mergé. L'endpoint `/api/tenants/<slug>/config` est en prod.
- [yeebot-2.0/HANDOFF_SUBSPRINT_A_TENANTS_FACTORY.md](../yeebot-2.0/HANDOFF_SUBSPRINT_A_TENANTS_FACTORY.md) — Backend factory routing (parallèle, indépendant).
- Sub-sprint C (Front IA `yeekai-embed-ai-front`) — à rédiger.
- Sub-sprint B (Dashboard) — à rédiger.
- Sub-sprint E (Bakeli catch-up) — à rédiger.
- Plan global : [yeebot-2.0/MVP_FINAL_SPRINT_PROBABLY.MD](../yeebot-2.0/MVP_FINAL_SPRINT_PROBABLY.MD).
