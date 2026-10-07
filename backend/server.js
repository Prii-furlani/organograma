/**
 * Cabeçalho Arquitetural: Arquivo principal de inicialização do servidor Backend.
 * Configura o Express, middlewares como CORS e JSON, e roteia as APIs de Organograma e Autenticação.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const organogramaRoutes = require('./routes/organogramaRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const { initDatabaseSchema } = require('./database/initDb');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors()); // Permite requisições do frontend (Cross-Origin Resource Sharing)
app.use(express.json()); // Habilita o parse de JSON no corpo das requisições

// Rotas da API
app.use('/api/organograma', organogramaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', userRoutes);

// Tratamento para rotas não encontradas
app.use((req, res, next) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
});

// Inicialização do servidor com autossuficiência do esquema MySQL
app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    await initDatabaseSchema();
});
