/**
 * Cabeçalho Arquitetural: Rotas HTTP da API de Gerenciamento de Usuários (/api/usuarios).
 * Protegidas com middleware JWT e restritas a administradores (checkAdminRole).
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, checkUserManagementPermission } = require('../middlewares/auth');

// Todas as rotas de usuários requerem autenticação JWT e permissão de gestão hierárquica
router.use(authenticateToken);
router.use(checkUserManagementPermission);

/**
 * @route GET /api/usuarios
 * @description Listagem de todos os usuários com seus cargos vinculados.
 */
router.get('/', userController.getAllUsers);

/**
 * @route POST /api/usuarios
 * @description Cadastro de novo colaborador com senha criptografada e vínculos de vaga.
 */
router.post('/', userController.createUser);

/**
 * @route PUT /api/usuarios/:id
 * @description Atualização de perfil, senha, status e cargos do usuário.
 */
router.put('/:id', userController.updateUser);

/**
 * @route DELETE /api/usuarios/:id
 * @description Exclusão de usuário.
 */
router.delete('/:id', userController.deleteUser);

module.exports = router;
