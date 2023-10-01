import { writeFile } from 'fs'
import { dirExists } from './dirExists.mjs'
import { ledgerIndexToFolders } from './ledgerIndexToFolders.mjs'
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

/**
 * TODO: FIELDSREQUIRED ENV VAR (so: decode tx) - if empty store all
 *       » Store transactions
 *       » Generate xPOP
 */

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
      console.log('TX', tx.hash, validTx)

      if (validTx && transaction?.ledger_index) {
        const relativeStorDir = 'store/' + networkId + '/' + ledgerIndexToFolders(transaction.ledger_index)
        const storeDir = new URL('../' + relativeStorDir, import.meta.url).pathname
        
        console.log('xPOP eligible', relativeStorDir, transaction)

        if (await dirExists(storeDir)) {
          writeFile(storeDir + '/tx_' + tx.hash + '.json', Buffer.from(JSON.stringify(transaction), 'utf8'), err => {
            if (err) {
              console.log('Error writing file @ ' + storeDir)
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
