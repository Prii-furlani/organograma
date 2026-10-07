/**
 * Cabeçalho Arquitetural: Barra de Ferramentas e Navegação Superior (Toolbar / Navbar).
 * Fornece controles de zoom, centralização, alternância de Dark Mode, ajuda,
 * além do status de autenticação (Login/Logout) e exibição do usuário e cargos ativas.
 */

import React from 'react';
import { ZoomIn, ZoomOut, Maximize, HelpCircle, Sun, Moon, LogIn, LogOut, UserCheck, Shield } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useAuth } from '../context/AuthContext';

function Toolbar({ onToggleHelp, isDark, onToggleDarkMode, onOpenLoginModal }) {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const { user, isAuthenticated, logout } = useAuth();

    // Formata o resumo do cargo principal do usuário
    const getCargoBadge = () => {
        if (!user) return '';
        if (user.role_global === 'admin') return 'Administrador Geral';
        if (user.cargos && user.cargos.length > 0) {
            return user.cargos[0].no_titulo;
        }
        return 'Colaborador';
    };

    return (
        <div className="toolbar-container">
            {/* Controles de Zoom e Viewport */}
            <button 
                onClick={() => zoomIn()} 
                className="toolbar-btn"
                title="Aumentar Zoom"
            >
                <ZoomIn size={18} />
            </button>
            <button 
                onClick={() => zoomOut()} 
                className="toolbar-btn"
                title="Diminuir Zoom"
            >
                <ZoomOut size={18} />
            </button>
            <button 
                onClick={() => fitView({ duration: 800 })} 
                className="toolbar-btn"
                title="Centralizar Organograma"
            >
                <Maximize size={18} />
            </button>
            
            {/* Alternância de Dark Mode */}
            <button 
                onClick={onToggleDarkMode} 
                className="toolbar-btn theme-toggle-btn"
                title={isDark ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
            >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <div className="toolbar-divider"></div>
            
            {/* Botão de Ajuda */}
            <button 
                onClick={onToggleHelp} 
                className="help-btn"
                title="Ajuda e Navegação"
            >
                <HelpCircle size={16} />
                Como usar
            </button>

            <div className="toolbar-divider"></div>

            {/* Área de Autenticação (Login / User Info / Logout) */}
            {isAuthenticated ? (
                <div className="user-profile-widget">
                    <div className="user-info-text">
                        <span className="user-name flex items-center gap-1">
                            {user.role_global === 'admin' ? <Shield size={14} className="text-cyan-400" /> : <UserCheck size={14} className="text-emerald-400" />}
                            {user.nome_completo}
                        </span>
                        <span className="user-role-badge">
                            {getCargoBadge()}
                        </span>
                    </div>
                    <button
                        onClick={logout}
                        className="logout-btn"
                        title="Encerrar Sessão"
                    >
                        <LogOut size={16} />
                        Sair
                    </button>
                </div>
            ) : (
                <button
                    onClick={onOpenLoginModal}
                    className="login-trigger-btn"
                    title="Entrar para gerenciar setores"
                >
                    <LogIn size={16} />
                    Entrar
                </button>
            )}
        </div>
    );
}

export default Toolbar;
