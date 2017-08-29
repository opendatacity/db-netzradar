# DB Netzradar Frontend

Render geojson and data to a leaflet canvas layer, cache data in localStorage

* [index.html](./index.html) for web deployment
* [mobile.html](./mobile.html) for mobile deployment
* [frame.html](./frame.html) for teating mobile in a web browser


## Deploy
* put datafiles in assets/data
* go to the root of this project, run

    aws s3 cp . s3://netzradar.deutschebahn.com/ --recursive --exclude 'node_modules/*' --exclude '.git/*' --exclude '.idea/*'


## Data

* Files in assets/data are generated from TSV files, see [dbnetz_data](https://bitbucket.org/datenfreunde/dbnetz_data) repo.


## generating html for the app

this is done by dist.sh, which generates a dist folder that contains a standalone mobile version of this

