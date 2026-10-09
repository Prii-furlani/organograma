/**
 * Cabeçalho Arquitetural: Navbar Executiva Superior Descentralizada.
 * Interface discreta e elegante para apresentações executivas.
 * Exibe a marca JHE Engenharia à esquerda e o perfil do usuário com menu dropdown à direita.
 * Zero CSS inline: utiliza classes do organograma.css.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Building2, LogIn, LogOut, UserCheck, Shield, Edit3, Plus, Eye, Users, ChevronDown, Search, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Navbar({ 
    onOpenLoginModal, 
    isEditMode, 
    onToggleEditMode, 
    onOpenCreateDrawer,
    onOpenUserMgmt,
    onOpenChangePassword,
    allNodesFlat = [],
    onFocusNode
}) {
    const { user, isAuthenticated, logout } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Estados da Busca Global
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef(null);

    // Fechar dropdowns ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filtra os nós do organograma em tempo real
    const searchResults = useMemo(() => {
        if (!globalSearchQuery || !globalSearchQuery.trim() || !allNodesFlat) return [];
        const q = globalSearchQuery.trim().toLowerCase();
        return allNodesFlat.filter(n => {
            const titleMatch = n.titulo && n.titulo.toLowerCase().includes(q);
            const levelMatch = n.nivel_nome && n.nivel_nome.toLowerCase().includes(q);
            const respMatch = n.responsavel && n.responsavel.toLowerCase().includes(q);
            return titleMatch || levelMatch || respMatch;
        }).slice(0, 10);
    }, [allNodesFlat, globalSearchQuery]);

    const handleSelectSearchResult = (nodeId) => {
        setIsSearchOpen(false);
        setGlobalSearchQuery('');
        if (onFocusNode) onFocusNode(nodeId);
    };

    // Verifica se o usuário autenticado pode usar o Modo Edição
    const canUseEditMode = isAuthenticated && user && ['admin', 'diretor', 'coordenador'].includes(user.role_global);

    // Helper para gerar iniciais
    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    // Formata a exibição do cargo principal do usuário
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
                <div className="navbar-logo-wrapper">
                    <img src="/logo.png" alt="Logo JHE" className="navbar-logo-img" />
                </div>
                <div className="navbar-brand-text">
                    <h1 className="brand-title">JHE ENGENHARIA</h1>
                    <span className="brand-subtitle">Organograma Corporativo Executivo</span>
                </div>
            </div>

            {/* Centro: Barra de Busca Global no Canvas */}
            <div className="jhe-global-search-container" ref={searchRef}>
                <div className="jhe-global-search-wrapper">
                    <Search size={14} className="jhe-global-search-icon" />
                    <input
                        type="text"
                        value={globalSearchQuery}
                        onChange={(e) => {
                            setGlobalSearchQuery(e.target.value);
                            setIsSearchOpen(true);
                        }}
                        onFocus={() => {
                            if (globalSearchQuery.trim()) setIsSearchOpen(true);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchResults.length > 0) {
                                handleSelectSearchResult(searchResults[0].id);
                            }
                            if (e.key === 'Escape') {
                                setIsSearchOpen(false);
                            }
                        }}
                        placeholder="Buscar diretoria, área ou cargo..."
                        className="jhe-global-search-input"
                    />
                </div>

                {isSearchOpen && globalSearchQuery.trim() !== '' && (
                    <div className="jhe-global-search-popover" role="listbox">
                        {searchResults.length > 0 ? (
                            searchResults.map(n => (
                                <div
                                    key={n.id}
                                    role="option"
                                    className="jhe-global-search-item"
                                    onClick={() => handleSelectSearchResult(n.id)}
                                >
                                    <div className="jhe-global-search-item-content">
                                        <Building2 size={14} className="text-cyan-500 shrink-0" />
                                        <div className="jhe-global-search-item-text">
                                            <span className="jhe-global-search-item-title">{n.titulo}</span>
                                            <span className="jhe-global-search-item-subtitle">
                                                {n.nivel_nome || n.tipo} {n.responsavel ? `• ${n.responsavel}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="jhe-global-search-empty">
                                Nenhum resultado para "{globalSearchQuery}"
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Lado Direito: Perfil do Usuário, Modo Edição e Autenticação */}
            <div className="navbar-actions-container">
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

                {/* Perfil do Usuário com Menu Dropdown */}
                {isAuthenticated ? (
                    <div className="user-profile-dropdown" ref={dropdownRef}>
                        <button 
                            className="user-profile-trigger"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                        >
                            <div className={`user-avatar-small role-${user.role_global}`}>
                                {getInitials(user.nome_completo)}
                            </div>
                            <div className="user-info-text hidden md:flex flex-col items-start">
                                <span className="user-name flex items-center gap-1">
                                    {user.nome_completo}
                                </span>
                                <span className="user-role-badge text-xs">
                                    {getCargoBadge()}
                                </span>
                            </div>
                            <ChevronDown size={14} className={`dropdown-caret ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Menu Flutuante */}
                        {dropdownOpen && (
                            <div className="dropdown-menu-content">
                                <div className="dropdown-header">
                                    <span className="dropdown-user-name">{user.nome_completo}</span>
                                    <span className="dropdown-user-email">{user.email}</span>
                                </div>
                                
                                <div className="dropdown-cargos-list">
                                    <span className="dropdown-section-title">Cargos e Vínculos:</span>
                                    {user.role_global === 'admin' && (
                                        <div className="dropdown-cargo-item">
                                            <Shield size={14} className="text-cyan-500" /> Administrador Global (Acesso Total)
                                        </div>
                                    )}
                                    {user.cargos && user.cargos.length > 0 ? (
                                        user.cargos.map((cargo, idx) => (
                                            <div key={idx} className="dropdown-cargo-item">
                                                <Building2 size={14} className="text-emerald-500" />
                                                <span>{cargo.no_titulo} {cargo.papel_no_cargo ? `(${cargo.papel_no_cargo})` : ''}</span>
                                            </div>
                                        ))
                                    ) : (
                                        user.role_global !== 'admin' && <div className="text-xs text-slate-500 italic">Nenhum cargo vinculado</div>
                                    )}
                                </div>

                                <div className="dropdown-divider"></div>

                                {user.role_global === 'admin' && (
                                    <button
                                        onClick={() => {
                                            setDropdownOpen(false);
                                            onOpenUserMgmt();
                                        }}
                                        className="dropdown-action-btn"
                                    >
                                        <Users size={15} />
                                        Gerenciar Usuários
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        setDropdownOpen(false);
                                        if (onOpenChangePassword) onOpenChangePassword();
                                    }}
                                    className="dropdown-action-btn"
                                >
                                    <KeyRound size={15} />
                                    Alterar Senha
                                </button>

                                <button
                                    onClick={() => {
                                        setDropdownOpen(false);
                                        logout();
                                    }}
                                    className="dropdown-action-btn text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                >
                                    <LogOut size={15} />
                                    Sair da Conta
                                </button>
                            </div>
                        )}
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
