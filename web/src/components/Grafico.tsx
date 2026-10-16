import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { useTokens, type Tokens } from '../lib/tema'
import { fmtInt } from '../lib/formato'

interface Props { opcao: (t: Tokens) => EChartsOption; altura?: number; rotulo: string }

/** Wrapper do ECharts com o tema do site: grade e eixos recessivos, tooltip padrão. */
export function Grafico({ opcao, altura = 280, rotulo }: Props) {
  const t = useTokens()
  const base: EChartsOption = {
    backgroundColor: 'transparent',
    textStyle: { color: t.ink2, fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis', backgroundColor: t.surface, borderColor: t.axis, textStyle: { color: t.ink },
      valueFormatter: (v) => fmtInt(Number(v)),
    },
    animationDuration: 300,
  }
  return (
    <div role="img" aria-label={rotulo}>
      <ReactECharts echarts={echarts} option={{ ...base, ...opcao(t) }} notMerge style={{ height: altura, width: '100%' }} />
    </div>
  )
}

export const eixoCategoria = (t: Tokens, dados: string[], extra: object = {}) => ({
  type: 'category' as const, data: dados,
  axisLine: { lineStyle: { color: t.axis } }, axisTick: { show: false },
  axisLabel: { color: t.muted, fontSize: 11 }, ...extra,
})
export const eixoValor = (t: Tokens, extra: object = {}) => ({
  type: 'value' as const,
  splitLine: { lineStyle: { color: t.grid, type: 'solid' as const } },
  axisLabel: { color: t.muted, fontSize: 11, formatter: (v: number) => fmtInt(v) }, ...extra,
})
