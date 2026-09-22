# SPAWT — Vitrine web (`spawt.online`)

Page unique de présentation de l'app SPAWT. **Purement vitrine** : aucun achat,
aucune connexion, aucun backend. Les seuls liens sortants sont le quiz du Palais
et Instagram.

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

Il n'y a volontairement **aucune clé d'API ni aucun secret** : la vitrine ne
contacte aucun service.

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
`security-headers.conf` pose `connect-src 'none'` et `form-action 'none'` —
c'est un constat, pas une précaution : la vitrine ne fait aucun appel réseau et
n'a aucun formulaire. `src/__tests__/security-headers.test.ts` l'assert par
égalité stricte, tout comme `font-src 'self'` et `script-src 'self'`.

Donc **tout est same-origin** : pas de Google Fonts, pas de CDN d'images, pas
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
bientot/                   ancienne page de décompte (servie sur
                           bientot.spawt.online — filet de rollback)
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
`claude/app-finale-ios-android-f8ewrp`.

Rollback : la page de décompte tourne toujours sur `bientot.spawt.online`, et
les versions précédentes restent dans l'historique Coolify.
