/**
 * Cabeçalho Arquitetural: Módulo de inicialização e autossuficiência do esquema MySQL.
 * Garante que a tabela 'niveis_hierarquicos' exista, esteja populada e que 'organograma_nos'
 * possua a chave estrangeira 'nivel_id' associada.
 */

const pool = require('../config/database');

async function initDatabaseSchema() {
    try {
        console.log('[DB-Init] Verificando estrutura e tabela niveis_hierarquicos...');

        // 1. Cria a tabela niveis_hierarquicos caso não exista
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`niveis_hierarquicos\` (
              \`id\` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único do nível hierárquico',
              \`slug\` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Identificador único textual (ex: ceo, staff, diretoria)',
              \`nome\` VARCHAR(100) NOT NULL COMMENT 'Nome de exibição institucional (ex: Co-CEOs, Staff, Diretoria)',
              \`ordem_hierarquica\` INT NOT NULL DEFAULT 1 COMMENT 'Ordem de precedência hierárquica (1 a N)',
              \`classe_css\` VARCHAR(100) NOT NULL COMMENT 'Classe CSS semântica definida em organograma.css',
              \`ativo\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Flag de status: 1 = ativo, 0 = inativo',
              \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de níveis hierárquicos institucionais JHE';
        `);

        // 2. Popula os níveis institucionais da JHE
        const niveisSeed = [
            [1, 'ceo', 'Co-CEOs', 1, 'level-ceo', 1],
            [2, 'staff', 'Staff', 2, 'level-staff', 1],
            [3, 'diretoria', 'Diretoria', 3, 'level-diretoria', 1],
            [4, 'coordenacao', 'Coordenação', 4, 'level-coordenacao', 1],
            [5, 'gerencia', 'Gerência', 5, 'level-coordenacao', 1],
            [6, 'apoio', 'Apoio', 6, 'level-subordinado', 1],
            [7, 'equipe', 'Equipe', 7, 'level-subordinado', 1],
            [8, 'unidade', 'Unidade de Negócios', 5, 'level-coordenacao', 1],
            [9, 'contrato', 'Contrato', 7, 'level-subordinado', 1],
            [10, 'oia', 'OIA', 3, 'level-diretoria', 1]
        ];

        for (const n of niveisSeed) {
            await pool.query(
                `INSERT INTO niveis_hierarquicos (id, slug, nome, ordem_hierarquica, classe_css, ativo) 
                 VALUES (?, ?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE nome = VALUES(nome), classe_css = VALUES(classe_css), ordem_hierarquica = VALUES(ordem_hierarquica)`,
                n
            );
        }

        // 3. Verifica se o campo 'nivel_id' existe na tabela organograma_nos
        const [columns] = await pool.query("SHOW COLUMNS FROM organograma_nos LIKE 'nivel_id'");
        if (columns.length === 0) {
            console.log('[DB-Init] Adicionando coluna nivel_id na tabela organograma_nos...');
            await pool.query("ALTER TABLE organograma_nos ADD COLUMN nivel_id INT NOT NULL DEFAULT 7 AFTER parent_id");
            
            // Mapeamento dos tipos existentes para nivel_id
            await pool.query("UPDATE organograma_nos SET nivel_id = 1 WHERE tipo = 'ceo'");
            await pool.query("UPDATE organograma_nos SET nivel_id = 2 WHERE tipo = 'staff'");
            await pool.query("UPDATE organograma_nos SET nivel_id = 3 WHERE tipo = 'diretoria'");
            await pool.query("UPDATE organograma_nos SET nivel_id = 4 WHERE tipo = 'coordenacao'");
            await pool.query("UPDATE organograma_nos SET nivel_id = 5 WHERE tipo = 'gerencia'");
            await pool.query("UPDATE organograma_nos SET nivel_id = 6 WHERE tipo = 'apoio'");
            await pool.query("UPDATE organograma_nos SET nivel_id = 7 WHERE tipo = 'equipe'");
            await pool.query("UPDATE organograma_nos SET nivel_id = 8 WHERE tipo = 'unidade'");
            await pool.query("UPDATE organograma_nos SET nivel_id = 9 WHERE tipo = 'contrato'");
            await pool.query("UPDATE organograma_nos SET nivel_id = 10 WHERE tipo = 'oia'");

            try {
                await pool.query("ALTER TABLE organograma_nos ADD CONSTRAINT fk_organograma_nivel FOREIGN KEY (nivel_id) REFERENCES niveis_hierarquicos (id) ON UPDATE CASCADE");
            } catch (errConstraint) {
                console.log('[DB-Init] Aviso FK nivel_id:', errConstraint.message);
            }
        }

        // 4. Garante a tabela de usuários e os dados de seed padrão
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`usuarios\` (
              \`id\` INT AUTO_INCREMENT PRIMARY KEY,
              \`nome_completo\` VARCHAR(150) NOT NULL,
              \`email\` VARCHAR(150) NOT NULL UNIQUE,
              \`senha_hash\` VARCHAR(255) NOT NULL,
              \`role_global\` ENUM('admin', 'diretor', 'coordenador', 'colaborador') NOT NULL DEFAULT 'colaborador',
              \`ativo\` TINYINT(1) NOT NULL DEFAULT 1,
              \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`usuario_cargos_nos\` (
              \`id\` INT AUTO_INCREMENT PRIMARY KEY,
              \`usuario_id\` INT NOT NULL,
              \`no_id\` INT NOT NULL,
              \`papel_no_cargo\` VARCHAR(100) NOT NULL DEFAULT 'Titular',
              \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT \`fk_ucn_usuario\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
              CONSTRAINT \`fk_ucn_no\` FOREIGN KEY (\`no_id\`) REFERENCES \`organograma_nos\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
              UNIQUE KEY \`uk_usuario_no\` (\`usuario_id\`, \`no_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        const bcrypt = require('bcryptjs');
        const adminHash = await bcrypt.hash('Admin@123', 10);
        const leandroHash = await bcrypt.hash('leandro123', 10);

        await pool.query(`
            INSERT INTO usuarios (id, nome_completo, email, senha_hash, role_global, ativo) 
            VALUES (1, 'Administrador do Sistema', 'admin@jhe.com.br', ?, 'admin', 1)
            ON DUPLICATE KEY UPDATE nome_completo = VALUES(nome_completo), senha_hash = VALUES(senha_hash), role_global = VALUES(role_global)
        `, [adminHash]);

        await pool.query(`
            INSERT INTO usuarios (id, nome_completo, email, senha_hash, role_global, ativo) 
            VALUES (2, 'Leandro Furlani', 'leandro@jhe.com.br', ?, 'diretor', 1)
            ON DUPLICATE KEY UPDATE nome_completo = VALUES(nome_completo), senha_hash = VALUES(senha_hash), role_global = VALUES(role_global)
        `, [leandroHash]);

        await pool.query(`
            INSERT INTO usuario_cargos_nos (usuario_id, no_id, papel_no_cargo) 
            VALUES (2, 120, 'Titular'), (2, 128, 'Acumulação')
            ON DUPLICATE KEY UPDATE papel_no_cargo = VALUES(papel_no_cargo)
        `);

        console.log('[DB-Init] Sincronia de níveis hierárquicos e usuários concluída com sucesso.');
    } catch (error) {
        console.error('[DB-Init] Erro ao inicializar esquema do banco:', error.message);
    }
}

module.exports = { initDatabaseSchema };

