# SPAWT Portail — spawt.online

Le portail web public de **SPAWT**, la carte du bon goût à Abidjan. C'est à la
fois la vitrine de l'app mobile **et le seul endroit où se paient les
abonnements** (modèle Spotify/Netflix : aucun achat dans l'app — elle renvoie
ici).

## Ce que le portail couvre

| Route | Rôle |
|---|---|
| `/` | Landing : promesse, les 3 piliers (Instinct / Identité / Communauté), Le Guet, badges stores, lien quiz archétype |
| `/gold` | Abonnement **Spawter Gold** : pitch, prix TTC (2 950 F CFA/mois · 29 500 F CFA/an, 2 mois offerts), FAQ |
| `/connexion` | Login OTP par SMS (+225), identique au flux de l'app mobile |
| `/gold/paiement` | Checkout Gold (auth requis) → page CinetPay (Orange Money, Wave, MTN MoMo) |
| `/gold/retour` | Retour paiement : poll de l'entitlement (3 s / 2 min), succès, attente ou échec |
| `/compte` | Mon abonnement : statut, renouvellement, factures, déconnexion |
| `/pro` | Espace lieux (B2B) : Spawt Libre 0 F · Pro 15 000 F HT/mois · Gold 65 000 F HT/mois |
| `/pro/dashboard` | Shell du tableau de bord lieux (Aperçu / Avis / Audience), prêt pour les vues SQL |
| `/legal/confidentialite` · `/legal/cgu` · `/legal/cgv` | Squelettes juridiques (loi 2013-450, ARTCI, TVA 18 %, rétractation 7 jours) — marqueurs `[À VALIDER PAR JURISTE]` |
| `/legal/suppression-compte` | Demande de suppression de compte, accessible sans connexion (exigence Google Play Data Safety) |

## Stack

Vite 5 · React 18 · TypeScript · react-router 7 · @supabase/supabase-js 2 ·
vitest 1 (mêmes majeures que `spawt-admin` du repo mobile). Pas de SSR : SPA
servie par nginx. Node ≥ 20.

## Dev local

```bash
npm ci
cp .env.example .env       # remplir au moins VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev                # http://localhost:5174
```

Sans backend configuré, le portail démarre en mode démo (bandeau explicite sur
les écrans concernés). Pour développer le tunnel de paiement sans backend :
`VITE_PAYMENT_MOCK=1` dans `.env` — le checkout simule la réponse de
`payment-checkout` et `/gold/retour` joue un succès.

### Gates qualité (les mêmes qu'en CI)

```bash
npm run lint:vocab   # dialecte SPAWT + « aucun hex hors src/theme/tokens.* »
npm run typecheck    # tsc --noEmit
npm test             # vitest (49 tests)
npm run build        # tsc + vite build
```

## Direction artistique (verrouillée)

- Palette canonique **uniquement** dans `src/theme/tokens.ts` et
  `src/theme/tokens.css` : noir `#0A0A0A`, or `#C8A44E`, vert chat `#2D6B4F`,
  blanc cassé `#FAFAF8`, crème sable `#EFE8DC` (+ rouge d'erreur `#B3261E`).
  Le lint échoue si un hex apparaît ailleurs dans `src/`.
- Polices : **Klinsman** (display) + **Gotham** (corps), copiées depuis l'app
  mobile dans `public/fonts/`, déclarées dans `src/styles/fonts.css` avec
  fallbacks système.
- Vocabulaire (lint `scripts/lint-vocab.mjs`, périmètre `src/`) : jamais
  « restaurant » (dire lieu/spot/maquis/table), ni le mot anglais isolé
  « user » (dire spawter), ni « check-in » (dire spawt), ni « gastronomie »,
  ni « leaderboard ».

## Auth : flux OTP partagé avec l'app

1. `POST {VITE_SUPABASE_URL}/functions/v1/otp-send` — body `{"phone_e164":"+225..."}`,
   headers `apikey` + `Authorization: Bearer <clé anon>`.
2. `POST .../functions/v1/otp-verify` — body `{"phone_e164":"...","otp_code":"123456"}`
   → `{"access_token":"...","refresh_token":"...","user_id":"..."}`.
3. `supabase.auth.setSession({access_token, refresh_token})` — session GoTrue
   réelle, refresh natif, persistée en localStorage.

Erreurs gérées : `invalid_otp`, rate limit `429` (5/heure/numéro), cooldown de
renvoi 30 s, `ACCOUNT_BANNED`. En phase actuelle le backend est en mode mock
SMS : code universel `123456`.

⚠️ Côté Supabase, ajouter l'origine du portail à `ALLOWED_ORIGINS` des Edge
Functions (CORS fail-closed) : `supabase secrets set ALLOWED_ORIGINS=https://spawt.online,http://localhost:5174`.

## Contrat `payment-checkout` (Edge Function À CRÉER — chantier parallèle)

Le portail est codé contre ce contrat exact (`src/lib/api.ts`, tests dans
`src/lib/__tests__/api.test.ts` qui font office de spec exécutable) :

```
POST {SUPABASE_URL}/functions/v1/payment-checkout
Headers : Authorization: Bearer <access_token du spawter> · apikey: <clé anon>
Body    : {"plan": "gold_monthly" | "gold_annual", "return_url": "<origin>/gold/retour"}

200 → {"payment_url": "https://checkout.cinetpay...", "transaction_id": "..."}
401 → session expirée (le portail déconnecte et renvoie vers /connexion)
409 → {"error": "already_active"} : déjà Gold (le portail renvoie vers /compte)
502 → {"error": "provider_error"} : CinetPay indisponible (bouton réessayer)
```

Après paiement, CinetPay redirige vers `{return_url}?transaction_id=...` et le
portail poll `GET /rest/v1/active_entitlements?select=*` (RLS own, token du
spawter) toutes les 3 s pendant 2 min max (`src/lib/entitlement.ts`, parsing
défensif du schéma). Le compte lit aussi
`GET /rest/v1/invoices?select=invoice_number,price_ttc,currency,status,issued_at&order=issued_at.desc`.

Le dashboard B2B (`src/lib/b2b-data.ts`) est prêt pour les vues
`b2b_place_stats_monthly` et `b2b_place_funnel` (chantier parallèle) : tant
qu'elles n'existent pas (404 / `42P01`), l'UI affiche « stats en
construction » sans casser.

## Déploiement Coolify (runbook pas-à-pas)

Prérequis : un serveur Coolify opérationnel et le DNS de `spawt.online`
pointant vers lui (enregistrement A).

1. **Créer l'application** — Coolify → ton projet → *+ New* → *Application*
   → source *Git Repository* → renseigner ce repo et la branche à déployer.
2. **Build pack** — choisir **Dockerfile** (le `Dockerfile` à la racine fait
   build Vite puis sert `dist/` via nginx avec fallback SPA `try_files`).
3. **Domaine** — dans *Configuration → Domains*, saisir
   `https://spawt.online`. Coolify provisionne le certificat Let's Encrypt.
4. **Variables d'environnement** — onglet *Environment Variables*, cocher
   **Build Variable** pour chacune (Vite les fige au build) :
   - `VITE_SUPABASE_URL` = URL du projet Supabase (cloud ou self-hosted)
   - `VITE_SUPABASE_ANON_KEY` = clé anon
   - `VITE_APPSTORE_URL` / `VITE_PLAYSTORE_URL` = liens stores (laisser vides
     tant que l'app n'est pas publiée → badges « bientôt »)
   - `VITE_PAYMENT_MOCK` : ne pas définir (ou `0`) en production
5. **Déployer** — bouton *Deploy*. Vérifier ensuite :
   `https://spawt.online/` (landing), `https://spawt.online/gold` (tarifs),
   `https://spawt.online/legal/cgu` en accès direct (le fallback SPA doit
   répondre 200, pas 404).
6. **Après coup** — ajouter l'origine `https://spawt.online` à
   `ALLOWED_ORIGINS` des Edge Functions (cf. section Auth), puis tester le
   login OTP de bout en bout.
7. **Redéploiement** — chaque changement de variable `VITE_*` nécessite un
   redeploy (elles sont compilées dans le bundle).

## Structure

```
public/fonts/            Klinsman + Gotham (copiées depuis l'app mobile)
scripts/lint-vocab.mjs   lint dialecte + hex hors tokens
src/theme/               tokens.ts + tokens.css (SEULES sources de hex)
src/styles/              fonts.css + global.css (mobile-first, var(--...) only)
src/lib/                 config, supabase, phone, api, entitlement, invoices, b2b-data
src/providers/           AuthProvider (session + RequireAuth)
src/components/          Layout, StoreBadges, Confetti
src/pages/               Landing, Gold, Connexion, Checkout, Retour, Compte,
                         Pro, ProDashboard, legal/ (x4), NotFound
src/test/                setup vitest + stub fetch contractuel (façon MSW)
```
