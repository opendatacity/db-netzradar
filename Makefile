
SHELL := /bin/bash

AWS_CONFIG=--profile=odc

list:
	aws $(AWS_CONFIG) s3 ls s3://netzradar.deutschebahn.com


get-index-html:
	aws $(AWS_CONFIG) s3 cp s3://netzradar.deutschebahn.com/index.html ./index.html
