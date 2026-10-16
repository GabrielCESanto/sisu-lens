import { useConsulta } from '../lib/useConsulta'
import { where, type Filtros } from '../lib/filtros'
import { fmtDec, semestre } from '../lib/formato'
import { opBarras, opLinha } from '../lib/graficos'
import { Cartao, Tile } from '../components/Cartao'
import { Grafico } from '../components/Grafico'

const PROVAS = [
  ['ch', 'Ciências Humanas'], ['cn', 'Ciências da Natureza'], ['lc', 'Linguagens'], ['mt', 'Matemática'], ['rd', 'Redação'],
] as const

export function Notas({ filtros }: { filtros: Filtros }) {
  const w = where(filtros)
  const geral = useConsulta(`select sum(soma_nota) / sum(n_nota) as nota, sum(soma_corte) / sum(n_corte) as corte,
    ${PROVAS.map(([k]) => `sum(soma_${k}) / sum(n_provas) as ${k}`).join(', ')} from fato_inscritos ${w}`)
  const sem = useConsulta(`select ano, edicao, sum(soma_nota) / sum(n_nota) as nota, sum(soma_corte) / nullif(sum(n_corte), 0) as corte
    from fato_inscritos ${w} group by all order by all`)

  const g = geral.dados?.[0] ?? {}
  const s = sem.dados ?? []
  const x = s.map((r) => semestre(Number(r.ano), Number(r.edicao)))
  const nota = s.map((r) => Number(Number(r.nota).toFixed(2)))
  const corte = s.map((r) => (r.corte == null ? NaN : Number(Number(r.corte).toFixed(2))))
  const provas = PROVAS.map(([k, nome]) => ({ nome, v: Number(g[k]) }))

  return (
    <>
      <div className="tiles">
        <Tile rotulo="Média da nota do candidato" valor={fmtDec(Number(g.nota))} detalhe="nota ponderada usada na concorrência" />
        <Tile rotulo="Média da nota de corte" valor={fmtDec(Number(g.corte))} detalhe="sem os cursos que não divulgaram corte" />
        {provas.map((p) => <Tile key={p.nome} rotulo={p.nome} valor={fmtDec(p.v)} detalhe="média da prova no ENEM" />)}
      </div>
      <div className="grade">
        <Cartao classe="c6" titulo="Média da nota do candidato por semestre" carregando={sem.carregando} erro={sem.erro}
          tabela={{ colunas: [{ nome: 'Semestre' }, { nome: 'Média', num: true }], linhas: x.map((v, i) => [v, fmtDec(nota[i])]) }}>
          <Grafico rotulo="Média da nota por semestre" opcao={(t) => opLinha(t, x, { nome: 'Média', dados: nota }, { fmt: fmtDec })} />
        </Cartao>
        <Cartao classe="c6" titulo="Média da nota de corte por semestre" carregando={sem.carregando} erro={sem.erro}
          tabela={{ colunas: [{ nome: 'Semestre' }, { nome: 'Nota de corte', num: true }], linhas: x.map((v, i) => [v, fmtDec(corte[i])]) }}>
          <Grafico rotulo="Média da nota de corte por semestre" opcao={(t) => opLinha(t, x, { nome: 'Nota de corte', dados: corte }, { fmt: fmtDec })} />
        </Cartao>
        <Cartao classe="c12" titulo="Média por prova do ENEM" carregando={geral.carregando} erro={geral.erro}
          tabela={{ colunas: [{ nome: 'Prova' }, { nome: 'Média', num: true }], linhas: provas.map((p) => [p.nome, fmtDec(p.v)]) }}>
          <Grafico rotulo="Média por prova" altura={240} opcao={(t) => opBarras(t, provas.map((p) => p.nome), provas.map((p) => Number(p.v.toFixed(2))), { horizontal: true, rotulos: true, fmt: fmtDec })} />
        </Cartao>
      </div>
    </>
  )
}
