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
                n.telefone,
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
            row.responsavel = row.responsavel && String(row.responsavel).trim() !== '' ? String(row.responsavel).trim() : null;
            row.email_contato = row.email_contato && String(row.email_contato).trim() !== '' ? String(row.email_contato).trim() : null;
            row.telefone = row.telefone && String(row.telefone).trim() !== '' ? String(row.telefone).trim() : null;
            row.descricao = row.descricao && String(row.descricao).trim() !== '' ? String(row.descricao).trim() : null;

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
                n.responsavel,
                n.email_contato,
                n.telefone,
                n.descricao
            FROM organograma_nos n
            LEFT JOIN niveis_hierarquicos nh ON n.nivel_id = nh.id
            WHERE n.ativo = 1 
            ORDER BY n.titulo ASC
        `);

        rows.forEach(row => {
            row.responsavel = row.responsavel && String(row.responsavel).trim() !== '' ? String(row.responsavel).trim() : null;
            row.email_contato = row.email_contato && String(row.email_contato).trim() !== '' ? String(row.email_contato).trim() : null;
            row.telefone = row.telefone && String(row.telefone).trim() !== '' ? String(row.telefone).trim() : null;
            row.descricao = row.descricao && String(row.descricao).trim() !== '' ? String(row.descricao).trim() : null;
        });

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
    const { parent_id, titulo, nome, nivel_id, tipo, responsavel, email_contato, telefone, descricao, icone, ordem } = req.body;
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
            (parent_id, titulo, nivel_id, responsavel, email_contato, telefone, descricao, icone, ordem) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            parsedParentId, 
            nodeTitle.trim(), 
            finalNivelId, 
            responsavel || null, 
            email_contato || null, 
            telefone || null,
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
    const { parent_id, titulo, nome, nivel_id, tipo, responsavel, email_contato, telefone, descricao, icone, ordem, ativo } = req.body;

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
            SET parent_id = ?, titulo = ?, nivel_id = ?, responsavel = ?, email_contato = ?, telefone = ?, descricao = ?, icone = ?, ordem = ?, ativo = ?
            WHERE id = ?
        `;
        const values = [
            parsedParentId, 
            nodeTitle.trim(), 
            finalNivelId, 
            responsavel !== undefined ? responsavel : null, 
            email_contato !== undefined ? email_contato : null, 
            telefone !== undefined ? telefone : null,
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
 * Move um nó para um novo nó pai (reparenting), com prevenção de ciclos e recálculo de níveis.
 */
async function moveNode(req, res) {
    const { id } = req.params;
    const { parent_id, nivel_id } = req.body;

    const nodeId = parseInt(id, 10);
    const parsedParentId = parent_id !== undefined && parent_id !== null && parent_id !== '' 
        ? parseInt(parent_id, 10) 
        : null;

    if (!nodeId) {
        return res.status(400).json({ error: 'ID do nó inválido.' });
    }

    try {
        const [allNodes] = await pool.query('SELECT id, parent_id, nivel_id, titulo FROM organograma_nos WHERE ativo = 1');
        const targetNode = allNodes.find(n => n.id === nodeId);
        if (!targetNode) {
            return res.status(404).json({ error: 'Nó a ser movido não encontrado.' });
        }

        if (parsedParentId) {
            if (parsedParentId === nodeId) {
                return res.status(400).json({ error: 'Um nó não pode ser subordinado a si mesmo.' });
            }

            // Prevenção de ciclo: o novo pai não pode ser um descendente do nó a ser movido
            let current = allNodes.find(n => n.id === parsedParentId);
            while (current && current.parent_id) {
                if (current.parent_id === nodeId) {
                    return res.status(400).json({ 
                        error: 'Operação inválida: um nó não pode ser movido para dentro de um de seus próprios subordinados.' 
                    });
                }
                current = allNodes.find(n => n.id === current.parent_id);
            }
        }

        // Determina nivel_id recalculando com base na hierarquia do novo pai se necessário
        let finalNivelId = nivel_id ? parseInt(nivel_id, 10) : targetNode.nivel_id;

        if (parsedParentId) {
            const [niveis] = await pool.query('SELECT id, ordem_hierarquica FROM niveis_hierarquicos ORDER BY ordem_hierarquica ASC');
            const parentNode = allNodes.find(n => n.id === parsedParentId);
            if (parentNode) {
                const parentNivel = niveis.find(nh => nh.id === parentNode.nivel_id);
                const currentNivel = niveis.find(nh => nh.id === targetNode.nivel_id);

                if (parentNivel && currentNivel && currentNivel.ordem_hierarquica <= parentNivel.ordem_hierarquica) {
                    // O novo nível do nó movido deve ser subordinado (ordem_hierarquica maior que o pai)
                    const subordinateNiveis = niveis.filter(nh => nh.ordem_hierarquica > parentNivel.ordem_hierarquica);
                    if (subordinateNiveis.length > 0) {
                        finalNivelId = subordinateNiveis[0].id;
                    }
                }
            }
        }

        // Determina a ordem como próximo elemento na lista de filhos
        const [ordemResult] = await pool.query(
            'SELECT COALESCE(MAX(ordem), 0) + 1 AS proxima_ordem FROM organograma_nos WHERE parent_id <=> ?', 
            [parsedParentId]
        );
        const proximaOrdem = ordemResult[0]?.proxima_ordem || 1;

        await pool.query(
            'UPDATE organograma_nos SET parent_id = ?, nivel_id = ?, ordem = ?, updated_at = NOW() WHERE id = ?',
            [parsedParentId, finalNivelId, proximaOrdem, nodeId]
        );

        res.json({ 
            message: 'Setor transferido com sucesso.', 
            id: nodeId, 
            parent_id: parsedParentId,
            nivel_id: finalNivelId
        });
    } catch (error) {
        console.error('Erro ao transferir setor:', error);
        res.status(500).json({ error: 'Erro interno ao transferir setor.' });
    }
}

/**
 * Exclui um nó e todos os seus subordinados em transação segura (BEGIN ... COMMIT).
 */
async function deleteNode(req, res) {
    const { id } = req.params;
    const nodeId = parseInt(id, 10);

    if (!nodeId) {
        return res.status(400).json({ error: 'ID do nó inválido.' });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [allNodes] = await connection.query('SELECT id, parent_id FROM organograma_nos');
        const targetNode = allNodes.find(n => n.id === nodeId);
        if (!targetNode) {
            await connection.rollback();
            return res.status(404).json({ error: 'Nó não encontrado.' });
        }

        const idsToDelete = [nodeId];
        const collectDescendants = (parentId) => {
            const children = allNodes.filter(n => n.parent_id === parentId);
            for (let child of children) {
                if (!idsToDelete.includes(child.id)) {
                    idsToDelete.push(child.id);
                    collectDescendants(child.id);
                }
            }
        };

        collectDescendants(nodeId);

        // Remove associações de usuários com os nós a serem deletados
        await connection.query('DELETE FROM usuario_cargos_nos WHERE no_id IN (?)', [idsToDelete]);

        // Remove os nós em lote dentro da mesma transação
        const [result] = await connection.query('DELETE FROM organograma_nos WHERE id IN (?)', [idsToDelete]);

        await connection.commit();

        res.json({ 
            message: 'Nó e todos os seus subordinados foram excluídos com sucesso.',
            deleted_count: result.affectedRows,
            deleted_ids: idsToDelete
        });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao deletar nó em transação:', error);
        res.status(500).json({ error: 'Erro interno ao deletar nó.' });
    } finally {
        connection.release();
    }
}

module.exports = {
    getOrganogramaTree,
    getNiveisHierarquicos,
    getAllNodesFlat,
    createNode,
    updateNode,
    moveNode,
    deleteNode
};
