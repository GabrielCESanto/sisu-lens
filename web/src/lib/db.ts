import * as duckdb from '@duckdb/duckdb-wasm'

// Endereço base dos Parquet: local (/data, servido pelo Vite) ou Hugging Face em produção.
const DATA_URL = (import.meta.env.VITE_DATA_URL as string | undefined) ?? new URL('data/', location.href).href

export const TABELAS = [
  'dim_ies', 'dim_campus', 'dim_municipio',
  'fato_inscritos', 'fato_geo', 'fato_socio', 'fato_renda_uf', 'fato_evolucao',
] as const

export type Linha = Record<string, string | number | boolean | null>

export interface Medicao { sql: string; ms: number }
const medicoes: Medicao[] = []
const ouvintes = new Set<() => void>()
export const perf = {
  inicioMs: 0,
  get medicoes() { return medicoes },
  ouvir(fn: () => void) { ouvintes.add(fn); return () => { ouvintes.delete(fn) } },
}

let conexao: Promise<duckdb.AsyncDuckDBConnection> | null = null

async function iniciar(): Promise<duckdb.AsyncDuckDBConnection> {
  const t0 = performance.now()
  // O motor (~30 MB) vem do jsDelivr: fica em cache no navegador e não pesa no site.
  const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles())
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }),
  )
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), new Worker(workerUrl))
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  URL.revokeObjectURL(workerUrl)
  const con = await db.connect()
  for (const t of TABELAS) {
    await db.registerFileURL(`${t}.parquet`, new URL(`${t}.parquet`, DATA_URL).href, duckdb.DuckDBDataProtocol.HTTP, false)
    await con.query(`create view ${t} as select * from read_parquet('${t}.parquet')`)
  }
  perf.inicioMs = performance.now() - t0
  return con
}

function normalizar(v: unknown): string | number | boolean | null {
  if (typeof v === 'bigint') return Number(v)
  if (v === undefined) return null
  return v as string | number | boolean | null
}

export async function consultar(sql: string): Promise<Linha[]> {
  conexao ??= iniciar()
  const con = await conexao
  const t0 = performance.now()
  const tabela = await con.query(sql)
  medicoes.push({ sql, ms: performance.now() - t0 })
  if (medicoes.length > 200) medicoes.shift()
  ouvintes.forEach((fn) => fn())
  return tabela.toArray().map((r) => {
    const o: Linha = {}
    for (const [k, v] of Object.entries(r.toJSON())) o[k] = normalizar(v)
    return o
  })
}
