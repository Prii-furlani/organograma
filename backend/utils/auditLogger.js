const pool = require('../config/database');

/**
 * Registra uma ação no log de auditoria.
 * @param {Object} params - Parâmetros do log.
 * @param {number|null} params.usuario_id - ID do usuário.
 * @param {string} params.usuario_nome - Nome do usuário.
 * @param {string} params.usuario_email - Email do usuário.
 * @param {string} params.tipo_acao - Tipo de ação (CRIACAO, EDICAO, MOVIMENTACAO, EXCLUSAO).
 * @param {string} params.alvo_tipo - Tipo de alvo (ex: ESTRUTURA).
 * @param {number|null} params.alvo_id - ID do alvo modificado.
 * @param {string} params.alvo_nome - Nome ou descrição do alvo.
 * @param {Object} params.detalhes - Detalhes adicionais em JSON.
 */
async function logAction({
  usuario_id,
  usuario_nome,
  usuario_email,
  tipo_acao,
  alvo_tipo = 'ESTRUTURA',
  alvo_id,
  alvo_nome,
  detalhes = {}
}) {
  try {
    const query = `
      INSERT INTO organograma_logs 
      (usuario_id, usuario_nome, usuario_email, tipo_acao, alvo_tipo, alvo_id, alvo_nome, detalhes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      usuario_id || null,
      usuario_nome || 'Sistema',
      usuario_email || 'sistema@sistema.com',
      tipo_acao,
      alvo_tipo,
      alvo_id || null,
      alvo_nome || 'N/A',
      JSON.stringify(detalhes)
    ];

    await pool.query(query, values);
  } catch (error) {
    console.error('Erro ao registrar log de auditoria:', error);
  }
}

module.exports = {
  logAction
};
