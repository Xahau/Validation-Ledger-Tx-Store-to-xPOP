const ledgerIndexToFolders = ledgerIndex => {
  return Math.floor(ledgerIndex / Math.pow(10, 6)) + '/'
    + Math.floor((ledgerIndex % Math.pow(10, 6)) / Math.pow(10, 3)) + '/'
    + ledgerIndex % Math.pow(10, 6) % Math.pow(10, 3)
}

export {
  ledgerIndexToFolders
}
