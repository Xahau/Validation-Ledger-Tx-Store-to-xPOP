import { URL } from 'url'
import { mkdir, stat } from 'fs'

const createDirectory = dir => new Promise((resolve, reject) => {
  const dirToCreate = new URL('../' + dir, import.meta.url).pathname
  stat(dirToCreate, staterr => {
    if (staterr) {
      mkdir(dirToCreate, { recursive: true }, mkerr => {
        if (mkerr) {
          reject(new Error('Error creating Store directory: ' + staterr?.message + ' » ' + mkerr?.message))
        }
        resolve(dirToCreate)
      })
    } else{
      resolve(dirToCreate)
    }
  })  
})

export {
  createDirectory,
}
