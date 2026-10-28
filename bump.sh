#!/usr/bin/env bash
# Met à jour le numéro de version des fichiers CSS/JS dans toutes les pages,
# pour que les navigateurs et le cache de GitHub Pages rechargent la dernière
# version après chaque mise en ligne. À lancer avant chaque commit qui touche
# assets/.
cd "$(dirname "$0")"
V=$(date +%Y%m%d%H%M)
for f in index.html 404.html */index.html; do
  sed -i '' -E "s#(assets/(style\.css|app\.js|config\.js))(\?v=[0-9]+)?#\1?v=$V#g" "$f"
done
echo "version $V"
