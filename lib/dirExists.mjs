import { stat } from 'fs'

const dirExists = async storeDir => await new Promise(resolve => stat(storeDir, staterr => resolve(!staterr)))

export {
  dirExists,
}
