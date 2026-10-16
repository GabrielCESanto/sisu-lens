import { useConsulta } from '../lib/useConsulta'
import { where, type Filtros } from '../lib/filtros'
import { fmtDec, fmtInt } from '../lib/formato'
import { opBarras, opBarrasAgrupadas } from '../lib/graficos'
import { Cartao } from '../components/Cartao'
import { Grafico } from '../components/Grafico'

export function Campi({ filtros }: { filtros: Filtros }) {
  const q = useConsulta(`
    select coalesce(c.nome, f.co_campus::varchar) as campus, sum(f.n) as n,
           sum(f.soma_idade) / nullif(sum(f.n_idade), 0) as idade,
           sum(f.n) filter (where f.sexo = 'M') as homens, sum(f.n) filter (where f.sexo = 'F') as mulheres
    from fato_inscritos f left join dim_campus c on c.co_ies = f.co_ies and c.co_campus = f.co_campus
    ${where(filtros, { ignorarCampus: true, alias: 'f' })}
    group by 1 order by n desc`)
  const r = q.dados ?? []
  const nomes = r.map((x) => String(x.campus))
  const tabela = {
    colunas: [{ nome: 'Câmpus' }, { nome: 'Inscrições', num: true }, { nome: 'Idade média', num: true }, { nome: 'Homens', num: true }, { nome: 'Mulheres', num: true }],
    linhas: r.map((x) => [String(x.campus), fmtInt(Number(x.n)), fmtDec(Number(x.idade)), fmtInt(Number(x.homens ?? 0)), fmtInt(Number(x.mulheres ?? 0))]),
  }
  const alt = Math.max(240, r.length * 30)
  return (
    <>
      <p className="aviso">Esta página compara todos os câmpus da instituição escolhida; o filtro de câmpus não se aplica aqui.</p>
      <div className="grade">
        <Cartao classe="c12" titulo="Inscrições por câmpus" carregando={q.carregando} erro={q.erro} tabela={tabela}>
          <Grafico rotulo="Inscrições por câmpus" altura={alt} opcao={(t) => opBarras(t, nomes, r.map((x) => Number(x.n)), { horizontal: true, rotulos: true })} />
        </Cartao>
        <Cartao classe="c5" titulo="Idade média por câmpus" carregando={q.carregando} erro={q.erro} tabela={tabela}>
          <Grafico rotulo="Idade média por câmpus" altura={alt} opcao={(t) => opBarras(t, nomes, r.map((x) => Number(Number(x.idade).toFixed(1))), { horizontal: true, rotulos: true, fmt: fmtDec })} />
        </Cartao>
        <Cartao classe="c7" titulo="Homens e mulheres por câmpus" carregando={q.carregando} erro={q.erro} tabela={tabela}>
          <Grafico rotulo="Homens e mulheres por câmpus" altura={alt} opcao={(t) => opBarrasAgrupadas(t, nomes, [
            { nome: 'Homens', dados: r.map((x) => Number(x.homens ?? 0)), cor: t.s1 },
            { nome: 'Mulheres', dados: r.map((x) => Number(x.mulheres ?? 0)), cor: t.s2 },
          ], { horizontal: true })} />
        </Cartao>
      </div>
    </>
  )
}
