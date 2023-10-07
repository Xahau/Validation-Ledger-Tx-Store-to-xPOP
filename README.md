# Validation Ledger & Transaction Store [![npm version](https://badge.fury.io/js/xpopgen.svg)](https://badge.fury.io/js/xpopgen)
## To generate xPOPs

Watcher that connects to multiple nodes & listens for validation messages, closed ledgers & transactions, and stores all of it in an organised file system data structure for xPOP 
generation. Why? Pretty important: XRPL validation messages are ephemeral, and if no one has them the burn can't be turned into a mint.

Based on the work by @RichardAH: https://github.com/RichardAH/xpop-generator

## Run (Docker)

#### Docker Compose

To run this service & nginx in two separate preconfigured containers, simply run:

```bash
TELEMETRY=YES URL_PREFIX=https://xpop.my-site.com docker-compose up --build
```

Unless specified otherwise (with environment variables) a connection to XRPL Testnet will be made.

The above command explained:
- `TELEMETRY=YES` sends the `URL_PREFIX` and request hostname to XRPL Labs to build an xPOP serving directory. Default: `NO`, change to `YES` to enable (much appreciated) if you want to run this service publicly for others to fetch xPOPs from (really really appreciate it 💕!)
- `URL_PREFIX` specifies a public URL (if applicable) you are serving your xPOPs on (mapped to this service)
- `--build` at the end makes sure you rebuild your service container, to make sure you're running the latest version of this code

##### Cleanup

The `docker-compose` machines also contain a clean up machine.

The clean up will clear the pre-generated xPOP HEX files from the `/xpop` folder when
older than `60 minutes [default=60]` - which can be changed with the `TTL_MINUTES_PREGEN_XPOP` environment variable.

The clean up will clear folders with all source files for xPOP generation from the `/store/{networkid}`
subfolders older than `30 days [default=30]` (one month) - which can be changed with the `TTL_DAYS_XPOP_SOURCE_FILES`
environment variable.

Expect a significant IO impact during cleanup if a lot of existing history is stored. Clean up will run
on `docker-compose up` and every `60 minutes [default=60]` thereafter - which can be changed with the
`TTL_MINUTES_CLEANUP_INTERVAL` environment variable.

##### Endpoints

You will get a container running at port 3000 (unless configured differently), with the following routes:

- `http://{host}:3000` » Web Browser: homepage with some stats and links
- `http://{host}:3000` » WebSocket: live events on xPOP generated
- `http://{host}:3000/blob` » WebSocket: live events on xPOP generated + HEX XPOP
- `http://{host}:3000/blob/{account}` » WebSocket: live events on xPOP generated + HEX XPOP for specific account
- `http://{host}:3000/xpop/{hash}` » HEX encoded xPOP
- `http://{host}:3000/{networkid}/{...}` » Web Browser Dirlisting & xPOP source files
- `http://{host}:3000/{networkid}/{...}` » Called with `Content-Type: application/json`? JSON dirlisting


#### Single Docker Container
Run a container with HTTP exposed, for XRPL testnet, auto-remove container after running & interactive (allow for CTRL+C to kill).

Docker Hub: https://hub.docker.com/r/wietsewind/xpop

```bash
docker rmi wietsewind/xpop:latest # Clean existing image, or build locally
docker run \
  --name xpop \
  --rm -i \
  -v $(pwd)/store:/usr/src/app/store
  -p 3000:3000 \
    -e EVENT_SOCKET_PORT=3000 \
    -e URL_PREFIX=http://localhost:3000 \
    -e NETWORKID=1 \
    -e UNLURL=https://vl.altnet.rippletest.net \
    -e UNLKEY=ED264807102805220DA0F312E71FC2C69E1552C9C5790F6C25E3729DEB573D5860 \
    -e NODES=wss://testnet.xrpl-labs.com,wss://s.altnet.rippletest.net:51233 \
    -e FIELDSREQUIRED=Fee,Account,OperationLimit \
    -e NOVALIDATIONLOG=true \
    -e NOELIGIBLEFULLTXLOG=true \
  wietsewind/xpop:latest
```

## Output

#### Folder

This tool creates a folder structore in the `./store` directory, where it creates sub-directories like this:

> `store / {networkid} / {ledgerpath///} /`

The `ledgerpath` is the ledger index chunked from right to left in sections of three digits, making sure there
are max. 1000 subfolders per level. This allows for easy dir listing & cleaning.

So e.g. for NetworkId `21338`, ledger index `82906790`, the path would be:

> `store/0/82/906/790`

This way entire chunks of stored ledger scan be easily fetched or pruned by removing a directory recursively.

#### Folder contents

Every folder will contain the following files:

- `ledger_binary_transactions.json` with the binary info for a `ledger` command, including transactions. The transactions contain the `meta`, `tx_blob` and a computed `tx_id`
- `ledger_info.json` with the regular `ledger` command output
- `vl.json` with the UNL validator list (signature checked)
- `validation_{signing pubkey}.json`, e.g. `validation_n9McDrz9tPujrQK3vMXJXzuEJv1B8UG3opfZEsFA8t6QxdZh1H6m.json`
- `tx_{tx hash}.json`, e.g. `tx_FFDEADBEEF64F423CB4B317370F9B40645BA9D5646B47837FDC74B8DCAFEBABE.json`
- `xpop_{tx hash}.json` for the generated xPOP (in JSON format)

## Helper scripts

`npm run serve` to launch a webserver for the `store` dir
`npm run dev` to launch (verbose)
`npm run xpopgen` to launch, less verbose

## Webserver

This script also runs a webserver is the env. var is provided for the TCP port & URL Prefix where the app will run:

```bash
EVENT_SOCKET_PORT="3000"
URL_PREFIX="https://4849bf891e06.ngrok.app"
```

#### WebSocket

You can listen for xPOP publish events (live, so you don't hve to poll).

By default you will get all xPOP events. If you want to filter on a specific address, provide
the r-address in the URL path. If you also want to receive the xPOP Blob, also provide `/blob` in the URL path.

E.g. `/blob/rwietsevLFg8XSmG3bEZzFein1g8RBqWDZ` would listen for xPOPs for account `rwietsevLFg8XSmG3bEZzFein1g8RBqWDZ`
and serve the (hex encoded) xPOP in the `xpop.blob` property.

#### HTTP File Browser

On the HTTP port a file listing is also provided & xPOPs can be downloaded at `/xpop/{tx hash}`.

Original source files to reconstruct the xPOP locally can be downloaded at `/{networkid}/`.

When visiting the `/{networkid}/` route, you'll be presented a dirlisting. When visiting with the HTTP
header `Accept: application/json` you will be presented a dirlisting & file browser in JSON format
for automation.

This file browser is for development and test purposes only, for production, put a static webserver
in front of this application & reverse proxy only the WebSocket (HTTP Upgrade) server.

#### Monitoring

A health check endpoint lives on `/health`, and returns e.g.:

```json
{  
    "uptime": 44023,
    "lastLedger": 41800244,
    "lastLedgerTx": 41800238,
    "txCount": 276
}
```

## Tools (Utils)

This package provides some internal helper functions:

- NPM (backend): https://www.npmjs.com/package/xpopgen
- CDN (browser): https://cdn.jsdelivr.net/npm/xpopgen/npm/browser.min.js

#### JS (backend)

```
import { ledgerIndexToFolders } from 'xpop-utils/npm/utils.mjs'
console.log(ledgerIndexToFolders(123456789))
```

#### JS (browser)

```
<script src="https://cdn.jsdelivr.net/npm/xpopgen/npm/browser.min.js"></script>
<script>
  const { ledgerIndexToFolders } = require('xpop-utils')
  console.log(ledgerIndexToFolders(123456789))
</script>
```
