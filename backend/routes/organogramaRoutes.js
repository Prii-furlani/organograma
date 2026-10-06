/**
 * Cabeçalho Arquitetural: Arquivo responsável por definir as rotas da API REST do organograma.
 * Faz a ponte entre os endpoints HTTP e os métodos do controller.
 */

const express = require('express');
const router = express.Router();
const organogramaController = require('../controllers/organogramaController');

/**
 * @route GET /api/organograma
 * @description Retorna a árvore completa do organograma.
 */
router.get('/', organogramaController.getOrganogramaTree);

/**
 * @route POST /api/organograma
 * @description Cria um novo nó no organograma.
 */
router.post('/', organogramaController.createNode);

/**
 * @route PUT /api/organograma/:id
 * @description Atualiza os dados de um nó específico.
 */
router.put('/:id', organogramaController.updateNode);

/**
 * @route DELETE /api/organograma/:id
 * @description Deleta um nó e, em cascata, todos os seus filhos.
 */
router.delete('/:id', organogramaController.deleteNode);

module.exports = router;
