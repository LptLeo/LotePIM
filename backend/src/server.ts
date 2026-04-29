import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { AppDataSource } from "./config/AppDataSource.js";
import routes from "./routes/index.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { ProgressaoService } from "./services/progressao.service.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://localhost:4200",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use("/api", routes);
app.use(errorHandler);

AppDataSource.initialize()
  .then(() => {
    console.log("Banco de dados conectado com sucesso.");

    /** Inicia o job de progressão automática de lotes */
    const progressao = new ProgressaoService();
    progressao.iniciar();

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Erro ao conectar com o banco:", error);
  });