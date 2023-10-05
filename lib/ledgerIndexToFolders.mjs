const ledgerIndexToFolders = ledgerIndex => {
  return String(ledgerIndex)
    .split('').reverse().join('') // Reverse
    .replace(/([0-9]{3})/g, '$1/')
    .split('').reverse().join('') // Reverse
    .replace(/^\//, '') // Remove prefix slash on i%3
}

export {
  ledgerIndexToFolders
}
