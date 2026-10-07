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
 * Cria um novo nó no banco de dados.
 * @param {Object} nodeData - Dados do nó a ser criado
 * @returns {Promise<Object>} Resposta da criação
 */
export const createNode = async (nodeData) => {
    const response = await api.post('/organograma', nodeData);
    return response.data;
};

/**
 * Atualiza um nó existente.
 * @param {number} id - ID do nó
 * @param {Object} nodeData - Novos dados
 * @returns {Promise<Object>} Resposta da atualização
 */
export const updateNode = async (id, nodeData) => {
    const response = await api.put(`/organograma/${id}`, nodeData);
    return response.data;
};

/**
 * Deleta um nó pelo seu ID.
 * @param {number} id - ID do nó
 * @returns {Promise<Object>} Resposta da exclusão
 */
export const deleteNode = async (id) => {
    const response = await api.delete(`/organograma/${id}`);
    return response.data;
};
