#!/usr/bin/env node
const fs = require('fs')
const yaml = require('js-yaml')
const async = require('async')

const data = yaml.load(fs.readFileSync('karte.yaml'))
run(data)

function run (data) {
  async.eachOf(data.render, (def, id, done) => render(id, def, done))
}

function render (id, def, callback) {
  console.log(id, def)
}
