import { useEffect, useId, useMemo, useRef, useState } from 'react'

export interface Opcao<T> { valor: T; rotulo: string }

interface Props<T> {
  rotulo: string; opcoes: Opcao<T>[]; selecionados: T[]; onChange: (v: T[]) => void
  unico?: boolean; busca?: boolean; vazio?: string
}

/** Seletor com busca; vazio = "Todos". `unico` vira seleção simples (ex.: instituição). */
export function MultiSelect<T extends string | number>({ rotulo, opcoes, selecionados, onChange, unico, busca, vazio = 'Todos' }: Props<T>) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])

  const filtradas = useMemo(() => {
    const q = texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    return q ? opcoes.filter((o) => o.rotulo.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().includes(q)) : opcoes
  }, [opcoes, texto])

  const resumo = selecionados.length === 0 ? vazio
    : selecionados.length === 1 ? (opcoes.find((o) => o.valor === selecionados[0])?.rotulo ?? String(selecionados[0]))
    : `${selecionados.length} selecionados`

  const alternar = (v: T) => {
    if (unico) { onChange([v]); setAberto(false); return }
    onChange(selecionados.includes(v) ? selecionados.filter((s) => s !== v) : [...selecionados, v])
  }

  return (
    <div className="ms" ref={ref}>
      <span id={id} hidden>{rotulo}</span>
      <button className="ms-botao" aria-labelledby={id} aria-expanded={aberto} onClick={() => setAberto((a) => !a)} title={resumo}>
        {resumo}
      </button>
      {aberto && (
        <div className="ms-painel">
          {busca && <input type="search" placeholder="Buscar…" value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />}
          <div className="ms-lista" role="listbox" aria-multiselectable={!unico}>
            {filtradas.map((o) => (
              <label key={String(o.valor)} className="ms-item">
                <input type={unico ? 'radio' : 'checkbox'} checked={selecionados.includes(o.valor)} onChange={() => alternar(o.valor)} />
                <span>{o.rotulo}</span>
              </label>
            ))}
            {filtradas.length === 0 && <div className="ms-item">Nada encontrado</div>}
          </div>
          {!unico && (
            <div className="ms-acoes">
              <button onClick={() => onChange([])}>Limpar (todos)</button>
              <button onClick={() => setAberto(false)}>Fechar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
