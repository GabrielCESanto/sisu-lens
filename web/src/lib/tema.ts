import { useEffect, useState } from 'react'

export interface Tokens {
  ink: string; ink2: string; muted: string; grid: string; axis: string; surface: string
  s1: string; s2: string; ord: string[]
}

function ler(): Tokens {
  const cs = getComputedStyle(document.documentElement)
  const v = (n: string) => cs.getPropertyValue(n).trim()
  return {
    ink: v('--ink'), ink2: v('--ink-2'), muted: v('--muted'), grid: v('--grid'), axis: v('--axis'), surface: v('--surface'),
    s1: v('--series-1'), s2: v('--series-2'),
    ord: [v('--ord-1'), v('--ord-2'), v('--ord-3'), v('--ord-4'), v('--ord-5')],
  }
}

/** Lê os tokens CSS e reage à troca de tema (preferência do sistema ou botão). */
export function useTokens(): Tokens {
  const [t, setT] = useState(ler)
  useEffect(() => {
    const atualizar = () => setT(ler())
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', atualizar)
    const mo = new MutationObserver(atualizar)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { mq.removeEventListener('change', atualizar); mo.disconnect() }
  }, [])
  return t
}

export type Tema = 'auto' | 'light' | 'dark'
export function aplicarTema(t: Tema) {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', t)
  try { localStorage.setItem('sisu-lens-tema', t) } catch { /* armazenamento indisponível */ }
}
export function temaSalvo(): Tema {
  try { return (localStorage.getItem('sisu-lens-tema') as Tema) || 'auto' } catch { return 'auto' }
}
