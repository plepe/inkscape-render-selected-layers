#!/usr/bin/env node
const fs = require('fs')
const yaml = require('js-yaml')
const async = require('async')
const JSDOM = require("jsdom").JSDOM
const childProcess = require('child_process')

const filename = process.argv[2]

const data = yaml.load(fs.readFileSync(filename + '.yaml'))
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
  fs.readFile(filename + '.svg', (err, body) => {
    if (err) { return callback(err) }

    const dom = new JSDOM('')
    const DOMParser = dom.window.DOMParser
    const parser = new DOMParser
    svgFile = parser.parseFromString(body, 'text/xml')
    callback(null)
  })
}

function run () {
  async.eachOfSeries(
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
      let current = item.getAttribute('style') || ''
      item.setAttribute('style', current + ';display:none')
    })
  })

  ;(def.show || []).forEach(labelId => {
    const items = svgFile.querySelectorAll(convertToSelector(labelId))
    Array.from(items).forEach(item => {
      let current = item.getAttribute('style') || ''
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
  const newBody = svgFile.documentElement.outerHTML

  async.waterfall([
    done => fs.readFile(tmpFilename, (err, body) => {
      if (body == newBody) {
        console.log(id, 'no change')
        return done(true)
      }

      done()
    }),
    done => fs.writeFile(tmpFilename, newBody, done),
    done => childProcess.execFile('inkscape', ['--export-area-page', '-o', finalFilename, tmpFilename], done)
  ], (err) => {
    if (err === true) {
      return callback()
    }

    callback(err)
  })
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
