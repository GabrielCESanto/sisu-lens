export interface Filtros {
  ies: number
  campus: number[]
  curso: string[]
  /** true = só inscrições aprovadas na chamada; false = todas */
  aprovado: boolean
  ano: number[]
  edicao: number[]
}

// Padrão: o recorte do TCC (UTFPR – Câmpus Cornélio Procópio).
export const FILTROS_PADRAO: Filtros = { ies: 588, campus: [220], curso: [], aprovado: false, ano: [], edicao: [] }

export const ANOS = Array.from({ length: 10 }, (_, i) => 2014 + i)

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`

/** Cláusula WHERE comum a todas as tabelas fato (grão: ano, edicao, co_ies, co_campus, curso, aprovado). */
export function where(f: Filtros, opcoes: { ignorarCampus?: boolean; alias?: string } = {}): string {
  const a = opcoes.alias ? `${opcoes.alias}.` : ''
  const c = [`${a}co_ies = ${Number(f.ies)}`]
  if (f.campus.length && !opcoes.ignorarCampus) c.push(`${a}co_campus in (${f.campus.map(Number).join(',')})`)
  if (f.curso.length) c.push(`${a}curso in (${f.curso.map(lit).join(',')})`)
  if (f.aprovado) c.push(`${a}aprovado`)
  if (f.ano.length) c.push(`${a}ano in (${f.ano.map(Number).join(',')})`)
  if (f.edicao.length) c.push(`${a}edicao in (${f.edicao.map(Number).join(',')})`)
  return `where ${c.join(' and ')}`
}

export const sqlLit = lit
