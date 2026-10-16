import type { EChartsOption } from 'echarts'
import type { Tokens } from './tema'
import { eixoCategoria, eixoValor } from '../components/Grafico'
import { fmtDec, fmtInt } from './formato'

type Fmt = (v: number) => string

/** Índices que recebem rótulo direto: mínimo, máximo e último (nunca todos os pontos). */
function destaques(v: number[]): Set<number> {
  if (!v.length) return new Set()
  const max = v.indexOf(Math.max(...v))
  const min = v.indexOf(Math.min(...v))
  return new Set([max, min, v.length - 1])
}

export function opLinha(t: Tokens, x: string[], serie: { nome: string; dados: number[] },
  opcoes: { media?: boolean; fmt?: Fmt; minZero?: boolean } = {}): EChartsOption {
  const fmt = opcoes.fmt ?? fmtInt
  const marcados = destaques(serie.dados)
  return {
    tooltip: { trigger: 'axis', valueFormatter: (v) => fmt(Number(v)) },
    xAxis: eixoCategoria(t, x, { boundaryGap: false, axisLabel: { color: t.muted, fontSize: 11, rotate: x.length > 12 ? 45 : 0 } }),
    yAxis: eixoValor(t, { scale: !opcoes.minZero, axisLabel: { color: t.muted, fontSize: 11, formatter: (v: number) => fmt(v) } }),
    series: [{
      name: serie.nome, type: 'line', data: serie.dados, smooth: false,
      lineStyle: { width: 2, color: t.s1 }, itemStyle: { color: t.s1, borderColor: t.surface, borderWidth: 2 },
      symbol: 'circle', symbolSize: 8,
      label: {
        show: true, position: 'top', color: t.ink2, fontSize: 11,
        formatter: (p) => (marcados.has(p.dataIndex) ? fmt(Number(p.value)) : ''),
      },
      markLine: opcoes.media ? {
        silent: true, symbol: 'none', lineStyle: { color: t.muted, type: 'solid', width: 1 },
        label: { formatter: (p) => `média ${fmt(Number(p.value))}`, color: t.muted, fontSize: 11, position: 'insideEndTop' },
        data: [{ type: 'average' }],
      } : undefined,
    }],
  }
}

export function opBarras(t: Tokens, cats: string[], vals: number[],
  opcoes: { horizontal?: boolean; fmt?: Fmt; rotulos?: boolean; cores?: string[] } = {}): EChartsOption {
  const fmt = opcoes.fmt ?? fmtInt
  const h = !!opcoes.horizontal
  const cat = eixoCategoria(t, cats, h ? { inverse: true, axisLabel: { color: t.ink2, fontSize: 11, width: 220, overflow: 'truncate' } } : { axisLabel: { color: t.muted, fontSize: 11, interval: 0, rotate: cats.length > 8 ? 35 : 0 } })
  const val = eixoValor(t, { axisLabel: { color: t.muted, fontSize: 11, formatter: (v: number) => fmt(v) } })
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => fmt(Number(v)) },
    grid: { left: 8, right: h ? 56 : 16, top: 16, bottom: 8, containLabel: true },
    xAxis: h ? val : cat,
    yAxis: h ? cat : val,
    series: [{
      type: 'bar', data: vals.map((v, i) => ({ value: v, itemStyle: { color: opcoes.cores?.[i] ?? t.s1 } })),
      barMaxWidth: h ? 18 : 36, barCategoryGap: '30%',
      itemStyle: { borderRadius: h ? [0, 4, 4, 0] : [4, 4, 0, 0] },
      label: { show: !!opcoes.rotulos, position: h ? 'right' : 'top', color: t.ink2, fontSize: 11, formatter: (p) => fmt(Number(p.value)) },
    }],
  }
}

export function opBarrasAgrupadas(t: Tokens, cats: string[], series: { nome: string; dados: number[]; cor: string }[],
  opcoes: { horizontal?: boolean; fmt?: Fmt } = {}): EChartsOption {
  const fmt = opcoes.fmt ?? fmtInt
  const h = !!opcoes.horizontal
  const cat = eixoCategoria(t, cats, h ? { inverse: true, axisLabel: { color: t.ink2, fontSize: 11, width: 200, overflow: 'truncate' } } : { axisLabel: { color: t.muted, fontSize: 11, interval: 0, rotate: cats.length > 6 ? 30 : 0 } })
  const val = eixoValor(t, { axisLabel: { color: t.muted, fontSize: 11, formatter: (v: number) => fmt(v) } })
  return {
    legend: { top: 0, right: 0, textStyle: { color: t.ink2 }, itemWidth: 12, itemHeight: 12 },
    grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => fmt(Number(v)) },
    xAxis: h ? val : cat,
    yAxis: h ? cat : val,
    series: series.map((s) => ({
      name: s.nome, type: 'bar' as const, data: s.dados, barMaxWidth: 22, barGap: '10%',
      itemStyle: { color: s.cor, borderRadius: h ? [0, 4, 4, 0] : [4, 4, 0, 0] },
    })),
  }
}

/** Uma barra 100% com duas partes (ex.: sexo). Legenda + rótulos diretos com o percentual. */
export function opDivisao(t: Tokens, partes: { nome: string; valor: number; cor: string; texto: string }[]): EChartsOption {
  const total = partes.reduce((a, p) => a + p.valor, 0) || 1
  return {
    legend: { bottom: 0, textStyle: { color: t.ink2 }, itemWidth: 12, itemHeight: 12 },
    grid: { left: 0, right: 0, top: 8, bottom: 36 },
    tooltip: { trigger: 'item', formatter: (p: unknown) => {
      const q = p as { seriesName: string; value: number }
      return `${q.seriesName}: ${fmtInt(q.value)} (${fmtDec((100 * q.value) / total)}%)`
    } },
    xAxis: { type: 'value', max: total, show: false },
    yAxis: { type: 'category', data: [''], show: false },
    series: partes.map((p, i) => ({
      name: p.nome, type: 'bar' as const, stack: 'total', data: [p.valor], barWidth: 44,
      itemStyle: {
        color: p.cor, borderColor: t.surface, borderWidth: 2,
        borderRadius: i === 0 ? [4, 0, 0, 4] : i === partes.length - 1 ? [0, 4, 4, 0] : 0,
      },
      label: { show: p.valor / total > 0.08, color: p.texto, fontWeight: 600, formatter: () => `${fmtDec((100 * p.valor) / total)}%` },
    })),
  }
}
