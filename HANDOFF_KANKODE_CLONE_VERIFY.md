# HANDOFF — Clone HTML iframe wrapper Kankode

> **Repo** : `esmt-rita-demo` (le repo où on regroupe tous les wrappers iframe de démo + clones)
> **Branche suggérée** : `feat/kankode-clone`
> **Spec source** : [yeebot-2.0/KANKODE_SPEC.md](file:///Users/admin/Documents/GitHub/yeebot-2.0/KANKODE_SPEC.md)
>
> **Effort estimé** : ~30 min (pattern Steamy mature, copy-paste ajusté)

---

## 1. Créer `iframe-clones/kankode.html`

Pattern à dupliquer ligne par ligne depuis [iframe-clones/steamy.html](iframe-clones/steamy.html) avec les valeurs Kankode :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Kankode — Démo Yeekai</title>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    /*
      ⚠️ SCOPING CRITICAL : utiliser l'ID #site-background-iframe
      (pas le sélecteur `iframe` nu) pour ne PAS impacter l'iframe
      interne du panneau Yeekai (#yk-frame) qui s'ouvre au clic FAB.
      Cf bug détecté + fixé sur Xaadi (commit 22af8ece).
    */
    #site-background-iframe {
      position: fixed; inset: 0; width: 100vw; height: 100vh; border: 0;
    }
  </style>
</head>
<body>
  <!--
    Approche "iframe wrapper" pour POC cold reach Kankode.

    Kankode = première plateforme de formation numérique en fon, yoruba
    et français. EdTech béninoise basée à Cotonou. Fondée par Laetitia
    AGASSA + équipe (Aïcha, Nadine, Romuald, Gérard, Clarisse, Serge).

    Site Next.js (Vercel/SSR), nginx Ubuntu hosting. Pas d'API REST
    publique connue actuellement — donc Kobi V1-like (prompt-only)
    suffit pour le POC. Différé V2.

    ⚠️ HYPOTHÈSE UX SEAMLESS TESTÉE POUR KANKODE
    =============================================
    Le site Kankode a déjà un bouton WhatsApp dans le footer
    (wa.me/64893282, ⚠️ URL bugée sans indicatif +229). Pour ne pas
    concurrencer ce canal mais le COMPLÉTER, l'embed Yeekai :
    - Se positionne en bas-GAUCHE (data-fab-position="left")
    - Affiche une icône WhatsApp (data-fab-icon-style="whatsapp")
    - Click → ouvre une interface chat WhatsApp-like (?ui=whatsapp)

    L'idée = se présenter comme "canal direct WhatsApp avec Kankode"
    plutôt qu'un n-ième bouton de chat générique.

    Pattern identique à Steamy (cf steamy.html).
  -->
  <iframe
    id="site-background-iframe"
    src="https://wekankode.com"
    title="Kankode — wekankode.com"
    allow="fullscreen; geolocation; camera; microphone"
  ></iframe>

  <!-- Yeekai Embed -->
  <script
    src="https://yeekai-embed-js.vercel.app/v1/embed.js"
    data-tenant="kankode"
    data-app-url="https://yeekai-embed-ai-front.vercel.app/kankode?ui=whatsapp"
    data-disclaimer-target="https://wekankode.com"
    data-fab-position="left"
    data-fab-icon-style="whatsapp"
    async
  ></script>
  <!-- End Yeekai Embed -->
</body>
</html>
```

---

## 2. Smoke test

1. Lancer un serveur HTTP local depuis le repo : `python3 -m http.server 8000`
2. Ouvrir `http://localhost:8000/iframe-clones/kankode.html` dans un navigateur incognito
3. Vérifier :
   - ✅ Le site wekankode.com s'affiche en plein écran via l'iframe
   - ✅ Le FAB Yeekai apparaît **en bas à gauche** avec une icône WhatsApp (pas l'avatar Yemi)
   - ✅ Click sur le FAB → ouvre le panneau Yeekai avec la skin WhatsApp Steamy-like
   - ✅ Le panneau Yeekai a son propre header (pas masqué par le CSS scoping)
   - ✅ La conversation avec Yemi marche (post-deploy backend + front)

---

## 3. Pré-requis

- ✅ Backend Kankode (Sprint 1) mergé + déployé Render — sinon le `data-app-url` renvoie une page vide
- ✅ Front IA Kankode (Sprint 2) mergé + déployé Vercel — sinon idem
- ✅ Tenant `kankode` provisionné côté embed JS (registry + tenant config) — l'agent backend ou front s'en charge

---

## 4. Variants à anticiper

### Variant A — Si on veut tester sans skin WA
Changer 2 attributs :
```html
data-app-url="https://yeekai-embed-ai-front.vercel.app/kankode"  <!-- pas de ?ui=whatsapp -->
data-fab-position="right"  <!-- au lieu de left -->
```
→ Le FAB devient avatar à droite, le chat ouvre la skin default. Utile pour A/B test côté @AlAmine.

### Variant B — Wrapper iframe vs site cloné en local
Si on veut un clone HTML statique local de wekankode.com (pour démo offline ou contournement du bouton WhatsApp footer bugé) :
1. `wget --mirror --convert-links --adjust-extension --page-requisites https://wekankode.com -P kankode-clone/`
2. Servir `kankode-clone/wekankode.com/index.html` à la place de l'iframe
3. ⚠️ Probablement cassé pour les routes Next.js dynamiques — préférer le wrapper iframe sauf besoin spécifique

---

## 5. Référence handoffs précédents

- Pattern wrapper iframe : [iframe-clones/steamy.html](iframe-clones/steamy.html), [iframe-clones/xaadi.html](iframe-clones/xaadi.html), [iframe-clones/haroon.html](iframe-clones/haroon.html)
- Spec produit : [yeebot-2.0/KANKODE_SPEC.md](file:///Users/admin/Documents/GitHub/yeebot-2.0/KANKODE_SPEC.md)
- Méthodologie : [yeebot-2.0/GUIDE_TENANT_CREATION_E2E.md](file:///Users/admin/Documents/GitHub/yeebot-2.0/GUIDE_TENANT_CREATION_E2E.md)
