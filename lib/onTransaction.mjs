import { writeFile } from 'fs'
import { dirExists } from './dirExists.mjs'
import { ledgerIndexToFolders } from './ledgerIndexToFolders.mjs'
import { xpopGenerate } from './xpopGenerate.mjs'
import { waitForLedgerReady } from './events/ledgerReady.mjs'
import { emit } from '../bin/webserver.mjs'
import 'dotenv/config'

const xpopBinaryDir = new URL('../store/xpop', import.meta.url).pathname
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
            const wroteTxFile = await new Promise(resolve => {
              writeFile(storeDir + '/tx_' + tx.hash + '.json', Buffer.from(JSON.stringify(transaction), 'utf8'), err => {
                if (err) {
                  console.log('Error writing file @ ' + storeDir)
                  resolve(false)
                }
                resolve(true)
              })
            })

            if (wroteTxFile) {
              await waitForLedgerReady(transaction.ledger_index)
              /**
               * TX all ready, written to filesystem, ...
               * This is where we start a slight delay to give the `onLedger`
               * routine some time to fetch & store and then we'll try to
               * generate an xPOP.
               */
              const xpopBinary = await xpopGenerate({
                ledgerIndex: transaction.ledger_index,
                networkId,
                txHash: tx.hash,
              })
              if (await dirExists(xpopBinaryDir)) {
                const xpopWritten = await new Promise(resolve => {
                  writeFile(xpopBinaryDir + '/' + tx.hash, Buffer.from(xpopBinary, 'utf8'), err => {
                    if (err) {
                      console.log('Error writing binary XPOP', err)
                      resolve(false)
                    } else {
                      console.log('Wrote binary xPOP: ' + xpopBinaryDir + '/' + tx.hash)
                      resolve(true)
                    }
                  })
                })
                if (xpopWritten) {
                  console.log('   ### EMIT XPOP READY FOR', tx?.Account, Number(tx.Sequence), tx.hash)

                  return await emit({
                    account: tx?.Account,
                    sequence: tx.Sequence,
                    origin: {
                      tx: tx.hash,
                      networkId: networkId,
                      ledgerIndex: transaction.ledger_index,
                      burn: tx?.Fee,
                    },
                    destination: {
                      networkId: tx?.OperationLimit,
                    },
                    ...(
                      process.env?.URL_PREFIX
                        ? {
                            xpop: {
                              binary: `${process.env.URL_PREFIX}/xpop/${tx.hash}`,
                              source: `${process.env.URL_PREFIX}/${networkId}/${ledgerIndexToFolders(transaction.ledger_index)}/`,
                              blob: xpopBinary,
                            }
                          }
                        : {}
                    )
                  })
                }
              }
            }
          }
        }
      }
    }
}

export {
  onTransaction,
}
