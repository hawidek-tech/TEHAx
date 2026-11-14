#!/usr/bin/env node
/** Serves the demo partner site on its own origin (default http://localhost:5500). Usage: node serve.mjs [port] [accessflowHost] */
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const port = Number(process.argv[2] ?? 5500)
const host = process.argv[3] ?? process.env.ACCESSFLOW_HOST ?? 'http://localhost:8081'
const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.html'), 'utf8')
  .replace("window.ACCESSFLOW_HOST || 'http://localhost:8081'", JSON.stringify(host))

createServer((req, res) => {
  if (req.url === '/' || req.url?.startsWith('/?')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html)
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
}).listen(port, () => console.log(`Demo partner site on http://localhost:${port} (ACCESSFLOW at ${host})`))
