/**
 * Cabeçalho Arquitetural: Arquivo principal de inicialização do servidor Backend.
 * Configura o Express, middlewares como CORS e JSON, e roteia a API.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const organogramaRoutes = require('./routes/organogramaRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors()); // Permite requisições do frontend (Cross-Origin Resource Sharing)
app.use(express.json()); // Habilita o parse de JSON no corpo das requisições

// Rotas da API
app.use('/api/organograma', organogramaRoutes);

// Tratamento para rotas não encontradas
app.use((req, res, next) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
});

// Inicialização do servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
