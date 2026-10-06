/**
 * Cabeçalho Arquitetural: Controller responsável por orquestrar a lógica de negócios
 * do Organograma. Ele se comunica com o banco de dados para realizar operações CRUD
 * e utiliza funções utilitárias (como treeBuilder) para formatar os dados.
 */

const pool = require('../config/database');
const { buildTree } = require('../utils/treeBuilder');

/**
 * Obtém todos os nós do organograma formatados em estrutura de árvore.
 * Apenas os nós marcados como 'ativo=1' são retornados por padrão.
 * 
 * @param {import('express').Request} req - Objeto de requisição do Express
 * @param {import('express').Response} res - Objeto de resposta do Express
 */
async function getOrganogramaTree(req, res) {
    try {
        // Busca os nós ativos no banco de dados, ordenados por 'ordem'
        const [rows] = await pool.query('SELECT * FROM organograma_nos WHERE ativo = 1 ORDER BY ordem ASC');
        
        // Injeção de dados de líderes para o CEO caso o banco de dados ainda não tenha sido atualizado
        rows.forEach(row => {
            if (row.id === 1) {
                // Parse do JSON se vier do banco, ou injeta default se vier null
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

        // Converte o array plano em árvore
        const tree = buildTree(rows);
        
        res.json(tree);
    } catch (error) {
        console.error('Erro ao buscar organograma:', error);
        res.status(500).json({ error: 'Erro interno ao buscar a estrutura do organograma.' });
    }
}

/**
 * Cria um novo nó no organograma.
 * 
 * @param {import('express').Request} req - Objeto de requisição do Express contendo os dados do nó
 * @param {import('express').Response} res - Objeto de resposta do Express
 */
async function createNode(req, res) {
    const { parent_id, titulo, tipo, responsavel, email_contato, descricao, cor_tema, icone, ordem } = req.body;

    try {
        const query = `
            INSERT INTO organograma_nos 
            (parent_id, titulo, tipo, responsavel, email_contato, descricao, cor_tema, icone, ordem) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [parent_id || null, titulo, tipo || 'equipe', responsavel, email_contato, descricao, cor_tema || '#0284c7', icone || 'users', ordem || 0];
        
        const [result] = await pool.query(query, values);
        
        res.status(201).json({ message: 'Nó criado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Erro ao criar nó:', error);
        res.status(500).json({ error: 'Erro interno ao criar nó no organograma.' });
    }
}

/**
 * Atualiza os dados de um nó existente.
 * 
 * @param {import('express').Request} req - Objeto de requisição com o ID nos parâmetros e dados no corpo
 * @param {import('express').Response} res - Objeto de resposta
 */
async function updateNode(req, res) {
    const { id } = req.params;
    const { parent_id, titulo, tipo, responsavel, email_contato, descricao, cor_tema, icone, ordem, ativo } = req.body;

    try {
        const query = `
            UPDATE organograma_nos 
            SET parent_id = ?, titulo = ?, tipo = ?, responsavel = ?, email_contato = ?, descricao = ?, cor_tema = ?, icone = ?, ordem = ?, ativo = ?
            WHERE id = ?
        `;
        const values = [parent_id || null, titulo, tipo, responsavel, email_contato, descricao, cor_tema, icone, ordem, ativo, id];
        
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
 * Exclui um nó do organograma logicamente ou fisicamente.
 * A deleção em cascata (ON DELETE CASCADE) no banco de dados removerá os filhos automaticamente.
 * 
 * @param {import('express').Request} req - Objeto de requisição com o ID
 * @param {import('express').Response} res - Objeto de resposta
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
    createNode,
    updateNode,
    deleteNode
};
