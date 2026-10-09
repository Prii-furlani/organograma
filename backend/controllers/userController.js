/**
 * Cabeçalho Arquitetural: Controller de Gerenciamento de Usuários.
 * Permite que administradores criem, editem, alterem status e vinculem colaboradores a múltiplos nós.
 */

const pool = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Obtém a lista completa de usuários cadastrados com seus cargos vinculados.
 */
async function getAllUsers(req, res) {
    try {
        const [users] = await pool.query(`
            SELECT id, nome_completo, email, role_global, primeiro_acesso, ativo, created_at 
            FROM usuarios 
            ORDER BY nome_completo ASC
        `);

        const [cargos] = await pool.query(`
            SELECT ucn.usuario_id, ucn.no_id, ucn.papel_no_cargo, n.titulo AS no_titulo
            FROM usuario_cargos_nos ucn
            JOIN organograma_nos n ON ucn.no_id = n.id
        `);

        users.forEach(u => {
            u.cargos = cargos.filter(c => c.usuario_id === u.id);
            u.primeiro_acesso = u.primeiro_acesso === 1;
        });

        res.json(users);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro interno ao listar usuários.' });
    }
}

/**
 * Cadastra um novo colaborador no sistema (senha provisória padrão Jhe@2026 com primeiro_acesso = 1).
 */
async function createUser(req, res) {
    const { nome_completo, email, role_global, nos_ids, no_ids } = req.body;

    if (!nome_completo || !nome_completo.trim()) {
        return res.status(400).json({ error: 'O Nome Completo é um campo obrigatório.' });
    }
    if (!email || !email.trim()) {
        return res.status(400).json({ error: 'O E-mail Institucional é um campo obrigatório.' });
    }
    if (!role_global) {
        return res.status(400).json({ error: 'O Perfil Base é um campo obrigatório.' });
    }

    try {
        const cleanEmail = email.trim().toLowerCase();

        // Valida duplicidade de e-mail
        const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [cleanEmail]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
        }

        // Senha inicial fixa padrão: 'Jhe@2026' com hash bcrypt e primeiro_acesso = 1
        const rawPassword = 'Jhe@2026';
        const senha_hash = await bcrypt.hash(rawPassword, 10);

        // Insere o usuário na tabela usuarios com primeiro_acesso = 1 e ativo = 1
        const [result] = await pool.query(
            'INSERT INTO usuarios (nome_completo, email, senha_hash, role_global, primeiro_acesso, ativo) VALUES (?, ?, ?, ?, 1, 1)',
            [nome_completo.trim(), cleanEmail, senha_hash, role_global]
        );

        const newUserId = result.insertId;

        // Associa os nós/vagas selecionados em usuario_cargos_nos
        const targetNosIds = nos_ids || no_ids || [];
        if (Array.isArray(targetNosIds) && targetNosIds.length > 0) {
            for (let noId of targetNosIds) {
                const parsedNoId = parseInt(noId, 10);
                if (parsedNoId) {
                    await pool.query(
                        'INSERT INTO usuario_cargos_nos (usuario_id, no_id, papel_no_cargo) VALUES (?, ?, ?)',
                        [newUserId, parsedNoId, 'Titular']
                    );
                }
            }
        }

        res.status(201).json({ 
            message: 'Usuário cadastrado com sucesso. Senha provisória: Jhe@2026', 
            id: newUserId 
        });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro interno ao cadastrar novo usuário.' });
    }
}

/**
 * Atualiza os dados de um usuário e suas permissões/cargos.
 */
async function updateUser(req, res) {
    const { id } = req.params;
    const { nome_completo, email, senha, role_global, ativo, nos_ids, no_ids } = req.body;
    const userId = parseInt(id, 10);

    try {
        const [users] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        let senha_hash = users[0].senha_hash;
        if (senha && senha.trim().length >= 4) {
            senha_hash = await bcrypt.hash(senha.trim(), 10);
        }

        await pool.query(
            'UPDATE usuarios SET nome_completo = ?, email = ?, senha_hash = ?, role_global = ?, ativo = ? WHERE id = ?',
            [
                nome_completo ? nome_completo.trim() : users[0].nome_completo,
                email ? email.trim().toLowerCase() : users[0].email,
                senha_hash,
                role_global || users[0].role_global,
                ativo !== undefined ? (ativo ? 1 : 0) : users[0].ativo,
                userId
            ]
        );

        // Atualiza as associações em usuario_cargos_nos
        const targetNosIds = nos_ids !== undefined ? nos_ids : no_ids;
        if (Array.isArray(targetNosIds)) {
            await pool.query('DELETE FROM usuario_cargos_nos WHERE usuario_id = ?', [userId]);
            for (let noId of targetNosIds) {
                const parsedNoId = parseInt(noId, 10);
                if (parsedNoId) {
                    await pool.query(
                        'INSERT INTO usuario_cargos_nos (usuario_id, no_id, papel_no_cargo) VALUES (?, ?, ?)',
                        [userId, parsedNoId, 'Titular']
                    );
                }
            }
        }

        res.json({ message: 'Usuário atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar usuário.' });
    }
}

/**
 * Reseta a senha do usuário para o padrão Jhe@2026 com troca obrigatória no próximo acesso.
 */
async function resetUserPassword(req, res) {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    try {
        const [users] = await pool.query('SELECT id FROM usuarios WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const defaultHash = await bcrypt.hash('Jhe@2026', 10);
        await pool.query(
            'UPDATE usuarios SET senha_hash = ?, primeiro_acesso = 1 WHERE id = ?',
            [defaultHash, userId]
        );

        res.json({ message: 'Senha resetada com sucesso para o padrão Jhe@2026.' });
    } catch (error) {
        console.error('Erro ao resetar senha do usuário:', error);
        res.status(500).json({ error: 'Erro interno ao resetar senha do usuário.' });
    }
}

/**
 * Remove um usuário do sistema.
 */
async function deleteUser(req, res) {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    try {
        const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        res.json({ message: 'Usuário removido com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: 'Erro interno ao excluir usuário.' });
    }
}

module.exports = {
    getAllUsers,
    createUser,
    updateUser,
    resetUserPassword,
    deleteUser
};
