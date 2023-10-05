# Validation Ledger & Transaction Store
## To generate xPOPs

Watcher that connects to multiple nodes & listens for validation messages, closed ledgers & transactions, and stores all of it in an organised file system data structure for xPOP 
generation.

Based on the work by @RichardAH: https://github.com/RichardAH/xpop-generator

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

This file browser is for development and test purposes only, for production, put a static webserver
in front of this application & reverse proxy only the WebSocket (HTTP Upgrade) server.
