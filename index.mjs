import { XrplClient } from 'xrpl-client'
import { createDirectory } from './lib/createDirectory.mjs'
import { onValidation } from './lib/onValidation.mjs'
import { onLedger } from './lib/onLedger.mjs'
import 'dotenv/config'
import assert from 'assert'
import wtf from 'wtfnode'
import './bin/webserver.mjs'

let sigintEventHandler = false

assert(process.env?.NODES, 'ENV var missing: NODES, containing: a comma separated list of websocket endpoints')

await createDirectory('store')
await createDirectory('store/xpop')

const connections = process.env.NODES.split(',').map(h => h.trim())
  .map(h => new XrplClient(h))

connections
  .map(async c => {
    
    const subscribe = async () => {
      await c.ready()
      
      /**
       * TODO: Auto disconnect if no messages for X
       * TODO: Generate xPOPs for matching transactions
       */

      c.send({ command: "subscribe", streams: [
        "validations",
        "ledger",
        // No transactions, to make it easier for clients transactions are
        // processed in order (sorted on sequence) and emitted in order
        // to clients to prevent async tx sequence problems.
      ] })

      c.on("validation", validation => onValidation({
        connectionUrl: c.getState()?.server?.uri,
        networkId: c.getState()?.server?.networkId,
        validation,
      }))

      c.on("ledger", ledger => onLedger({
        connectionUrl: c.getState()?.server?.uri,
        networkId: c.getState()?.server?.networkId,
        ledger,
        connection: c,
      }))
    }

    c.on('online', () => subscribe())

  })

// Play nice with Docker etc.
if (!sigintEventHandler) {
  sigintEventHandler = true

  const quit = () => {
    connections
      .map(async c => {
        console.info('Interrupted', c.getState()?.server?.uri)
        c.close()
      })

    if (process.env?.DEBUG) {
      // Display open handles
      console.log('-------------------')
      wtf.dump()
      console.log('-------------------' + `\n`)
    }
  }

  process.on('SIGINT', quit) // Node
  process.on('SIGTERM', quit) // Docker    
}
