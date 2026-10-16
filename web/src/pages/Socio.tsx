import { useMemo, useState } from 'react'
import { useConsulta } from '../lib/useConsulta'
import { sqlLit, where, type Filtros } from '../lib/filtros'
import { fmtDec, fmtInt, fmtPct, semestre } from '../lib/formato'
import { COR_RACA, ESCOLARIDADE, OCUPACAO, OCUPACAO_DESCRICAO, ORDEM_RENDA, QTD, RENDA, SEM_INFO, rotulo } from '../lib/rotulos'
import { opBarras, opBarrasAgrupadas, opLinha } from '../lib/graficos'
import { Cartao, Tile } from '../components/Cartao'
import { Grafico } from '../components/Grafico'
import type { Linha } from '../lib/db'

const SECOES = ['Renda', 'Região', 'Estudo e trabalho', 'Notas', 'Tecnologia', 'Escola e cor/raça', 'Temporal'] as const
type Secao = (typeof SECOES)[number]

type Dist = Map<string, { n: number; media: number | null }>

function distribuicao(linhas: Linha[], variavel: string): Dist {
  const m: Dist = new Map()
  for (const r of linhas) if (r.variavel === variavel) {
    const nn = Number(r.nn)
    m.set(String(r.categoria), { n: Number(r.n), media: nn ? Number(r.sn) / nn : null })
  }
  return m
}
const validas = (d: Dist, ordem: string[]) => ordem.filter((k) => (d.get(k)?.n ?? 0) > 0)
const semInfo = (d: Dist) => SEM_INFO.reduce((a, k) => a + (d.get(k)?.n ?? 0), 0)

export function Socio({ filtros }: { filtros: Filtros }) {
  const [secao, setSecao] = useState<Secao>('Renda')
  const w = where(filtros)
  const q = useConsulta(`select variavel, categoria, sum(n) as n, sum(soma_nota) as sn, sum(n_nota) as nn from fato_socio ${w} group by all`)
  const linhas = q.dados ?? []
  const d = useMemo(() => Object.fromEntries(
    ['renda', 'escolaridade_pai', 'escolaridade_mae', 'ocupacao_pai', 'ocupacao_mae', 'celulares', 'computadores', 'internet', 'cor_raca', 'tipo_escola']
      .map((v) => [v, distribuicao(linhas, v)])), [linhas])

  const renda = d.renda ?? new Map()
  const rendaOk = validas(renda, ORDEM_RENDA)
  const totalRenda = rendaOk.reduce((a, k) => a + renda.get(k)!.n, 0)
  const ordenadas = [...rendaOk].sort((a, b) => renda.get(b)!.n - renda.get(a)!.n)

  return (
    <>
      <div className="secoes" role="group" aria-label="Seções">
        {SECOES.map((s) => <button key={s} aria-pressed={s === secao} onClick={() => setSecao(s)}>{s}</button>)}
      </div>
      {semInfo(renda) > 0 && (
        <p className="aviso">
          {fmtInt(semInfo(renda))} inscrições não entram nestes gráficos: candidatos não localizados no ENEM, que não responderam
          ou que estão em grupos com menos de 5 pessoas (ocultados para proteger a privacidade).
        </p>
      )}

      {secao === 'Renda' && (
        <>
          <div className="tiles">
            <Tile rotulo="Inscrições com renda informada" valor={fmtInt(totalRenda)} />
            <Tile rotulo="Faixa mais frequente" valor={ordenadas[0] ? rotulo(RENDA, ordenadas[0]) : '–'} detalhe={ordenadas[0] ? `${fmtPct(renda.get(ordenadas[0])!.n / totalRenda)} das inscrições` : undefined} />
            <Tile rotulo="Faixa menos frequente" valor={ordenadas.at(-1) ? rotulo(RENDA, ordenadas.at(-1)!) : '–'} detalhe={ordenadas.at(-1) ? `${fmtPct(renda.get(ordenadas.at(-1)!)!.n / totalRenda)} das inscrições` : undefined} />
          </div>
          <div className="grade">
            <Cartao classe="c12" titulo="Inscrições por renda familiar mensal" sub="Em salários mínimos (SM) do ano da prova, comparável entre anos"
              carregando={q.carregando} erro={q.erro} tabela={tabelaDist(renda, rendaOk, RENDA, 'Renda')}>
              <Grafico rotulo="Inscrições por faixa de renda" altura={420}
                opcao={(t) => opBarras(t, rendaOk.map((k) => `${k} · ${RENDA[k]}`), rendaOk.map((k) => renda.get(k)!.n), { horizontal: true, rotulos: true })} />
            </Cartao>
          </div>
        </>
      )}

      {secao === 'Região' && <RendaPorUf filtros={filtros} />}

      {secao === 'Estudo e trabalho' && (
        <div className="grade">
          <Comparacao classe="c6" titulo="Escolaridade dos pais" carregando={q.carregando} erro={q.erro}
            pai={d.escolaridade_pai} mae={d.escolaridade_mae} ordem={['0', '1', '2', '3', '4', '5', '9']} mapa={ESCOLARIDADE} />
          <Comparacao classe="c6" titulo="Ocupação dos pais" sub="Pergunta inexistente no ENEM 2013–2014 (SISU 2014–2015)" carregando={q.carregando} erro={q.erro}
            pai={d.ocupacao_pai} mae={d.ocupacao_mae} ordem={['A', 'B', 'C', 'D', 'E', 'F']} mapa={OCUPACAO} />
          <section className="cartao c12">
            <h2>Grupos de ocupação (questionário do ENEM)</h2>
            <ul className="sub">{Object.entries(OCUPACAO_DESCRICAO).map(([k, v]) => <li key={k}><b>{OCUPACAO[k]}</b>: {v}</li>)}</ul>
          </section>
        </div>
      )}

      {secao === 'Notas' && <NotasPorRenda filtros={filtros} renda={renda} rendaOk={rendaOk} carregando={q.carregando} erro={q.erro} />}

      {secao === 'Tecnologia' && (
        <>
          <div className="tiles">
            <Tile rotulo="Com internet em casa" valor={fmtPct(pctSim(d.internet))} detalhe="entre quem respondeu" />
            <Tile rotulo="Com computador em casa" valor={fmtPct(pctPositivo(d.computadores))} />
            <Tile rotulo="Com 3 ou mais celulares" valor={fmtPct(pctCat(d.celulares, '3'))} />
          </div>
          <div className="grade">
            <Simples classe="c6" titulo="Celulares na residência" dist={d.celulares} ordem={['0', '1', '2', '3']} mapa={QTD} carregando={q.carregando} erro={q.erro} />
            <Simples classe="c6" titulo="Computadores na residência" dist={d.computadores} ordem={['0', '1', '2', '3']} mapa={QTD} carregando={q.carregando} erro={q.erro} />
          </div>
        </>
      )}

      {secao === 'Escola e cor/raça' && (
        <div className="grade">
          <Simples classe="c6" titulo="Tipo de escola do ensino médio" sub="Declarado no ENEM; muitos participantes não respondem"
            dist={d.tipo_escola} ordem={['Pública', 'Privada', 'Exterior', 'Não respondeu']} mapa={{}} carregando={q.carregando} erro={q.erro} incluirNaoResp />
          <Simples classe="c6" titulo="Cor/raça" dist={d.cor_raca} ordem={['1', '2', '3', '4', '5', '0']} mapa={COR_RACA} carregando={q.carregando} erro={q.erro} />
        </div>
      )}

      {secao === 'Temporal' && <RendaTemporal filtros={filtros} />}
    </>
  )
}

function tabelaDist(d: Dist, ordem: string[], mapa: Record<string, string>, nome: string) {
  return { colunas: [{ nome }, { nome: 'Inscrições', num: true }], linhas: ordem.map((k) => [rotulo(mapa, k), fmtInt(d.get(k)?.n ?? 0)]) }
}
const pctSim = (d?: Dist) => { const s = d?.get('Sim')?.n ?? 0, n = d?.get('Não')?.n ?? 0; return s + n ? s / (s + n) : null }
const pctPositivo = (d?: Dist) => { if (!d) return null; const t = ['0', '1', '2', '3'].reduce((a, k) => a + (d.get(k)?.n ?? 0), 0); return t ? 1 - (d.get('0')?.n ?? 0) / t : null }
const pctCat = (d: Dist | undefined, k: string) => { if (!d) return null; const t = ['0', '1', '2', '3'].reduce((a, c) => a + (d.get(c)?.n ?? 0), 0); return t ? (d.get(k)?.n ?? 0) / t : null }

function Simples({ titulo, sub, dist, ordem, mapa, classe, carregando, erro, incluirNaoResp }: {
  titulo: string; sub?: string; dist?: Dist; ordem: string[]; mapa: Record<string, string>; classe: string
  carregando: boolean; erro: string | null; incluirNaoResp?: boolean
}) {
  const d = dist ?? new Map()
  const ks = ordem.filter((k) => (d.get(k)?.n ?? 0) > 0 && (incluirNaoResp || !SEM_INFO.includes(k)))
  return (
    <Cartao classe={classe} titulo={titulo} sub={sub} carregando={carregando} erro={erro} tabela={tabelaDist(d, ks, mapa, titulo)}>
      <Grafico rotulo={titulo} opcao={(t) => opBarras(t, ks.map((k) => rotulo(mapa, k)), ks.map((k) => d.get(k)!.n), { rotulos: true })} />
    </Cartao>
  )
}

function Comparacao({ titulo, sub, pai, mae, ordem, mapa, classe, carregando, erro }: {
  titulo: string; sub?: string; pai?: Dist; mae?: Dist; ordem: string[]; mapa: Record<string, string>; classe: string
  carregando: boolean; erro: string | null
}) {
  const p = pai ?? new Map(), m = mae ?? new Map()
  const ks = ordem.filter((k) => (p.get(k)?.n ?? 0) + (m.get(k)?.n ?? 0) > 0)
  const cats = ks.map((k) => rotulo(mapa, k))
  return (
    <Cartao classe={classe} titulo={titulo} sub={sub} carregando={carregando} erro={erro}
      tabela={{ colunas: [{ nome: 'Categoria' }, { nome: 'Pai', num: true }, { nome: 'Mãe', num: true }], linhas: ks.map((k, i) => [cats[i], fmtInt(p.get(k)?.n ?? 0), fmtInt(m.get(k)?.n ?? 0)]) }}>
      <Grafico rotulo={titulo} altura={Math.max(260, ks.length * 44)} opcao={(t) => opBarrasAgrupadas(t, cats, [
        { nome: 'Pai', dados: ks.map((k) => p.get(k)?.n ?? 0), cor: t.s1 },
        { nome: 'Mãe', dados: ks.map((k) => m.get(k)?.n ?? 0), cor: t.s2 },
      ], { horizontal: true })} />
    </Cartao>
  )
}

function RendaPorUf({ filtros }: { filtros: Filtros }) {
  const w = where(filtros)
  const ufs = useConsulta(`select uf, sum(n) as n from fato_geo ${w} and uf is not null group by 1 order by n desc`)
  const [uf, setUf] = useState<string | null>(null)
  const ufSel = uf ?? (ufs.dados?.[0]?.uf as string | undefined) ?? null
  const renda = useConsulta(ufSel ? `select categoria, sum(n) as n from fato_renda_uf ${w} and uf = ${sqlLit(ufSel)} group by 1` : null)
  const mun = useConsulta(ufSel ? `select municipio, sum(n) as n from fato_geo ${w} and uf = ${sqlLit(ufSel)} group by 1 order by n desc limit 15` : null)
  const r = new Map((renda.dados ?? []).map((x) => [String(x.categoria), Number(x.n)]))
  const ks = ORDEM_RENDA.filter((k) => (r.get(k) ?? 0) > 0)
  const mm = mun.dados ?? []
  return (
    <>
      <div className="filtros" style={{ padding: '0 0 14px', gridTemplateColumns: 'minmax(200px, 320px)' }}>
        <div className="filtro">
          <label htmlFor="f-uf">Estado de origem do candidato</label>
          <select id="f-uf" className="sel" value={ufSel ?? ''} onChange={(e) => setUf(e.target.value)}>
            {(ufs.dados ?? []).map((x) => <option key={String(x.uf)} value={String(x.uf)}>{String(x.uf)} · {fmtInt(Number(x.n))} inscrições</option>)}
          </select>
        </div>
      </div>
      <div className="grade">
        <Cartao classe="c7" titulo={`Renda familiar · candidatos de ${ufSel ?? '–'}`} carregando={renda.carregando} erro={renda.erro}
          tabela={{ colunas: [{ nome: 'Renda' }, { nome: 'Inscrições', num: true }], linhas: ks.map((k) => [`${k} · ${RENDA[k]}`, fmtInt(r.get(k))]) }}>
          <Grafico rotulo="Renda por estado" altura={420} opcao={(t) => opBarras(t, ks.map((k) => `${k} · ${RENDA[k]}`), ks.map((k) => r.get(k)!), { horizontal: true, rotulos: true })} />
        </Cartao>
        <Cartao classe="c5" titulo={`Municípios com mais inscrições · ${ufSel ?? '–'}`} carregando={mun.carregando} erro={mun.erro}
          tabela={{ colunas: [{ nome: 'Município' }, { nome: 'Inscrições', num: true }], linhas: mm.map((x) => [String(x.municipio), fmtInt(Number(x.n))]) }}>
          <Grafico rotulo="Municípios" altura={420} opcao={(t) => opBarras(t, mm.map((x) => String(x.municipio)), mm.map((x) => Number(x.n)), { horizontal: true, rotulos: true })} />
        </Cartao>
      </div>
    </>
  )
}

function NotasPorRenda({ filtros, renda, rendaOk, carregando, erro }: { filtros: Filtros; renda: Dist; rendaOk: string[]; carregando: boolean; erro: string | null }) {
  const s = useConsulta(`select ano, edicao, sum(soma_nota) / sum(n_nota) as media from fato_inscritos ${where(filtros)} group by all order by all`)
  const ks = rendaOk.filter((k) => renda.get(k)?.media != null)
  const sem = s.dados ?? []
  return (
    <div className="grade">
      <Cartao classe="c7" titulo="Média da nota do candidato por renda" sub="Nota ponderada usada na concorrência" carregando={carregando} erro={erro}
        tabela={{ colunas: [{ nome: 'Renda' }, { nome: 'Média', num: true }], linhas: ks.map((k) => [`${k} · ${RENDA[k]}`, fmtDec(renda.get(k)!.media)]) }}>
        <Grafico rotulo="Média por renda" altura={360} opcao={(t) => opBarras(t, ks, ks.map((k) => Number(renda.get(k)!.media!.toFixed(2))), { fmt: fmtDec })} />
      </Cartao>
      <Cartao classe="c5" titulo="Média da nota por semestre" carregando={s.carregando} erro={s.erro}
        tabela={{ colunas: [{ nome: 'Semestre' }, { nome: 'Média', num: true }], linhas: sem.map((r) => [semestre(Number(r.ano), Number(r.edicao)), fmtDec(Number(r.media))]) }}>
        <Grafico rotulo="Média por semestre" altura={360} opcao={(t) => opLinha(t, sem.map((r) => semestre(Number(r.ano), Number(r.edicao))), { nome: 'Média', dados: sem.map((r) => Number(Number(r.media).toFixed(2))) }, { fmt: fmtDec })} />
      </Cartao>
    </div>
  )
}

function RendaTemporal({ filtros }: { filtros: Filtros }) {
  const [faixa, setFaixa] = useState('C')
  const s = useConsulta(`select ano, edicao, sum(n) as n from fato_socio ${where(filtros)} and variavel = 'renda' and categoria = ${sqlLit(faixa)} group by all order by all`)
  const sem = s.dados ?? []
  const x = sem.map((r) => semestre(Number(r.ano), Number(r.edicao)))
  const y = sem.map((r) => Number(r.n))
  return (
    <>
      <div className="filtros" style={{ padding: '0 0 14px', gridTemplateColumns: 'minmax(200px, 320px)' }}>
        <div className="filtro">
          <label htmlFor="f-faixa">Faixa de renda</label>
          <select id="f-faixa" className="sel" value={faixa} onChange={(e) => setFaixa(e.target.value)}>
            {ORDEM_RENDA.map((k) => <option key={k} value={k}>{k} · {RENDA[k]}</option>)}
          </select>
        </div>
      </div>
      <div className="tiles">
        <Tile rotulo="Maior semestre" valor={fmtInt(y.length ? Math.max(...y) : null)} />
        <Tile rotulo="Menor semestre" valor={fmtInt(y.length ? Math.min(...y) : null)} />
        <Tile rotulo="Queda maior → menor" valor={fmtPct(y.length ? 1 - Math.min(...y) / Math.max(...y) : null)} />
      </div>
      <div className="grade">
        <Cartao classe="c12" titulo={`Inscrições na faixa ${faixa} · ${RENDA[faixa]}`} sub="Pode ficar abaixo do real: em cada curso, grupos com menos de 5 inscrições são ocultados (LGPD)" carregando={s.carregando} erro={s.erro}
          tabela={{ colunas: [{ nome: 'Semestre' }, { nome: 'Inscrições', num: true }], linhas: sem.map((_, i) => [x[i], fmtInt(y[i])]) }}>
          <Grafico rotulo="Renda ao longo do tempo" opcao={(t) => opLinha(t, x, { nome: 'Inscrições', dados: y }, { minZero: true })} />
        </Cartao>
      </div>
    </>
  )
}
