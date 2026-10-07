/**
 * Cabeçalho Arquitetural: Controller de Autenticação responsável pelo login e perfil do usuário (RBAC).
 * Gerencia validação de senhas com bcrypt, emissão de tokens JWT e busca de posições/cargos.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { JWT_SECRET, getUserPermittedNodeIds } = require('../middlewares/auth');

/**
 * Realiza a autenticação do usuário com email e senha.
 */
async function login(req, res) {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    try {
        // Busca o usuário no banco de dados
        const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ? AND ativo = 1', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo.' });
        }

        const user = users[0];

        // Valida a senha criptografada
        const senhaValida = await bcrypt.compare(senha, user.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        // Busca todos os cargos e posições vinculados ao usuário em usuario_cargos_nos
        const [cargos] = await pool.query(`
            SELECT ucn.no_id, ucn.papel_no_cargo, n.titulo AS no_titulo, n.tipo AS no_tipo
            FROM usuario_cargos_nos ucn
            JOIN organograma_nos n ON ucn.no_id = n.id
            WHERE ucn.usuario_id = ?
        `, [user.id]);

        // Calcula a lista de IDs permitidos para a sub-árvore
        const allowedNodeIds = await getUserPermittedNodeIds(user.id, user.role_global);

        // Gera o token JWT
        const token = jwt.sign(
            { 
                id: user.id, 
                nome_completo: user.nome_completo, 
                email: user.email, 
                role_global: user.role_global 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login realizado com sucesso',
            token,
            user: {
                id: user.id,
                nome_completo: user.nome_completo,
                email: user.email,
                role_global: user.role_global,
                cargos
            },
            allowed_node_ids: allowedNodeIds
        });
    } catch (error) {
        console.error('Erro ao realizar login:', error);
        res.status(500).json({ error: 'Erro interno ao processar a autenticação.' });
    }
}

/**
 * Retorna o perfil do usuário logado baseado no token JWT.
 */
async function getMe(req, res) {
    try {
        const userId = req.user.id;
        const [users] = await pool.query('SELECT id, nome_completo, email, role_global, ativo FROM usuarios WHERE id = ?', [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const user = users[0];

        const [cargos] = await pool.query(`
            SELECT ucn.no_id, ucn.papel_no_cargo, n.titulo AS no_titulo, n.tipo AS no_tipo
            FROM usuario_cargos_nos ucn
            JOIN organograma_nos n ON ucn.no_id = n.id
            WHERE ucn.usuario_id = ?
        `, [user.id]);

        const allowedNodeIds = await getUserPermittedNodeIds(user.id, user.role_global);

        res.json({
            user: {
                ...user,
                cargos
            },
            allowed_node_ids: allowedNodeIds
        });
    } catch (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        res.status(500).json({ error: 'Erro interno ao buscar perfil.' });
    }
}

module.exports = {
    login,
    getMe
};
