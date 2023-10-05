import { WebSocket } from 'ws'
import morgan from 'morgan'
import express from 'express'
import expressWs from 'express-ws'
import autoindex from 'express-autoindex/dist/index.cjs.js'
import 'dotenv/config'

let wss // WebSocket Server

if (!wss) {
  if (process.env?.EVENT_SOCKET_PORT && process.env?.URL_PREFIX) {
    const port = Number(process.env.EVENT_SOCKET_PORT)
    
    try {
      const app = express()

      app.enable('trust proxy')
      app.disable('x-powered-by')
      app.use(express.json())
      app.use(morgan('combined', { }))

      wss = expressWs(app)

      // app.use(function middlware (req, res, next) {
      //   return next()
      // })

      app.use('/', express.static('./store/'))

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
      
      app.listen(port)
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
        const accountAddress = client.req.url.match(/r[a-zA-Z0-9]{18,}/)
        const blob = !!client.req.url.match(/\/blob/i)

        if (accountAddress) {
          account = accountAddress[0]
        }

        if (!blob && data?.xpop?.blob) {
          data.xpop.blob = undefined
        }

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
}
