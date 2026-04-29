import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppDataSource } from "./config/AppDataSource.js";
import routes from "./routes/index.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { ProgressaoService } from "./services/progressao.service.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de Origens Permitidas
const allowedOrigins = [
  "http://localhost:4200",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (como mobile apps ou curl) ou se estiver na lista
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Trust Proxy (Importante para o Render/Heroku detectar HTTPS corretamente)
app.set("trust proxy", 1);

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