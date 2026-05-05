var getScriptPromisify = (src) => {
  const __define = define
  define = undefined
  return new Promise(resolve => {
    $.getScript(src, () => {
      define = __define
      resolve()
    })
  })
}

;(function () {

  let _echartsReady = null
  const ensureEcharts = () => {
    if (!_echartsReady) {
      _echartsReady = getScriptPromisify('https://cdnjs.cloudflare.com/ajax/libs/echarts/5.0.0/echarts.min.js')
    }
    return _echartsReady
  }

  const parseMetadata = (metadata) => {
    const { dimensions: dimensionsMap, mainStructureMembers: measuresMap } = metadata
    const dimensions = []
    for (const key in dimensionsMap) {
      dimensions.push({ key, ...dimensionsMap[key] })
    }
    const measures = []
    for (const key in measuresMap) {
      measures.push({ key, ...measuresMap[key] })
    }
    return { dimensions, measures }
  }

  const parseData = (dataBinding) => {
    if (!dataBinding || dataBinding.state !== 'success') { return null }

    const { data, metadata } = dataBinding
    const { dimensions, measures } = parseMetadata(metadata)

    if (dimensions.length < 2 || measures.length < 1) { return null }

    const seriesDimKey = dimensions[0].key   // e.g. "dimensions_0"
    const timeDimKey   = dimensions[1].key   // e.g. "dimensions_1"
    const measureKey   = measures[0].key     // e.g. "measures_0"

    // Collect unique sorted time labels
    const timeSet = new Set()
    data.forEach(row => timeSet.add(row[timeDimKey].label))
    const timeSteps = Array.from(timeSet).sort()

    // Group values by series label
    const seriesMap = {}
    data.forEach(row => {
      const seriesLabel = row[seriesDimKey].label
      const timeLabel   = row[timeDimKey].label
      const value       = row[measureKey].raw

      if (!seriesMap[seriesLabel]) { seriesMap[seriesLabel] = {} }
      seriesMap[seriesLabel][timeLabel] = value
    })

    // Build ECharts series array — null for missing time steps
    const series = Object.keys(seriesMap).map(name => ({
      type: 'line',
      name,
      data: timeSteps.map(t => seriesMap[name][t] !== undefined ? seriesMap[name][t] : null),
      smooth: true
    }))

    return { timeSteps, series }
  }

  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      #root {
        width: 100%;
        height: 100%;
      }
      #chart {
        width: 100%;
        height: 100%;
      }
    </style>
    <div id="root">
      <div id="chart"></div>
    </div>
  `

  class Main extends HTMLElement {
    constructor () {
      super()
      this._shadowRoot = this.attachShadow({ mode: 'open' })
      this._shadowRoot.appendChild(template.content.cloneNode(true))
      this._root = this._shadowRoot.getElementById('root')
      this._chart = null
      this._interval = null
      this._rendering = false
    }

    // SAC lifecycle hooks
    async onCustomWidgetBeforeUpdate (changedProps) {}

    async onCustomWidgetAfterUpdate (changedProps) {
      await this._render()
    }

    async onCustomWidgetResize (width, height) {
      if (this._chart) {
        this._chart.resize()
      } else {
        await this._render()
      }
    }

    async onCustomWidgetDestroy () {
      this._dispose()
    }

    _dispose () {
      if (this._interval) {
        clearInterval(this._interval)
        this._interval = null
      }
      if (this._chart) {
        echarts.dispose(this._chart)
        this._chart = null
      }
    }

    async _render () {
      if (this._rendering) { return }
      this._rendering = true
      try {
        await ensureEcharts()
        this._dispose()

      const parsed = parseData(this.myDataBinding)
      if (!parsed) { return }

      const { timeSteps, series } = parsed

      const chartDiv = this._shadowRoot.getElementById('chart')
      this._chart = echarts.init(chartDiv)

      this._chart.setOption({
        legend: { show: true },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: timeSteps,
          boundaryGap: false
        },
        yAxis: { type: 'value' },
        series: series.map(s => ({ ...s, data: [] }))
      })

      let i = 0
      this._interval = setInterval(() => {
        if (!this._chart) { return }

        i++
        if (i >= timeSteps.length) { i = 0 }

        this._chart.setOption({
          series: series.map(s => ({
            name: s.name,
            data: s.data.slice(0, i)
          }))
        })
      }, 1000)
      } finally {
        this._rendering = false
      }
    }
  }

  customElements.define('com-sap-sample-echarts-linerace', Main)
})()
