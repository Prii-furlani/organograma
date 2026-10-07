/**
 * Cabeçalho Arquitetural: Middleware de autenticação JWT e controle de escopo hierárquico (RBAC contextual).
 * Valida os tokens JWT e verifica se o usuário autenticado possui autorização por sub-árvore descendente.
 */

const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'organograma_jwt_secret_key_jhe_2026';

/**
 * Middleware para validar Token JWT.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acesso não autorizado. Faça login para continuar.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Sessão expirada ou token inválido. Faça login novamente.' });
        }
        req.user = user;
        next();
    });
}

/**
 * Middleware opcional para extrair o usuário sem bloquear caso não esteja logado.
 */
function optionalAuthToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        req.user = err ? null : user;
        next();
    });
}

/**
 * Obtém todos os IDs de nós que o usuário tem permissão para gerenciar (sub-árvore descendente).
 * - 'admin': Retorna 'all' (permissão total em todos os nós)
 * - 'diretor' / 'coordenador': Retorna array com os IDs dos nós vinculados e TODOS os seus descendentes
 * - 'colaborador': Retorna [] (sem permissão de edição)
 */
async function getUserPermittedNodeIds(userId, roleGlobal) {
    if (roleGlobal === 'admin') {
        return 'all'; // Permissão total
    }

    if (roleGlobal === 'colaborador') {
        return [];
    }

    // Busca os nós diretamente vinculados ao usuário em usuario_cargos_nos
    const [cargos] = await pool.query('SELECT no_id FROM usuario_cargos_nos WHERE usuario_id = ?', [userId]);
    const rootNodeIds = cargos.map(c => c.no_id);

    if (rootNodeIds.length === 0) {
        return [];
    }

    // Busca todos os nós da tabela organograma_nos para navegar a árvore em memória
    const [allNodes] = await pool.query('SELECT id, parent_id FROM organograma_nos');

    const permittedSet = new Set(rootNodeIds);

    // Função recursiva para adicionar todos os filhos e netos descendentes
    const addDescendants = (parentId) => {
        const children = allNodes.filter(n => n.parent_id === parentId);
        for (let child of children) {
            if (!permittedSet.has(child.id)) {
                permittedSet.add(child.id);
                addDescendants(child.id);
            }
        }
    };

    rootNodeIds.forEach(id => addDescendants(id));

    return Array.from(permittedSet);
}

/**
 * Middleware para verificar se o usuário autenticado tem permissão para editar um nó específico.
 */
async function checkNodeEditPermission(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Acesso não autorizado.' });
    }

    if (req.user.role_global === 'admin') {
        return next(); // Admin pode tudo
    }

    const targetNodeId = parseInt(req.params.id || req.body.parent_id, 10);
    if (!targetNodeId) {
        return next(); // Caso seja uma operação genérica sem ID de nó específico
    }

    try {
        const permittedNodeIds = await getUserPermittedNodeIds(req.user.id, req.user.role_global);
        
        if (permittedNodeIds === 'all' || (Array.isArray(permittedNodeIds) && permittedNodeIds.includes(targetNodeId))) {
            return next();
        }

        return res.status(403).json({ 
            error: 'Acesso negado: você não possui permissão hierárquica para editar este setor ou seus subordinados.' 
        });
    } catch (error) {
        console.error('Erro ao verificar permissão de sub-árvore:', error);
        return res.status(500).json({ error: 'Erro interno ao validar permissões hierárquicas.' });
    }
}

/**
 * Middleware para verificar se o usuário autenticado possui perfil de Administrador global.
 */
function checkAdminRole(req, res, next) {
    if (!req.user || req.user.role_global !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado: funcionalidade restrita a administradores do sistema.' });
    }
    next();
}

module.exports = {
    JWT_SECRET,
    authenticateToken,
    optionalAuthToken,
    getUserPermittedNodeIds,
    checkNodeEditPermission,
    checkAdminRole
};
