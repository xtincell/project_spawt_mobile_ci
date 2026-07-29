# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SPAWT — page « Bientôt » de spawt.online.
#
# Pourquoi une image plutôt qu'un fichier posé à la main sur le serveur : c'est
# la seule page PUBLIQUE du produit, et c'était la seule qui ne vivait dans
# aucun dépôt. Personne ne pouvait dire ce qu'elle contenait sans la télécharger,
# et deux défauts y sont restés en ligne pendant des semaines — un lien de CTA
# vers un hôte inexistant (503) et un mot de passe écrit en clair dans le
# source. Les deux ont été trouvés en la mettant sous contrôle de version.
#
# Pas d'étape de build : c'est un seul fichier HTML autonome, sans dépendance,
# sans police distante. Le mettre dans un bundler serait ajouter un risque sans
# rien gagner.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80
# 127.0.0.1 explicitement : sous Alpine, `localhost` résout ::1 en premier, et
# un nginx qui n'écoute qu'en IPv4 ferait échouer le contrôle de santé — donc
# annuler un déploiement pourtant sain. Doublé par le `listen [::]:80`.
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
