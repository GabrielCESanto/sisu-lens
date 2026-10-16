const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const fmtInt = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? '–' : inteiro.format(v))
export const fmtDec = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? '–' : decimal.format(v))
export const fmtPct = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '–' : pct.format(v))
export const semestre = (ano: number, edicao: number) => `${ano}/${edicao}`
