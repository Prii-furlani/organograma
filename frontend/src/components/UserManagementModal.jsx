/**
 * Cabeçalho Arquitetural: Componente Modal de Gestão e Cadastro de Usuários.
 * Acessível exclusivamente por Administradores autenticados.
 * Permite pesquisar em tempo real, cadastrar com 2 seções lógicas (Acesso e Vínculos de Escopo),
 * definir papéis nos cargos (Titular, Acumulação) e desativar/redefinir senhas com SweetAlert2.
 * Zero CSS inline: estilização centralizada em organograma.css.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, UserPlus, Shield, ShieldCheck, UserCheck, Trash2, Edit, Save, Loader2, AlertTriangle, CheckSquare, Square, Search, Key, UserX, User } from 'lucide-react';
import { fetchUsersList, createUserData, updateUserData, deleteUserData, resetUserPassword } from '../api/organogramaApi';
import { confirmDeleteUser, confirmToggleUserStatus, confirmResetUserPassword, showToast } from '../utils/alerts';


function UserManagementModal({ isOpen, onClose, allNodesFlat }) {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Estado da barra de pesquisa de usuários
    const [userSearchQuery, setUserSearchQuery] = useState('');
    // Estado da barra de pesquisa de nós na atribuição de cargos
    const [nodeSearchQuery, setNodeSearchQuery] = useState('');

    // Estado do modo formulário (null = lista, 'create' = criar, userObj = editar)
    const [formMode, setFormMode] = useState(null);

    const [formData, setFormData] = useState({
        nome_completo: '',
        email: '',
        senha: '',
        role_global: 'colaborador',
        ativo: 1,
        vinculos: [] // Array de { no_id, papel_no_cargo }
    });

    // Suporte para fechar com a tecla ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const loadUsers = async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const data = await fetchUsersList();
            setUsers(data);
        } catch (err) {
            console.error('Erro ao carregar usuários:', err);
            setErrorMsg(err.response?.data?.error || 'Não foi possível carregar a lista de usuários.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadUsers();
            setFormMode(null);
            setErrorMsg(null);
            setUserSearchQuery('');
            setNodeSearchQuery('');
        }
    }, [isOpen]);

    const handleOpenCreateForm = () => {
        setFormData({
            nome_completo: '',
            email: '',
            senha: '',
            role_global: 'colaborador',
            ativo: 1,
            vinculos: []
        });
        setFormMode('create');
        setErrorMsg(null);
    };

    const handleOpenEditForm = (user) => {
        const initialVinculos = user.cargos ? user.cargos.map(c => ({
            no_id: c.no_id,
            papel_no_cargo: c.papel_no_cargo || 'Titular'
        })) : [];

        setFormData({
            id: user.id,
            nome_completo: user.nome_completo || '',
            email: user.email || '',
            senha: '', // Vazio para não alterar a menos que preenchido
            role_global: user.role_global || 'colaborador',
            ativo: user.ativo !== undefined ? user.ativo : 1,
            vinculos: initialVinculos
        });
        setFormMode(user);
        setErrorMsg(null);
    };

    // Alterna a seleção de um nó e permite definir o papel no cargo
    const handleToggleNodeSelection = (noId) => {
        setFormData(prev => {
            const currentVinculos = prev.vinculos || [];
            const exists = currentVinculos.some(v => v.no_id === noId);

            if (exists) {
                return {
                    ...prev,
                    vinculos: currentVinculos.filter(v => v.no_id !== noId)
                };
            } else {
                return {
                    ...prev,
                    vinculos: [...currentVinculos, { no_id: noId, papel_no_cargo: 'Titular' }]
                };
            }
        });
    };

    // Atualiza o texto do papel no cargo (ex: Titular, Acumulação, Interino)
    const handleUpdatePapelCargo = (noId, papel) => {
        setFormData(prev => ({
            ...prev,
            vinculos: prev.vinculos.map(v => v.no_id === noId ? { ...v, papel_no_cargo: papel } : v)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.nome_completo || !formData.nome_completo.trim()) {
            setErrorMsg('O Nome Completo é um campo obrigatório.');
            return;
        }
        if (!formData.email || !formData.email.trim()) {
            setErrorMsg('O E-mail Institucional é um campo obrigatório.');
            return;
        }
        if (formMode === 'create' && formData.senha && formData.senha.trim().length < 4) {
            setErrorMsg('Se informada, a senha deve ter pelo menos 4 caracteres.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);

        const nosIds = formData.vinculos.map(v => v.no_id);

        const payload = {
            ...formData,
            nos_ids: nosIds,
            vinculos: formData.vinculos
        };

        try {
            if (formMode === 'create') {
                await createUserData(payload);
                showToast(`Novo colaborador "${formData.nome_completo}" cadastrado com sucesso!`, 'success');
            } else if (formData.id) {
                await updateUserData(formData.id, payload);
                showToast(`Dados do usuário "${formData.nome_completo}" atualizados!`, 'success');
            }
            await loadUsers();
            setFormMode(null);
        } catch (err) {
            console.error('Erro ao salvar usuário:', err);
            const errText = err.response?.data?.error || 'Erro ao processar alteração de usuário.';
            setErrorMsg(errText);
            showToast(errText, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (user) => {
        const isConfirmed = await confirmResetUserPassword(user.nome_completo);
        if (!isConfirmed) return;

        setIsSubmitting(true);
        try {
            await resetUserPassword(user.id);
            showToast(`Senha do usuário "${user.nome_completo}" resetada para o padrão Jhe@2026.`, 'success');
            await loadUsers();
        } catch (err) {
            console.error('Erro ao resetar senha:', err);
            showToast(err.response?.data?.error || 'Erro ao resetar senha do usuário.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleUserStatus = async (user) => {

        const newStatus = user.ativo ? 0 : 1;

        const isConfirmed = await confirmToggleUserStatus(user.nome_completo, newStatus);
        if (!isConfirmed) return;

        setIsSubmitting(true);
        try {
            await updateUserData(user.id, { ...user, ativo: newStatus });
            showToast(`Usuário "${user.nome_completo}" ${newStatus ? 'ativado' : 'desativado'}.`, 'success');
            await loadUsers();
        } catch (err) {
            console.error('Erro ao alterar status:', err);
            showToast('Erro ao alterar status do usuário.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (user) => {
        const isConfirmed = await confirmDeleteUser(user.nome_completo);
        if (!isConfirmed) return;

        setIsSubmitting(true);
        try {
            await deleteUserData(user.id);
            showToast(`Usuário "${user.nome_completo}" removido.`, 'success');
            await loadUsers();
        } catch (err) {
            console.error('Erro ao remover usuário:', err);
            showToast(err.response?.data?.error || 'Erro ao remover usuário.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filtra os usuários em tempo real na tabela
    const filteredUsers = useMemo(() => {
        if (!userSearchQuery || !userSearchQuery.trim()) return users;
        const q = userSearchQuery.trim().toLowerCase();
        return users.filter(u => 
            u.nome_completo.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.role_global.toLowerCase().includes(q) ||
            (u.cargos && u.cargos.some(c => c.no_titulo.toLowerCase().includes(q)))
        );
    }, [users, userSearchQuery]);

    // Filtra os nós no formulário de inclusão de vagas
    const filteredNodes = useMemo(() => {
        if (!allNodesFlat) return [];
        if (!nodeSearchQuery || !nodeSearchQuery.trim()) return allNodesFlat;
        const q = nodeSearchQuery.trim().toLowerCase();
        return allNodesFlat.filter(n => 
            n.titulo.toLowerCase().includes(q) ||
            (n.nivel_nome && n.nivel_nome.toLowerCase().includes(q)) ||
            (n.tipo && n.tipo.toLowerCase().includes(q))
        );
    }, [allNodesFlat, nodeSearchQuery]);

    // Helper para gerar as iniciais do avatar
    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    if (!isOpen) return null;

    return (
        <div className="drawer-overlay drawer-open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="drawer-content modal-user-mgmt">
                
                {/* Header do Modal */}
                <div className="drawer-header bg-theme-ceo">
                    <div className="drawer-title-group">
                        <Shield size={24} />
                        <div>
                            <h2 className="drawer-main-title">
                                Gestão e Cadastro de Usuários
                            </h2>
                            <span className="drawer-subtitle">
                                Painel Administrativo de Controle de Acessos e Vínculos
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="modal-close-btn" title="Fechar painel (Esc)">
                        <X size={20} />
                    </button>
                </div>

                {/* Banners de Notificação */}
                {errorMsg && (
                    <div className="drawer-error-banner">
                        <AlertTriangle size={18} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <div className="user-mgmt-body">

                    {/* Visão de Formulário Organizado em 2 Seções (Criar ou Editar) */}
                    {formMode !== null ? (
                        <form onSubmit={handleSubmit} className="drawer-body-form">
                            <h3 className="user-form-subtitle">
                                {formMode === 'create' ? '1. Cadastrar Novo Colaborador' : `1. Editar Usuário #${formData.id}`}
                            </h3>

                            {/* SEÇÃO 1: DADOS PESSOAIS & ACESSO */}
                            <div className="user-form-section">
                                <h4 className="section-title-text">
                                    <User size={15} /> Dados Pessoais & Credenciais
                                </h4>

                                <div className="drawer-form-row">
                                    {/* Nome Completo */}
                                    <div className="drawer-form-group flex-1">
                                        <label className="drawer-label required">
                                            Nome Completo
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.nome_completo}
                                            onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                                            placeholder="Ex: Leandro Furlani, Dr. Hélio"
                                            className="drawer-input"
                                        />
                                    </div>

                                    {/* E-mail Institucional */}
                                    <div className="drawer-form-group flex-1">
                                        <label className="drawer-label required">
                                            E-mail Institucional
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="colaborador@jhe.com.br"
                                            className="drawer-input"
                                        />
                                    </div>
                                </div>

                                <div className="drawer-form-row">
                                    {/* Senha Inicial (apenas no modo de Edição) / Info Badge no Cadastro */}
                                    {formMode === 'create' ? (
                                        <div className="drawer-form-group flex-1">
                                            <label className="drawer-label">
                                                Senha Inicial Padrão
                                            </label>
                                            <div className="demo-credentials-box">
                                                <span className="demo-credentials-title">
                                                    💡 Senha provisória configurada: <strong>Jhe@2026</strong>
                                                </span>
                                                <span className="text-xs text-muted">
                                                    O colaborador será obrigado a cadastrar sua própria senha no primeiro login.
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="drawer-form-group flex-1">
                                            <label className="drawer-label">
                                                Nova Senha (opcional)
                                            </label>
                                            <input
                                                type="password"
                                                value={formData.senha}
                                                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                                                placeholder="Deixe em branco para não alterar"
                                                className="drawer-input"
                                            />
                                        </div>
                                    )}

                                    {/* Perfil Base (Role Global) */}
                                    <div className="drawer-form-group flex-1">
                                        <label className="drawer-label required">
                                            Perfil Base (Role Global)
                                        </label>
                                        <select
                                            value={formData.role_global}
                                            onChange={(e) => setFormData({ ...formData, role_global: e.target.value })}
                                            className="drawer-select"
                                            required
                                        >
                                            <option value="admin">Administrador (Acesso Total)</option>
                                            <option value="diretor">Diretor (Gestor de Diretoria)</option>
                                            <option value="coordenador">Coordenador (Gestor de Área)</option>
                                            <option value="colaborador">Colaborador (Visualização)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* SEÇÃO 2: VÍNCULOS NO ORGANOGRAMA (ESCOPO DE PERMISSÕES) */}
                            <div className="user-form-section mt-4">
                                <h3 className="user-form-subtitle">
                                    2. Vínculos e Cargos no Organograma (Escopo de Gerência)
                                </h3>

                                <div className="drawer-form-group">
                                    <span className="drawer-help-text">
                                        Marque as áreas às quais este usuário possui permissão de gestão direta. É possível atribuir múltiplos cargos.
                                    </span>

                                    {/* Busca em tempo real de nós no checklist */}
                                    <div className="drawer-search-wrapper my-2">
                                        <Search size={14} className="drawer-search-icon" />
                                        <input
                                            type="text"
                                            value={nodeSearchQuery}
                                            onChange={(e) => setNodeSearchQuery(e.target.value)}
                                            placeholder="Filtrar áreas por nome ou nível..."
                                            className="drawer-search-input"
                                        />
                                    </div>

                                    <div className="user-nodes-checklist">
                                        {filteredNodes && filteredNodes.length > 0 ? (
                                            filteredNodes.map(node => {
                                                const vinculo = (formData.vinculos || []).find(v => v.no_id === node.id);
                                                const isChecked = !!vinculo;

                                                return (
                                                    <div 
                                                        key={node.id} 
                                                        className={`user-node-item ${isChecked ? 'selected' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => handleToggleNodeSelection(node.id)}>
                                                            {isChecked ? <CheckSquare size={16} className="text-primary-lighter flex-shrink-0" /> : <Square size={16} className="flex-shrink-0" />}
                                                            <span className="user-node-title">{node.titulo}</span>
                                                            <span className="user-node-badge">{node.nivel_nome || node.tipo}</span>
                                                        </div>

                                                        {/* Papel no cargo (Titular / Acumulação) */}
                                                        {isChecked && (
                                                            <select
                                                                value={vinculo.papel_no_cargo || 'Titular'}
                                                                onChange={(e) => handleUpdatePapelCargo(node.id, e.target.value)}
                                                                className="user-papel-select"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <option value="Titular">Titular</option>
                                                                <option value="Acumulação">Acumulação</option>
                                                                <option value="Interino">Interino</option>
                                                            </select>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <span className="text-muted text-sm py-2">Nenhuma área encontrada.</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Ações do Formulário */}
                            <div className="drawer-footer-actions">
                                <button
                                    type="button"
                                    onClick={() => setFormMode(null)}
                                    className="btn-drawer-cancel"
                                >
                                    Voltar à Lista
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn-drawer-save"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            {formMode === 'create' ? 'Cadastrar Usuário' : 'Salvar Alterações'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Visão de Lista de Usuários */
                        <div className="user-list-container">
                            <div className="user-list-toolbar">
                                {/* Barra de Pesquisa em Tempo Real */}
                                <div className="user-search-box">
                                    <Search size={16} className="user-search-icon" />
                                    <input
                                        type="text"
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                        placeholder="Pesquisar por nome, e-mail ou cargo..."
                                        className="user-search-input"
                                    />
                                </div>

                                <button
                                    onClick={handleOpenCreateForm}
                                    className="btn-add-user"
                                >
                                    <UserPlus size={16} />
                                    + Novo Usuário
                                </button>
                            </div>

                            {isLoading ? (
                                <div className="user-loading-spinner">
                                    <Loader2 size={32} className="animate-spin text-primary-lighter" />
                                    <span>Carregando usuários...</span>
                                </div>
                            ) : (
                                <div className="user-table-wrapper">
                                    <table className="user-table">
                                        <thead>
                                            <tr>
                                                <th>Colaborador</th>
                                                <th>E-mail</th>
                                                <th>Perfil Global</th>
                                                <th>Áreas Vinculadas</th>
                                                <th>Status</th>
                                                <th>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.map(u => (
                                                <tr key={u.id} className={!u.ativo ? 'user-row-inactive' : ''}>
                                                    <td>
                                                        <div className="user-avatar-cell">
                                                            <div className={`user-avatar-circle role-${u.role_global}`}>
                                                                {getInitials(u.nome_completo)}
                                                            </div>
                                                            <span className="font-semibold">{u.nome_completo}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-muted">{u.email}</td>
                                                    <td>
                                                        <span className={`role-badge role-${u.role_global}`}>
                                                            {u.role_global}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {u.cargos && u.cargos.length > 0 ? (
                                                            <div className="user-cargos-tags">
                                                                {u.cargos.map((c, idx) => (
                                                                    <span key={idx} className="cargo-tag">
                                                                        {c.no_titulo} {c.papel_no_cargo ? `(${c.papel_no_cargo})` : ''}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-italics">Sem vínculo direto</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge ${u.ativo ? 'active' : 'inactive'}`}>
                                                            {u.ativo ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="user-action-buttons">
                                                            <button
                                                                onClick={() => handleResetPassword(u)}
                                                                className="btn-action-key"
                                                                title="Resetar senha para o padrão JHE@123"
                                                            >
                                                                <Key size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenEditForm(u)}
                                                                className="btn-action-edit"
                                                                title="Editar dados e vínculos"
                                                            >
                                                                <Edit size={14} />
                                                            </button>

                                                            <button
                                                                onClick={() => handleToggleUserStatus(u)}
                                                                className={`btn-action-toggle ${u.ativo ? 'deactivate' : 'activate'}`}
                                                                title={u.ativo ? "Desativar usuário" : "Ativar usuário"}
                                                            >
                                                                {u.ativo ? <UserX size={14} /> : <UserCheck size={14} />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteUser(u)}
                                                                className="btn-action-delete"
                                                                title="Excluir usuário"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredUsers.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="text-center py-6 text-muted">
                                                        Nenhum usuário encontrado para os critérios de busca.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default UserManagementModal;
