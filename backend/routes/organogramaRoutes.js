/**
 * Cabeçalho Arquitetural: Arquivo responsável por definir as rotas da API REST do organograma.
 * Faz a ponte entre os endpoints HTTP (incluindo aliases /nos), os middlewares de permissão e o controller.
 */

const express = require('express');
const router = express.Router();
const organogramaController = require('../controllers/organogramaController');
const { authenticateToken, checkNodeEditPermission } = require('../middlewares/auth');

/**
 * @route GET /api/organograma e GET /api/organograma/nos
 * @description Retorna a árvore completa do organograma.
 */
router.get('/', organogramaController.getOrganogramaTree);
router.get('/nos', organogramaController.getOrganogramaTree);

/**
 * @route GET /api/organograma/niveis
 * @description Retorna a lista de todos os níveis hierárquicos cadastrados.
 */
router.get('/niveis', organogramaController.getNiveisHierarquicos);

/**
 * @route GET /api/organograma/nos/flat
 * @description Retorna a lista de todos os nós em formato plano (para selects de nó pai).
 */
router.get('/nos/flat', organogramaController.getAllNodesFlat);

/**
 * @route POST /api/organograma e POST /api/organograma/nos
 * @description Cria um novo nó no organograma (Requer Autenticação e Permissão no Pai).
 */
router.post('/', authenticateToken, checkNodeEditPermission, organogramaController.createNode);
router.post('/nos', authenticateToken, checkNodeEditPermission, organogramaController.createNode);

/**
 * @route PUT /api/organograma/:id e PUT /api/organograma/nos/:id
 * @description Atualiza os dados de um nó específico e reparenteia com prevenção de ciclos.
 */
router.put('/:id', authenticateToken, checkNodeEditPermission, organogramaController.updateNode);
router.put('/nos/:id', authenticateToken, checkNodeEditPermission, organogramaController.updateNode);

/**
 * @route DELETE /api/organograma/:id e DELETE /api/organograma/nos/:id
 * @description Deleta um nó e seus subordinados em cascata.
 */
router.delete('/:id', authenticateToken, checkNodeEditPermission, organogramaController.deleteNode);
router.delete('/nos/:id', authenticateToken, checkNodeEditPermission, organogramaController.deleteNode);

module.exports = router;
