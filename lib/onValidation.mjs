import { writeFile } from 'fs'
import { createDirectory } from './createDirectory.mjs'
import 'dotenv/config'
import { unlData } from './unlData.mjs'
import { ledgerIndexToFolders } from './ledgerIndexToFolders.mjs'
import { ledgerReady } from './events/ledgerReady.mjs'

let lastUnlLedgerIndex = 0
const lastSeenValidations = []
let lastCreatedLedgerDir

const onValidation = async ({
  connectionUrl,
  networkId,
  validation,
}) => {
  /**
   * Only proceed if the pubkey is on preferred UNL & reported by node with expected network ID
   */
  const validationHostInUnl = unlData.hosts.indexOf(validation.validation_public_key) > -1 && networkId === unlData.networkid
  const storeAllValidations = process.env?.ONLYUNLVALIDATIONS
  const validationLedgerIndex = Number(validation.ledger_index)

  if (validationHostInUnl && (lastUnlLedgerIndex === 0 || validationLedgerIndex > lastUnlLedgerIndex)) {
    lastUnlLedgerIndex = validationLedgerIndex
  }

  if (((validationHostInUnl && storeAllValidations) || !storeAllValidations) && Math.abs(Number(validation.ledger_index) - lastUnlLedgerIndex) < 10) {
    if (validationHostInUnl) {
      unlData.refresh()
    }

    const lastSeenKey = `${validation.ledger_index} @ ${validation.validation_public_key}`

    /**
     * Do not process & write same validation received from multiple nodes twice
     */
    if (lastSeenValidations.indexOf(lastSeenKey) < 0) {

      lastSeenValidations.unshift(lastSeenKey)
      lastSeenValidations.length = unlData.hosts.length * 10

      /**
       * Write to ledger index folder
       */
      const relativeStorDir = 'store/' + networkId + '/' + ledgerIndexToFolders(validation.ledger_index)
      const storeDir = new URL('../' + relativeStorDir, import.meta.url).pathname

      ledgerReady(validation.ledger_index, 'validation')

      if (lastCreatedLedgerDir !== validation.ledger_index) {
        await createDirectory(relativeStorDir)
        lastCreatedLedgerDir = validation.ledger_index

        writeFile(storeDir + '/vl.json', Buffer.from(JSON.stringify(unlData.data), 'utf8'), err => {
          if (err) {
            console.log('Error writing file @ ' + storeDir)
          } else {
            ledgerReady(validation.ledger_index, 'vl')
          }
        })  
      }

      /**
       * Debug output
       */
      if (!process.env?.NOVALIDATIONLOG) {
        console.log(
          networkId,
          validation.ledger_index,
          relativeStorDir,
          validation.validation_public_key,
          // validation.validated_hash, // parent hash
          validation.ledger_hash, // ledger_hash
          connectionUrl,
        )
      }

      /**
       * Create validation file
       */
      writeFile(storeDir + '/validation_' + validation.validation_public_key + '.json', Buffer.from(JSON.stringify(validation), 'utf8'), err => {
        if (err) {
          console.log('Error writing file @ ' + storeDir)
        }
      })
    }
  }
}

export {
  onValidation,
}
