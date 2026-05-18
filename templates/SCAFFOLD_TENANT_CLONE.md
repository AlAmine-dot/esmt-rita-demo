# Scaffold — Ajouter un nouveau clone prospect dans esmt-rita-demo

> Procédure standard pour cloner un nouveau site prospect et y injecter le widget Yeekai (ex : Afrodemy, Volkeno, future EdTech…).
>
> Pour générer en autonomie via Claude Code : copier-coller le **prompt dispatch** en bas.

---

## Pré-requis

1. **Tenant créé en DB Supabase** (table `tenants`) avec son slug + branding. Sinon l'embed fail-soft sur les couleurs default.

2. **Backend tenant scaffolded** côté `yeebot-2.0` (sinon `/api/tenants/<slug>/config` 404). Cf `yeebot-2.0/templates/SCAFFOLD_BACKEND_TENANT.md`.

3. **Front IA tenant scaffolded** côté `yeekai-embed-ai-front` (sinon l'iframe affiche du blanc). Cf `yeekai-embed-ai-front/templates/SCAFFOLD_FRONT_TENANT.md`.

→ Bref, ce scaffold est typiquement **le dernier** dans l'ordre de provisioning d'un nouveau tenant.

---

## Procédure manuelle (~30 min selon taille du site)

### Step 1 — Safety branch

```bash
git checkout main && git pull origin main
git checkout -b feat/clone-<slug>
```

### Step 2 — Clone wget du site cible

```bash
rm -rf <slug>-clone

wget --mirror --page-requisites --convert-links --adjust-extension \
     --no-parent --domains=<site-domain> --no-host-directories \
     -U "Mozilla/5.0" \
     -e robots=off -P <slug>-clone https://www.<site-domain>
```

**Options expliquées** :
- `--mirror` = `-r -N -l inf --no-remove-listing` (récursif infini)
- `--page-requisites` = télécharge CSS/JS/images nécessaires au rendu
- `--convert-links` = réécrit les liens absolus en relatifs (utile pour servir localement)
- `--adjust-extension` = ajoute `.html` aux URL sans extension
- `--no-parent` = ne pas remonter au domaine parent
- `--domains` = limite aux domaines listés (sinon wget peut diverger)
- `--no-host-directories` = pas de sous-dossier `www.site.com/` dans le clone
- `-U "Mozilla/5.0"` = user-agent (certains sites bloquent wget par défaut)
- `-e robots=off` = ignore robots.txt (clones de démo, on s'autorise)

### Step 3 — (Optionnel) Fix liens absolus survivants

Wget rate parfois certaines URLs absolues. Si le site cloné ne s'affiche pas correctement quand servi en local, faire un script ad-hoc Python :

```python
import re, pathlib
for f in pathlib.Path("<slug>-clone").rglob("*.html"):
    txt = f.read_text(encoding="utf-8")
    txt = re.sub(r'https?://www\.<site-domain>', '', txt)
    f.write_text(txt, encoding="utf-8")
```

### Step 4 — Cas spécial SPA Next.js / React

Si le site est une SPA (Next.js, React, Nuxt…), wget ne chope que la home + quelques pages parce que le routing interne est client-side. Symptômes :
- 3-5 HTML seulement au lieu de centaines
- Liens internes qui mènent à 404

**Workaround pour MVP** : OK pour la démo visuelle (home suffit). Pour exploration profonde, prévoir Playwright headless (Phase 3, pas urgent).

**Cas spécifique filenames Next.js avec `?dpl=`** : ces query params cassent GitHub Pages. Script de strip :
```python
import re, pathlib
for f in pathlib.Path("<slug>-clone").rglob("*"):
    if f.is_file() and "?dpl=" in f.name:
        f.rename(f.parent / f.name.split("?dpl=")[0])
# + grep -r '?dpl=' et strip dans les HTML aussi
```

### Step 5 — Injecter le snippet Yeekai Embed dans tous les HTML

```bash
python3 scripts/inject_embed.py \
    --clone-dir <slug>-clone \
    --tenant <slug> \
    --app-url https://yeekai-embed-ai-front.vercel.app/<slug> \
    --disclaimer-target https://www.<site-domain>
```

**Le script** :
- Strip automatiquement le legacy (anciens snippets ESMT/Bakeli/Breedj si présents)
- Injecte le snippet Yeekai avant `</body>` (fallback `</html>`, sinon append)
- Idempotent (re-run = 0 modifs si déjà à jour)

**Vérification** :
```bash
grep -rln "yeekai-embed-js" <slug>-clone/ | wc -l
# → doit retourner ~ le nombre de HTML du clone
```

### Step 6 — Test local

```bash
python3 -m http.server 8080
# Ouvrir http://localhost:8080/<slug>-clone/index.html
# → vérifier que le FAB apparaît en bas-droite avec les couleurs du tenant
# → click FAB → iframe ouvre vers le front IA → vérifier branding + intro
```

**Checklist visuelle** :
- [ ] FAB visible en bas-droite (mobile + desktop)
- [ ] Couleurs FAB = celles du tenant (pas le bleu default)
- [ ] Logo / avatar tenant chargé
- [ ] Disclaimer "Démo Yeekai sur clone — Site officiel →" visible en bas-centre
- [ ] Click FAB → iframe ouvre vers `/<slug>` → branding + intro corrects
- [ ] Click "Site officiel" du disclaimer → redirige vers le vrai site

### Step 7 — Commit + push + deploy

```bash
git add <slug>-clone/
git commit -m "feat(<slug>): clone wget + injection Yeekai embed

Clone wget de www.<site-domain> (~N HTML, ~X Mo). Injection Yeekai
embed standalone via inject_embed.py. Tenant déjà en DB + backend +
front IA opérationnels.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

git push origin feat/clone-<slug>

# Si push timeout (clone > 500 Mo) → utiliser SSH ou split commit
# git remote set-url origin git@github.com:AlAmine-dot/esmt-rita-demo.git

# PR vers main → review → merge → GitHub Pages + Vercel auto-deploy
# URL démo : https://alamine-dot.github.io/esmt-rita-demo/<slug>-clone/
```

### Step 8 — Update README clones table

Ajouter une ligne dans la table "Clones disponibles" du `README.md` :

```md
| `<slug>` | [<site-domain>](https://www.<site-domain>) | N | X Mo | ✅ Tenant opérationnel | [Pages](https://alamine-dot.github.io/esmt-rita-demo/<slug>-clone/) |
```

Status :
- ✅ Tenant provisionné DB + backend + front IA shippés → widget fonctionnel
- 🟡 Pré-clone shippé, en attente des autres scaffolds (backend / front IA)

---

## Prompt dispatch Claude Code (= automatisation)

Pour générer le clone via Claude Code dans une session esmt-rita-demo dédiée :

> **Agent clones esmt-rita-demo** : nouveau clone POC tenant `<slug>` à provisionner.
>
> **Pré-requis utilisateur** : tenant déjà en DB Supabase + backend scaffolded + front IA scaffolded. Cf les autres SCAFFOLD_* dans les repos respectifs.
>
> Suis [`templates/SCAFFOLD_TENANT_CLONE.md`](templates/SCAFFOLD_TENANT_CLONE.md) Steps 1-8 :
> 1. Branche feature
> 2. `wget --mirror` du site cible avec les bonnes options
> 3. (Optionnel) Fix liens absolus si survivants
> 4. (Si SPA) Fix filenames Next.js `?dpl=` si applicable
> 5. `python3 scripts/inject_embed.py` avec les bons args
> 6. Test local + checklist visuelle
> 7. Commit + push (SSH si > 500 Mo) + PR vers main
> 8. Update table clones dans README
>
> **Ping Mouhamed** quand shippé en prod GitHub Pages + Vercel.

---

## Hors scope ce scaffold

- ❌ Création row tenant en DB Supabase (UI dashboard ou SQL direct, hors code clone)
- ❌ Backend tenant agent IA (autre repo : `yeebot-2.0`, cf son `SCAFFOLD_BACKEND_TENANT.md`)
- ❌ Front IA tenant dossier (autre repo : `yeekai-embed-ai-front`, cf son `SCAFFOLD_FRONT_TENANT.md`)
- ❌ Réécriture profonde du clone (rewrite du DOM pour SPA, etc.) → différé Phase 3 (Playwright headless)
