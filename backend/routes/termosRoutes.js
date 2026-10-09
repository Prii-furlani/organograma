/**
 * Cabeçalho Arquitetural: Rotas de Termos de Serviço e Aceite Dinâmico.
 */

const express = require('express');
const router = express.Router();
const termosController = require('../controllers/termosController');
const { authenticateToken } = require('../middlewares/auth');

// Middleware para verificar se o usuário logado é Administrador Global
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role_global === 'admin') {
        return next();
    }
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem modificar os termos.' });
};

// Rota pública para buscar o termo ativo
router.get('/vigente', termosController.getTermoVigente);

// Rota autenticada para registrar aceite
router.post('/aceitar', authenticateToken, termosController.aceitarTermo);

// Rota administrativa para publicar novos termos
router.put('/admin', authenticateToken, requireAdmin, termosController.updateTermoAdmin);

module.exports = router;
