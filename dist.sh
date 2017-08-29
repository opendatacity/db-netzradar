#!/bin/bash

# generate compressed js
rm assets/js/netzradar.min.js
./node_modules/uglify/bin/uglify -s assets/js/canvas.js,assets/js/dataloader.js,assets/js/layers.js,assets/js/main.js -o assets/js/netzradar.min.js

# generate compressed libraries
rm assets/lib/libraries.min.js
./node_modules/uglify/bin/uglify -s assets/lib/jquery-1.11.2.min.js,assets/lib/bootstrap/js/bootstrap.js,assets/lib/chroma.js,assets/lib/leaflet/leaflet.js,assets/lib/modernizr.min.js,assets/lib/slick.js -o assets/lib/libraries.min.js

# refresh gzipped versions
find ./ -name "*.gz" -type f -delete
find assets/ -name "*.css" -type f -exec gzip -k9 {} \;
find assets/ -name "*.js" -type f -exec gzip -k9 {} \;
find assets/ -name "*.json" -type f -exec gzip -k9 {} \;
find assets/ -name "*.geojson" -type f -exec gzip -k9 {} \;
find assets/ -name "*.eot" -type f -exec gzip -k9 {} \;
find assets/ -name "*.svg" -type f -exec gzip -k9 {} \;
find assets/ -name "*.woff" -type f -exec gzip -k9 {} \;
find assets/ -name "*.woff2" -type f -exec gzip -k9 {} \;
find assets/ -name "*.ttf" -type f -exec gzip -k9 {} \;
gzip -k ./index.html

# generate new dist file
rm -rf dist;

mkdir -p dist/assets/style
cp assets/style/mobile.css dist/assets/style/.

mkdir -p dist/assets/data
echo -n "var _data=" > dist/assets/data/data.js
cat assets/data/data4000.json >> dist/assets/data/data.js
echo -n ";" >> dist/assets/data/data.js

# fonts
mkdir -p dist/assets/fonts/dbglyphs
mkdir -p dist/assets/fonts/dbhead
mkdir -p dist/assets/fonts/dboffice
cp assets/fonts/fonts.min.css dist/assets/fonts/.
cp assets/fonts/dbglyphs/*.eot dist/assets/fonts/dbglyphs/.
cp assets/fonts/dbglyphs/*.svg dist/assets/fonts/dbglyphs/.
cp assets/fonts/dbglyphs/*.ttf dist/assets/fonts/dbglyphs/.
cp assets/fonts/dbglyphs/*.woff dist/assets/fonts/dbglyphs/.
cp assets/fonts/dbhead/*.eot dist/assets/fonts/dbhead/.
cp assets/fonts/dbhead/*.svg dist/assets/fonts/dbhead/.
cp assets/fonts/dbhead/*.ttf dist/assets/fonts/dbhead/.
cp assets/fonts/dbhead/*.woff dist/assets/fonts/dbhead/.
cp assets/fonts/dboffice/*.eot dist/assets/fonts/dboffice/.
cp assets/fonts/dboffice/*.svg dist/assets/fonts/dboffice/.
cp assets/fonts/dboffice/*.ttf dist/assets/fonts/dboffice/.
cp assets/fonts/dboffice/*.woff dist/assets/fonts/dboffice/.

# images
mkdir -p dist/assets/images
cp assets/images/background.png dist/assets/images/.
cp assets/images/locationmarker-*.png dist/assets/images/.
cp assets/images/phone-sprite.png dist/assets/images/.

# for debugging reasons
# cp assets/images/locationmarker.svg dist/assets/images/.
# cp assets/images/phone-sprite.svg dist/assets/images/.

mkdir -p dist/assets/js
#cp assets/js/canvas.js dist/assets/js/.
#cp assets/js/dataloader.js dist/assets/js/.
#cp assets/js/layers.js dist/assets/js/.
#cp assets/js/main.js dist/assets/js/.
cp assets/js/netzradar.min.js dist/assets/js/.

mkdir -p dist/assets/lib
cp assets/lib/libraries.min.js dist/assets/lib/.

mkdir -p dist/assets/lib/leaflet
cp assets/lib/leaflet/leaflet.min.css dist/assets/lib/leaflet/.

cp mobile.html dist/index.html

mkdir archive
mv dist.*.7z archive/.
7z a dist.$(date +"%Y%m%d%H%M00").7z dist