import { XrplClient } from 'xrpl-client'
import { createDirectory } from './lib/createDirectory.mjs'
import { onValidation } from './lib/onValidation.mjs'
import { onLedger } from './lib/onLedger.mjs'
import 'dotenv/config'
import assert from 'assert'
import wtf from 'wtfnode'
import { _health } from './bin/webserver.mjs'

const noLedgerTimeoutSec = Number(process.env.LEDGERTIMEOUTSEC || 15) || 15

let sigintEventHandler = false
let quitting = false

let aliveInterval

assert(process.env?.NODES, 'ENV var missing: NODES, containing: a comma separated list of websocket endpoints')

await createDirectory('store')
await createDirectory('store/xpop')

const connections = []

const connect = () => {
  console.log('<<<<< CONNECTING >>>>>')
  _health.reconnectCount++;

  connections.map(c => {
    console.log('# # # CLOSING', c.getState()?.server?.uri)

    c.removeAllListeners('validation')
    c.removeAllListeners('ledger')
    c.removeAllListeners('online')
    c.removeAllListeners('state')
    c.removeAllListeners('error')
    c.close()
  })

  connections.length = 0
  process.env.NODES.split(',').map(h => h.trim())
    .map(h => new XrplClient(h, {
      assumeOfflineAfterSeconds: 10,
      connectAttemptTimeoutSeconds: 10,
      maxConnectionAttempts: null,
    }))
    .forEach(c => {
      console.log('* * * CONNECTING', c.getState()?.server?.uri)
      connections.push(c)
    })

  connections
    .map(async c => {
      const subscribe = async () => {
        // await c.ready()
        
        /**
         * TODO: Auto disconnect if no messages for X
         * TODO: Generate xPOPs for matching transactions
         */

        try {
          c.send({ command: "subscribe", streams: [ "validations" ] })
          c.send({ command: "subscribe", streams: [ "ledger" ] })
          // No transactions, to make it easier for clients transactions are
          // processed in order (sorted on sequence) and emitted in order
          // to clients to prevent async tx sequence problems.
          } catch (e) {
          console.log(e.message)
        }
      }

      c.on("validation", validation => onValidation({
        connectionUrl: c.getState()?.server?.uri,
        networkId: c.getState()?.server?.networkId,
        validation,
      }))

      c.on("ledger", ledger => {
        clearTimeout(aliveInterval)
        aliveInterval = setTimeout(() => {
          console.log('Reconnecting, no recently closed ledger after sec.', noLedgerTimeoutSec)
          connect()
        }, noLedgerTimeoutSec * 1000)

        return onLedger({
          connectionUrl: c.getState()?.server?.uri,
          networkId: c.getState()?.server?.networkId,
          ledger,
          connection: c,
        })
      })

      c.on('online', subscribe)
      c.on('state', subscribe)

      // c.on('retry', () => subscribe())
      // c.on('round', () => subscribe())

      c.on('error', e => console.error(e?.message || e))
    })
  }

// Play nice with Docker etc.
if (!sigintEventHandler) {
  sigintEventHandler = true

  const quit = () => {
    if (!quitting) {
      clearTimeout(aliveInterval)

      quitting = true

      // Allow for re-quit shortly after
      setTimeout(() => {
        quitting = false
      }, 1000)

      console.log('Closing (interrupting) connections', connections.length)
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
  }

  process.on('SIGINT', quit) // Node
  process.on('SIGTERM', quit) // Docker    
}

// Here we go
connect()
