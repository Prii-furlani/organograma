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
 * - 'diretor' / 'coordenador' / etc: Retorna array com os IDs dos nós vinculados e TODOS os seus descendentes
 * - 'colaborador': Retorna [] (sem permissão de edição)
 */
async function getUserPermittedNodeIds(userId, roleGlobal) {
    const role = String(roleGlobal || '').toUpperCase();
    if (role === 'ADMIN') {
        return 'all'; // Permissão total sobre qualquer nó
    }

    if (role === 'COLABORADOR') {
        return [];
    }

    // Busca os nós diretamente vinculados ao usuário em usuario_cargos_nos
    const [cargos] = await pool.query('SELECT no_id FROM usuario_cargos_nos WHERE usuario_id = ?', [userId]);
    const rootNodeIds = cargos.map(c => c.no_id).filter(Boolean);

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
 * Middleware checkScopePermission:
 * Antes de executar qualquer rota de alteração (POST, PUT, PATCH, DELETE em /api/organograma/nos),
 * verifica recursivamente se o nó alvo descende de uma das áreas vinculadas ao req.user.
 * Caso contrário, retorna status 403 Forbidden ("Você não tem permissão para alterar setores fora da sua diretoria").
 */
async function checkScopePermission(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Acesso não autorizado. Faça login para continuar.' });
    }

    const role = String(req.user.role_global || '').toUpperCase();
    if (role === 'ADMIN') {
        return next(); // ADMIN possui permissão total sobre qualquer nó
    }

    try {
        const permittedNodeIds = await getUserPermittedNodeIds(req.user.id, req.user.role_global);

        if (permittedNodeIds === 'all') {
            return next();
        }

        const isPermitted = (id) => {
            if (!id) return false;
            return Array.isArray(permittedNodeIds) && permittedNodeIds.includes(parseInt(id, 10));
        };

        // Rota POST (criação): deve validar se parent_id pertence ao escopo
        if (req.method === 'POST') {
            const parentId = req.body.parent_id !== undefined && req.body.parent_id !== null && req.body.parent_id !== '' 
                ? parseInt(req.body.parent_id, 10) 
                : null;

            // Criar nó raiz sem pai só é permitido para ADMIN
            if (!parentId || !isPermitted(parentId)) {
                return res.status(403).json({ 
                    error: 'Você não tem permissão para alterar setores fora da sua diretoria' 
                });
            }

            return next();
        }

        // Rota PUT / PATCH (edição ou transferência de nó)
        if (req.method === 'PUT' || req.method === 'PATCH') {
            const targetId = parseInt(req.params.id, 10);
            if (!targetId || !isPermitted(targetId)) {
                return res.status(403).json({ 
                    error: 'Você não tem permissão para alterar setores fora da sua diretoria' 
                });
            }

            // Se estiver alterando ou movendo para um novo parent_id
            if (req.body.parent_id !== undefined && req.body.parent_id !== null && req.body.parent_id !== '') {
                const newParentId = parseInt(req.body.parent_id, 10);
                if (!isPermitted(newParentId)) {
                    return res.status(403).json({ 
                        error: 'Você não tem permissão para alterar setores fora da sua diretoria' 
                    });
                }
            }

            return next();
        }

        // Rota DELETE (exclusão de nó)
        if (req.method === 'DELETE') {
            const targetId = parseInt(req.params.id, 10);
            if (!targetId || !isPermitted(targetId)) {
                return res.status(403).json({ 
                    error: 'Você não tem permissão para alterar setores fora da sua diretoria' 
                });
            }

            return next();
        }

        return next();
    } catch (error) {
        console.error('Erro ao verificar permissão de escopo hierárquico:', error);
        return res.status(500).json({ error: 'Erro interno ao validar permissões hierárquicas.' });
    }
}

/**
 * Alias mantido para compatibilidade com código existente.
 */
const checkNodeEditPermission = checkScopePermission;

/**
 * Middleware para verificar se o usuário autenticado possui perfil de Administrador global.
 */
function checkAdminRole(req, res, next) {
    const role = String(req.user?.role_global || '').toUpperCase();
    if (!req.user || role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acesso negado: funcionalidade restrita a administradores do sistema.' });
    }
    next();
}

/**
 * Middleware para validar a Matriz Hierárquica na Gestão de Usuários.
 * - Admin: Permissão total.
 * - Diretor: Pode criar/editar Diretor, Coordenador, Colaborador.
 * - Coordenador: Pode criar/editar Coordenador, Colaborador.
 * - Valida se as áreas vinculadas estão dentro da árvore permitida.
 */
async function checkUserManagementPermission(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Acesso não autorizado. Faça login para continuar.' });
    }

    const role = String(req.user.role_global || '').toUpperCase();
    if (role === 'COLABORADOR') {
        return res.status(403).json({ error: 'Acesso negado: colaboradores não podem gerenciar usuários.' });
    }

    if (role === 'ADMIN') {
        return next();
    }

    try {
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const targetRoleRaw = req.body.role_global;
            if (targetRoleRaw) {
                const targetRole = String(targetRoleRaw).toUpperCase();
                if (role === 'DIRETOR' && targetRole === 'ADMIN') {
                    return res.status(403).json({ error: 'Diretores não podem gerenciar perfis de Administrador.' });
                }
                if (role === 'COORDENADOR' && (targetRole === 'ADMIN' || targetRole === 'DIRETOR')) {
                    return res.status(403).json({ error: 'Coordenadores não podem gerenciar perfis de Administrador ou Diretor.' });
                }
            }

            const targetNosIds = req.body.nos_ids || req.body.no_ids || [];
            if (Array.isArray(targetNosIds) && targetNosIds.length > 0) {
                const permittedNodeIds = await getUserPermittedNodeIds(req.user.id, req.user.role_global);
                if (permittedNodeIds !== 'all') {
                    const invalidNodes = targetNosIds.filter(id => !permittedNodeIds.includes(parseInt(id, 10)));
                    if (invalidNodes.length > 0) {
                        return res.status(403).json({ error: 'Você não tem permissão para vincular usuários a áreas fora de sua hierarquia.' });
                    }
                }
            }
        }
        return next();
    } catch (error) {
        console.error('Erro ao verificar permissão de gestão de usuários:', error);
        return res.status(500).json({ error: 'Erro interno ao validar permissões.' });
    }
}

module.exports = {
    JWT_SECRET,
    authenticateToken,
    optionalAuthToken,
    getUserPermittedNodeIds,
    checkScopePermission,
    checkNodeEditPermission,
    checkAdminRole,
    checkUserManagementPermission
};
