import { useMemo, useState } from 'react'
import { useConsulta } from '../lib/useConsulta'
import { sqlLit } from '../lib/filtros'
import { Cartao } from '../components/Cartao'
import { MultiSelect } from '../components/MultiSelect'
import { TabelaQueda, type LinhaQueda } from '../components/TabelaQueda'
import { ANO_FIM, ANO_INI, REDES, ResumoQueda, useUfs } from './comparacao'

export function Universidades() {
  const [ufs, setUfs] = useState<string[]>([])
  const [redes, setRedes] = useState<string[]>([])
  const [ambos, setAmbos] = useState(true)
  const opUfs = useUfs()

  const cond = [
    ufs.length ? `i.uf in (${ufs.map(sqlLit).join(',')})` : null,
    redes.length ? `i.rede in (${redes.map(sqlLit).join(',')})` : null,
  ].filter(Boolean)
  const q = useConsulta(`
    select i.co_ies, i.sigla, i.nome, i.uf, i.rede, sum(f.n) as total,
           coalesce(sum(f.n) filter (where f.ano = ${ANO_INI}), 0) as ini,
           coalesce(sum(f.n) filter (where f.ano = ${ANO_FIM}), 0) as fim
    from fato_evolucao f join dim_ies i using (co_ies)
    ${cond.length ? `where ${cond.join(' and ')}` : ''}
    group by all
    ${ambos ? 'having ini > 0 and fim > 0' : ''}`)

  const linhas: LinhaQueda[] = useMemo(() => (q.dados ?? []).map((r) => ({
    chave: String(r.co_ies), sigla: String(r.sigla), nome: String(r.nome), uf: String(r.uf), rede: String(r.rede),
    total: Number(r.total), ini: Number(r.ini), fim: Number(r.fim),
  })), [q.dados])

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
        <label className="check">
          <input type="checkbox" checked={ambos} onChange={(e) => setAmbos(e.target.checked)} />
          Só quem participou do SISU em {ANO_INI} e em {ANO_FIM}
        </label>
      </div>
      <ResumoQueda linhas={linhas} rotulo="Instituições" />
      <div className="grade">
        <Cartao classe="c12" titulo="Inscrições por instituição"
          sub={`Ordenado pela maior queda de ${ANO_INI} para ${ANO_FIM}. Clique no cabeçalho para reordenar.`}
          carregando={q.carregando} erro={q.erro}>
          <TabelaQueda linhas={linhas} anoIni={ANO_INI} anoFim={ANO_FIM} textos={[
            { chave: 'sigla', nome: 'Instituição', largura: 260, render: (l) => <><b>{l.sigla}</b> <span className="fraco">{l.nome}</span></> },
            { chave: 'uf', nome: 'UF' },
            { chave: 'rede', nome: 'Rede' },
          ]} />
        </Cartao>
      </div>
      <p className="nota">
        Inscrições da 1ª chamada / chamada regular, somando os dois semestres de cada ano. Uma queda até zero
        em {ANO_FIM} pode significar que a instituição deixou o SISU, e não falta de procura.
        Rede: deduzida do nome da instituição; as distritais do DF contam como estaduais.
      </p>
    </>
  )
}

