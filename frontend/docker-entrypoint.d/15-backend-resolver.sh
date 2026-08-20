#!/bin/sh
# Génère /etc/nginx/conf.d/resolver.conf depuis le DNS du conteneur.
# Nécessaire pour que nginx résolve l'upstream backend À LA REQUÊTE
# (et non au démarrage) : le frontend reste up même si le backend est absent.
set -eu

NS=$(awk '/^nameserver/ { print $2; exit }' /etc/resolv.conf)
if [ -z "$NS" ]; then
  NS="1.1.1.1"
fi

echo "resolver $NS valid=10s;" > /etc/nginx/conf.d/resolver.conf
