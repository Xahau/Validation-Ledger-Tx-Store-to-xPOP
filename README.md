# Validation Ledger & Transaction Store
## To generate xPOPs

Watcher that connects to multiple nodes & listens for validation messages, closed ledgers & transactions, and stores all of it in an organised file system data structure for xPOP 
generation.

Based on the work by @RichardAH: https://github.com/RichardAH/xpop-generator

## Output

#### Folder

This tool creates a folder structore in the `./store` directory, where it creates sub-directories like this:

> `store / {networkid} / {ledgerno(0, -6)} / {ledgerno(-6, -3)} / {ledgerno(-3)} /`

So e.g. for NetworkId `21338`, ledger index `82906790`, the path would be:

> `store/0/82/906/790`

This way entire chunks of stored ledger scan be easily fetched or pruned by removing a directory recursively.

#### Folder contents

Every folder will contain the following files:

- `ledger_binary_transactions.json` with the binary info for a `ledger` command, including transactions. The transactions contain the `meta`, `tx_blob` and a computed `tx_id`
- `ledger_info.json` with the regular `ledger` command output
- `vl.json` with the UNL validator list (signature checked)
- `validation_{signing pubkey}.json`, e.g. `validation_n9McDrz9tPujrQK3vMXJXzuEJv1B8UG3opfZEsFA8t6QxdZh1H6m.json`
- `tx_{tx hash}.json`, e.g. `tx_FFDEADBEEF64F423CB4B317370F9B40645BA9D5646B47837FDC74B8DCAFEBABE.json`
- (Optional, if all info was present) `xpop_{tx hash}.json`
