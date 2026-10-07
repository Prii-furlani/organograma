/**
 * Cabeçalho Arquitetural: Componente Painel Lateral de Edição (Drawer / CRUD Form).
 * Permite criar, editar, excluir e reparentear qualquer área do organograma.
 * Integra alertas executivos SweetAlert2 via alerts.js (zero native alerts/confirms).
 * Zero CSS inline: estilizado exclusivamente via classes em organograma.css (Light & Dark).
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Save, Plus, Trash2, ArrowLeft, Loader2, AlertTriangle, ShieldCheck, Building2, Eye, Search } from 'lucide-react';
import { updateNode, createNode, deleteNode, fetchNiveisHierarquicos } from '../api/organogramaApi';
import { confirmDeleteNode, confirmUnsavedChanges, showToast } from '../utils/alerts';

function NodeDrawerEditor({ isOpen, nodeData, parentNodeForCreate, allNodesFlat, onClose, onRefreshTree }) {
    const isCreateMode = !nodeData || !!parentNodeForCreate;

    const [niveis, setNiveis] = useState([]);
    const [parentSearchQuery, setParentSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        parent_id: null,
        titulo: '',
        nivel_id: 7,
        tipo: 'equipe',
        responsavel: '',
        email_contato: '',
        descricao: '',
        ordem: 0
    });

    const initialFormDataRef = useRef(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Verifica se o formulário teve edições não salvas
    const isDirty = useMemo(() => {
        if (!initialFormDataRef.current) return false;
        return JSON.stringify(formData) !== JSON.stringify(initialFormDataRef.current);
    }, [formData]);

    // Função de fechamento segura (pergunta se deseja descartar edições)
    const handleSafeClose = async () => {
        if (isDirty && !isSubmitting) {
            const confirmed = await confirmUnsavedChanges();
            if (!confirmed) return;
        }
        onClose();
    };

    // Fechamento seguro com a tecla ESC
    useEffect(() => {
        const handleKeyDown = async (e) => {
            if (e.key === 'Escape' && isOpen) {
                await handleSafeClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isDirty, isSubmitting]);

    // Carrega a lista de níveis hierárquicos institucionais da API
    useEffect(() => {
        fetchNiveisHierarquicos()
            .then(data => setNiveis(data))
            .catch(err => console.error("Erro ao carregar níveis hierárquicos:", err));
    }, []);

    // Contagem de nós subordinados diretos para o alerta de exclusão
    const childrenCount = useMemo(() => {
        if (!nodeData || !allNodesFlat) return 0;
        return allNodesFlat.filter(n => n.parent_id === nodeData.id).length;
    }, [nodeData, allNodesFlat]);

    // Atualiza o formulário ao abrir o Drawer ou alterar o nó selecionado
    useEffect(() => {
        if (!isOpen) return;

        setParentSearchQuery('');

        let initialData;
        if (parentNodeForCreate) {
            initialData = {
                parent_id: parentNodeForCreate.id,
                titulo: '',
                nivel_id: 7,
                tipo: 'equipe',
                responsavel: '',
                email_contato: '',
                descricao: '',
                ordem: 0
            };
        } else if (nodeData) {
            initialData = {
                parent_id: nodeData.parent_id !== undefined ? nodeData.parent_id : null,
                titulo: nodeData.titulo || '',
                nivel_id: nodeData.nivel_id || (nodeData.tipo === 'ceo' ? 1 : nodeData.tipo === 'staff' ? 2 : nodeData.tipo === 'diretoria' ? 3 : 7),
                tipo: nodeData.tipo || 'equipe',
                responsavel: nodeData.responsavel || '',
                email_contato: nodeData.email_contato || '',
                descricao: nodeData.descricao || '',
                ordem: nodeData.ordem !== undefined ? nodeData.ordem : 0
            };
        } else {
            initialData = {
                parent_id: null,
                titulo: '',
                nivel_id: 7,
                tipo: 'equipe',
                responsavel: '',
                email_contato: '',
                descricao: '',
                ordem: 0
            };
        }

        setFormData(initialData);
        initialFormDataRef.current = initialData;
        setErrorMsg(null);
    }, [isOpen, nodeData, parentNodeForCreate]);

    // Prevenção de ciclos: calcula o conjunto de IDs desabilitados no select de Nó Pai
    const disabledParentIds = useMemo(() => {
        if (isCreateMode || !nodeData) return new Set();

        const currentId = parseInt(nodeData.id, 10);
        const disabledSet = new Set([currentId]);

        const collectDescendants = (pId) => {
            const children = allNodesFlat.filter(n => n.parent_id === pId);
            children.forEach(c => {
                disabledSet.add(c.id);
                collectDescendants(c.id);
            });
        };

        collectDescendants(currentId);
        return disabledSet;
    }, [isCreateMode, nodeData, allNodesFlat]);

    // Constrói a lista hierárquica identada de nós para o dropdown de Nó Pai
    const formattedTreeOptions = useMemo(() => {
        if (!allNodesFlat || allNodesFlat.length === 0) return [];

        const options = [];

        const buildTree = (parentId, depth = 0) => {
            const children = allNodesFlat.filter(n => n.parent_id === parentId);
            children.forEach(child => {
                const indent = depth > 0 ? `${'  '.repeat(depth)}↳ ` : '';
                options.push({
                    id: child.id,
                    titulo: child.titulo,
                    nivel_nome: child.nivel_nome || child.tipo,
                    label: `${indent}${child.titulo}`,
                    depth
                });
                buildTree(child.id, depth + 1);
            });
        };

        buildTree(null, 0);

        if (parentSearchQuery && parentSearchQuery.trim()) {
            const q = parentSearchQuery.trim().toLowerCase();
            return options.filter(opt => opt.titulo.toLowerCase().includes(q));
        }

        return options;
    }, [allNodesFlat, parentSearchQuery]);

    // Obtém os dados do nível selecionado para a pré-visualização ao vivo
    const currentNivel = useMemo(() => {
        return niveis.find(n => n.id === formData.nivel_id) || {
            nome: formData.tipo,
            classe_css: 'level-subordinado'
        };
    }, [niveis, formData.nivel_id, formData.tipo]);

    if (!isOpen) return null;

    // Submissão do Formulário (Criar ou Atualizar)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.titulo || formData.titulo.trim() === '') {
            setErrorMsg('O Nome da Área / Setor é um campo obrigatório.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);

        const payload = {
            nome: formData.titulo.trim(),
            titulo: formData.titulo.trim(),
            nivel_id: formData.nivel_id,
            tipo: formData.tipo,
            parent_id: formData.parent_id,
            responsavel: formData.responsavel ? formData.responsavel.trim() : null,
            email_contato: formData.email_contato ? formData.email_contato.trim() : null,
            descricao: formData.descricao ? formData.descricao.trim() : null,
            ordem: formData.ordem || 0
        };

        try {
            if (isCreateMode) {
                await createNode(payload);
                showToast(`Área "${formData.titulo.trim()}" criada com sucesso!`, 'success');
            } else {
                await updateNode(nodeData.id, payload);
                showToast(`Alterações da área "${formData.titulo.trim()}" salvas com sucesso!`, 'success');
            }
            initialFormDataRef.current = formData;
            onClose();
            if (onRefreshTree) await onRefreshTree();
        } catch (err) {
            console.error('Erro ao salvar nó:', err);
            const errText = err.response?.data?.error || 'Erro ao processar alteração no nó.';
            setErrorMsg(errText);
            showToast(errText, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Fluxo de exclusão com confirmação executiva via SweetAlert2
    const handleDeleteClick = async () => {
        if (!nodeData) return;

        const isConfirmed = await confirmDeleteNode(formData.titulo || nodeData.titulo, childrenCount);
        if (!isConfirmed) return;

        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            await deleteNode(nodeData.id);
            showToast(`Área "${nodeData.titulo}" excluída com sucesso!`, 'success');
            initialFormDataRef.current = formData;
            onClose();
            if (onRefreshTree) await onRefreshTree();
        } catch (err) {
            console.error('Erro ao excluir nó:', err);
            const errText = err.response?.data?.error || 'Erro ao excluir área.';
            setErrorMsg(errText);
            showToast(errText, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="drawer-overlay drawer-open" onClick={(e) => { if (e.target === e.currentTarget) handleSafeClose(); }}>
            <div className="drawer-content">
                {/* Header do Drawer */}
                <div className={`drawer-header bg-theme-${formData.tipo || 'default'}`}>
                    <div className="drawer-title-group">
                        <Building2 size={24} />
                        <div>
                            <h2 className="drawer-main-title">
                                {isCreateMode ? 'Criar Nova Área' : 'Editar Área'}
                            </h2>
                            {!isCreateMode && nodeData && (
                                <span className="drawer-subtitle">
                                    ID: #{nodeData.id} • {nodeData.titulo}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={handleSafeClose} className="modal-close-btn" title="Fechar editor (Esc)">
                        <X size={20} />
                    </button>
                </div>

                {/* Banner de Erro */}
                {errorMsg && (
                    <div className="drawer-error-banner">
                        <AlertTriangle size={18} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Formulário Principal */}
                <form onSubmit={handleSubmit} className="drawer-body-form">
                    
                    {/* Área Superior Imediata (Parent Node) com Busca */}
                    <div className="drawer-form-group">
                        <label className="drawer-label required">
                            Área Superior Imediata (Nó Pai)
                        </label>

                        <div className="drawer-search-wrapper">
                            <Search size={14} className="drawer-search-icon" />
                            <input
                                type="text"
                                value={parentSearchQuery}
                                onChange={(e) => setParentSearchQuery(e.target.value)}
                                placeholder="Filtrar áreas superiores..."
                                className="drawer-search-input"
                            />
                        </div>

                        <select
                            value={formData.parent_id !== null && formData.parent_id !== undefined ? formData.parent_id : ''}
                            onChange={(e) => setFormData({ ...formData, parent_id: e.target.value ? parseInt(e.target.value, 10) : null })}
                            className="drawer-select"
                        >
                            <option value="">Nenhum (Nó Raiz / Co-CEOs)</option>
                            {formattedTreeOptions.map((opt) => {
                                const isDisabled = disabledParentIds.has(opt.id);
                                return (
                                    <option 
                                        key={opt.id} 
                                        value={opt.id}
                                        disabled={isDisabled}
                                    >
                                        {isDisabled ? `[Inválido/Descendente] ${opt.label}` : `${opt.label} (${opt.nivel_nome})`}
                                    </option>
                                );
                            })}
                        </select>
                        <span className="drawer-help-text">
                            Visualização em árvore identada. Altera a posição hierárquica no organograma.
                        </span>
                    </div>

                    {/* Nome da Área */}
                    <div className="drawer-form-group">
                        <label className="drawer-label required">
                            Título / Nome da Área
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.titulo}
                            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                            placeholder="Ex: Diretoria de Inovação, Licitação"
                            className="drawer-input"
                        />
                    </div>

                    {/* Nível Hierárquico e Ordem */}
                    <div className="drawer-form-row">
                        <div className="drawer-form-group flex-1">
                            <label className="drawer-label required">
                                Nível Hierárquico (Estilo & Classe)
                            </label>
                            <select
                                value={formData.nivel_id || ''}
                                onChange={(e) => {
                                    const selectedId = parseInt(e.target.value, 10);
                                    const selectedNivel = niveis.find(n => n.id === selectedId);
                                    setFormData({ 
                                        ...formData, 
                                        nivel_id: selectedId,
                                        tipo: selectedNivel ? selectedNivel.slug : formData.tipo
                                    });
                                }}
                                className="drawer-select"
                                required
                            >
                                {niveis && niveis.length > 0 ? (
                                    niveis.map(n => (
                                        <option key={n.id} value={n.id}>
                                            {n.nome} ({n.classe_css})
                                        </option>
                                    ))
                                ) : (
                                    <>
                                        <option value="1">Co-CEOs</option>
                                        <option value="2">Staff</option>
                                        <option value="3">Diretoria</option>
                                        <option value="4">Coordenação</option>
                                        <option value="5">Gerência</option>
                                        <option value="6">Apoio</option>
                                        <option value="7">Equipe</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div className="drawer-form-group w-28">
                            <label className="drawer-label">
                                Ordem (X)
                            </label>
                            <input
                                type="number"
                                value={formData.ordem}
                                onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value, 10) || 0 })}
                                className="drawer-input"
                            />
                        </div>
                    </div>

                    {/* Responsável / Gestor */}
                    <div className="drawer-form-group">
                        <label className="drawer-label">
                            Responsável / Gestor
                        </label>
                        <input
                            type="text"
                            value={formData.responsavel}
                            onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                            placeholder="Ex: Dra. Juliana, Leandro Neves"
                            className="drawer-input"
                        />
                    </div>

                    {/* E-mail de Contato */}
                    <div className="drawer-form-group">
                        <label className="drawer-label">
                            E-mail de Contato
                        </label>
                        <input
                            type="email"
                            value={formData.email_contato}
                            onChange={(e) => setFormData({ ...formData, email_contato: e.target.value })}
                            placeholder="setor@jhe.com.br"
                            className="drawer-input"
                        />
                    </div>

                    {/* Descrição e Atribuições */}
                    <div className="drawer-form-group">
                        <label className="drawer-label">
                            Descrição e Atribuições do Setor
                        </label>
                        <textarea
                            value={formData.descricao}
                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                            placeholder="Descreva as principais funções e responsabilidades deste setor..."
                            rows={3}
                            className="drawer-textarea"
                        />
                    </div>

                    {/* Pré-visualização Dinâmica do Card (Live Preview) */}
                    <div className="drawer-form-group">
                        <label className="drawer-label flex items-center gap-1">
                            <Eye size={14} className="text-primary-lighter" />
                            Pré-visualização Dinâmica do Card
                        </label>
                        <div className="drawer-preview-container">
                            <div className={`preview-card-item ${currentNivel.classe_css || 'level-subordinado'}`}>
                                <div className="preview-card-header">
                                    <Building2 size={18} />
                                    <span className="preview-card-title">
                                        {formData.titulo.trim() || 'Nome da Área'}
                                    </span>
                                </div>
                                <span className="preview-card-badge">
                                    {currentNivel.nome || 'Nível'}
                                </span>
                                {formData.responsavel && (
                                    <span className="preview-card-responsavel">
                                        Líder: {formData.responsavel}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Ações do Rodapé do Drawer */}
                    <div className="drawer-footer-actions">
                        {!isCreateMode && (
                            <button
                                type="button"
                                onClick={handleDeleteClick}
                                disabled={isSubmitting}
                                className="btn-drawer-delete"
                                title="Excluir este setor"
                            >
                                <Trash2 size={16} />
                                Excluir
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSafeClose}
                            className="btn-drawer-cancel"
                        >
                            Cancelar
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
                                    {isCreateMode ? 'Criar Área' : 'Salvar Alterações'}
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}

export default NodeDrawerEditor;
