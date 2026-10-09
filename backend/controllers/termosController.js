/**
 * Cabeçalho Arquitetural: Controller para gerenciamento dos Termos de Serviço (Termo de Aceite Dinâmico).
 * Permite buscar o termo vigente, registrar o aceite pelo usuário logado e atualizar o termo (Admin).
 */

const pool = require('../config/database');

/**
 * Retorna o Termo de Serviço ativo/vigente no banco MySQL.
 */
async function getTermoVigente(req, res) {
    try {
        const [termos] = await pool.query(
            'SELECT id, titulo, subtitulo, conteudo, versao, ativo, updated_at FROM termos_servico WHERE ativo = 1 ORDER BY id DESC LIMIT 1'
        );

        if (termos.length === 0) {
            return res.status(404).json({ error: 'Nenhum termo de serviço ativo encontrado.' });
        }

        res.json(termos[0]);
    } catch (error) {
        console.error('[ERRO TERMO VIGENTE]:', error);
        res.status(500).json({ error: 'Erro ao buscar o termo de serviço vigente.' });
    }
}

/**
 * Registra a concordância/aceite do usuário autenticado com a versão do termo.
 */
async function aceitarTermo(req, res) {
    const { versao } = req.body;
    const userId = req.user.id;

    if (!versao) {
        return res.status(400).json({ error: 'A versão do termo aceito é obrigatória.' });
    }

    try {
        await pool.query(
            'UPDATE usuarios SET termo_aceite_versao = ?, termo_aceite_em = NOW() WHERE id = ?',
            [versao, userId]
        );

        res.json({
            message: 'Termo de serviço aceito com sucesso.',
            termo_aceite_versao: versao,
            termo_aceite_em: new Date().toISOString()
        });
    } catch (error) {
        console.error('[ERRO ACEITAR TERMO]:', error);
        res.status(500).json({ error: 'Erro ao registrar aceite do termo de serviço.' });
    }
}

/**
 * Atualiza ou insere uma nova versão dos Termos de Serviço (Exclusivo Administrador).
 */
async function updateTermoAdmin(req, res) {
    const { titulo, subtitulo, conteudo, versao } = req.body;

    if (!conteudo || !versao) {
        return res.status(400).json({ error: 'Conteúdo e versão são obrigatórios.' });
    }

    try {
        // Desativa a versão anterior
        await pool.query('UPDATE termos_servico SET ativo = 0');

        // Insere a nova versão ativa
        const [result] = await pool.query(
            'INSERT INTO termos_servico (titulo, subtitulo, conteudo, versao, ativo) VALUES (?, ?, ?, ?, 1)',
            [titulo || 'Termos de Serviço', subtitulo || 'Revise os termos antes de aceitar o acordo.', conteudo, versao]
        );

        res.json({
            message: `Termos de serviço atualizados para a versão ${versao} com sucesso.`,
            id: result.insertId,
            versao
        });
    } catch (error) {
        console.error('[ERRO ADMIN UPDATE TERMOS]:', error);
        res.status(500).json({ error: 'Erro ao atualizar o termo de serviço.' });
    }
}

module.exports = {
    getTermoVigente,
    aceitarTermo,
    updateTermoAdmin
};
