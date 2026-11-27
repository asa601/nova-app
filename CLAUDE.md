# Nova App — dépôt public des mises à jour

Ce dépôt est lu par tous les téléphones qui ont **Nova App** (l'appli Android qui regroupe les jeux Nova).
Chaque téléphone lit `catalogue.json` (au lancement de l'appli et toutes les 3 h en arrière-plan), puis
télécharge les jeux dont la `version` a augmenté, et propose d'installer `apk/NovaApp.apk` si
`apk.versionCode` a augmenté. **Tout ce qui est poussé sur `main` part chez tout le monde.**

Dépôt **public** : n'y mets jamais de clé, de mot de passe ni de donnée privée.
Le code source de l'appli et la clé de signature sont dans le dépôt **privé** `asa601/nova-app-cle`
(voir son CLAUDE.md) : il ne sert que pour changer l'appli elle-même (accueil, menus, partie Android).

## Façon de travailler
Réponds en français, de façon courte et sûre. Annonce ce que tu vas faire et la durée de chaque étape.
À la fin, donne le numéro de mise à jour publié (ex. « mise à jour v1.3.0 ») et ce qui a changé.
Une mise à jour demandée par le propriétaire se publie sans redemander confirmation.

## Contenu
- `catalogue.json` : la liste des jeux (`id`, `nom`, `groupe`, `genre`, `desc`, `version`, `orientation`,
  `nouveau`, `taille`, `fichiers[{p,t}]`), les `groupes` (rangées de l'accueil), `apk`, `firebase`,
  `version` (affichée « mise à jour actuelle ») et `rev`.
- `jeux/<id>/` : les fichiers de chaque jeu, `index.html` en entrée.
- `vignettes/<id>.jpg` : l'image du jeu, 600×800 JPEG, **vraie capture du jeu** (jamais une image inventée).
- `apk/NovaApp.apk` : la dernière version de l'appli.
- `outils/maj_catalogue.py` : l'outil qui tient le catalogue à jour (voir plus bas). Ne modifie pas
  `catalogue.json` à la main.

## Mettre à jour un jeu
1. Récupère la nouvelle version du jeu. Les jeux viennent des artefacts claude.ai du propriétaire :
   `list_artifacts` (query = une partie du nom du jeu), `list_files` (chemins + sha256), puis
   `read_file` avec `paths` (32 fichiers et 4 Mo maximum par appel ; les fichiers arrivent dans
   `/tmp/claude-tool-results/...`). Copie chaque fichier vers `jeux/<id>/<chemin>` en vérifiant le sha256.
   Un artefact peut avoir plusieurs fichiers (ex. Nova Inferno : `index.html`, `data.js`, `game.js`,
   `icons.js`) : prends-les **tous**. Exception : `ricochets` n'est pas un artefact, ses sources sont dans
   `asa601/nova-app-cle` (`source/ricochets/`, `build_web.py` produit un seul `index.html`).
2. `python3 outils/maj_catalogue.py maj <id>` : recalcule la liste des fichiers et passe le jeu en version +1.
   Si le jeu a changé de genre ou de description : ajoute `--genre "…" --desc "…"` (aussi `--nom`, `--orientation`).
3. Si l'écran du jeu a changé, refais sa vignette (voir plus bas). La vignette suit la version du jeu.
4. `python3 outils/maj_catalogue.py verifier` doit afficher « Tout est bon ».
5. Commit puis `git -c push.negotiate=true push origin main` (l'avertissement « push negotiation failed »
   est sans gravité).
6. Vérifie en ligne : `https://raw.githubusercontent.com/asa601/nova-app/main/catalogue.json`
   (le cache de GitHub peut mettre jusqu'à 5 min).

Les sauvegardes des joueurs sont gardées : chaque jeu a son propre stockage (localStorage), que la mise à
jour ne touche pas. Si une nouvelle version change le format de sauvegarde, le jeu doit savoir relire
l'ancien.

## Ajouter un jeu
1. Choisis un `id` (minuscules, chiffres, tirets) et copie ses fichiers dans `jeux/<id>/`.
2. Fais sa vignette `vignettes/<id>.jpg`.
3. `python3 outils/maj_catalogue.py ajouter <id> --nom "Nom" --groupe principaux --genre "Type de jeu" --desc "Une ou deux phrases." [--orientation paysage]`
   Groupes actuels : `principaux` (Tes jeux principaux), `nova-city`, `titans`, `prototypes`, `demos`.
   Nouveau groupe : `python3 outils/maj_catalogue.py groupe <id> "Nom affiché"`.
   Le nouveau jeu reçoit le badge NOUVEAU (retiré des autres).
4. Vérifie, commit, push (comme ci-dessus).

## Ce qu'un jeu doit respecter pour marcher dans Nova App
- Entrée `index.html`, chemins **relatifs** pour ses autres fichiers ; noms de fichiers en
  `[A-Za-z0-9._/-]` seulement.
- Chaque jeu tourne sur sa propre adresse `https://<id>.jeux.nova/` servie par l'appli (hors ligne).
- three.js r128 est fourni hors ligne pour ces adresses exactes :
  `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` et
  `https://cdn.jsdelivr.net/npm/three@0.128.0/` (`build/three.min.js`, `examples/js/libs/meshopt_decoder.js`,
  `examples/js/loaders/GLTFLoader.js`, `examples/js/utils/BufferGeometryUtils.js`,
  `examples/js/utils/SkeletonUtils.js`). Toute autre ressource en ligne (Google Fonts…) n'est chargée
  qu'avec internet : le jeu doit marcher sans.
- Sauvegarde : utilise `localStorage`. L'appli la garde, la restaure et la synchronise avec le compte
  du joueur toute seule.
- Retour à l'accueil : bouton « N » ajouté automatiquement, ou geste retour. Un jeu qui définit
  `window.onAndroidBack` gère lui-même le retour (et n'a pas de bouton N) ; il revient à l'accueil avec
  `Android.quit()`.
- Bridges disponibles dans un jeu : `Android.quit()`, `Android.vibrate(ms)`, `Android.safeArea()`
  (« gauche,haut,droite,bas » en dp).
- `orientation` : `portrait` (par défaut) ou `paysage`.

## Faire une vignette (vraie capture)
Playwright + Chromium, téléphone portrait 390×760, `device_scale_factor=2`, attends que le jeu soit affiché
(3 à 5 s ; Dino Survie ~30 s), passe l'écran d'intro s'il cache le jeu (bouton « C'est parti », « OK »…),
capture, puis recadre au centre en 3:4 et enregistre en 600×800 JPEG qualité 80. Pour un jeu en paysage :
capture en 800×360 puis recadre le centre en 3:4. Sers les fichiers avec
`python3 -m http.server --directory jeux` et redirige les URL three.js vers les copies locales
(`source/lib/` du dépôt privé). Lance Chromium avec `--use-gl=angle --use-angle=swiftshader
--enable-unsafe-swiftshader --ignore-gpu-blocklist` pour la 3D.

## Comptes
Firebase Auth (e-mail/mot de passe) + Firestore, appelés en REST depuis l'appli. Le pseudo devient
`<pseudo en minuscules>@joueurs.nova-app.fr`. Données : `joueurs/{uid}` (pseudo, profil = favoris/récents
en JSON, t) et `joueurs/{uid}/sauvegardes/{idJeu}` (data, t) ; la plus récente gagne.
Pour activer les comptes chez tout le monde : `python3 outils/maj_catalogue.py firebase <Clé API Web> <ID du projet>`,
puis commit et push. Règles Firestore à mettre dans la console :
`match /joueurs/{uid}/{doc=**} { allow read, write: if request.auth != null && request.auth.uid == uid; }`
