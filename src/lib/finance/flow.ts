import type { TxKind } from './types.ts'

export function isFlow(tx: { kind?: TxKind }): boolean {
  return !tx.kind
}
