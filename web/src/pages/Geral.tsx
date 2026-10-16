import { useConsulta } from '../lib/useConsulta'
import { where, type Filtros } from '../lib/filtros'
import { fmtInt, fmtPct, semestre } from '../lib/formato'
import { FAIXAS_IDADE } from '../lib/rotulos'
import { opBarras, opDivisao, opLinha } from '../lib/graficos'
import { Cartao, Tile } from '../components/Cartao'
import { Grafico } from '../components/Grafico'

export function Geral({ filtros }: { filtros: Filtros }) {
  const w = where(filtros)
  const porSem = useConsulta(`select ano, edicao, sum(n) as n from fato_inscritos ${w} group by all order by all`)
  const sexo = useConsulta(`select sexo, sum(n) as n from fato_inscritos ${w} group by 1`)
  const curso = useConsulta(`select curso, sum(n) as n from fato_inscritos ${w} group by 1 order by n desc`)
  const idade = useConsulta(`select faixa_idade, sum(n) as n from fato_inscritos ${w} and faixa_idade is not null group by 1`)

  const sem = porSem.dados ?? []
  const x = sem.map((r) => semestre(Number(r.ano), Number(r.edicao)))
  const y = sem.map((r) => Number(r.n))
  const total = y.reduce((a, b) => a + b, 0)
  const max = Math.max(...y), min = Math.min(...y)

  const sx = sexo.dados ?? []
  const nSexo = (s: string) => Number(sx.find((r) => r.sexo === s)?.n ?? 0)

  const cursos = curso.dados ?? []
  const top = cursos.slice(0, 15)
  const resto = cursos.slice(15).reduce((a, r) => a + Number(r.n), 0)
  const cursosCats = [...top.map((r) => String(r.curso)), ...(resto ? [`Outros (${cursos.length - 15} cursos)`] : [])]
  const cursosVals = [...top.map((r) => Number(r.n)), ...(resto ? [resto] : [])]

  const id = new Map((idade.dados ?? []).map((r) => [String(r.faixa_idade), Number(r.n)]))
  const faixas = FAIXAS_IDADE.filter((f) => id.has(f))

  return (
    <>
      <div className="tiles">
        <Tile rotulo="Total de inscrições" valor={fmtInt(total)} detalhe="1ª chamada / chamada regular" />
        <Tile rotulo="Média por semestre" valor={fmtInt(y.length ? total / y.length : null)} detalhe={`${y.length} semestres`} />
        <Tile rotulo="Queda maior → menor" valor={fmtPct(y.length ? 1 - min / max : null)} detalhe={y.length ? `${fmtInt(max)} → ${fmtInt(min)}` : undefined} />
        <Tile rotulo="Variação 1º → último" valor={fmtPct(y.length > 1 ? y[y.length - 1] / y[0] - 1 : null)} detalhe={y.length > 1 ? `${x[0]} → ${x[x.length - 1]}` : undefined} />
      </div>
      <div className="grade">
        <Cartao classe="c12" titulo="Inscrições por semestre" sub="Linha horizontal: média do período" carregando={porSem.carregando} erro={porSem.erro}
          tabela={{ colunas: [{ nome: 'Semestre' }, { nome: 'Inscrições', num: true }], linhas: sem.map((_, i) => [x[i], fmtInt(y[i])]) }}>
          <Grafico rotulo="Inscrições por semestre" altura={320} opcao={(t) => opLinha(t, x, { nome: 'Inscrições', dados: y }, { media: true })} />
        </Cartao>
        <Cartao classe="c12" titulo="Inscrições por sexo" carregando={sexo.carregando} erro={sexo.erro}
          tabela={{ colunas: [{ nome: 'Sexo' }, { nome: 'Inscrições', num: true }], linhas: [['Masculino', fmtInt(nSexo('M'))], ['Feminino', fmtInt(nSexo('F'))]] }}>
          <div className="sexo-linha">
            <Tile rotulo="Masculino" valor={fmtInt(nSexo('M'))} />
            <Tile rotulo="Feminino" valor={fmtInt(nSexo('F'))} />
            <Grafico rotulo="Divisão das inscrições por sexo" altura={96} opcao={(t) => opDivisao(t, [
              { nome: 'Masculino', valor: nSexo('M'), cor: t.s1, texto: '#1f1a10' },
              { nome: 'Feminino', valor: nSexo('F'), cor: t.s2, texto: '#ffffff' },
            ])} />
          </div>
        </Cartao>
        <Cartao classe="c6" titulo="Inscrições por curso" sub={cursos.length > 15 ? 'Os 15 maiores; o restante em "Outros"' : undefined}
          carregando={curso.carregando} erro={curso.erro}
          tabela={{ colunas: [{ nome: 'Curso' }, { nome: 'Inscrições', num: true }], linhas: cursos.map((r) => [String(r.curso), fmtInt(Number(r.n))]) }}>
          <Grafico rotulo="Inscrições por curso" altura={Math.max(220, cursosCats.length * 26)}
            opcao={(t) => opBarras(t, cursosCats, cursosVals, { horizontal: true, rotulos: true })} />
        </Cartao>
        <Cartao classe="c6" titulo="Inscrições por idade" sub="Idade no ano da edição" carregando={idade.carregando} erro={idade.erro}
          tabela={{ colunas: [{ nome: 'Faixa' }, { nome: 'Inscrições', num: true }], linhas: faixas.map((f) => [f, fmtInt(id.get(f))]) }}>
          <Grafico rotulo="Inscrições por faixa de idade" altura={300} opcao={(t) => opBarras(t, faixas, faixas.map((f) => id.get(f) ?? 0))} />
        </Cartao>
      </div>
    </>
  )
}
