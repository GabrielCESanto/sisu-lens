import { useMemo, useState, type ReactNode } from 'react'
import { fmtInt, fmtPct } from '../lib/formato'

/** Linha comum às páginas de comparação: inscrições no total, no primeiro e no último ano. */
export interface LinhaQueda { chave: string; total: number; ini: number; fim: number; [k: string]: string | number }

export interface ColunaTexto { chave: string; nome: string; largura?: number; render?: (l: LinhaQueda) => ReactNode }

type Ordem = 'total' | 'ini' | 'fim' | 'dif' | 'pct' | string

const dif = (l: LinhaQueda) => l.fim - l.ini
/** Variação relativa; sem base no primeiro ano não há percentual. */
const pct = (l: LinhaQueda) => (l.ini > 0 ? l.fim / l.ini - 1 : null)

interface Props { linhas: LinhaQueda[]; textos: ColunaTexto[]; anoIni: number; anoFim: number; vazio?: string }

/** Tabela ordenável (clique no cabeçalho). Padrão: maior queda absoluta primeiro. */
export function TabelaQueda({ linhas, textos, anoIni, anoFim, vazio = 'Nada encontrado com esses filtros.' }: Props) {
  const [ordem, setOrdem] = useState<Ordem>('dif')
  const [asc, setAsc] = useState(true)

  const ordenadas = useMemo(() => {
    const valor = (l: LinhaQueda): number | string | null =>
      ordem === 'dif' ? dif(l) : ordem === 'pct' ? pct(l) : l[ordem]
    const s = [...linhas].sort((a, b) => {
      const va = valor(a), vb = valor(b)
      if (va == null) return vb == null ? 0 : 1 // sem valor sempre no fim
      if (vb == null) return -1
      const c = typeof va === 'string' ? va.localeCompare(String(vb), 'pt-BR') : va - (vb as number)
      return asc ? c : -c
    })
    return s
  }, [linhas, ordem, asc])

  const clicar = (c: Ordem, ascPadrao: boolean) => {
    if (c === ordem) setAsc((a) => !a)
    else { setOrdem(c); setAsc(ascPadrao) }
  }
  const th = (c: Ordem, nome: string, num: boolean, ascPadrao = !num) => (
    <th key={c} className={num ? 'num' : undefined} aria-sort={c === ordem ? (asc ? 'ascending' : 'descending') : 'none'}>
      <button className="ordenar" onClick={() => clicar(c, ascPadrao)}>
        {nome}{c === ordem ? (asc ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  )

  return (
    <div className="tabela-wrap alta">
      <table className="dados">
        <thead>
          <tr>
            <th className="num pos">#</th>
            {textos.map((t) => th(t.chave, t.nome, false))}
            {th('total', `Total ${anoIni}–${anoFim}`, true)}
            {th('ini', String(anoIni), true)}
            {th('fim', String(anoFim), true)}
            {th('dif', 'Diferença', true, true)}
            {th('pct', 'Variação', true, true)}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((l, i) => {
            const d = dif(l), p = pct(l)
            return (
              <tr key={l.chave}>
                <td className="num pos">{i + 1}</td>
                {textos.map((t) => <td key={t.chave} style={t.largura ? { minWidth: t.largura } : undefined}>{t.render ? t.render(l) : l[t.chave]}</td>)}
                <td className="num">{fmtInt(l.total)}</td>
                <td className="num">{fmtInt(l.ini)}</td>
                <td className="num">{fmtInt(l.fim)}</td>
                <td className={`num ${d < 0 ? 'neg' : ''}`}>{d > 0 ? '+' : ''}{fmtInt(d)}</td>
                <td className="num">
                  <span className="var">
                    <span className={`var-barra ${p != null && p < 0 ? 'neg' : 'pos'}`} style={{ width: `${Math.min(Math.abs(p ?? 0), 1) * 100}%` }} />
                    <span className={p != null && p < 0 ? 'neg' : undefined}>{p != null && p > 0 ? '+' : ''}{fmtPct(p)}</span>
                  </span>
                </td>
              </tr>
            )
          })}
          {ordenadas.length === 0 && <tr><td colSpan={textos.length + 6}>{vazio}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
