#!/usr/bin/env bash
# Assemble dist/ puis publie sur Cloudflare Workers (mon-chauffagiste-prive.fr).
# dist/ ne contient que ce qui doit être public : pas le README, pas _da/,
# pas les scripts.
set -euo pipefail
cd "$(dirname "$0")"
./bump.sh >/dev/null
rm -rf dist && mkdir -p dist
for d in pompe-a-chaleur simulateur-aides entretien-chaudiere depannage-chauffage chaudiere-gaz \
         merci merci-hors-zone merci-non-eligible mentions-legales confidentialite; do
  mkdir -p "dist/$d" && cp "$d/index.html" "dist/$d/"
done
cp index.html 404.html dist/
cp -R assets dist/assets
cp -R img dist/img
cp -R fonts dist/fonts
cp _headers dist/_headers
echo "dist/ : $(find dist -type f | wc -l | tr -d ' ') fichiers, $(du -sh dist | cut -f1)"
exec npx wrangler@latest deploy "$@"
