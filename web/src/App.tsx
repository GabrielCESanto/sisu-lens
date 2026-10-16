import { useEffect, useState, useSyncExternalStore } from 'react'
import { BarraFiltros } from './components/BarraFiltros'
import { FILTROS_PADRAO, type Filtros } from './lib/filtros'
import { aplicarTema, temaSalvo, type Tema } from './lib/tema'
import { perf } from './lib/db'
import { Geral } from './pages/Geral'
import { Socio } from './pages/Socio'
import { Regiao } from './pages/Regiao'
import { Notas } from './pages/Notas'
import { Campi } from './pages/Campi'
import { Universidades } from './pages/Universidades'
import { Cursos } from './pages/Cursos'
import { Sobre } from './pages/Sobre'

const ABAS = ['Geral', 'Socioeconômico', 'Região', 'Notas', 'Campi', 'Universidades', 'Cursos', 'Sobre'] as const
type Aba = (typeof ABAS)[number]
// Páginas que comparam todas as instituições têm filtros próprios e não usam a barra principal
const SEM_BARRA: Aba[] = ['Universidades', 'Cursos', 'Sobre']

export default function App() {
  const [aba, setAba] = useState<Aba>('Geral')
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_PADRAO)
  const [tema, setTema] = useState<Tema>(temaSalvo)
  useEffect(() => aplicarTema(tema), [tema])
  const proximoTema: Record<Tema, Tema> = { auto: 'light', light: 'dark', dark: 'auto' }
  const nomeTema: Record<Tema, string> = { auto: 'Tema: automático', light: 'Tema: claro', dark: 'Tema: escuro' }

  return (
    <>
      <header className="topo">
        <div className="topo-inner">
          <div className="marca">
            <h1>SISU <span>Lens</span></h1>
            <small>Inscrições no SISU e perfil dos candidatos · 2014–2023</small>
          </div>
          <nav className="abas" role="tablist" aria-label="Páginas">
            {ABAS.map((a) => (
              <button key={a} role="tab" aria-selected={a === aba} onClick={() => setAba(a)}>{a}</button>
            ))}
          </nav>
          <button className="tema" onClick={() => setTema(proximoTema[tema])}>{nomeTema[tema]}</button>
        </div>
      </header>
      {!SEM_BARRA.includes(aba) && <BarraFiltros filtros={filtros} onChange={setFiltros} />}
      <main role="tabpanel" aria-label={aba}>
        {aba === 'Geral' && <Geral filtros={filtros} />}
        {aba === 'Socioeconômico' && <Socio filtros={filtros} />}
        {aba === 'Região' && <Regiao filtros={filtros} />}
        {aba === 'Notas' && <Notas filtros={filtros} />}
        {aba === 'Campi' && <Campi filtros={filtros} />}
        {aba === 'Universidades' && <Universidades />}
        {aba === 'Cursos' && <Cursos />}
        {aba === 'Sobre' && <Sobre />}
      </main>
      <Rodape />
    </>
  )
}

function Rodape() {
  const n = useSyncExternalStore(perf.ouvir, () => perf.medicoes.length)
  const m = perf.medicoes
  const ultimas = m.slice(-10)
  const media = ultimas.length ? ultimas.reduce((a, x) => a + x.ms, 0) / ultimas.length : 0
  return (
    <footer className="rodape">
      <span>Fontes: SISU (MEC) e ENEM (INEP) · dados abertos · agregados com proteção LGPD</span>
      {n > 0 && (
        <details>
          <summary>Desempenho: motor iniciado em {(perf.inicioMs / 1000).toFixed(1)} s · últimas consultas {media.toFixed(0)} ms em média</summary>
          <pre>{ultimas.map((x) => `${x.ms.toFixed(0).padStart(5)} ms  ${x.sql.replace(/\s+/g, ' ').slice(0, 140)}`).join('\n')}</pre>
        </details>
      )}
    </footer>
  )
}
