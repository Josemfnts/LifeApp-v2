import { localISO } from '@/lib/finance/dates'

export const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
export const MONTHS_SH = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export function monthKey(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

interface ExportableTx {
  date: string
  concept: string
  category: string
  type: string
  amount: number
  note?: string
}

export function exportCSV(txs: ExportableTx[], toast: { show: (m: string) => void }) {
  const headers = 'Fecha,Concepto,Categoría,Tipo,Importe,Nota'
  const rows = txs.map(t => `${t.date},"${t.concept}","${t.category}",${t.type},${t.amount},"${t.note || ''}"`)
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `lifeos-finanzas-${localISO()}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
  toast.show('✓ CSV exportado')
}
