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
