import { useEffect, useState } from 'react'
import * as echarts from 'echarts'
import { useConsulta } from '../lib/useConsulta'
import { where, type Filtros } from '../lib/filtros'
import { fmtInt, semestre } from '../lib/formato'
import { opBarras, opLinha } from '../lib/graficos'
import { Cartao } from '../components/Cartao'
import { Grafico } from '../components/Grafico'

let mapaPronto: Promise<void> | null = null
function carregarMapa() {
  mapaPronto ??= fetch(new URL('geo/br-uf.json', location.href)).then((r) => r.json())
    .then((geo) => { echarts.registerMap('BR', geo) })
  return mapaPronto
}

export function Regiao({ filtros }: { filtros: Filtros }) {
  const w = where(filtros)
  const [modo, setModo] = useState<'uf' | 'cidade'>('uf')
  const [mapaOk, setMapaOk] = useState(false)
  useEffect(() => { carregarMapa().then(() => setMapaOk(true)) }, [])

  const ufs = useConsulta(`select uf, sum(n) as n from fato_geo ${w} and uf is not null group by 1 order by n desc`)
  const mun = useConsulta(`select uf, municipio, sum(n) as n from fato_geo ${w} and municipio is not null group by all order by n desc`)
  const pontos = useConsulta(modo === 'cidade' ? `
      select m.nome_oficial as nome, g.uf, m.lon, m.lat, sum(g.n) as n
      from fato_geo g join dim_municipio m on g.uf = m.uf and g.municipio = m.municipio
      ${where(filtros, { alias: 'g' })}
      group by all order by n desc` : null)
  const sem = useConsulta(`select ano, edicao, sum(n) as n from fato_inscritos ${w} group by all order by all`)

  const u = ufs.dados ?? []
  const m = mun.dados ?? []
  const top = m.slice(0, 20)
  const p = pontos.dados ?? []
  const maxN = Math.max(1, ...p.map((r) => Number(r.n)))
  const s = sem.dados ?? []

  return (
    <div className="grade">
      <Cartao classe="c4" titulo="Inscrições por estado de origem" carregando={ufs.carregando} erro={ufs.erro}
        tabela={{ colunas: [{ nome: 'UF' }, { nome: 'Inscrições', num: true }], linhas: u.map((r) => [String(r.uf), fmtInt(Number(r.n))]) }}>
        <Grafico rotulo="Inscrições por estado" altura={Math.max(300, u.length * 22)} opcao={(t) => opBarras(t, u.map((r) => String(r.uf)), u.map((r) => Number(r.n)), { horizontal: true, rotulos: true })} />
      </Cartao>
      <Cartao classe="c8" titulo="Mapa de origem dos candidatos" sub={modo === 'uf' ? 'Cor mais escura = mais inscrições' : 'Área da bolha proporcional às inscrições'}
        carregando={!mapaOk || ufs.carregando || pontos.carregando} erro={pontos.erro}>
        <div className="secoes" role="group" aria-label="Agrupar mapa por">
          <button aria-pressed={modo === 'uf'} onClick={() => setModo('uf')}>Estado</button>
          <button aria-pressed={modo === 'cidade'} onClick={() => setModo('cidade')}>Cidade</button>
        </div>
        {mapaOk && (
          <Grafico rotulo="Mapa de origem dos candidatos" altura={520} opcao={(t) => modo === 'uf' ? {
            tooltip: { trigger: 'item', formatter: (q: unknown) => { const x = q as { name: string; value: number }; return `${x.name}: ${fmtInt(x.value || 0)}` } },
            visualMap: {
              min: 0, max: Math.max(1, ...u.map((r) => Number(r.n))), orient: 'horizontal', left: 0, bottom: 0, calculable: false,
              inRange: { color: [t.surface, t.ord[0], t.ord[2], t.ord[4]] }, textStyle: { color: t.muted }, formatter: (v: unknown) => fmtInt(Number(v)),
            },
            series: [{
              type: 'map', map: 'BR', roam: true, itemStyle: { borderColor: t.axis, areaColor: t.surface },
              emphasis: { label: { show: false }, itemStyle: { areaColor: t.s2 } },
              data: u.map((r) => ({ name: String(r.uf), value: Number(r.n) })),
            }],
          } : {
            tooltip: { trigger: 'item', formatter: (q: unknown) => { const x = q as { data: { name: string; value: number[] } }; return `${x.data.name}: ${fmtInt(x.data.value[2])}` } },
            geo: { map: 'BR', roam: true, itemStyle: { areaColor: t.surface, borderColor: t.axis }, emphasis: { disabled: true } },
            series: [{
              type: 'scatter', coordinateSystem: 'geo',
              data: p.map((r) => ({ name: `${r.nome} (${r.uf})`, value: [Number(r.lon), Number(r.lat), Number(r.n)] })),
              symbolSize: (v: number[]) => 4 + 30 * Math.sqrt(v[2] / maxN),
              itemStyle: { color: t.s1, opacity: 0.75, borderColor: t.surface, borderWidth: 1 },
            }],
          }} />
        )}
      </Cartao>
      <Cartao classe="c6" titulo="Municípios com mais inscrições" sub="Os 20 maiores" carregando={mun.carregando} erro={mun.erro}
        tabela={{ colunas: [{ nome: 'Município' }, { nome: 'UF' }, { nome: 'Inscrições', num: true }], linhas: m.slice(0, 300).map((r) => [String(r.municipio), String(r.uf), fmtInt(Number(r.n))]) }}>
        <Grafico rotulo="Municípios com mais inscrições" altura={520} opcao={(t) => opBarras(t, top.map((r) => `${r.municipio} (${r.uf})`), top.map((r) => Number(r.n)), { horizontal: true, rotulos: true })} />
      </Cartao>
      <Cartao classe="c6" titulo="Inscrições por semestre" carregando={sem.carregando} erro={sem.erro}
        tabela={{ colunas: [{ nome: 'Semestre' }, { nome: 'Inscrições', num: true }], linhas: s.map((r) => [semestre(Number(r.ano), Number(r.edicao)), fmtInt(Number(r.n))]) }}>
        <Grafico rotulo="Inscrições por semestre" altura={520} opcao={(t) => opLinha(t, s.map((r) => semestre(Number(r.ano), Number(r.edicao))), { nome: 'Inscrições', dados: s.map((r) => Number(r.n)) })} />
      </Cartao>
    </div>
  )
}
