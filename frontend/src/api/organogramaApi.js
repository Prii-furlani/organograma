/**
 * Cabeçalho Arquitetural: Camada de serviços para comunicação com a API Backend.
 * Utiliza o Axios com interceptor para injetar o token JWT e gerenciar o CRUD de nós do organograma.
 */

import axios from 'axios';

// Instância base do axios configurada para usar a API
const api = axios.create({
    baseURL: '/api',
});

// Interceptor para injetar o token JWT de autorização automaticamente
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('organograma_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

/**
 * Busca a árvore completa do organograma.
 * @returns {Promise<Array>} Retorna a estrutura em árvore dos nós.
 */
export const fetchOrganogramaTree = async () => {
    const response = await api.get('/organograma');
    return response.data;
};

/**
 * Busca a lista de níveis hierárquicos institucionais JHE.
 * @returns {Promise<Array>} Retorna a lista de níveis hierárquicos.
 */
export const fetchNiveisHierarquicos = async () => {
    const response = await api.get('/organograma/niveis');
    return response.data;
};

/**
 * Busca a lista plana de todos os nós (usada no select de nó pai do Drawer).
 * @returns {Promise<Array>} Retorna lista plana { id, parent_id, titulo, tipo, responsavel }.
 */
export const fetchFlatNodesList = async () => {
    const response = await api.get('/organograma/nos/flat');
    return response.data;
};

/**
 * Cria um novo nó no banco de dados.
 * @param {Object} nodeData - Dados do nó a ser criado
 * @returns {Promise<Object>} Resposta da criação
 */
export const createNode = async (nodeData) => {
    const response = await api.post('/organograma/nos', nodeData);
    return response.data;
};

/**
 * Atualiza um nó existente.
 * @param {number} id - ID do nó
 * @param {Object} nodeData - Novos dados
 * @returns {Promise<Object>} Resposta da atualização
 */
export const updateNode = async (id, nodeData) => {
    const response = await api.put(`/organograma/nos/${id}`, nodeData);
    return response.data;
};

/**
 * Deleta um nó pelo seu ID.
 * @param {number} id - ID do nó
 * @returns {Promise<Object>} Resposta da exclusão
 */
export const deleteNode = async (id) => {
    const response = await api.delete(`/organograma/nos/${id}`);
    return response.data;
};

// ==========================================
// AUDITORIA E LOGS
// ==========================================

export const getOrganogramaLogs = async (params = {}) => {
    const response = await api.get('/organograma/logs', { params });
    return response.data;
};

/**
 * Move um nó para um novo nó pai (reparenting) e recalcula níveis.
 * @param {number|string} id - ID do nó a ser movido
 * @param {number|string} parent_id - ID do novo nó pai
 * @returns {Promise<Object>} Resposta da movimentação
 */
export const moveNode = async (id, parent_id) => {
    const response = await api.patch(`/organograma/nos/${id}/mover`, { parent_id });
    return response.data;
};

/**
 * Busca a lista de usuários cadastrados (apenas Admin).
 */
export const fetchUsersList = async () => {
    const response = await api.get('/usuarios');
    return response.data;
};

/**
 * Cadastra um novo usuário colaborador.
 */
export const createUserData = async (userData) => {
    const response = await api.post('/usuarios', userData);
    return response.data;
};

/**
 * Atualiza um usuário existente.
 */
export const updateUserData = async (id, userData) => {
    const response = await api.put(`/usuarios/${id}`, userData);
    return response.data;
};

/**
 * Exclui um usuário pelo ID.
 */
export const deleteUserData = async (id) => {
    const response = await api.delete(`/usuarios/${id}`);
    return response.data;
};

/**
 * Redefine a senha de um usuário para o padrão provisório JHE@123 (apenas Admin).
 */
export const resetUserPassword = async (id) => {
    const response = await api.patch(`/usuarios/${id}/reset-senha`);
    return response.data;
};

/**
 * Define a nova senha no primeiro acesso do colaborador.
 */
export const definirPrimeiraSenha = async (nova_senha, confirmacao_senha, usuario_id, email, customToken) => {
    const token = customToken || localStorage.getItem('organograma_token') || sessionStorage.getItem('organograma_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await api.post('/auth/definir-primeira-senha', {
        nova_senha,
        confirmacao_senha,
        usuario_id,
        email
    }, { headers });
    return response.data;
};

/**
 * Busca o Termo de Serviço ativo/vigente no banco de dados.
 */
export const fetchTermoVigente = async () => {
    const response = await api.get('/termos/vigente');
    return response.data;
};

/**
 * Registra o aceite do Termo de Serviço pelo usuário logado.
 */
export const aceitarTermo = async (versao) => {
    const response = await api.post('/termos/aceitar', { versao });
    return response.data;
};

/**
 * Atualiza ou insere novos Termos de Serviço (Administrador Global).
 */
export const updateTermoAdmin = async (termoData) => {
    const response = await api.put('/termos/admin', termoData);
    return response.data;
};


