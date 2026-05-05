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
    if (dataBinding.state !== 'success') { return null }

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
    }

    // SAC lifecycle hooks
    async onCustomWidgetBeforeUpdate (changedProps) {}

    async onCustomWidgetAfterUpdate (changedProps) {
      await this._render()
    }

    async onCustomWidgetResize (width, height) {
      await this._render()
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
      await getScriptPromisify('https://cdnjs.cloudflare.com/ajax/libs/echarts/5.0.0/echarts.min.js')
      this._dispose()
      // rendering logic added in Task 4
    }
  }

  customElements.define('com-sap-sample-echarts-linerace', Main)
})()
