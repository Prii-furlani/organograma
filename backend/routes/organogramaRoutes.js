/**
 * Cabeçalho Arquitetural: Arquivo responsável por definir as rotas da API REST do organograma.
 * Faz a ponte entre os endpoints HTTP (incluindo aliases /nos), os middlewares de permissão e o controller.
 */

const express = require('express');
const router = express.Router();
const organogramaController = require('../controllers/organogramaController');
const { authenticateToken, checkScopePermission } = require('../middlewares/auth');

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
 * @route GET /api/organograma/logs
 * @description Retorna o histórico de auditoria de alterações do organograma.
 */
router.get('/logs', authenticateToken, organogramaController.getOrganogramaLogs);

/**
 * @route POST /api/organograma e POST /api/organograma/nos
 * @description Cria um novo nó no organograma (Requer Autenticação e Permissão de Escopo no Pai).
 */
router.post('/', authenticateToken, checkScopePermission, organogramaController.createNode);
router.post('/nos', authenticateToken, checkScopePermission, organogramaController.createNode);

/**
 * @route PUT /api/organograma/:id e PUT /api/organograma/nos/:id
 * @description Atualiza os dados de um nó específico e reparenteia com prevenção de ciclos.
 */
router.put('/:id', authenticateToken, checkScopePermission, organogramaController.updateNode);
router.put('/nos/:id', authenticateToken, checkScopePermission, organogramaController.updateNode);

/**
 * @route PATCH /api/organograma/:id/mover e PATCH /api/organograma/nos/:id/mover
 * @description Move um nó para um novo nó pai (reparenting) e recalcula os níveis.
 */
router.patch('/:id/mover', authenticateToken, checkScopePermission, organogramaController.moveNode);
router.patch('/nos/:id/mover', authenticateToken, checkScopePermission, organogramaController.moveNode);

/**
 * @route DELETE /api/organograma/:id e DELETE /api/organograma/nos/:id
 * @description Deleta um nó e seus subordinados em cascata em transação segura.
 */
router.delete('/:id', authenticateToken, checkScopePermission, organogramaController.deleteNode);
router.delete('/nos/:id', authenticateToken, checkScopePermission, organogramaController.deleteNode);

module.exports = router;
