/**
 * Cabeçalho Arquitetural: Arquivo responsável por definir as rotas da API REST do organograma.
 * Faz a ponte entre os endpoints HTTP, os middlewares de segurança/permissão e os métodos do controller.
 */

const express = require('express');
const router = express.Router();
const organogramaController = require('../controllers/organogramaController');
const { authenticateToken, checkNodeEditPermission } = require('../middlewares/auth');

/**
 * @route GET /api/organograma
 * @description Retorna a árvore completa do organograma.
 */
router.get('/', organogramaController.getOrganogramaTree);

/**
 * @route POST /api/organograma
 * @description Cria um novo nó no organograma (Requer Autenticação e Permissão no Pai).
 */
router.post('/', authenticateToken, checkNodeEditPermission, organogramaController.createNode);

/**
 * @route PUT /api/organograma/:id
 * @description Atualiza os dados de um nó específico (Requer Autenticação e Permissão no Nó).
 */
router.put('/:id', authenticateToken, checkNodeEditPermission, organogramaController.updateNode);

/**
 * @route DELETE /api/organograma/:id
 * @description Deleta um nó e seus subordinados em cascata (Requer Autenticação e Permissão no Nó).
 */
router.delete('/:id', authenticateToken, checkNodeEditPermission, organogramaController.deleteNode);

module.exports = router;
