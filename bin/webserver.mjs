import { WebSocket } from 'ws'
import { readFile } from 'fs'
import morgan from 'morgan'
import express from 'express'
import expressWs from 'express-ws'
import autoindex from 'express-autoindex/dist/index.cjs.js'
import nunjucks from 'nunjucks'
import cors from 'cors'
import 'dotenv/config'
import 'wtfnode'

import { lastLedger } from '../lib/onLedger.mjs'
import { txCount } from '../lib/onTransaction.mjs'

let _health = {
  reconnectCount: -1,
}

const telemetry = {
  host: null,
  proto: null,
  url: process.env?.URL_PREFIX,
  networkid: process.env?.NETWORKID ?? 0,
  collected: false,
  sent: false,
}

const version = await new Promise(resolve => {
  readFile(new URL('../package.json', import.meta.url).pathname, (err, data) => {
    if (!err) {
      try {
        const pjson = JSON.parse(data)
        return resolve(pjson?.version)
      }
      catch (e) {
        //
      }
    }
    resolve(null)
  })
})

console.log('Running backend version', version || '<< UNKNOWN >>')

const sendTelemetry = async () => {
  if (process.env?.TELEMETRY === 'YES') {
    try {
      console.log('Sending telemetry...', telemetry)
      telemetry.sent = new Date()
      const tcall = await fetch('https://xrpl.ws-stats.com/xpop/telemetry', {
        body: JSON.stringify(telemetry),
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      })
      const tbody = await tcall.text()
      console.log('Telemetry response', tbody)
    } catch (e) {
      console.log('Error sending telemetry', e.message)
    }
    setTimeout(() => {
      Object.assign(telemetry, { collected: false });
    }, 600 * 1000) // Re send telemetry after 10 minutes
  }
}

const startDate = new Date()
let lastWsPushedLedger

let wss // WebSocket Server

if (!wss) {
  if (process.env?.EVENT_SOCKET_PORT && process.env?.URL_PREFIX) {
    const port = Number(process.env.EVENT_SOCKET_PORT || 3000)
    
    try {
      const app = express()

      nunjucks.configure(new URL('../', import.meta.url).pathname, { autoescape: true, express: app })
      
      app.enable('trust proxy') // , ['loopback', 'linklocal', 'uniquelocal']) - Needs more for Cloudflare etc.
      app.disable('x-powered-by')
      app.use(express.json())
      app.use(morgan('combined', { }))

      wss = expressWs(app)

      app.use(function middlware (req, res, next) {
        res.setHeader('X-Robots-Tag', 'noindex')
        return next()
      })

      app.use('/robots.txt', (req, res, next) => {
        res.setHeader('content-type', 'text/plain')
        return res.send(
          `User-agent: *\nDisallow: /\n`
        )
      })

      app.use('/',
        (req, res, next) => {
          if (process.env?.TELEMETRY === 'YES' && !req.url.match(/health/)) {
            const telemetryData = {
              host: req.headers?.['host'] || 'localhost',
              proto: (req.headers?.['x-forwarded-proto'] || 'http').split(',')[0],
              collected: new Date(),
            }

            if (!telemetry.collected || telemetryData.host !== telemetry.host) {
              Object.assign(telemetry, telemetryData)
              sendTelemetry()
            }
          }

          if (req.url.split('?')?.[0].match(/\.json$/i)) {
            res.setHeader('content-type', 'application/json')
          }

          // Sent by nginx used with docker-compose
          if (req.headers?.['x-no-cors']) {
            next()
          } else {
            cors()(req, res, next)
          }
        },
        function renderHomepage(req, res, next) {
          // res.setHeader('content-type', 'text/html')
          res.setHeader('Cache-Control', 'no-store')
             .setHeader('Pragma','no-cache')
             .setHeader('Expires',0)
             .setHeader('Surrogate-Control','no-store')
          if (req.url === '' || req.url === '/') {
            res.render('public_html/index.html', {
              infraConfig: {
                wssNodes: typeof process.env?.NODES === 'string' ? process.env.NODES.split(',') : null,
                unlurl: process.env?.UNLURL ?? null,
                unlkey: process.env?.UNLKEY ?? null,
              },
              config: {
                version,
                networkid: process.env?.NETWORKID ?? 0,
                urlprefix: process.env?.URL_PREFIX ?? null,
                requiredTxFields: typeof process.env?.FIELDSREQUIRED === 'string' ? process.env.FIELDSREQUIRED.split(',') : null,
              },
              stats: {
                uptime: new Date() - startDate,
                lastLedger: lastLedger ?? null,
                lastWsPushedLedger: lastWsPushedLedger ?? null,
                txCount: txCount ?? null,
                ..._health,
              },
            })
          } else {
            next()
          }
        },
        express.static('./store/'),
      )

      app.use('/health', (req, res) => {
        res.setHeader('content-type', 'application/json')
        res.json({
          version,
          networkid: Number(process.env?.NETWORKID ?? 0),
          uptime: new Date() - startDate,
          lastLedger: lastLedger ?? null,
          lastWsPushedLedger: lastWsPushedLedger ?? null,
          txCount: txCount ?? null,
          ..._health,
        })
      })

      app.use('/:networkId([0-9]{1,})', (req, res, next) => {
        return autoindex('./store/' + req.params.networkId + '/', { json: /application\/json/.test(req.get('accept')) })(req, res,  next)
      })
      
      // app.get('/', function route (req, res, next){
      //   console.log('get route', req.testing)
      //   res.end()
      // })
      
      app.ws('*', function wsclient (ws, req) {
        Object.assign(ws, { req, })
        ws.on('message', function wsmsg (msg) {
          // Ignore
          // console.log(msg)
        })
      })
      
      const server = app.listen(port)

      // Play nice with Docker etc.
      const quit = () => {
        console.log('Shutting down webserver')
        wss.getWss().clients.forEach(client => client.close())
        server.close()
        wss.getWss().close()
      }

      process.on('SIGINT', quit) // Node
      process.on('SIGTERM', quit) // Docker    

      console.log('Started Event Socket Service at TCP port', port)
    } catch (e) {
      console.log('Cannot start Webserver & Event Socket Service at port', port, e)
    }
  } else {
    console.log('Not starting Webserver & Event Socket Service, EVENT_SOCKET_PORT and/or URL_PREFIX unset')
  }
}

const emit = _data => {
  if (wss) {
    wss.getWss().clients.forEach(function each (client) {
      const data = Object.assign({}, { ..._data })
      // Needed to prevent shared object manipulation with multiple clients
      data.xpop = Object.assign({}, _data.xpop)

      if (client.readyState === WebSocket.OPEN) {
        // console.log(client)
        // console.log(client?._xpopAccount)
        // console.log(client?._xpopBlob)

        let account = ''
        const accountAddress = client.req?.url.match(/r[a-zA-Z0-9]{18,}/)
        const blob = !!client.req?.url.match(/\/blob/i)

        if (accountAddress) {
          account = accountAddress[0]
        }

        if (!blob && data?.xpop?.blob) {
          data.xpop.blob = undefined
        }

        lastWsPushedLedger = data.origin.ledgerIndex

        if (account === '' || data.account === account) {
          client.send(JSON.stringify(data), { binary: false })
        }
      }
    })

    return wss.getWss().clients.length
  }

  return false
}

export {
  emit,
  _health,
}
