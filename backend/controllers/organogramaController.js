/**
 * Cabeçalho Arquitetural: Controller responsável por orquestrar a lógica de negócios
 * do Organograma. Ele se comunica com o banco de dados para realizar operações CRUD,
 * validação de prevenção de ciclos e formatação da árvore com niveis_hierarquicos.
 */

const pool = require('../config/database');
const { buildTree } = require('../utils/treeBuilder');

/**
 * Obtém todos os nós do organograma formatados em estrutura de árvore.
 * Realiza JOIN com niveis_hierarquicos para injetar slug (tipo), classe_css e nome do nível.
 */
async function getOrganogramaTree(req, res) {
    try {
        const [rows] = await pool.query(`
            SELECT 
                n.id,
                n.parent_id,
                n.titulo,
                n.nivel_id,
                nh.slug AS tipo,
                nh.nome AS nivel_nome,
                nh.classe_css,
                n.responsavel,
                n.lideres_json,
                n.email_contato,
                n.descricao,
                n.icone,
                n.ordem,
                n.ativo
            FROM organograma_nos n
            LEFT JOIN niveis_hierarquicos nh ON n.nivel_id = nh.id
            WHERE n.ativo = 1 
            ORDER BY n.ordem ASC
        `);
        
        rows.forEach(row => {
            if (row.id === 1) {
                if (typeof row.lideres_json === 'string') {
                    row.lideres_json = JSON.parse(row.lideres_json);
                } else if (!row.lideres_json) {
                    row.lideres_json = [
                        { nome: "Dr. Hélio", foto: "/avatars/helio.png" },
                        { nome: "Dr. Viol",  foto: "/avatars/viol.png" }
                    ];
                }
            }
        });

        const tree = buildTree(rows);
        res.json(tree);
    } catch (error) {
        console.error('Erro ao buscar organograma:', error);
        res.status(500).json({ error: 'Erro interno ao buscar a estrutura do organograma.' });
    }
}

/**
 * Retorna a lista de níveis hierárquicos cadastrados no banco (para os selects do Drawer).
 */
async function getNiveisHierarquicos(req, res) {
    try {
        const [rows] = await pool.query(`
            SELECT id, slug, nome, ordem_hierarquica, classe_css 
            FROM niveis_hierarquicos 
            WHERE ativo = 1 
            ORDER BY ordem_hierarquica ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar níveis hierárquicos:', error);
        res.status(500).json({ error: 'Erro interno ao buscar níveis hierárquicos.' });
    }
}

/**
 * Retorna a lista plana de todos os nós ativos do organograma (para o select de nó pai do Drawer).
 */
async function getAllNodesFlat(req, res) {
    try {
        const [rows] = await pool.query(`
            SELECT 
                n.id,
                n.parent_id,
                n.titulo,
                n.nivel_id,
                nh.slug AS tipo,
                nh.nome AS nivel_nome,
                nh.classe_css,
                n.responsavel
            FROM organograma_nos n
            LEFT JOIN niveis_hierarquicos nh ON n.nivel_id = nh.id
            WHERE n.ativo = 1 
            ORDER BY n.titulo ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar lista plana de nós:', error);
        res.status(500).json({ error: 'Erro interno ao buscar lista de nós.' });
    }
}

/**
 * Cria um novo nó no organograma.
 */
async function createNode(req, res) {
    const { parent_id, titulo, nome, nivel_id, tipo, responsavel, email_contato, descricao, icone, ordem } = req.body;
    const nodeTitle = titulo || nome;

    if (!nodeTitle || String(nodeTitle).trim() === '') {
        return res.status(400).json({ error: 'O nome/título da área é um campo obrigatório.' });
    }

    let finalNivelId = nivel_id ? parseInt(nivel_id, 10) : null;

    if (!finalNivelId && tipo) {
        const [niveis] = await pool.query('SELECT id FROM niveis_hierarquicos WHERE slug = ? LIMIT 1', [tipo]);
        if (niveis.length > 0) {
            finalNivelId = niveis[0].id;
        }
    }

    if (!finalNivelId) {
        finalNivelId = 7; // Padrão: Equipe (id 7)
    }

    const parsedParentId = parent_id !== undefined && parent_id !== null && parent_id !== '' ? parseInt(parent_id, 10) : null;

    try {
        const query = `
            INSERT INTO organograma_nos 
            (parent_id, titulo, nivel_id, responsavel, email_contato, descricao, icone, ordem) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            parsedParentId, 
            nodeTitle.trim(), 
            finalNivelId, 
            responsavel || null, 
            email_contato || null, 
            descricao || null, 
            icone || 'users', 
            ordem || 0
        ];
        
        const [result] = await pool.query(query, values);
        
        res.status(201).json({ message: 'Nó criado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar nó:', error);
        res.status(500).json({ error: 'Erro interno ao criar nó no organograma.' });
    }
}

/**
 * Atualiza os dados de um nó existente e previne loops hierárquicos ao reparentear.
 */
async function updateNode(req, res) {
    const { id } = req.params;
    const { parent_id, titulo, nome, nivel_id, tipo, responsavel, email_contato, descricao, icone, ordem, ativo } = req.body;

    const nodeId = parseInt(id, 10);
    const nodeTitle = titulo || nome;
    const parsedParentId = parent_id !== undefined && parent_id !== null && parent_id !== '' ? parseInt(parent_id, 10) : null;

    if (!nodeTitle || String(nodeTitle).trim() === '') {
        return res.status(400).json({ error: 'O nome/título da área é um campo obrigatório.' });
    }

    let finalNivelId = nivel_id ? parseInt(nivel_id, 10) : null;

    if (!finalNivelId && tipo) {
        const [niveis] = await pool.query('SELECT id FROM niveis_hierarquicos WHERE slug = ? LIMIT 1', [tipo]);
        if (niveis.length > 0) {
            finalNivelId = niveis[0].id;
        }
    }

    if (!finalNivelId) {
        finalNivelId = 7;
    }

    try {
        // Prevenção de ciclo ao reparentear
        if (parsedParentId) {
            if (parsedParentId === nodeId) {
                return res.status(400).json({ error: 'Um nó não pode ser seu próprio pai.' });
            }

            const [allNodes] = await pool.query('SELECT id, parent_id FROM organograma_nos');
            let current = allNodes.find(n => n.id === parsedParentId);
            while (current && current.parent_id) {
                if (current.parent_id === nodeId) {
                    return res.status(400).json({ error: 'Operação inválida: um nó não pode ser reparenteado para um de seus próprios descendentes.' });
                }
                current = allNodes.find(n => n.id === current.parent_id);
            }
        }

        const query = `
            UPDATE organograma_nos 
            SET parent_id = ?, titulo = ?, nivel_id = ?, responsavel = ?, email_contato = ?, descricao = ?, icone = ?, ordem = ?, ativo = ?
            WHERE id = ?
        `;
        const values = [
            parsedParentId, 
            nodeTitle.trim(), 
            finalNivelId, 
            responsavel !== undefined ? responsavel : null, 
            email_contato !== undefined ? email_contato : null, 
            descricao !== undefined ? descricao : null, 
            icone || 'users', 
            ordem !== undefined ? ordem : 0, 
            ativo !== undefined ? ativo : 1, 
            nodeId
        ];
        
        const [result] = await pool.query(query, values);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Nó não encontrado.' });
        }
        
        res.json({ message: 'Nó atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar nó:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar nó.' });
    }
}

/**
 * Exclui um nó do organograma. A deleção em cascata no MySQL removerá os subordinados.
 */
async function deleteNode(req, res) {
    const { id } = req.params;

    try {
        const [result] = await pool.query('DELETE FROM organograma_nos WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Nó não encontrado.' });
        }
        
        res.json({ message: 'Nó e seus subordinados removidos com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar nó:', error);
        res.status(500).json({ error: 'Erro interno ao deletar nó.' });
    }
}

module.exports = {
    getOrganogramaTree,
    getNiveisHierarquicos,
    getAllNodesFlat,
    createNode,
    updateNode,
    deleteNode
};
