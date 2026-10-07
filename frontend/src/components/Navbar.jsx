/**
 * Cabeçalho Arquitetural: Navbar Executiva Superior Descentralizada.
 * Interface discreta e elegante para apresentações executivas.
 * Exibe a marca JHE Engenharia à esquerda e o perfil do usuário com controles de edição à direita.
 * Zero CSS inline: utiliza classes do organograma.css.
 */

import React from 'react';
import { Building2, LogIn, LogOut, UserCheck, Shield, Edit3, Plus, Eye, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Navbar({ 
    onOpenLoginModal, 
    isEditMode, 
    onToggleEditMode, 
    onOpenCreateDrawer,
    onOpenUserMgmt
}) {
    const { user, isAuthenticated, logout } = useAuth();

    // Verifica se o usuário autenticado pode usar o Modo Edição
    const canUseEditMode = isAuthenticated && user && ['admin', 'diretor', 'coordenador'].includes(user.role_global);

    // Formata a exibição do cargo do usuário
    const getCargoBadge = () => {
        if (!user) return '';
        if (user.role_global === 'admin') return 'Administrador Geral';
        if (user.cargos && user.cargos.length > 0) {
            return user.cargos[0].no_titulo;
        }
        return 'Colaborador';
    };

    return (
        <header className="executive-navbar">
            {/* Lado Esquerdo: Marca / Logo JHE Engenharia */}
            <div className="navbar-brand-container">
                <div className="navbar-logo-badge">
                    <Building2 size={22} className="navbar-logo-icon" />
                </div>
                <div className="navbar-brand-text">
                    <h1 className="brand-title">JHE ENGENHARIA</h1>
                    <span className="brand-subtitle">Organograma Corporativo Executivo</span>
                </div>
            </div>

            {/* Lado Direito: Perfil do Usuário, Modo Edição e Autenticação */}
            <div className="navbar-actions-container">
                {/* Controles de Gerenciamento de Usuários (Apenas Administradores) */}
                {isAuthenticated && user && user.role_global === 'admin' && (
                    <button
                        onClick={onOpenUserMgmt}
                        className="user-mgmt-trigger-btn"
                        title="Painel de Gestão e Criação de Usuários"
                    >
                        <Users size={15} />
                        Gerenciar Usuários
                    </button>
                )}

                {/* Controles de Modo Edição / Nova Área (apenas gestores) */}
                {canUseEditMode && (
                    <div className="navbar-edit-group">
                        <button
                            onClick={onToggleEditMode}
                            className={`edit-mode-toggle-btn ${isEditMode ? 'edit-mode-active' : 'edit-mode-inactive'}`}
                            title={isEditMode ? "Desativar Modo Edição (Voltar ao Modo Apresentação)" : "Ativar Modo Edição de Áreas"}
                        >
                            {isEditMode ? (
                                <>
                                    <Edit3 size={15} />
                                    Modo Edição
                                </>
                            ) : (
                                <>
                                    <Eye size={15} />
                                    Modo Apresentação
                                </>
                            )}
                        </button>

                        {isEditMode && (
                            <button
                                onClick={onOpenCreateDrawer}
                                className="create-area-btn"
                                title="Criar uma nova área no organograma"
                            >
                                <Plus size={15} />
                                Nova Área
                            </button>
                        )}
                    </div>
                )}

                {/* Perfil do Usuário / Login / Logout */}
                {isAuthenticated ? (
                    <div className="user-profile-widget">
                        <div className="user-info-text">
                            <span className="user-name flex items-center gap-1">
                                {user.role_global === 'admin' ? (
                                    <Shield size={14} className="text-cyan-400" />
                                ) : (
                                    <UserCheck size={14} className="text-emerald-400" />
                                )}
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
                            <LogOut size={15} />
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
        </header>
    );
}

export default Navbar;
