import express from 'express'
import { AppDataSource } from './src/config/AppDataSource.js'
import routes from './src/routes/index.routes.js'
import { errorHandler } from './src/middlewares/errorHandler.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use('/api', routes)
app.use(errorHandler)

AppDataSource.initialize()
  .then(() => {
    console.log("Banco de dados conectado com sucesso.")
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`)
    })
  })
  .catch((error) => {
    console.log(error)
  })