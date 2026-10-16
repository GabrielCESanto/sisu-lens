import { useState, type ReactNode } from 'react'

export interface Tabela { colunas: { nome: string; num?: boolean }[]; linhas: (string | number)[][] }

interface Props {
  titulo: string; sub?: string; classe?: string; carregando?: boolean; erro?: string | null
  tabela?: Tabela; children: ReactNode
}

/** Cartão de gráfico com alternância para a visão em tabela (o valor nunca fica só no tooltip). */
export function Cartao({ titulo, sub, classe = 'c6', carregando, erro, tabela, children }: Props) {
  const [verTabela, setVerTabela] = useState(false)
  return (
    <section className={`cartao ${classe}`}>
      <div className="cartao-topo">
        <div>
          <h2>{titulo}</h2>
          {sub && <p className="sub">{sub}</p>}
        </div>
        {tabela && (
          <button className="alternar" onClick={() => setVerTabela((v) => !v)} aria-pressed={verTabela}>
            {verTabela ? 'Ver gráfico' : 'Ver tabela'}
          </button>
        )}
      </div>
      {erro ? <div className="erro">Erro ao consultar: {erro}</div> : (
        <div className={carregando ? 'carregando' : undefined}>
          {verTabela && tabela ? <TabelaDados tabela={tabela} /> : children}
        </div>
      )}
    </section>
  )
}

export function TabelaDados({ tabela }: { tabela: Tabela }) {
  return (
    <div className="tabela-wrap">
      <table className="dados">
        <thead><tr>{tabela.colunas.map((c) => <th key={c.nome} className={c.num ? 'num' : undefined}>{c.nome}</th>)}</tr></thead>
        <tbody>
          {tabela.linhas.map((l, i) => (
            <tr key={i}>{l.map((v, j) => <td key={j} className={tabela.colunas[j]?.num ? 'num' : undefined}>{v}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Tile({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="tile">
      <div className="rot">{rotulo}</div>
      <div className="val">{valor}</div>
      {detalhe && <div className="det">{detalhe}</div>}
    </div>
  )
}
