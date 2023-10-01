import { writeFile } from 'fs'
import { ledgerIndexToFolders } from './ledgerIndexToFolders.mjs'
import { computeBinaryTransactionHash } from './computeBinaryTransactionHash.mjs'
import { dirExists } from './dirExists.mjs'
import 'dotenv/config'

const obtainedHumanReadableLedgers = []
const obtainedBinaryTxLedgers = []

const onLedger = async ({
  networkId,
  ledger,
  connection,
}) => {
  if ((ledger?.type || '').toUpperCase() === 'LEDGERCLOSED') {
    if (ledger?.txn_count > 0 && ledger?.ledger_index) {
      const relativeStoreDir = 'store/' + networkId + '/' + ledgerIndexToFolders(ledger.ledger_index)
      const storeDir = new URL('../' + relativeStoreDir, import.meta.url).pathname

      if (await dirExists(storeDir)) {
        ;[
          ...(
            obtainedBinaryTxLedgers.indexOf(ledger.ledger_index) < 0
              ? [
                  connection.send({
                    command: 'ledger',
                    ledger_index: ledger.ledger_index,
                    transactions: true,
                    expand: true,
                    binary: true,
                  })
                ]
              : []),
          ...(
            obtainedHumanReadableLedgers.indexOf(ledger.ledger_index) < 0
              ? [
                  connection.send({
                    command: 'ledger',
                    ledger_index: ledger.ledger_index,
                  })
                ]
              : []),
        ].map(query => query.then(results => {
          if (results?.validated && results?.ledger_index === ledger?.ledger_index && results?.ledger_hash === ledger?.ledger_hash) {
            if (
              results?.ledger?.transactions
              && Array.isArray(results.ledger.transactions)
              && results.ledger.transactions.length > 0
              && obtainedBinaryTxLedgers.indexOf(ledger.ledger_index) < 0
            ) {
              /**
               * Store in array, so if more ledger events come in and they
               * also result in a response here, it won't be saved again.
               * So yes: events will come in multiple times if multiple
               * nodes are connected, and yes, multiple promises will be
               * fired to fetch the ledger information, but then only
               * the first one will be stored.
               */
              obtainedBinaryTxLedgers.unshift(results.ledger_index)
              obtainedBinaryTxLedgers.length = 250

              console.log('Obtained ledger (binary)', relativeStoreDir, results.ledger_index, 'TX#', results.ledger.transactions.length)

              /**
               * Merge transaction hashes with the raw tx data
               */
              ;(results?.ledger?.transactions || []).map(t => {
                return Object.assign(t, { tx_id: computeBinaryTransactionHash(t.tx_blob), })
              })

              writeFile(storeDir + '/ledger_binary_transactions.json', Buffer.from(JSON.stringify(results.ledger), 'utf8'), err => {
                if (err) {
                  console.log('Error writing file @ ' + storeDir)
                }
              })
            }
            if (
              results?.ledger?.parent_hash
              && obtainedHumanReadableLedgers.indexOf(ledger.ledger_index) < 0
              && results?.ledger?.ledger_hash === ledger?.ledger_hash
            ) {
              /**
               * See comment above "Store in array" ... - first one will be stored
               */
              obtainedHumanReadableLedgers.unshift(results.ledger_index)
              obtainedHumanReadableLedgers.length = 250
        
              console.log('Obtained ledger (JSON object)', relativeStoreDir, results.ledger_index, 'Hash', results.ledger.ledger_hash)

              writeFile(storeDir + '/ledger_info.json', Buffer.from(JSON.stringify(results.ledger), 'utf8'), err => {
                if (err) {
                  console.log('Error writing file @ ' + storeDir)
                }
              })
            }
          }
        }))
      }

    }
  }
}

export {
  onLedger,
}
