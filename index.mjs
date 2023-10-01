import { XrplClient } from 'xrpl-client'
import { createDirectory } from './lib/createDirectory.mjs'
import { onValidation } from './lib/onValidation.mjs'
// import { onLedger } from './lib/onLedger.mjs'
// import { onTransaction } from './lib/onTransaction.mjs'
import 'dotenv/config'
import assert from 'assert'

assert(process.env?.NODES, 'ENV var missing: NODES, containing: a comma separated list of websocket endpoints')

await createDirectory('store')

process.env.NODES.split(',').map(h => h.trim())
  .map(h => new XrplClient(h)).map(async c => {
    await c.ready()

    /**
     * TODO: Auto disconnect if no messages for X
     */

    c.send({ command: "subscribe", streams: [
      "validations",
      // "ledger",
      // "transactions",
      // "transactions_proposed"
    ] })

    c.on("validation", validation => onValidation({
      connectionUrl: c.getState()?.server?.uri,
      networkId: c.getState()?.server?.networkId,
      validation,
    }))

    // c.on("ledger", ledger => onLedger({
    //   connectionUrl: c.getState()?.server?.uri,
    //   networkId: c.getState()?.server?.networkId,
    //   ledger,
    //   connection: c,
    // }))

    // c.on("transaction", transaction => onTransaction({
    //   connectionUrl: c.getState()?.server?.uri,
    //   networkId: c.getState()?.server?.networkId,
    //   transaction,
    //   connection: c,
    // }))
  })
