/**
 * Cabeçalho Arquitetural: Arquivo responsável por gerenciar a conexão com o banco de dados MySQL.
 * Utiliza o pool de conexões do pacote mysql2/promise para suportar requisições assíncronas de alta performance.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Cria um pool de conexões reutilizáveis para o banco de dados.
 * @type {import('mysql2/promise').Pool}
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'organograma_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
