import { writeFile } from 'fs'
import { dirExists } from './dirExists.mjs'
import { ledgerIndexToFolders } from './ledgerIndexToFolders.mjs'
import { generateV1 as xpop } from '../xpop/generateV1.mjs'
import 'dotenv/config'

const lastSeenTransactions = []

const fields = (process.env?.FIELDSREQUIRED || '')
  .split(',')
  .map(f => f.trim())
  .filter(f => f.match(/^[a-zA-Z0-9]+$/))

const fieldsRequired = fields.length === 1 && fields[0] === ''
  ? [ 'Fee' ]
  : fields

const hasRequiredFields = tx => fieldsRequired.map(f => Object.keys(tx).includes(f)).every(f => !!f)

const onTransaction = async ({
  networkId,
  transaction,
}) => {
  if (transaction?.validated) {
    const { transaction: tx } = transaction

    if (tx.hash && lastSeenTransactions.indexOf(tx.hash) < 0) {
      lastSeenTransactions.unshift(tx.hash)
      lastSeenTransactions.length = 3000

      const validTx = hasRequiredFields(tx)
      if (!process.env?.NOELIGIBLEFULLTXLOG) {
        console.log('TX', tx.hash, validTx)
      }

      if (validTx && transaction?.ledger_index) {
        const relativeStorDir = 'store/' + networkId + '/' + ledgerIndexToFolders(transaction.ledger_index)
        const storeDir = new URL('../' + relativeStorDir, import.meta.url).pathname
        
        console.log('xPOP eligible', relativeStorDir, process.env?.NOELIGIBLEFULLTXLOG ? tx.hash : tx)

        if (await dirExists(storeDir)) {
          writeFile(storeDir + '/tx_' + tx.hash + '.json', Buffer.from(JSON.stringify(transaction), 'utf8'), err => {
            if (err) {
              console.log('Error writing file @ ' + storeDir)
            } else {
              /**
               * TX all ready, written to filesystem, ...
               * This is where we start a slight delay to give the `onLedger`
               * routine some time to fetch & store and then we'll try to
               * generate an xPOP.
               */
              setTimeout(async () => {
                console.log(
                  await xpop({
                    ledgerIndex: transaction.ledger_index,
                    networkId,
                    txHash: tx.hash,
                  })
                )
              }, 500)
              //  ^^ To check: is this enough? If e.g. retrieving the ledger info
              //     would take longer this may not be enough. Best solution:
              //     make this await the ledger fetching calls.
              //     Dirty: extend to e.g. 2000.
            }
          })
        }
      }
    }
  }
}

export {
  onTransaction,
}
