/**
 * Cabeçalho Arquitetural: Contexto Global de Autenticação e Permissões (RBAC).
 * Gerencia o login, logout, persistência no localStorage e cálculo de permissões de edição por nó.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE_URL = 'http://localhost:5000/api';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('organograma_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [token, setToken] = useState(() => {
        return localStorage.getItem('organograma_token') || null;
    });

    const [allowedNodeIds, setAllowedNodeIds] = useState(() => {
        const savedAllowed = localStorage.getItem('organograma_allowed_nodes');
        return savedAllowed ? JSON.parse(savedAllowed) : [];
    });

    const [isLoading, setIsLoading] = useState(false);
    const [loginError, setLoginError] = useState(null);

    // Valida o token salvo ao carregar
    useEffect(() => {
        if (!token) return;

        const verifySession = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                    setAllowedNodeIds(data.allowed_node_ids);
                    localStorage.setItem('organograma_user', JSON.stringify(data.user));
                    localStorage.setItem('organograma_allowed_nodes', JSON.stringify(data.allowed_node_ids));
                } else {
                    // Token inválido ou expirado
                    logout();
                }
            } catch (error) {
                console.error('Erro ao verificar sessão do usuário:', error);
            }
        };

        verifySession();
    }, [token]);

    // Função de Login
    const login = useCallback(async (email, senha) => {
        setIsLoading(true);
        setLoginError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, senha })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao realizar login');
            }

            setToken(data.token);
            setUser(data.user);
            setAllowedNodeIds(data.allowed_node_ids);

            localStorage.setItem('organograma_token', data.token);
            localStorage.setItem('organograma_user', JSON.stringify(data.user));
            localStorage.setItem('organograma_allowed_nodes', JSON.stringify(data.allowed_node_ids));

            return true;
        } catch (error) {
            setLoginError(error.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Função de Logout
    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        setAllowedNodeIds([]);
        localStorage.removeItem('organograma_token');
        localStorage.removeItem('organograma_user');
        localStorage.removeItem('organograma_allowed_nodes');
    }, []);

    /**
     * Verifica se o usuário autenticado tem permissão para editar/excluir/adicionar no nó especificado.
     * @param {number|string} nodeId - ID do nó a ser verificado
     * @returns {boolean}
     */
    const hasPermissionToEdit = useCallback((nodeId) => {
        if (!user || !token) return false;

        if (user.role_global === 'admin' || allowedNodeIds === 'all') {
            return true;
        }

        if (Array.isArray(allowedNodeIds)) {
            return allowedNodeIds.includes(parseInt(nodeId, 10));
        }

        return false;
    }, [user, token, allowedNodeIds]);

    const value = {
        user,
        token,
        allowedNodeIds,
        isLoading,
        loginError,
        login,
        logout,
        hasPermissionToEdit,
        isAuthenticated: !!user && !!token
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
    }
    return context;
}
