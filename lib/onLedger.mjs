import { writeFile } from 'fs'
import { stat } from 'fs'
import { ledgerIndexToFolders } from './ledgerIndexToFolders.mjs'
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

      const dirExists = await new Promise(resolve => stat(storeDir, staterr => resolve(!staterr)))

      if (dirExists) {
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
            if (results?.ledger?.transactions && obtainedBinaryTxLedgers.indexOf(ledger.ledger_index) < 0) {
              obtainedBinaryTxLedgers.unshift(results.ledger_index)
              obtainedBinaryTxLedgers.length = 250

              console.log('Obtained ledger (binary)', results.ledger_index, results.ledger.transactions.length)
              writeFile(storeDir + '/ledger_binary_transactions.json', Buffer.from(JSON.stringify(results.ledger), 'utf8'), err => {
                if (err) {
                  console.log('Error writing file @ ' + storeDir)
                }
              })
            }
            if (results?.ledger?.parent_hash && obtainedHumanReadableLedgers.indexOf(ledger.ledger_index) < 0) {
              obtainedHumanReadableLedgers.unshift(results.ledger_index)
              obtainedHumanReadableLedgers.length = 250
        
              console.log('Obtained ledger (JSON object)', results.ledger_index, results.ledger.ledger_hash)
              writeFile(storeDir + '/ledger.json', Buffer.from(JSON.stringify(results.ledger), 'utf8'), err => {
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
