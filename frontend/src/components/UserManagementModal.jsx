/**
 * Cabeçalho Arquitetural: Componente Modal de Gestão e Cadastro de Usuários.
 * Acessível exclusivamente por Administradores autenticados.
 * Permite pesquisar em tempo real, cadastrar com 2 seções lógicas (Acesso e Vínculos de Escopo),
 * definir papéis nos cargos (Titular, Acumulação) e desativar/redefinir senhas com SweetAlert2.
 * Zero CSS inline: estilização centralizada em organograma.css.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, UserPlus, Shield, ShieldCheck, UserCheck, Trash2, Edit, Save, Loader2, AlertTriangle, CheckSquare, Square, Search, Key, UserX, User, ChevronDown, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { fetchUsersList, createUserData, updateUserData, deleteUserData, resetUserPassword } from '../api/organogramaApi';
import { confirmDeleteUser, confirmToggleUserStatus, confirmResetUserPassword, showToast } from '../utils/alerts';
import { useAuth } from '../context/AuthContext';


function UserManagementModal({ isOpen, onClose, allNodesFlat }) {
    const { user: currentUser, hasPermissionToEdit } = useAuth();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Estado da barra de pesquisa de usuários
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [filterArea, setFilterArea] = useState('');
    const [isAreaFilterOpen, setIsAreaFilterOpen] = useState(false);
    const [areaFilterSearchQuery, setAreaFilterSearchQuery] = useState('');
    const areaFilterRef = useRef(null);
    // Estado da barra de pesquisa de nós na atribuição de cargos
    const [nodeSearchQuery, setNodeSearchQuery] = useState('');

    // Estado do modo formulário (null = lista, 'create' = criar, userObj = editar)
    const [formMode, setFormMode] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

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
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (areaFilterRef.current && !areaFilterRef.current.contains(event.target)) {
                setIsAreaFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        return () => setErrorMsg(null);
    }, []);

    const handleClose = () => {
        setErrorMsg(null);
        setFormMode(null);
        onClose();
    };

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
            setFilterArea('');
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
        setCurrentStep(1);
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
        setCurrentStep(1);
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
        let result = users;
        
        if (filterArea) {
            result = result.filter(u => 
                String(u.role_global).toLowerCase() === 'admin' || 
                (u.cargos && u.cargos.some(c => String(c.no_id) === String(filterArea)))
            );
        }

        if (userSearchQuery && userSearchQuery.trim()) {
            const q = userSearchQuery.trim().toLowerCase();
            result = result.filter(u => 
                u.nome_completo.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.role_global.toLowerCase().includes(q) ||
                (u.cargos && u.cargos.some(c => c.no_titulo.toLowerCase().includes(q)))
            );
        }
        return result;
    }, [users, userSearchQuery, filterArea]);

    const sortedNodes = useMemo(() => {
        if (!allNodesFlat) return [];
        return [...allNodesFlat].sort((a, b) => a.titulo.localeCompare(b.titulo));
    }, [allNodesFlat]);

    const normalizeString = (str) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    const filteredDropdownNodes = useMemo(() => {
        if (!areaFilterSearchQuery) return sortedNodes;
        const query = normalizeString(areaFilterSearchQuery);
        return sortedNodes.filter(node => normalizeString(node.titulo).includes(query));
    }, [sortedNodes, areaFilterSearchQuery]);

    // Filtra os nós no formulário de inclusão de vagas e aplica a restrição de sub-árvore
    const filteredNodes = useMemo(() => {
        if (!allNodesFlat) return [];
        let nodes = allNodesFlat.filter(n => hasPermissionToEdit(n.id));
        if (nodeSearchQuery && nodeSearchQuery.trim()) {
            const q = nodeSearchQuery.trim().toLowerCase();
            nodes = nodes.filter(n => 
                n.titulo.toLowerCase().includes(q) ||
                (n.nivel_nome && n.nivel_nome.toLowerCase().includes(q)) ||
                (n.tipo && n.tipo.toLowerCase().includes(q))
            );
        }
        return nodes;
    }, [allNodesFlat, nodeSearchQuery, hasPermissionToEdit]);

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
        <div className="jhe-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
            <div className="jhe-modal-card">
                
                {/* Header do Modal */}
                {formMode !== null ? (
                    <div className="jhe-modal-header-stepper">
                        <div className="jhe-modal-header-stepper-title-col">
                            <span className="jhe-modal-header-tag">GESTÃO DE ACESSO</span>
                            <h2 className="jhe-modal-header-title">
                                {formMode === 'create' ? 'Novo usuário' : 'Editar usuário'}
                            </h2>
                        </div>
                        <button onClick={() => { setFormMode(null); setCurrentStep(1); setErrorMsg(null); }} className="jhe-modal-close-btn" title="Fechar formulário">
                            <X size={20} />
                        </button>
                    </div>
                ) : (
                    <div className="jhe-modal-header">
                        <div className="jhe-modal-title-group">
                            <Shield size={24} className="jhe-modal-icon" />
                            <div>
                                <h2 className="jhe-modal-main-title">
                                    Gestão e Cadastro de Usuários
                                </h2>
                                <span className="jhe-modal-subtitle">
                                    Painel Administrativo de Controle de Acessos e Vínculos
                                </span>
                            </div>
                        </div>
                        <button onClick={handleClose} className="jhe-modal-close-btn" title="Fechar painel (Esc)">
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Banners de Notificação */}
                {errorMsg && (
                    <div className="jhe-form-alert-container">
                        <AlertTriangle size={18} className="jhe-form-alert-icon" />
                        <span className="jhe-form-alert-text">{errorMsg}</span>
                    </div>
                )}

                <div className="user-mgmt-body">
                    {/* Visão de Formulário Organizado em 2 Seções (Criar ou Editar) */}
                    {formMode !== null ? (
                        <form onSubmit={handleSubmit} className="drawer-body-form">
                            
                            {/* Stepper Horizontal */}
                            <div className="jhe-stepper-container">
                                <div className={`jhe-step-item ${currentStep === 1 ? 'active' : 'completed'}`}>
                                    <span className="jhe-step-circle">1</span>
                                    <span className="jhe-step-label">Dados pessoais & acesso</span>
                                </div>
                                <div className="jhe-step-divider"></div>
                                <div className={`jhe-step-item ${currentStep === 2 ? 'active' : ''}`}>
                                    <span className="jhe-step-circle">2</span>
                                    <span className="jhe-step-label">Vínculos no organograma</span>
                                </div>
                            </div>

                            {/* PASSO 1: DADOS PESSOAIS */}
                            {currentStep === 1 && (
                                <div className="user-form-section">
                                    <div className="jhe-form-grid-2col">
                                        <div className="jhe-form-group">
                                            <label className="jhe-form-label required">Nome completo</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.nome_completo}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, nome_completo: e.target.value });
                                                    if (errorMsg) setErrorMsg(null);
                                                }}
                                                placeholder="Ex: Leandro Neves"
                                                className={`jhe-form-input ${errorMsg && !formData.nome_completo.trim() ? 'has-error' : ''}`}
                                            />
                                        </div>
                                        <div className="jhe-form-group">
                                            <label className="jhe-form-label required">E-mail institucional</label>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, email: e.target.value });
                                                    if (errorMsg) setErrorMsg(null);
                                                }}
                                                placeholder="nome@jhe.com.br"
                                                className={`jhe-form-input ${errorMsg && !formData.email.trim() ? 'has-error' : ''}`}
                                            />
                                        </div>
                                    </div>

                                    <div className="jhe-form-grid-2col">
                                        <div className="jhe-form-group">
                                            <label className="jhe-form-label required">Perfil global</label>
                                            <div className="jhe-custom-select-wrapper">
                                                <div 
                                                    className="jhe-custom-select-button"
                                                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                                >
                                                    <div className="jhe-custom-select-value">
                                                        <div className={`jhe-custom-select-dot dot-${String(formData.role_global).toLowerCase()}`}></div>
                                                        <span>{formData.role_global.charAt(0).toUpperCase() + formData.role_global.slice(1)}</span>
                                                    </div>
                                                    <ChevronDown size={16} className="text-gray-400" />
                                                </div>

                                                {isRoleDropdownOpen && (
                                                    <div className="jhe-custom-select-dropdown">
                                                        {String(currentUser?.role_global).toUpperCase() === 'ADMIN' && (
                                                            <div className="jhe-custom-select-option" onClick={() => { setFormData({ ...formData, role_global: 'admin' }); setIsRoleDropdownOpen(false); }}>
                                                                <div className="jhe-custom-select-option-left">
                                                                    <div className="jhe-custom-select-dot dot-admin"></div>
                                                                    Administrador
                                                                </div>
                                                                {formData.role_global === 'admin' && <Check size={16} className="text-[#0A192F] dark:text-[#61CBE8]" />}
                                                            </div>
                                                        )}
                                                        {['ADMIN', 'DIRETOR'].includes(String(currentUser?.role_global).toUpperCase()) && (
                                                            <div className="jhe-custom-select-option" onClick={() => { setFormData({ ...formData, role_global: 'diretor' }); setIsRoleDropdownOpen(false); }}>
                                                                <div className="jhe-custom-select-option-left">
                                                                    <div className="jhe-custom-select-dot dot-diretor"></div>
                                                                    Diretor
                                                                </div>
                                                                {formData.role_global === 'diretor' && <Check size={16} className="text-[#0A192F] dark:text-[#61CBE8]" />}
                                                            </div>
                                                        )}
                                                        {['ADMIN', 'DIRETOR', 'COORDENADOR'].includes(String(currentUser?.role_global).toUpperCase()) && (
                                                            <div className="jhe-custom-select-option" onClick={() => { setFormData({ ...formData, role_global: 'coordenador' }); setIsRoleDropdownOpen(false); }}>
                                                                <div className="jhe-custom-select-option-left">
                                                                    <div className="jhe-custom-select-dot dot-coordenador"></div>
                                                                    Coordenador
                                                                </div>
                                                                {formData.role_global === 'coordenador' && <Check size={16} className="text-[#0A192F] dark:text-[#61CBE8]" />}
                                                            </div>
                                                        )}
                                                        <div className="jhe-custom-select-option" onClick={() => { setFormData({ ...formData, role_global: 'colaborador' }); setIsRoleDropdownOpen(false); }}>
                                                            <div className="jhe-custom-select-option-left">
                                                                <div className="jhe-custom-select-dot dot-colaborador"></div>
                                                                Colaborador
                                                            </div>
                                                            {formData.role_global === 'colaborador' && <Check size={16} className="text-[#0A192F] dark:text-[#61CBE8]" />}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="jhe-form-group">
                                            {formMode === 'create' ? (
                                                <div className="jhe-password-banner" style={{ margin: 0, padding: '10px 16px', height: '44px', display: 'flex', alignItems: 'center' }}>
                                                    <ShieldCheck size={16} className="jhe-password-banner-icon" />
                                                    <span className="jhe-password-banner-title" style={{ fontSize: '13px' }}>Senha padrão provisória: Jhe@2026</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <label className="jhe-form-label">Nova Senha (opcional)</label>
                                                    <input
                                                        type="password"
                                                        value={formData.senha}
                                                        onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                                                        placeholder="Deixe em branco para manter"
                                                        className="jhe-form-input"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {formMode === 'create' && (
                                        <div className="jhe-password-banner">
                                            <ShieldCheck size={24} className="jhe-password-banner-icon" />
                                            <div className="jhe-password-banner-text">
                                                <span className="jhe-password-banner-title">Senha provisória padrão: Jhe@2026</span>
                                                <span className="jhe-password-banner-desc">O colaborador será obrigado a definir sua própria senha no primeiro login.</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="jhe-stepper-footer">
                                        <button
                                            type="button"
                                            onClick={() => { setFormMode(null); setErrorMsg(null); }}
                                            className="jhe-btn-secondary"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if(!formData.nome_completo || !formData.email) {
                                                    setErrorMsg('Preencha os campos obrigatórios (*) para avançar.');
                                                    return;
                                                }
                                                setErrorMsg(null);
                                                setCurrentStep(2);
                                            }}
                                            className="jhe-btn-primary"
                                        >
                                            Continuar <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PASSO 2: VÍNCULOS */}
                            {currentStep === 2 && (
                                <div className="user-form-section">
                                    <div className="drawer-form-group">
                                        <span className="drawer-help-text">
                                            Marque as áreas às quais este usuário possui permissão de gestão direta.
                                        </span>

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

                                        <div className="user-nodes-checklist" style={{ maxHeight: '300px' }}>
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
                                                                {isChecked ? <CheckSquare size={16} className="text-[#102A4E] dark:text-[#61CBE8] flex-shrink-0" /> : <Square size={16} className="flex-shrink-0" />}
                                                                <span className="user-node-title">{node.titulo}</span>
                                                                <span className="user-node-badge">{node.nivel_nome || node.tipo}</span>
                                                            </div>

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

                                    <div className="jhe-stepper-footer">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentStep(1)}
                                            className="jhe-btn-secondary"
                                        >
                                            <ArrowLeft size={16} /> Voltar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="jhe-btn-primary"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" /> Salvando...
                                                </>
                                            ) : (
                                                <>
                                                    <Save size={16} /> {formMode === 'create' ? 'Salvar Novo Usuário' : 'Salvar Alterações'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    ) : (
                        /* Visão de Lista de Usuários */
                        <div className="user-list-container">
                            <div className="jhe-user-toolbar">
                                {/* Barra de Pesquisa em Tempo Real e Filtro de Área */}
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="jhe-user-search-box">
                                        <Search size={16} className="jhe-user-search-icon" />
                                        <input
                                            type="text"
                                            value={userSearchQuery}
                                            onChange={(e) => setUserSearchQuery(e.target.value)}
                                            placeholder="Buscar por nome, cargo ou e-mail..."
                                            className="jhe-user-search-input"
                                        />
                                    </div>
                                    <div className="jhe-area-filter-wrapper" ref={areaFilterRef}>
                                        <div 
                                            className="jhe-area-filter-trigger"
                                            onClick={() => setIsAreaFilterOpen(!isAreaFilterOpen)}
                                        >
                                            <div className="jhe-area-filter-content">
                                                <span className="jhe-area-filter-label">ÁREA VINCULADA</span>
                                                <span className="jhe-area-filter-value">
                                                    {filterArea ? sortedNodes.find(n => String(n.id) === String(filterArea))?.titulo || 'Todas as áreas' : 'Todas as áreas'}
                                                </span>
                                            </div>
                                            <ChevronDown size={16} className={`jhe-area-filter-icon ${isAreaFilterOpen ? 'open' : ''}`} />
                                        </div>

                                        {isAreaFilterOpen && (
                                            <div className="jhe-area-filter-dropdown">
                                                <div className="jhe-area-filter-search-box">
                                                    <Search size={14} className="text-gray-400" />
                                                    <input 
                                                        type="text" 
                                                        value={areaFilterSearchQuery}
                                                        onChange={(e) => setAreaFilterSearchQuery(e.target.value)}
                                                        placeholder="Buscar área ou diretoria..."
                                                        className="jhe-area-filter-search-input"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="jhe-area-filter-list">
                                                    <div 
                                                        className={`jhe-area-filter-item ${!filterArea ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            setFilterArea('');
                                                            setIsAreaFilterOpen(false);
                                                            setAreaFilterSearchQuery('');
                                                        }}
                                                    >
                                                        <span>Todas as áreas (Exibir todos)</span>
                                                        {!filterArea && <Check size={16} className="text-[#0A192F] dark:text-[#61CBE8]" />}
                                                    </div>
                                                    {filteredDropdownNodes.map(node => (
                                                        <div 
                                                            key={node.id}
                                                            className={`jhe-area-filter-item ${String(filterArea) === String(node.id) ? 'selected' : ''}`}
                                                            onClick={() => {
                                                                setFilterArea(node.id);
                                                                setIsAreaFilterOpen(false);
                                                                setAreaFilterSearchQuery('');
                                                            }}
                                                        >
                                                            <span>{node.titulo}</span>
                                                            {String(filterArea) === String(node.id) && <Check size={16} className="text-[#0A192F] dark:text-[#61CBE8]" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleOpenCreateForm}
                                    className="jhe-btn-add-user"
                                >
                                    <UserPlus size={16} />
                                    + Novo usuário
                                </button>
                            </div>

                            {isLoading ? (
                                <div className="user-loading-spinner">
                                    <Loader2 size={32} className="animate-spin text-primary-lighter" />
                                    <span>Carregando usuários...</span>
                                </div>
                            ) : (
                                <div className="user-table-wrapper">
                                    <table className="jhe-user-table">
                                        <thead>
                                            <tr>
                                                <th>USUÁRIO</th>
                                                <th>PERFIL GLOBAL</th>
                                                <th>ÁREAS VINCULADAS</th>
                                                <th>STATUS</th>
                                                <th className="text-right">AÇÕES</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.map(u => (
                                                <tr key={u.id} className={!u.ativo ? 'jhe-user-row-inactive' : ''}>
                                                    <td>
                                                        <div className="jhe-user-avatar-cell">
                                                            <div className="jhe-user-avatar-squircle">
                                                                {getInitials(u.nome_completo)}
                                                            </div>
                                                            <div className="jhe-user-info-col">
                                                                <span className="jhe-user-name">{u.nome_completo}</span>
                                                                <span className="jhe-user-email">{u.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`jhe-role-pill role-${String(u.role_global).toLowerCase()}`}>
                                                            {u.role_global}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {String(u.role_global).toLowerCase() === 'admin' ? (
                                                            <span className="jhe-area-chip-admin-all">
                                                                ⚡ Acesso Global (Todas as Áreas)
                                                            </span>
                                                        ) : u.cargos && u.cargos.length > 0 ? (
                                                            <div className="jhe-user-cargos-tags">
                                                                {u.cargos.map((c, idx) => (
                                                                    <span key={idx} className="jhe-cargo-tag">
                                                                        {c.no_titulo} {c.papel_no_cargo ? `(${c.papel_no_cargo})` : ''}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-italics">Sem vínculo</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={`jhe-status-pill ${u.ativo ? 'status-active' : 'status-inactive'}`}>
                                                            {u.ativo ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="jhe-user-action-buttons">
                                                            <button
                                                                onClick={() => handleResetPassword(u)}
                                                                className="jhe-btn-action"
                                                                title="Redefinir senha (Jhe@2026)"
                                                            >
                                                                <Key size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenEditForm(u)}
                                                                className="jhe-btn-action"
                                                                title="Editar dados e vínculos"
                                                            >
                                                                <Edit size={16} />
                                                            </button>

                                                            <button
                                                                onClick={() => handleToggleUserStatus(u)}
                                                                className={`jhe-btn-action ${u.ativo ? 'jhe-btn-danger' : 'jhe-btn-success'}`}
                                                                title={u.ativo ? "Inativar usuário" : "Ativar usuário"}
                                                            >
                                                                {u.ativo ? <UserX size={16} /> : <UserCheck size={16} />}
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
