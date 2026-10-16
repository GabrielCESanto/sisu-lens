import { useMemo, useState } from 'react'
import { useConsulta } from '../lib/useConsulta'
import { sqlLit } from '../lib/filtros'
import { Cartao } from '../components/Cartao'
import { MultiSelect } from '../components/MultiSelect'
import { TabelaQueda, type LinhaQueda } from '../components/TabelaQueda'
import { ANO_FIM, ANO_INI, REDES, ResumoQueda, useUfs } from './comparacao'

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function Cursos() {
  const [ufs, setUfs] = useState<string[]>([])
  const [redes, setRedes] = useState<string[]>([])
  const [ies, setIes] = useState<number[]>([])
  const [busca, setBusca] = useState('')
  const [ambos, setAmbos] = useState(true)
  const opUfs = useUfs()

  const condIes = [
    ufs.length ? `i.uf in (${ufs.map(sqlLit).join(',')})` : null,
    redes.length ? `i.rede in (${redes.map(sqlLit).join(',')})` : null,
  ].filter(Boolean)
  const listaIes = useConsulta(`select co_ies, sigla, nome, uf from dim_ies i ${condIes.length ? `where ${condIes.join(' and ')}` : ''} order by sigla`)
  const opIes = useMemo(() => (listaIes.dados ?? []).map((r) => ({
    valor: Number(r.co_ies), rotulo: `${r.sigla} – ${r.nome} (${r.uf})`,
  })), [listaIes.dados])
  // Instituições escolhidas que saíram do recorte de UF/rede deixam de valer
  const iesValidas = ies.filter((v) => opIes.some((o) => o.valor === v))

  const cond = [...condIes, iesValidas.length ? `f.co_ies in (${iesValidas.join(',')})` : null].filter(Boolean)
  const q = useConsulta(`
    select f.curso, count(distinct f.co_ies) as ies, sum(f.n) as total,
           coalesce(sum(f.n) filter (where f.ano = ${ANO_INI}), 0) as ini,
           coalesce(sum(f.n) filter (where f.ano = ${ANO_FIM}), 0) as fim
    from fato_evolucao f join dim_ies i using (co_ies)
    ${cond.length ? `where ${cond.join(' and ')}` : ''}
    group by 1
    ${ambos ? 'having ini > 0 and fim > 0' : ''}`)

  const todas: LinhaQueda[] = useMemo(() => (q.dados ?? []).map((r) => ({
    chave: String(r.curso), curso: String(r.curso), ies: Number(r.ies),
    total: Number(r.total), ini: Number(r.ini), fim: Number(r.fim),
  })), [q.dados])
  const linhas = useMemo(() => {
    const b = semAcento(busca.trim())
    return b ? todas.filter((l) => semAcento(String(l.curso)).includes(b)) : todas
  }, [todas, busca])

  return (
    <>
      <div className="filtros comparacao">
        <div className="filtro">
          <label>Estado (UF)</label>
          <MultiSelect rotulo="Estado" busca opcoes={opUfs} selecionados={ufs} onChange={setUfs} />
        </div>
        <div className="filtro">
          <label>Rede</label>
          <MultiSelect rotulo="Rede" opcoes={REDES} selecionados={redes} onChange={setRedes} />
        </div>
        <div className="filtro">
          <label>Instituição</label>
          <MultiSelect rotulo="Instituição" busca vazio="Todas" opcoes={opIes} selecionados={iesValidas} onChange={setIes} />
        </div>
        <div className="filtro">
          <label htmlFor="busca-curso">Buscar curso</label>
          <input id="busca-curso" className="campo" type="search" placeholder="Ex.: engenharia" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <label className="check">
          <input type="checkbox" checked={ambos} onChange={(e) => setAmbos(e.target.checked)} />
          Só cursos com inscrições em {ANO_INI} e em {ANO_FIM}
        </label>
      </div>
      <ResumoQueda linhas={linhas} rotulo="Cursos" />
      <div className="grade">
        <Cartao classe="c12" titulo="Inscrições por curso"
          sub={`Cursos com o mesmo nome somados entre instituições. Ordenado pela maior queda de ${ANO_INI} para ${ANO_FIM}; clique no cabeçalho para reordenar.`}
          carregando={q.carregando} erro={q.erro}>
          <TabelaQueda linhas={linhas} anoIni={ANO_INI} anoFim={ANO_FIM} textos={[
            { chave: 'curso', nome: 'Curso', largura: 240 },
            { chave: 'ies', nome: 'Instituições' },
          ]} />
        </Cartao>
      </div>
      <p className="nota">
        O nome do curso vem como está na lista do MEC: grafias diferentes (ex.: "Engenharia de Computação" e
        "Engenharia da Computação") aparecem em linhas separadas. "Instituições" conta as que ofertaram o curso em
        algum ano do período. A queda de um curso também reflete instituições que entraram ou saíram do SISU.
      </p>
    </>
  )
}
