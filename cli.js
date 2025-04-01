#!/usr/bin/env node
const fs = require('fs')
const yaml = require('js-yaml')
const async = require('async')
const JSDOM = require("jsdom").JSDOM
const childProcess = require('child_process')

const data = yaml.load(fs.readFileSync('karte.yaml'))
let svgFile

init(err => {
  if (err) {
    console.error(err)
    process.exit(1)
  }

  run()
})

function init (callback) {
  async.parallel([
    done => loadSVG(done)
  ], err => callback(err))
}

function loadSVG (callback) {
  fs.readFile('karte.svg', (err, body) => {
    if (err) { return callback(err) }

    const dom = new JSDOM('')
    const DOMParser = dom.window.DOMParser
    const parser = new DOMParser
    svgFile = parser.parseFromString(body, 'text/xml')
    callback(null)
  })
}

function run () {
  async.eachOf(
    data.render,
    (def, id, done) => render(id, def, done),
    (err) => {
      if (err) {
        console.error(err)
        process.exit(1)
      }
    }
  )
}

function render (id, def, callback) {
  console.log(id, def)
  ;(def.hide || []).forEach(labelId => {
    const items = svgFile.querySelectorAll(convertToSelector(labelId))
    Array.from(items).forEach(item => {
      console.log('hide', item.getAttribute('inkscape:label'))
      let current = item.getAttribute('style') || ''
      item.setAttribute('style', current + ';display:none')
    })
  })

  ;(def.show || []).forEach(labelId => {
    const items = svgFile.querySelectorAll(convertToSelector(labelId))
    Array.from(items).forEach(item => {
      console.log('show', item.getAttribute('inkscape:label'))
      let current = item.getAttribute('style') || ''
      console.log(current)
      current = current.split(';').filter(v => v !== 'display:none').join(';')

      if (current !== '') {
        item.setAttribute('style', current)
      } else {
        item.removeAttribute('style')
      }
    })
  })

  const tmpFilename = 'tmp/' + id + '.svg'
  const finalFilename = 'data/' + id + '.png'

  async.waterfall([
    done => fs.writeFile(tmpFilename, svgFile.documentElement.outerHTML, done),
    done => childProcess.execFile('inkscape', ['--export-area-page', '--export-width=3840', '--export-height=2160', '-o', finalFilename, tmpFilename], done)
  ], callback)
}

function convertToSelector (str) {
  return str
    .split('/')
    .map(part => {
      if (part === '*') {
        return '*'
      } else {
        return '*[inkscape:label="' + part + '"]'
      }
    })
    .join(' > ')
}
