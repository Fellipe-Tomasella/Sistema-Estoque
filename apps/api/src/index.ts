import { createApp } from './app'
import { env } from './config/env'

const app = createApp().listen(env.port)

console.log(`API rodando em http://localhost:${app.server?.port}/api`)
