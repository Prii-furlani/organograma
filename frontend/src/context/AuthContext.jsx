/**
 * Cabeçalho Arquitetural: Contexto Global de Autenticação e Permissões (RBAC).
 * Gerencia o login, logout, persistência no localStorage e cálculo de permissões de edição por nó.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE_URL = 'http://localhost:5000/api';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('organograma_user') || sessionStorage.getItem('organograma_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [token, setToken] = useState(() => {
        return localStorage.getItem('organograma_token') || sessionStorage.getItem('organograma_token') || null;
    });

    const [allowedNodeIds, setAllowedNodeIds] = useState(() => {
        const savedAllowed = localStorage.getItem('organograma_allowed_nodes') || sessionStorage.getItem('organograma_allowed_nodes');
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

                    const storage = localStorage.getItem('organograma_token') ? localStorage : sessionStorage;
                    storage.setItem('organograma_user', JSON.stringify(data.user));
                    storage.setItem('organograma_allowed_nodes', JSON.stringify(data.allowed_node_ids));
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

    // Função de Login (suporta flag Lembre-se de mim)
    const login = useCallback(async (email, senha, rememberMe = true) => {
        setIsLoading(true);
        setLoginError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, senha, remember_me: rememberMe })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao realizar login');
            }

            setToken(data.token);
            setUser(data.user);
            setAllowedNodeIds(data.allowed_node_ids);

            if (rememberMe) {
                localStorage.setItem('organograma_token', data.token);
                localStorage.setItem('organograma_user', JSON.stringify(data.user));
                localStorage.setItem('organograma_allowed_nodes', JSON.stringify(data.allowed_node_ids));
                sessionStorage.removeItem('organograma_token');
                sessionStorage.removeItem('organograma_user');
                sessionStorage.removeItem('organograma_allowed_nodes');
            } else {
                sessionStorage.setItem('organograma_token', data.token);
                sessionStorage.setItem('organograma_user', JSON.stringify(data.user));
                sessionStorage.setItem('organograma_allowed_nodes', JSON.stringify(data.allowed_node_ids));
                localStorage.removeItem('organograma_token');
                localStorage.removeItem('organograma_user');
                localStorage.removeItem('organograma_allowed_nodes');
            }

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
        sessionStorage.removeItem('organograma_token');
        sessionStorage.removeItem('organograma_user');
        sessionStorage.removeItem('organograma_allowed_nodes');
    }, []);


    /**
     * Verifica se o usuário autenticado tem permissão para editar/excluir/adicionar no nó especificado.
     * @param {number|string} nodeId - ID do nó a ser verificado
     * @returns {boolean}
     */
    const hasPermissionToEdit = useCallback((nodeId) => {
        if (!user || !token) return false;

        const role = String(user.role_global || '').toUpperCase();
        if (role === 'ADMIN' || allowedNodeIds === 'all') {
            return true;
        }

        if (Array.isArray(allowedNodeIds)) {
            return allowedNodeIds.includes(parseInt(nodeId, 10));
        }

        return false;
    }, [user, token, allowedNodeIds]);

    // Função para atualizar dados da sessão (ex: redefinição de senha ou foto)
    const updateUserSession = useCallback((updatedUser, newToken) => {
        if (updatedUser) {
            setUser(updatedUser);
            localStorage.setItem('organograma_user', JSON.stringify(updatedUser));
        }
        if (newToken) {
            setToken(newToken);
            localStorage.setItem('organograma_token', newToken);
        }
    }, []);

    const value = {
        user,
        token,
        allowedNodeIds,
        isLoading,
        loginError,
        login,
        logout,
        updateUserSession,
        updateUserData: updateUserSession,
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
