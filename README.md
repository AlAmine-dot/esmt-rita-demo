# ESMT Rita Demo

Site démo statique : clone de [www.esmt.sn](https://www.esmt.sn) avec un widget **Rita** flottant en bas à droite. Au clic, le widget ouvre l'app Flutter Yeekai (le chat Rita) dans un panneau latéral via iframe.

100% HTML/CSS/JS, aucun build step. Déployable tel quel sur Vercel, Netlify, GitHub Pages ou n'importe quel hébergeur de fichiers statiques.

## Structure

```
.
├── index.html          ← page démo
├── styles.css
├── app.js              ← logique du panneau Rita
├── config.js           ← URL de l'app Flutter à embarquer (à modifier !)
├── assets/
│   ├── rita-icon.png   ← icône du FAB
│   └── rita-light.png  ← avatar du header du panneau
└── esmt-clone/         ← clone statique de www.esmt.sn (généré via wget --mirror)
```

## Dev local

1. Lancer l'app Flutter dans un terminal :
   ```bash
   cd ~/StudioProjects/yeebus_filthy_mvp
   fvm flutter run -d chrome
   ```
   Note le port utilisé (ex: `52022`) — affiché dans `Debug service listening on ws://127.0.0.1:<port>/...`.

2. Mettre à jour `config.js` avec cette URL :
   ```js
   window.FLUTTER_APP_URL = "http://localhost:52022/";
   ```

3. Servir ce site localement (port différent de Flutter) :
   ```bash
   cd ~/StudioProjects/esmt-rita-demo
   python3 -m http.server 8080
   ```

4. Ouvrir [http://localhost:8080/](http://localhost:8080/) dans le navigateur. Le clic sur le bouton Rita ouvre l'app Flutter dans le panneau.

## Déploiement Vercel

1. Modifier `config.js` pour pointer sur l'URL Flutter de prod :
   ```js
   window.FLUTTER_APP_URL = "https://yeekai-sneaky-mvp.workers.dev/";
   ```

2. Déployer :
   ```bash
   vercel --prod
   ```

   Ou connecter le repo à Vercel pour des deploys auto sur push.

## Régénérer le clone ESMT

Si www.esmt.sn change et qu'on veut remettre la démo à jour :

```bash
rm -rf esmt-clone
wget --mirror --page-requisites --convert-links --adjust-extension \
     --no-parent --domains=esmt.sn --no-host-directories \
     -e robots=off -P esmt-clone https://www.esmt.sn
```

## Notes

- L'iframe Rita pointe vers une **autre origine** (l'app Flutter). Le `localStorage` est donc isolé : l'utilisateur ne partage pas d'état entre le site démo et l'app.
- Si l'app Flutter renvoie un header `X-Frame-Options: DENY` ou une CSP `frame-ancestors` restrictive, l'iframe sera bloquée. À vérifier avant déploiement.
