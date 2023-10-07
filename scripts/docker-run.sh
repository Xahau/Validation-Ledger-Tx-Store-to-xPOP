#!/bin/bash

self(){
  DIR=$( cd "$( dirname "$0" )/" && pwd)
  echo $DIR
}

docker run -i --env-file $(self)/../.env -v $(self)/../store/:/usr/src/app/store --name xpop --rm -p 3000:3000 \
    -e EVENT_SOCKET_PORT=3000 \
    -e URL_PREFIX=http://localhost:3000 \
    -e NETWORKID=1 \
    -e UNLURL=https://vl.altnet.rippletest.net \
    -e UNLKEY=ED264807102805220DA0F312E71FC2C69E1552C9C5790F6C25E3729DEB573D5860 \
    -e NODES=wss://testnet.xrpl-labs.com,wss://s.altnet.rippletest.net:51233 \
    -e FIELDSREQUIRED=Fee,Account,OperationLimit \
    -e NOVALIDATIONLOG=true \
    -e NOELIGIBLEFULLTXLOG=true \
  xpop
