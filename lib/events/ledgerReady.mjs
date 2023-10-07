const ledgers = {}

const externalResolvablePromise = () => {
  let _resolve
  const meta = {
    resolved: false,
  }
  const promise = new Promise(resolve => {
    _resolve = (r) => {
      meta.resolved = true
      return resolve(r)
    }
  })

  return { promise, resolve: _resolve, meta, }
}

/**
 * 
 * @param {number} ledger - Ledger Index
 * @param {(ledger_binary_transactions|ledger_info|vl|validation)} readyElement - 
 */

const ledgerReady = async (ledger, readyElement) => {
  // console.log('LedgerReady', ledger, readyElement)
  const ledgerIndexString = String(ledger)

  if (!ledgers?.[ledgerIndexString]) {
    const ledger_binary_transactions = externalResolvablePromise()
    const ledger_info = externalResolvablePromise()
    const vl = externalResolvablePromise()

    const ready = Promise.all([
      ledger_binary_transactions.promise,
      ledger_info.promise,
      vl.promise,
    ])

    Object.assign(ledgers, {
      [ledgerIndexString]: {
        ledger_binary_transactions,
        ledger_info,
        vl,
        validation: 0,
        ready,
        timeout: null,
      }
    })

    // Set timeout to clean up
    ledgers[ledgerIndexString].timeout = setTimeout(() => {
      // console.log('Cleaning up', ledgerIndexString)
      if (ledgers?.[ledgerIndexString]) {
        ledgers?.[ledgerIndexString]?.ledger_binary_transactions?.resolve(false)
        ledgers?.[ledgerIndexString]?.ledger_info?.resolve(false)
        ledgers?.[ledgerIndexString]?.vl?.resolve(false)
      }

      // Force GC
      setTimeout(() => {
        if (ledgers?.[ledgerIndexString]) delete ledgers?.[ledgerIndexString]
      }, 50)
    }, 20_000)
  }

  if (
    readyElement === 'ledger_binary_transactions'
    || readyElement === 'ledger_info'
    || readyElement === 'vl'
  ) {
    ledgers[ledgerIndexString][readyElement].resolve(new Date() / 1000)
  }
  if (readyElement === 'validation') {
    ledgers[ledgerIndexString][readyElement]++
  }
}

const waitForLedgerReady = ledgerIndex => {
  return ledgers?.[String(ledgerIndex)]?.ready
}

const isLedgerReady = ledgerIndex => {
  return ledgers?.[String(ledgerIndex)]?.ledger_binary_transactions.meta.resolved
    && ledgers?.[String(ledgerIndex)]?.ledger_info.meta.resolved
    && ledgers?.[String(ledgerIndex)]?.vl.meta.resolved
}

export {
  ledgerReady,
  isLedgerReady,
  waitForLedgerReady,
}

// Play nice with Docker
const quit = () => {
  Object.values(ledgers).forEach(l => {
    clearTimeout(l?.timeout)
    l?.ledger_binary_transactions?.resolve(false)
    l?.ledger_info?.resolve(false)
    l?.vl?.resolve(false)
  })
}

process.on('SIGINT', quit) // Node
process.on('SIGTERM', quit) // Docker    
