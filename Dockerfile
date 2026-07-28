# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SPAWT Portail — image de production (build pack « Dockerfile » sur Coolify).
# Multi-stage : node 20 (build Vite) → nginx:alpine (statique + fallback SPA).
#
# ⚠️ Les variables VITE_* sont figées AU BUILD (Vite les inline dans le
# bundle). Sur Coolify, les déclarer en « Build Variable » pour qu'elles
# soient transmises comme build args au docker build.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ── Étape 1 : build ────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Variables Vite injectées au build (Coolify : Build Variables).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_APPSTORE_URL
ARG VITE_PLAYSTORE_URL
ARG VITE_QUIZ_URL
ARG VITE_PAYMENT_MOCK
# Rideau d'avant-lancement : « true » = ecran Bientot sauf pour l'equipe
# connectee (cf. README). Absent = build public normal.
ARG VITE_PREVIEW_GATE
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_APPSTORE_URL=$VITE_APPSTORE_URL \
    VITE_PLAYSTORE_URL=$VITE_PLAYSTORE_URL \
    VITE_QUIZ_URL=$VITE_QUIZ_URL \
    VITE_PAYMENT_MOCK=$VITE_PAYMENT_MOCK \
    VITE_PREVIEW_GATE=$VITE_PREVIEW_GATE

# Dépendances d'abord (cache Docker), sources ensuite.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ── Étape 2 : runtime nginx ────────────────────────────────────────
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# En-têtes de sécurité (CSP…) : fichier `include`é par nginx.conf. Copié HORS
# de conf.d/ pour ne pas être auto-chargé par le wildcard `include conf.d/*.conf`
# — il n'est monté que via l'`include` explicite de default.conf.
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
# 127.0.0.1 explicitement, pas `localhost` : sous Alpine, localhost résout
# ::1 en premier. Doublé par le `listen [::]:80` de nginx.conf — ceinture
# et bretelles, parce qu'un healthcheck faux négatif annule un déploiement
# qui fonctionne et fait chercher le bug dans le mauvais fichier.
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
