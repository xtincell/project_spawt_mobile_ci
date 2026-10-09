# SPAWT — Vitrine web (`spawt.online`)

Page unique de présentation de l'app SPAWT. **Purement vitrine** : aucun achat,
aucune connexion et aucun backend propre. Le texte de marque et les liens publics
consomment une édition publiée dans La Fusée ; le quiz reste un site séparé.

> Ce dépôt a d'abord hébergé un *portail* marchand (abonnement Spawter Gold,
> espace lieux B2B, connexion OTP). Tout cela a été retiré. Si tu cherches ce
> code, il est dans l'historique git avant `claude/vitrine-one-page`.

---

## D'où vient le contenu

Rien sur cette page n'est inventé. Deux documents font foi, et **un chiffre qui
n'y figure pas ne va pas sur la page** :

| Domaine | Source |
|---|---|
| Produit, chiffres, vocabulaire | `SPAWT_BIBLE_COMPLETE.md` — état consolidé, février 2026 |
| Marque, ton, dialecte, palette | Brandbook v1.0 |
| Visuel (tokens, logos, Moka, règles) | Design system CANON (`spawt-design-system/project/`) |

⚠️ **Deux pièges de documentation périmée**, déjà tranchés dans le code :
- La Bible §13.3 cite encore *Instrument Serif / Manrope / JetBrains Mono* et
  « mascotte à nommer ». C'est faux aujourd'hui : les polices sont **Klinsman**
  (display) et **Gotham** (corps), et la mascotte s'appelle **Moka**.
- Le template `SpawtWeb.dc.html` du design system annonce **8 archétypes** et
  « 1 800 spots cartographiés ». La Bible en compte **13**, et le chiffre de
  spots n'est corroboré nulle part. On a repris la *forme* de ce template, pas
  sa *copy*.

Et une correction de fond : l'ancienne landing présentait « **Le Guet** », un
mécanisme censé vérifier qu'un spawter était vraiment sur place. **Il n'existe
dans aucun document** — c'était une invention. Les vrais mécanismes de confiance
sont la note pondérée par le stade du spawter (§4.2) et la Pépite Vérifiée
(§4.3). Ne pas le réintroduire ; un test le vérifie.

---

## Développer

```bash
npm ci
npm run dev        # http://localhost:5174
```

Gates qualité — les mêmes qu'en CI :

```bash
npm run lint:vocab   # dialecte SPAWT + « aucun hex hors src/theme/tokens.* »
npm run typecheck    # tsc --noEmit
npm test             # vitest
npm run build        # tsc + vite build
```

## Variables d'environnement

Toutes optionnelles, toutes **figées au build** (Vite les inline dans le
bundle) : chaque changement exige un redéploiement. Voir `.env.example`.

| Variable | Effet |
|---|---|
| `VITE_APPSTORE_URL` | Vide → badge « Bientôt sur App Store » non cliquable |
| `VITE_PLAYSTORE_URL` | Idem pour Google Play |
| `VITE_QUIZ_URL` | Défaut `https://quiz.spawt.online` |

Il n'y a **aucune clé d'API ni aucun secret**. Le seul service lu est
`https://powerupgraders.com/api/export/LFA-spawt?format=public-brand` : un export
anonyme limité aux champs publics choisis, jamais l'export privé de stratégie.

La carte **Connexions → Page publique** de La Fusée permet de relire le nom,
le titre, la promesse, la présentation et les liens, puis de publier une édition.
SPAWT vérifie son identité, sa forme et son empreinte avant de remplacer ces textes.
Un brouillon ou une capture historique sans choix explicite ne modifie pas la vitrine.
Lecture au chargement, au retour dans l'onglet, puis toutes les cinq minutes visibles.
En cas de panne ou de réponse refusée, le dernier texte reçu dans l'onglet reste
visible ; un nouveau chargement commence par la copie embarquée ci-dessous.

Le raccord porte sur les textes du premier écran, le titre et les liens publics.
Les logos, la palette, les polices, Moka, les règles des six questions, les scores
et les liens des stores gardent leurs sources propres. Leur harmonisation complète
n'est pas reçue par ce lot. Une édition publique ne vaut pas validation de toute
la stratégie. Le retour à une édition antérieure crée une nouvelle version du coffre.

---

## Contraintes du dépôt (à lire avant de coder)

### 1. Le lint de vocabulaire n'est pas négociable
`scripts/lint-vocab.mjs` tourne en CI **et** dans la suite vitest. Il refuse,
dans `src/` : le mot `restaurant` (dire lieu / spot / maquis / table), le mot
anglais isolé `user` (dire spawter), `check-in` (dire spawt), `gastronom*`,
`leaderboard` / `ranking` / `classement`, `gamif*`, et **tout hex hors de
`src/theme/tokens.ts` et `src/theme/tokens.css`**.

Conséquence pratique : pas de `fill="#..."` dans un SVG inline, pas de couleur
en dur dans un composant. On utilise `var(--...)` ou `currentColor`.

### 2. La CSP est verrouillée par un test
`security-headers.conf` limite `connect-src` à `https://powerupgraders.com`
et garde `form-action 'none'`. Seule la publication publique est lue, sans
cookie ni référent ; la vitrine n'a aucun formulaire. `src/__tests__/security-headers.test.ts` l'assert par
égalité stricte, tout comme `font-src 'self'` et `script-src 'self'`.

Les images, polices et scripts restent **same-origin** : pas de Google Fonts, pas de CDN d'images, pas
d'analytics tiers. Si une origine externe devient vraiment nécessaire, l'ouvrir
dans `security-headers.conf` **et** mettre le test à jour dans le même commit,
sinon la CI casse.

### 3. Les polices sont le poste de poids principal
Klinsman pèse 406 Ko en `.otf` (Bold) contre 132 Ko en `.woff2`. Les deux
formats sont dans `public/fonts/` : le WOFF2 en premier dans `@font-face`, le
`.otf`/`.ttf` en repli pour les navigateurs Android anciens. `index.html` ne
précharge **que** les deux graisses du premier écran. Ne pas précharger plus :
le trafic est mobile, sur réseau ivoirien.

### 4. Les images de marque vivent dans `public/brand/`
Et pas dans `src/` — parce que le linter ne scanne que `src/` et `bientot/`, et
que les SVG de logo embarquent des couleurs. Elles sont servies en **WebP**
(108 Ko au total contre 652 Ko en PNG).

Les logos sont les fichiers **officiels**, seulement redimensionnés. Règle du
brandbook : **jamais inverser les couleurs du logo** — sur fond sombre, on
utilise la variante « contour » (`logo-horizontal-dark.webp`), pas un filtre CSS.

### 5. Pourquoi les pictos sont dessinés à la main
Le design system fournit 151 pictos, mais ce ne sont **pas des vecteurs** : les
fichiers `assets/icons/<nom>.svg` sont des découpes (`<image href="…png">`) d'un
sprite raster de 924×540, soit ~39×40 px par picto. Net dans l'app, visiblement
flou dès qu'on l'agrandit en retina sur le web. `src/components/BrandIcons.tsx`
redessine donc les 3 pictos nécessaires **dans la grammaire du jeu officiel**
(trait 1,6 px, bouts arrondis, grille 24 px, `currentColor`).

---

## Structure

```
index.html                 preload des 2 polices du premier écran
nginx.conf                 config de prod (fallback SPA + include sécurité)
security-headers.conf      CSP et en-têtes, source unique
Dockerfile                 build Vite (node) → runtime nginx:alpine
public/fonts/              Klinsman + Gotham (WOFF2 + repli otf/ttf)
public/brand/              logos, Moka, pin — en WebP
src/theme/                 tokens.ts + tokens.css (SEULES sources de hex)
src/styles/                global.css + fonts.css
src/components/            Layout, StoreBadges, BrandIcons
src/pages/                 LandingPage, NotFound, legal/ (×4)
scripts/lint-vocab.mjs     lint dialecte + palette
bientot/                   page historique autonome, sans décompte de lancement
                           (déploiement distinct sur bientot.spawt.online)
```

## Les pages légales ne sont pas décoratives

`/legal/confidentialite`, `/legal/cgu`, `/legal/cgv` et
`/legal/suppression-compte` restent en ligne bien que la vitrine ne vende rien :
**Apple et Google exigent une URL de politique de confidentialité et un chemin
de suppression de compte** pour accepter la fiche de l'app. Les retirer
bloquerait la publication de l'app que cette page annonce.

## Déploiement

Coolify, application `spawt-portail-apercu` (`dz5jc8dg8gw5tk1viopxg8q2`), qui
sert `spawt.online`, `www.spawt.online` (redirigé vers l'apex) et
`portail.spawt.online`. Build pack Dockerfile, branche
`claude/vitrine-one-page`. La page historique autonome reste portée par
`claude/app-finale-ios-android-f8ewrp` et son Dockerfile `bientot/Dockerfile`.

Le site et le quiz sont en ligne. La page historique `bientot.spawt.online`
reste accessible sans décompte ; elle renvoie vers le quiz à six questions et
la vitrine. La correction du lancement expiré est présente dans les deux branches
qui portent ces déploiements : elle ne doit pas être réintroduite lors d’un retour
à une version antérieure.

Réception du 9 octobre 2026 : vitrine principale et page historique ouvertes dans
un navigateur, aucun compteur expiré visible ; l’entrée du quiz annonce six
questions. Ce contrôle ne reçoit pas le parcours complet du quiz ni tout l’univers
de marque. Les versions précédentes restent dans l’historique Coolify, avec cette
correction à préserver.

### Logo de l’édition publique

Le logo choisi dans Connexions est désormais lu aux deux emplacements de la
vitrine. La publication reste une décision explicite de la marque : le site ne
choisit pas la première variante du coffre. Les images distantes sont limitées
aux fichiers de `https://powerupgraders.com/brand/`, sans paramètres ni accès
privé ; la CSP porte la même limite. Les polices embarquées servent de repli local. Si l’image
ne charge pas, le logo canon embarqué prend le relais. Une nouvelle URL réessaie
le chargement ; une réponse ancienne annulée n’écrase pas la nouvelle édition.

Le transport borné de La Fusée conserve les octets du logo par édition ; ce
lecteur reste compatible avec les éditions v1. Le quiz à six questions conserve
son contrat propre.

### Identité publiée par usage

La lecture `public-brand-v2` ajoute les six couleurs choisies, deux familles de
polices (titres/corps) et leurs fichiers OTF/TTF, trois usages de Moka
(accueil/découverte/guidage), ainsi qu’une citation et son attribution. Les choix
et références privés restent dans La Fusée ; aucune charte brouillon n’est
publiée implicitement. Les familles non choisies gardent leur présentation locale.

Le site valide le contrat, le digest et les URL exactes de l’édition. Il reçoit
et vérifie longueur/type/SHA-256 de chaque fichier, puis décode les polices avec
FontFace et les images avant d’appliquer l’identité entière. Les polices sont
chargées depuis les octets vérifiés ; les poses utilisent ces mêmes octets en
image data. La CSP reste inchangée. Une édition inchangée ne recharge pas ces
fichiers à chaque contrôle ; chargement, retour au premier plan et contrôle
visible toutes les cinq minutes suivent les publications nouvelles.

Un fichier refusé conserve la dernière édition reçue dans la page ouverte ; un
nouveau chargement indisponible garde la copie canon embarquée. Ce reçu n’est
pas persisté après fermeture de page. Les tailles, la composition, les tons
adaptés, les pages légales, les stores et le contrat du quiz restent propres à
la vitrine. Les cinq fichiers de polices utilisés sont choisis pour cette
surface : une graisse inutilisée n’est pas chargée seulement parce qu’elle
existe dans le coffre. La filiation et la projection WOFF2 restent à recevoir.

Réception locale du candidat : 38 tests, typecheck/build et décodage natif de
cinq polices et trois poses. Le harness transporte seulement les deux lectures
via un proxy vers une base isolée ; il ne prouve pas la CSP du domaine public.
Cette limite décrit le harness local initial. La réception en production du
9 octobre 2026 est désormais distinctement reçue : La Fusée 6.27.432 publie le
choix SPAWT v4, le republie sans resélection v5, puis le retour à v4 crée v6.
Les huit copies et le choix sont conservés. Cinq FontFace chargées, trois PNG
Moka décodés, six couleurs et citation sont reçus dans la vitrine ; l’export v1
reste compatible. CSP et trois origines CORS inchangées, sans exception/500/log
observé dans la fenêtre finale bornée. Aucun résultat métier ou cycle entier
de marque n’est déduit de cette lecture.

Le canon `adc4738` est livré sur les trois domaines. Les octets du build reçu
correspondent aux fichiers servis et au conteneur. Les build args vides et
`VITE_QUIZ_URL=https://quiz.spawt.online` sont pris en compte dans cette comparaison.
Les 38 tests/5 fichiers et les CI des PR #7 et #8 sont verts. La note sous les
badges est espacée de 16 px ; viewport 390 px sans débordement horizontal reçu.
Six questions et aucun décompte expiré conservés. Autres destinations, quiz/app,
filiation HD, équivalence WOFF2, reprise complète du stockage/clé et retour de
valeur restent ouverts ; le dernier reçu n’est pas persistant après fermeture.
