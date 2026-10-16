import { useEffect, useState } from 'react'
import { consultar, type Linha } from './db'

interface Estado { dados: Linha[] | null; erro: string | null; carregando: boolean }
const SEM_CONSULTA: Estado = { dados: null, erro: null, carregando: false }

/** Executa a SQL quando ela muda. Mantém o resultado anterior durante a recarga (sem "piscar"). */
export function useConsulta(sql: string | null): Estado {
  const [estado, setEstado] = useState<Estado>({ dados: null, erro: null, carregando: true })
  useEffect(() => {
    if (!sql) return
    let vivo = true
    setEstado((s) => ({ ...s, carregando: true }))
    consultar(sql)
      .then((dados) => vivo && setEstado({ dados, erro: null, carregando: false }))
      .catch((e: unknown) => vivo && setEstado({ dados: null, erro: String(e), carregando: false }))
    return () => { vivo = false }
  }, [sql])
  // Sem SQL (consulta desligada) não há nada carregando
  return sql ? estado : SEM_CONSULTA
}
