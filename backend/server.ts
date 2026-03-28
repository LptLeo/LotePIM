import express from 'express'
import { AppDataSource } from './src/config/AppDataSource.js'
import loteRouter from './src/routes/loteRoutes.js'

const app = express()

const PORT = process.env.PORT || 3000

app.use(express.json())

app.use(loteRouter)

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