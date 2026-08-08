import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { appDataSource } from './config/appDataSource.js';
import routes from './routes/index.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { ProgressaoService } from './services/progressao.service.js';
import { NotificacaoService } from './services/notificacao.service.js';
import { InsumoEstoqueService } from './services/insumoEstoque.service.js';
import { sseService } from './services/sse.service.js';
import { InsumoEstoque } from './entities/InsumoEstoque.js';
import { Lote } from './entities/Lote.js';
import { Notificacao } from './entities/Notificacao.js';
import { Usuario } from './entities/Usuario.js';
import { env, isProduction, isTest } from './config/env.js';
import { logger } from './utils/logger.js';

export const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://static.cloudflareinsights.com'],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'blob:'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
  }),
);
app.use(
  cors({
    origin: isProduction ? env.ALLOWED_ORIGINS : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1);
app.use('/api', routes);

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(currentDir, '../public');

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(publicDir, 'index.html'));
    }
    next();
  });
}

app.use(errorHandler);

async function inicializarServidor(): Promise<void> {
  await appDataSource.initialize();
  logger.info('Banco de dados conectado com sucesso.');

  const notificacaoService = new NotificacaoService(
    appDataSource.getRepository(Notificacao),
    appDataSource.getRepository(Usuario),
  );

  const insumoService = new InsumoEstoqueService(
    appDataSource.getRepository(InsumoEstoque),
    notificacaoService,
    appDataSource,
    sseService,
  );
  await insumoService.resgatarLotesTravados();

  const progressao = new ProgressaoService(
    appDataSource.getRepository(Lote),
    notificacaoService,
    sseService,
  );
  progressao.iniciar();

  app.listen(env.PORT, () => {
    logger.info(`Servidor rodando na porta ${env.PORT} (${env.NODE_ENV})`);
  });
}

if (!isTest) {
  inicializarServidor().catch((error) => {
    logger.error('Erro ao conectar com o banco:', error);
  });
}
