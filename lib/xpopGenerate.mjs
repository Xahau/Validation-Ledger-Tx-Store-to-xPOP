import assert from 'assert'
import { xpop } from './xpop/v1.mjs'
import { writeFile, readFile, readdir } from 'fs'
import { ledgerIndexToFolders } from '../lib/ledgerIndexToFolders.mjs'
import { dirExists } from '../lib/dirExists.mjs'

const cat = async file => {
  return new Promise((resolve, reject) => {
    readFile(new URL('../' + file, import.meta.url).pathname, (err, data) => {
      if (err) {
        reject(err)
      }
      if (data) resolve(data)
    })
  })
}

const catjson = async file => {
  const buffer = await cat(file)
  return JSON.parse(buffer.toString())
}

const xpopGenerate = async ({
  ledgerIndex,
  networkId,
  txHash
}) => {
  console.log('Generating XPOP for', ledgerIndex, txHash)

  const relativeStorDir = 'store/' + networkId + '/' + ledgerIndexToFolders(ledgerIndex)
  const storeDir = new URL('../' + relativeStorDir, import.meta.url).pathname

  if (await dirExists(storeDir)) {
    try {
      const files = await new Promise((resolve, reject) => {
        readdir(storeDir, (err, contents) => {
          if (err) reject(err)
          if (contents) resolve(contents)
        })
      })

      const validationFiles = files.filter(f => f.match(/^validation_n[a-zA-Z0-9]{10,}.json$/))
    
      assert(files.indexOf('ledger_binary_transactions.json') > -1, 'Missing ledger binary transactions')
      assert(files.indexOf('ledger_info.json') > -1, 'Missing ledger info')
      assert(files.indexOf('vl.json') > -1, 'Missing UNL info')
      assert(files.indexOf('tx_' + txHash + '.json') > -1, 'Missing TX ' + txHash)
      assert(validationFiles.length > 0, 'Validations missing')

      const [
        vl,
        json,
        binary,
        _allValidations,
        tx
      ] = await Promise.all([
        catjson(relativeStorDir + '/vl.json'),
        catjson(relativeStorDir + '/ledger_info.json'),
        catjson(relativeStorDir + '/ledger_binary_transactions.json'),
        Promise.all(validationFiles.map(f => catjson(relativeStorDir + '/' + f))),
        catjson(relativeStorDir + '/tx_' + txHash + '.json'),
      ])

      const unlValidators = Object.keys(vl?.unl || {})
      const validations = _allValidations.filter(v => unlValidators.indexOf(v.validation_public_key) > -1)

      const xpopJson = await xpop({ vl, ledger: { json, binary, }, validations, tx, })
      const xpopFilename = 'xpop_' + txHash + '.json'

      writeFile(storeDir + '/' + xpopFilename, Buffer.from(xpopJson, 'utf8'), err => {
        if (err) {
          console.log('   !!!->> Error writing xpop-file @ ' + storeDir)
        } else {
          console.log('   ---->> xPOP stored @ ' + relativeStorDir + '/' + xpopFilename + ', strlen: ' + xpopJson.length)
        }
      })
      
      return Buffer.from(xpopJson, 'utf-8').toString('hex')
    } catch (e) {
      console.log(e)
      throw new Error('Not all files required for xPOP generation found')
    }
  } else {
    throw new Error('xPOP source data storage dir missing: ' + relativeStorDir)
  }
}

export {
  xpopGenerate,
}
