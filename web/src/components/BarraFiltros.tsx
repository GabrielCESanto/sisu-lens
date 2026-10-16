import { useMemo } from 'react'
import { useConsulta } from '../lib/useConsulta'
import { ANOS, type Filtros } from '../lib/filtros'
import { MultiSelect } from './MultiSelect'

interface Props { filtros: Filtros; onChange: (f: Filtros) => void }

export function BarraFiltros({ filtros: f, onChange }: Props) {
  const ies = useConsulta('select co_ies, sigla, nome, uf from dim_ies order by sigla')
  const campi = useConsulta(`select co_campus, nome, municipio from dim_campus where co_ies = ${f.ies} order by nome`)
  const cursos = useConsulta(
    `select distinct curso from fato_inscritos where co_ies = ${f.ies}` +
    (f.campus.length ? ` and co_campus in (${f.campus.join(',')})` : '') + ' order by curso',
  )

  const opIes = useMemo(() => (ies.dados ?? []).map((r) => ({
    valor: Number(r.co_ies), rotulo: `${r.sigla} – ${r.nome} (${r.uf})`,
  })), [ies.dados])
  const opCampi = useMemo(() => (campi.dados ?? []).map((r) => ({ valor: Number(r.co_campus), rotulo: String(r.nome) })), [campi.dados])
  const opCursos = useMemo(() => (cursos.dados ?? []).map((r) => ({ valor: String(r.curso), rotulo: String(r.curso) })), [cursos.dados])

  return (
    <div className="filtros-barra">
      <div className="filtros-linha onde">
        <div className="filtro">
          <label>Instituição</label>
          <MultiSelect rotulo="Instituição" unico busca opcoes={opIes} selecionados={[f.ies]}
            onChange={([v]) => onChange({ ...f, ies: v, campus: [], curso: [] })} />
        </div>
        <div className="filtro">
          <label>Câmpus</label>
          <MultiSelect rotulo="Câmpus" busca opcoes={opCampi} selecionados={f.campus}
            onChange={(v) => onChange({ ...f, campus: v, curso: [] })} />
        </div>
        <div className="filtro">
          <label>Curso</label>
          <MultiSelect rotulo="Curso" busca opcoes={opCursos} selecionados={f.curso} onChange={(v) => onChange({ ...f, curso: v })} />
        </div>
      </div>
      <div className="filtros-linha quando">
        <div className="filtro">
          <label>Ano</label>
          <MultiSelect rotulo="Ano" opcoes={ANOS.map((a) => ({ valor: a, rotulo: String(a) }))} selecionados={f.ano} onChange={(v) => onChange({ ...f, ano: v })} />
        </div>
        <div className="filtro">
          <label>Semestre</label>
          <MultiSelect rotulo="Semestre" opcoes={[{ valor: 1, rotulo: '1º semestre' }, { valor: 2, rotulo: '2º semestre' }]}
            selecionados={f.edicao} onChange={(v) => onChange({ ...f, edicao: v })} />
        </div>
        <label className="check">
          <input type="checkbox" checked={f.aprovado} onChange={(e) => onChange({ ...f, aprovado: e.target.checked })} />
          Só aprovados na chamada
        </label>
      </div>
    </div>
  )
}
