# Handoff — POC Afrodemy clone smoke test + update README

> 📍 **Destinataire** : agent Claude Code session esmt-rita-demo
> 📍 **Effort estimé** : ~10 min (clone + injection déjà fait, juste vérif + update doc)
> 📍 **Source de vérité** : [`yeebot-2.0/AFRODEMY_SPEC.md`](https://github.com/AlAmine-dot/yeebot-2.0/blob/yeebot-v2/AFRODEMY_SPEC.md)

---

## Contexte

Le clone Afrodemy est **déjà fait** dans ce repo (`afrodemy-clone/`, 3 HTML, ~4.3 Mo, SPA Next.js wget partiel) avec le **snippet Yeekai déjà injecté** dans `index.html` + `fr.html`. Status actuel dans le README : 🟡 *"Pré-cloné, attente POC complet"*.

Une fois le backend Afrodemy + le front IA shippés en prod (autres handoffs), le widget devient pleinement fonctionnel sur ce clone. Ton job : **vérifier que tout marche bout-en-bout** + **flipper le status à ✅** dans le README clones table.

---

## Pré-requis (à valider avant dispatch)

- [ ] Backend Afrodemy déployé sur Render et fonctionnel
- [ ] Front IA Afrodemy déployé sur Vercel à `https://yeekai-embed-ai-front.vercel.app/afrodemy`
- [ ] Row tenant `afrodemy` en DB Supabase avec couleurs + agent_name = "Aïssa"

Si ces 3 pré-requis ne sont pas faits → **stop et ping Mouhamed**.

---

## Ta mission

### Step 1 — Vérifier que l'injection est bien là

```bash
cd /Users/admin/StudioProjects/esmt-rita-demo
grep -l "yeekai-embed-js" afrodemy-clone/*.html
# → doit retourner index.html et fr.html

grep -A5 "yeekai-embed-js" afrodemy-clone/index.html | head -8
# → doit montrer le snippet avec :
#   data-tenant="afrodemy"
#   data-app-url="https://yeekai-embed-ai-front.vercel.app/afrodemy"
#   data-disclaimer-target="https://afrogroup-sn.com/fr"
```

Si manquant : ré-injecter via
```bash
python3 scripts/inject_embed.py \
    --clone-dir afrodemy-clone \
    --tenant afrodemy \
    --app-url https://yeekai-embed-ai-front.vercel.app/afrodemy \
    --disclaimer-target https://afrogroup-sn.com/fr
```

### Step 2 — Smoke test local

```bash
python3 -m http.server 8080
# Ouvrir http://localhost:8080/afrodemy-clone/fr.html
```

**Checklist visuelle** :
- [ ] FAB Yeekai visible en bas-droite avec branding navy `#0F172A` + accent jaune `#FBBF24`
- [ ] Avatar Aïssa : placeholder color-aware (sauf si Mouhamed a upload logo Afrodemy)
- [ ] Disclaimer "Démo Yeekai sur clone — Site officiel →" visible en bas-centre, qui redirige vers `https://afrogroup-sn.com/fr`
- [ ] Click FAB → iframe ouvre vers `/afrodemy` → Aïssa accueille avec wording Afrodemy correct
- [ ] Tape "Quels sont les packs ?" → réponse profonde avec Starter/XamXam/Entrepreneur + prix exacts
- [ ] Qualif scriptée déclenche au tour 2 → Q1 affichée avec 5 options Afrodemy (entrepreneur, etudiant_jeunepro, etc.)
- [ ] Submit Q1+Q2+Q3 avec scores hauts → atteint P0 → WhatsApp arrive sur tel test depuis +221 shared

### Step 3 — Smoke test prod (GitHub Pages + Vercel)

```bash
# GitHub Pages
open https://alamine-dot.github.io/esmt-rita-demo/afrodemy-clone/fr.html

# Vercel (si projet esmt-rita-demo connecté)
# URL Vercel à demander à Mouhamed
```

Même checklist visuelle qu'en local, sur l'URL prod.

### Step 4 — Update README.md (table clones)

Dans la table "Clones disponibles", **flip le status Afrodemy** de 🟡 à ✅ :

**Avant** :
```md
| `afrodemy` | [afrogroup-sn.com/fr](https://afrogroup-sn.com/fr) | 3 | ~4.3 Mo | 🟡 Pré-cloné (SPA Next.js, wget partiel), attente POC complet | [Pages](https://alamine-dot.github.io/esmt-rita-demo/afrodemy-clone/) |
```

**Après** :
```md
| `afrodemy` | [afrogroup-sn.com/fr](https://afrogroup-sn.com/fr) | 3 | ~4.3 Mo | ✅ Tenant opérationnel, agent Aïssa profond sur 3 packs B2C + 2 packs B2B | [Pages](https://alamine-dot.github.io/esmt-rita-demo/afrodemy-clone/) |
```

### Step 5 — Commit + push

```bash
git add README.md
git commit -m "docs(afrodemy): flip clone status à ✅ (agent Aïssa opérationnel)

Backend + front IA Afrodemy shippés en prod. Clone afrodemy-clone/
maintenant pleinement fonctionnel avec FAB + iframe vers /afrodemy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

git push origin main
```

---

## Definition of Done

- [ ] Injection snippet vérifiée dans `afrodemy-clone/index.html` + `fr.html`
- [ ] Smoke test local 8/8 OK
- [ ] Smoke test prod GitHub Pages 8/8 OK
- [ ] README.md table clones flipped 🟡 → ✅ avec wording mis à jour
- [ ] Commit + push sur main
- [ ] Ping Mouhamed quand done — démo Afrodemy bout-en-bout est prête pour Loom cold reach

---

## Hors scope ce handoff

- ❌ Backend tenant code (autre handoff côté yeebot-2.0)
- ❌ Front IA tenant code (autre handoff côté yeekai-embed-ai-front)
- ❌ Création row tenant DB (pré-requis @Mouhamed)
- ❌ Re-clone wget complet du site (le wget partiel SPA Next.js suffit pour la démo visuelle ; exploration profonde via Playwright headless différée Phase 3)
