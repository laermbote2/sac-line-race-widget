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
