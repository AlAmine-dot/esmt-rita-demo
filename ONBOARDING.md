# Onboarding dev clones — esmt-rita-demo

> Briefing technique dense pour nouveau dev qui prend la main sur le repo. Lis-le en une fois (10 min), tu auras tout le contexte nécessaire pour coder dessus.

---

## 1. Scope du repo

Repo qui héberge :
- **N clones wget** de sites de prospects Yeekai (Bakeli, Breedj, Le Grand Frère, Afrodemy…)
- **1 script Python** (`scripts/inject_embed.py`) qui injecte l'embed Yeekai dans tous les HTML d'un clone fraîchement wgetté
- **1 démo "musée"** : clone ESMT historique avec pattern legacy (iframe + config.js) — gardé intentionnellement comme référence avant migration

**But métier** : avoir un site "lookalike" du prospect pour faire des démos cold reach qui simulent le widget Yeekai déjà intégré → faciliter la conversion commerciale.

**Ce que ce repo ne fait PAS** :
- L'embed JS lui-même → repo `yeekai-embed-js` (CDN Vercel)
- L'UI conversationnelle dans l'iframe → repo `yeekai-embed-ai-front`
- L'agent IA backend → repo `yeebot-2.0`

---

## 2. Setup local

```bash
git clone git@github.com:AlAmine-dot/esmt-rita-demo.git
cd esmt-rita-demo

# Pas d'install (juste HTML statique + Python pour le script d'injection)
python3 -m http.server 8080
# → http://localhost:8080/                          (musée ESMT)
# → http://localhost:8080/bakeli-clone/index.html    (Bakeli avec Yeekai)
# → http://localhost:8080/breedj-clone/index.html    (Breedj avec Yeekai)
# → http://localhost:8080/afrodemy-clone/index.html  (Afrodemy avec Yeekai)
```

Pour tester depuis un téléphone sur le même Wi-Fi : utiliser l'IP locale (`http://192.168.1.X:8080/...`).

---

## 3. Architecture (post Sub-sprint D)

### Pattern actuel (Bakeli/Breedj/futurs)

Chaque page HTML d'un clone contient juste **un script tag** vers l'embed CDN :

```html
<!-- Yeekai Embed (injected by scripts/inject_embed.py) -->
<script src="https://yeekai-embed-js.vercel.app/v1/embed.js"
        data-tenant="breedj"
        data-app-url="https://yeekai-embed-ai-front.vercel.app/breedj"
        data-disclaimer-target="https://breedj.com"
        async></script>
<!-- End Yeekai Embed -->
```

Au runtime, l'embed lit ses `data-*`, fetch la config tenant DB, render le FAB en bas-droite, et ouvre une iframe vers le front IA au clic.

### Pattern legacy (musée ESMT)

`index.html` racine utilise `config.js` + `app.js` + iframe wrapper. **Gardé intentionnellement** comme exemple historique avant migration vers embed standalone. Ne pas migrer.

---

## 4. Connection avec les autres microservices

```
                  Visiteur ouvre un clone (bakeli-clone/index.html)
                          │
                          ▼ HTML statique contient 1 script tag
              ┌────────────────────────────┐
              │ CETTE APP (esmt-rita-demo)  │
              │ Servi via GitHub Pages OU   │
              │ Vercel OU localhost:8080    │
              └────────────┬───────────────┘
                           │ script tag charge embed.js
                           ▼
              ┌────────────────────────────┐
              │ yeekai-embed-js (CDN)      │
              │ Render FAB + ouvre iframe   │
              └────────────┬───────────────┘
                           │ iframe target = data-app-url
                           ▼
              ┌────────────────────────────┐
              │ yeekai-embed-ai-front       │
              │ /<slug> → TenantShell       │
              └────────────────────────────┘
```

→ Le repo `esmt-rita-demo` est donc **purement statique** côté runtime. Aucune logique JS active, juste les clones wget + le script d'injection au build time.

---

## 5. Structure dossier

```
esmt-rita-demo/
├── index.html              MUSÉE : démo ESMT historique (legacy)
├── styles.css              MUSÉE : styles utilisés par index.html
├── app.js                  MUSÉE : logique panneau Rita legacy
├── config.js               MUSÉE : config FLUTTER_APP_URL démo ESMT
├── assets/                 Icônes Rita / Khady (partagées musée)
│
├── esmt-clone/             Clone wget de esmt.sn (intact, MUSÉE)
│
├── bakeli-clone/           Clone wget de bakeli.tech (228 HTML, ~40 Mo)
├── breedj-clone/           Clone wget de breedj.com (1454 HTML, ~959 Mo)
├── legrandfrere-clone/     (Local seulement, 484 Mo non-pushé GitHub)
├── afrodemy-clone/         Clone wget de afrogroup-sn.com/fr (3 HTML, SPA Next.js)
│
├── scripts/
│   └── inject_embed.py     Injecte snippet Yeekai dans tous les HTML d'un clone
│
└── archives/handoffs_shipped/  Handoffs historiques sub-sprints D
```

---

## 6. Le script `inject_embed.py` (LE truc central à connaître)

Lis le docstring du script en entier, c'est le meilleur intro. Résumé :

### Comportement
1. **Strip les anciens snippets legacy** (`<script src="../path/app.js">`, `<script src="../path/*-config.js">`, blocs HTML `<aside id="rita-panel">`, etc.) à TOUTES profondeurs de chemin relatif
2. **Injecte le snippet Yeekai Embed** avant `</body>` (fallback : avant `</html>`, sinon append)
3. **Idempotent** : 2e run = 0 modifications (sauf si du legacy a réapparu)

### Usage

```bash
python3 scripts/inject_embed.py \
    --clone-dir <slug>-clone \
    --tenant <slug> \
    --app-url https://yeekai-embed-ai-front.vercel.app/<slug> \
    --disclaimer-target https://<site-cible.com>
```

→ Toujours runner cette commande après un wget fresh. Toutes les pages HTML auront le widget Yeekai injecté.

---

## 7. Pièges connus

### Site SPA Next.js / React (Afrodemy, futurs)
`wget` ne chope que la home + quelques pages parce que le routing interne est client-side. Workaround temporaire : OK pour démo visuelle. Pour exploration profonde : Playwright headless (Phase 3, pas urgent).

Cas spécifique Afrodemy : les filenames Next.js contiennent `?dpl=` qui casse GitHub Pages. Fix appliqué dans le commit `810fac71` (script de strip).

### Clones > 500 Mo
- `breedj-clone/` (959 Mo) : push HTTPS GitHub timeout. Workaround : SSH ou split commit. Cf `archives/handoffs_shipped/HANDOFF_FEEDBACK.md`.
- `legrandfrere-clone/` (484 Mo) : **commit local seulement, jamais pushé**. Disponible sur la machine de Mouhamed pour démo cold reach. Si Iki a besoin → demander un transfert.

### Liens absolus qui survivent à `--convert-links`
wget rate parfois quelques URLs absolues. Faire un script ad-hoc Python si besoin (cf historique commits sur les clones).

### Le widget n'apparaît pas après injection
1. Check que le script tag a bien été injecté : `grep -r "yeekai-embed-js" <slug>-clone/index.html`
2. Vérifier qu'il n'y a pas d'erreur console (CSP du site cloné qui bloque ? rare)
3. Tenant slug correct ? Si pas en DB → fail-soft (FAB s'affiche quand même avec couleurs default)

---

## 8. Conventions code & commits

- **Pas de framework, pas de build step** — c'est du statique pur
- **Python 3.9+** pour les scripts (pas de deps externes, stdlib only)
- **Commits courts en français** (Conventional Commits)

### Style commits
```
feat(afrodemy): pre-clone for POC tomorrow

wget partiel (3 HTML), strip ?dpl= des filenames Next.js
pour compat GitHub Pages.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## 9. Déploiement

### GitHub Pages
Auto-deploy sur push `main`. URL : `https://alamine-dot.github.io/esmt-rita-demo/`
Sous-pages :
- `/` → musée ESMT
- `/bakeli-clone/` → Bakeli avec Yeekai
- `/breedj-clone/` → Breedj avec Yeekai
- `/afrodemy-clone/` → Afrodemy avec Yeekai

### Vercel
Aussi connecté à Vercel (auto-deploy). Url : à confirmer.

### Note clones lourds
`breedj-clone/` (~959 Mo) push HTTPS GitHub peut timeout. Soit utiliser SSH (`git remote set-url origin git@github.com:...`), soit split en plusieurs commits si trop gros.

---

## 10. Ressources à lire (dans l'ordre)

1. Ce fichier (ONBOARDING.md)
2. [`README.md`](README.md) — landing page rapide + table clones
3. [`templates/SCAFFOLD_TENANT_CLONE.md`](templates/SCAFFOLD_TENANT_CLONE.md) — procédure ajout nouveau clone
4. [`scripts/inject_embed.py`](scripts/inject_embed.py) — docstring du script (lis-le en entier)
5. [`yeebot-2.0/ECOSYSTEM.md`](https://github.com/AlAmine-dot/yeebot-2.0/blob/yeebot-v2/ECOSYSTEM.md) — vue cross-repos
