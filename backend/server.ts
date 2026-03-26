import express from 'express';
import loteRoutes from './src/routes/loteRoutes';

const app = express();

// Permite que o Express entenda JSON no corpo das requisições
app.use(express.json());

// RF02 - Rotas protegidas (No futuro, você adicionará o Middleware de JWT aqui) [cite: 140, 144]
app.use('/api/lotes', loteRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});