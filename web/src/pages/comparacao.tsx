import { useMemo } from 'react'
import { useConsulta } from '../lib/useConsulta'
import { fmtInt, fmtPct } from '../lib/formato'
import { Tile } from '../components/Cartao'
import type { LinhaQueda } from '../components/TabelaQueda'

// Peças comuns às páginas Universidades e Cursos (comparação do primeiro com o último ano).

export const ANO_INI = 2014
export const ANO_FIM = 2023

export const REDES = ['Federal', 'Estadual', 'Municipal'].map((r) => ({ valor: r, rotulo: r }))

export function useUfs() {
  const q = useConsulta('select distinct uf from dim_ies order by uf')
  return useMemo(() => (q.dados ?? []).map((r) => ({ valor: String(r.uf), rotulo: String(r.uf) })), [q.dados])
}

export function ResumoQueda({ linhas, rotulo }: { linhas: LinhaQueda[]; rotulo: string }) {
  const ini = linhas.reduce((a, l) => a + l.ini, 0)
  const fim = linhas.reduce((a, l) => a + l.fim, 0)
  const caiu = linhas.filter((l) => l.fim < l.ini).length
  return (
    <div className="tiles">
      <Tile rotulo={rotulo} valor={fmtInt(linhas.length)} detalhe={linhas.length ? `${fmtInt(caiu)} com queda (${fmtPct(caiu / linhas.length)})` : undefined} />
      <Tile rotulo={`Inscrições em ${ANO_INI}`} valor={fmtInt(ini)} />
      <Tile rotulo={`Inscrições em ${ANO_FIM}`} valor={fmtInt(fim)} />
      <Tile rotulo="Variação no período" valor={fmtPct(ini ? fim / ini - 1 : null)} detalhe={`${fmtInt(fim - ini)} inscrições`} />
    </div>
  )
}
