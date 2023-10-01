import { HashPrefix } from 'ripple-binary-codec/dist/hash-prefixes.js'
import { sha512Half } from 'ripple-binary-codec/dist/hashes.js'
import { Buffer as BufferPf } from "buffer/index.js";

const computeBinaryTransactionHash = txBlobHex => {
  const prefix = HashPrefix.transactionID.toString('hex').toUpperCase()
  const input = BufferPf.from(prefix + txBlobHex, 'hex')
  return sha512Half(input).toString('hex').toUpperCase()
}

export {
  computeBinaryTransactionHash,
}
