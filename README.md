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

L'app Flutter Yeekai est lancée sur **un port fixe (`52022`)** via le wrapper
[`scripts/run_web.sh`](../yeebus_filthy_mvp/scripts/run_web.sh) du repo Flutter.
Ainsi `config.js` n'a jamais besoin d'être modifié entre deux runs.

1. Lancer l'app Flutter sur le port verrouillé :
   ```bash
   cd ~/StudioProjects/yeebus_filthy_mvp
   ./scripts/run_web.sh
   ```
   Ou via VS Code : sélectionner la config **« Flutter Web (port 52022) »**.

2. Servir ce site localement (port 8080, indépendant de Flutter) :
   ```bash
   cd ~/StudioProjects/esmt-rita-demo
   python3 -m http.server 8080
   ```

3. Ouvrir [http://localhost:8080/](http://localhost:8080/) dans le navigateur.
   Le clic sur le bouton Rita ouvre l'app Flutter (`http://localhost:52022/`)
   dans le panneau latéral.

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
