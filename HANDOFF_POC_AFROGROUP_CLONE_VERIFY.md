# Handoff — POC Afrogroup clone re-injection + smoke test + update README

> 📍 **Destinataire** : agent Claude Code session esmt-rita-demo
> 📍 **Effort estimé** : ~15 min (re-injection avec nouveau slug + vérif + update doc)
> 📍 **Source de vérité** : [`yeebot-2.0/AFROGROUP_SPEC.md`](https://github.com/AlAmine-dot/yeebot-2.0/blob/yeebot-v2/AFROGROUP_SPEC.md)

---

## Contexte

Le clone Afrodemy est **déjà cloné** dans ce repo (`afrodemy-clone/`, 3 HTML, ~4.3 Mo, SPA Next.js wget partiel) avec **une première injection** du snippet Yeekai (qui utilisait l'ancien slug `afrodemy`).

⚠️ **Le tenant a été renommé** : `afrodemy` → `afrogroup` (le nom de l'entreprise mère, alors qu'Afrodemy est juste le nom du produit app). Donc le snippet injecté doit être **re-runné** avec le nouveau slug pour que le widget pointe sur les bons endpoints.

→ **Le dossier `afrodemy-clone/` garde son nom** (historique wget, pas de raison de re-clone) mais le contenu du `<script data-tenant=...>` doit être mis à jour à `afrogroup`.

Persona : **Bassirou** (masculin). Branding vert AFRO Group (`#152C26` / `#66D072`).

---

## Pré-requis (à valider avant dispatch)

- [ ] Backend Afrogroup déployé sur Render et fonctionnel (`/yeegpt-1.0-afrogroup/playground/` → 200)
- [ ] Front IA Afrogroup déployé sur Vercel à `https://yeekai-embed-ai-front.vercel.app/afrogroup`
- [ ] Row tenant `afrogroup` en DB Supabase avec couleurs vertes + agent_name = "Bassirou" + logo_url

Si ces 3 pré-requis ne sont pas faits → **stop et ping Mouhamed**.

---

## Ta mission

### Step 1 — Vérifier l'état actuel de l'injection

```bash
cd /Users/admin/StudioProjects/esmt-rita-demo

grep -A5 "yeekai-embed-js" afrodemy-clone/index.html | head -8
# Cas attendu : data-tenant="afrodemy" (ancien slug) → à mettre à jour
# Si déjà "afrogroup" → skip à Step 3
```

### Step 2 — Re-injecter avec le nouveau slug `afrogroup`

Le script `inject_embed.py` est **idempotent** : il strip l'ancien snippet et injecte le nouveau.

```bash
python3 scripts/inject_embed.py \
    --clone-dir afrodemy-clone \
    --tenant afrogroup \
    --app-url https://yeekai-embed-ai-front.vercel.app/afrogroup \
    --disclaimer-target https://afrogroup-sn.com/fr
```

**Vérification** :
```bash
grep -A5 "yeekai-embed-js" afrodemy-clone/index.html | head -8
# → DOIT maintenant montrer :
#   data-tenant="afrogroup"
#   data-app-url="https://yeekai-embed-ai-front.vercel.app/afrogroup"
#   data-disclaimer-target="https://afrogroup-sn.com/fr"

grep -l "afrogroup" afrodemy-clone/*.html | wc -l
# → doit retourner 2 (index.html + fr.html)

grep -l 'data-tenant="afrodemy"' afrodemy-clone/*.html
# → DOIT retourner 0 ligne (plus aucun résidu de l'ancien slug)
```

### Step 3 — Smoke test local

```bash
python3 -m http.server 8080
# Ouvrir http://localhost:8080/afrodemy-clone/fr.html
```

**Checklist visuelle** :
- [ ] FAB Yeekai visible en bas-droite avec branding **vert** (`#152C26` foncé + `#66D072` accent)
- [ ] Avatar Bassirou (logo tenant Afrodemy uploadé Supabase si dispo, sinon placeholder vert)
- [ ] Disclaimer "Démo Yeekai sur clone — Site officiel →" visible en bas-centre, redirige vers `https://afrogroup-sn.com/fr`
- [ ] Click FAB → iframe ouvre vers `/afrogroup` (PAS `/afrodemy`) → Bassirou accueille avec wording pack-first
- [ ] Tape "Quels sont les packs ?" → réponse profonde avec Starter/XamXam/Entrepreneur + prix exacts (1500 FCFA, 3000 FCFA)
- [ ] Tape "Je suis entrepreneur" → recommande Pack Entrepreneur 3000 FCFA
- [ ] Tape "Comment je souscris ?" → 3 étapes (download app onelink.to/akekfv → register → choisir pack)
- [ ] Qualif scriptée déclenche au tour 2 → Q1 affichée avec 5 options Afrogroup (entrepreneur, etudiant_jeunepro, etc.)
- [ ] Submit Q1+Q2+Q3 avec scores hauts → atteint P0 → WhatsApp arrive sur tel test avec template pack-first depuis +221 shared

### Step 4 — Smoke test prod (GitHub Pages)

```bash
open https://alamine-dot.github.io/esmt-rita-demo/afrodemy-clone/fr.html
```

Même checklist visuelle qu'en local.

### Step 5 — Update README.md (table clones)

Dans la table "Clones disponibles", **flip le status Afrodemy** de 🟡 à ✅. Mettre à jour la mention du slug (afrodemy → afrogroup côté tenant Yeekai, mais le dossier reste afrodemy-clone) :

**Avant** :
```md
| `afrodemy` | [afrogroup-sn.com/fr](https://afrogroup-sn.com/fr) | 3 | ~4.3 Mo | 🟡 Pré-cloné (SPA Next.js, wget partiel), attente POC complet | [Pages](https://alamine-dot.github.io/esmt-rita-demo/afrodemy-clone/) |
```

**Après** :
```md
| `afrogroup` (clone `afrodemy-clone/`) | [afrogroup-sn.com/fr](https://afrogroup-sn.com/fr) | 3 | ~4.3 Mo | ✅ Tenant opérationnel, agent Bassirou pack-first (3 packs B2C + 2 packs B2B) | [Pages](https://alamine-dot.github.io/esmt-rita-demo/afrodemy-clone/) |
```

### Step 6 — Commit + push

```bash
git add afrodemy-clone/ README.md
git commit -m "fix(afrogroup): re-inject embed avec nouveau slug afrogroup + flip status ✅

Tenant renommé afrodemy → afrogroup (nom entreprise mère, alors qu'Afrodemy
est juste le nom du produit app). Script inject_embed re-runné. Dossier
clone conservé sous afrodemy-clone/ (historique wget).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

git push origin main
```

---

## Definition of Done

- [ ] Snippet re-injecté avec `data-tenant=\"afrogroup\"` dans `afrodemy-clone/index.html` + `fr.html`
- [ ] 0 résidu `data-tenant=\"afrodemy\"` dans les HTML du clone
- [ ] Smoke test local 9/9 OK
- [ ] Smoke test prod GitHub Pages 9/9 OK
- [ ] README.md table clones flipped 🟡 → ✅ avec wording mis à jour
- [ ] Commit + push sur main
- [ ] Ping Mouhamed quand done — démo AFRO Group bout-en-bout est prête pour Loom cold reach

---

## Hors scope ce handoff

- ❌ Backend tenant code (autre handoff côté yeebot-2.0)
- ❌ Front IA tenant code (autre handoff côté yeekai-embed-ai-front)
- ❌ Création row tenant DB (pré-requis @Mouhamed)
- ❌ Re-clone wget complet du site (le wget partiel SPA Next.js suffit pour la démo visuelle ; exploration profonde via Playwright headless différée Phase 3)
- ❌ Renommer le dossier `afrodemy-clone/` → `afrogroup-clone/` (pas nécessaire, ferait perdre l'historique des commits sans bénéfice utilisateur — le slug Yeekai est ce qui compte côté runtime)
