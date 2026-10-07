/**
 * Cabeçalho Arquitetural: Rotas HTTP da API de Autenticação (/api/auth).
 * Mapeia login e checagem de sessão de usuário.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

/**
 * @route POST /api/auth/login
 * @description Autentica o usuário com email e senha, retornando token JWT e permissões.
 */
router.post('/login', authController.login);

/**
 * @route GET /api/auth/me
 * @description Retorna as informações do usuário autenticado no token.
 */
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
