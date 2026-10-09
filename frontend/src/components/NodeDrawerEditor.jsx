/**
 * Cabeçalho Arquitetural: Componente Painel Lateral de Edição (Drawer / CRUD Form).
 * Permite criar, editar, excluir e reparentear qualquer área do organograma.
 * Refinado com campos ordenados de 1 a 7, telefone com máscara, e pré-visualização ao vivo.
 * Zero CSS inline: estilizado exclusivamente via classes em organograma.css (Light & Dark).
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Save, Trash2, Loader2, AlertTriangle, Building2, Search, Mail, Phone, User, ChevronDown, Check } from 'lucide-react';
import { updateNode, createNode, deleteNode, fetchNiveisHierarquicos } from '../api/organogramaApi';
import { confirmDeleteNode, confirmUnsavedChanges, showToast } from '../utils/alerts';

function NodeDrawerEditor({ isOpen, nodeData, parentNodeForCreate, allNodesFlat, onClose, onRefreshTree }) {
    const isCreateMode = !nodeData || !!parentNodeForCreate;

    const [niveis, setNiveis] = useState([]);
    const [parentSearchQuery, setParentSearchQuery] = useState('');
    const [levelSearchQuery, setLevelSearchQuery] = useState('');
    const [isLevelDropdownOpen, setIsLevelDropdownOpen] = useState(false);
    const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);

    const levelDropdownRef = useRef(null);
    const parentDropdownRef = useRef(null);

    const [formData, setFormData] = useState({
        parent_id: null,
        titulo: '',
        nivel_id: 7,
        tipo: 'equipe',
        responsavel: '',
        email_contato: '',
        telefone: '',
        descricao: '',
        ordem: 0
    });

    const initialFormDataRef = useRef(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Fechar os dropdowns customizados ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (levelDropdownRef.current && !levelDropdownRef.current.contains(e.target)) {
                setIsLevelDropdownOpen(false);
            }
            if (parentDropdownRef.current && !parentDropdownRef.current.contains(e.target)) {
                setIsParentDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fechar dropdowns com a tecla ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (isLevelDropdownOpen) setIsLevelDropdownOpen(false);
                if (isParentDropdownOpen) setIsParentDropdownOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLevelDropdownOpen, isParentDropdownOpen]);

    // Máscara utilitária para telefone brasileiro
    const formatPhone = (val) => {
        if (!val) return '';
        const digits = val.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 2) return digits ? `(${digits}` : '';
        if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    };

    const handlePhoneChange = (e) => {
        const formatted = formatPhone(e.target.value);
        setFormData(prev => ({ ...prev, telefone: formatted }));
    };

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
        setLevelSearchQuery('');

        let initialData;
        if (parentNodeForCreate) {
            initialData = {
                parent_id: parentNodeForCreate.id,
                titulo: '',
                nivel_id: 7,
                tipo: 'equipe',
                responsavel: '',
                email_contato: '',
                telefone: '',
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
                telefone: nodeData.telefone || '',
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
                telefone: '',
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
                const indent = depth > 0 ? `${'  '.repeat(depth)}↳ ` : '';
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

    // Lista garantida de níveis hierárquicos institucionais
    const niveisList = useMemo(() => {
        if (niveis && niveis.length > 0) return niveis;
        return [
            { id: 1, slug: 'ceo', nome: 'Co-CEOs' },
            { id: 2, slug: 'staff', nome: 'Staff' },
            { id: 10, slug: 'oia', nome: 'OIA / Assessoria' },
            { id: 3, slug: 'diretoria', nome: 'Diretoria' },
            { id: 4, slug: 'coordenacao', nome: 'Coordenação' },
            { id: 5, slug: 'gerencia', nome: 'Gerência' },
            { id: 8, slug: 'unidade', nome: 'Unidade de Negócios' },
            { id: 6, slug: 'apoio', nome: 'Apoio' },
            { id: 7, slug: 'equipe', nome: 'Equipe' },
            { id: 9, slug: 'contrato', nome: 'Contrato' }
        ];
    }, [niveis]);

    // Mapeamento de subtítulos de hierarquia para os níveis
    const levelSubtitles = useMemo(() => ({
        ceo: 'Direção Executiva',
        staff: 'Assessoria & Planejamento',
        oia: 'Órgão de Inspeção & Auditoria',
        diretoria: 'Direção Estratégica',
        coordenacao: 'Gestão Operacional & Tática',
        gerencia: 'Gestão de Unidade',
        unidade: 'Operação & Projetos',
        apoio: 'Suporte Operacional',
        equipe: 'Execução Técnica',
        contrato: 'Prestação de Serviços'
    }), []);

    // Lista filtrada de níveis hierárquicos pela busca interna
    const filteredNiveis = useMemo(() => {
        if (!levelSearchQuery || !levelSearchQuery.trim()) return niveisList;
        const q = levelSearchQuery.trim().toLowerCase();
        return niveisList.filter(n => {
            const titleMatch = n.nome.toLowerCase().includes(q);
            const sub = n.subtitulo || levelSubtitles[n.slug] || '';
            const subMatch = sub.toLowerCase().includes(q);
            return titleMatch || subMatch;
        });
    }, [niveisList, levelSearchQuery, levelSubtitles]);

    // Obtém o nó pai selecionado para exibição no trigger do Combobox
    const selectedParentNode = useMemo(() => {
        if (formData.parent_id === null || formData.parent_id === undefined) return null;
        return allNodesFlat?.find(n => n.id === formData.parent_id);
    }, [allNodesFlat, formData.parent_id]);

    // Obtém os dados do nível selecionado para a pré-visualização ao vivo
    const currentNivel = useMemo(() => {
        return niveisList.find(n => n.id === formData.nivel_id) || {
            nome: formData.tipo || 'Equipe',
            slug: formData.tipo || 'equipe',
            classe_css: 'level-subordinado'
        };
    }, [niveisList, formData.nivel_id, formData.tipo]);

    if (!isOpen) return null;

    // Submissão do Formulário (Criar ou Atualizar)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.titulo || formData.titulo.trim() === '') {
            setErrorMsg('O Nome da Área é um campo obrigatório.');
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
            telefone: formData.telefone ? formData.telefone.trim() : null,
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
            const errText = err.response?.data?.error || 'Erro ao processar alteração na área.';
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
                {/* Header Minimalista Executivo do Drawer */}
                <div className="drawer-header-executive">
                    <div className="drawer-header-left">
                        <div className="drawer-header-icon-squircle">
                            <Building2 className="drawer-header-building-icon" />
                        </div>
                        <div className="drawer-header-text-group">
                            <span className="drawer-header-top-label">ESTRUTURA ORGANIZACIONAL</span>
                            <h2 className="drawer-header-main-title">
                                {isCreateMode ? 'Criar Nova Área' : 'Editar Área'}
                            </h2>
                            {!isCreateMode && nodeData && (
                                <span className="drawer-header-subtitle">
                                    ID: #{nodeData.id} • {nodeData.titulo}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={handleSafeClose} className="drawer-close-squircle" title="Fechar editor (Esc)">
                        <X size={18} />
                    </button>
                </div>

                {/* Banner de Erro */}
                {errorMsg && (
                    <div className="drawer-error-banner">
                        <AlertTriangle size={18} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Formulário Principal com Rótulos Limpos */}
                <form onSubmit={handleSubmit} className="drawer-body-form">
                    
                    {/* Nome da Área * */}
                    <div className="drawer-form-group">
                        <label className="drawer-label required">
                            Nome da Área
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.titulo}
                            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                            placeholder="ex: SGI, Planejamento Estratégico, Desenvolvimento"
                            className="drawer-input"
                        />
                    </div>

                    {/* Nível Hierárquico * (Searchable Combobox com Badges de Cores) */}
                    <div className="drawer-form-group" ref={levelDropdownRef}>
                        <label className="drawer-label required">
                            Nível Hierárquico
                        </label>
                        <div className="jhe-combobox-container">
                            <button
                                type="button"
                                className={`jhe-combobox-trigger ${isLevelDropdownOpen ? 'is-open' : ''}`}
                                onClick={() => setIsLevelDropdownOpen(!isLevelDropdownOpen)}
                                aria-expanded={isLevelDropdownOpen}
                                aria-label="Selecione o nível hierárquico"
                            >
                                <div className="jhe-combobox-trigger-content">
                                    <span className={`jhe-combobox-badge slug-badge-${currentNivel.slug || 'equipe'}`} />
                                    <span className="jhe-combobox-trigger-label">
                                        {currentNivel.nome || 'Selecione um nível'}
                                    </span>
                                </div>
                                <ChevronDown size={16} className="jhe-combobox-chevron" />
                            </button>

                            {isLevelDropdownOpen && (
                                <div className="jhe-combobox-popover" role="listbox">
                                    <div className="jhe-combobox-search-wrapper">
                                        <Search size={14} className="jhe-combobox-search-icon" />
                                        <input
                                            type="text"
                                            value={levelSearchQuery}
                                            onChange={(e) => setLevelSearchQuery(e.target.value)}
                                            placeholder="Buscar nível hierárquico..."
                                            className="jhe-combobox-search-input"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="jhe-combobox-list">
                                        {filteredNiveis && filteredNiveis.length > 0 ? (
                                            filteredNiveis.map(n => {
                                                const isSelected = formData.nivel_id === n.id;
                                                const subtitle = n.subtitulo || levelSubtitles[n.slug] || 'Nível Operacional';
                                                return (
                                                    <div
                                                        key={n.id}
                                                        role="option"
                                                        aria-selected={isSelected}
                                                        className={`jhe-combobox-item ${isSelected ? 'active' : ''}`}
                                                        onClick={() => {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                nivel_id: n.id,
                                                                tipo: n.slug || prev.tipo
                                                            }));
                                                            setIsLevelDropdownOpen(false);
                                                            setLevelSearchQuery('');
                                                        }}
                                                    >
                                                        <div className="jhe-combobox-item-content">
                                                            <span className={`jhe-combobox-badge slug-badge-${n.slug || 'equipe'}`} />
                                                            <div className="jhe-combobox-item-text">
                                                                <span className="jhe-combobox-item-title">{n.nome}</span>
                                                                <span className="jhe-combobox-item-subtitle">{subtitle}</span>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check size={14} className="jhe-combobox-check" />}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="jhe-combobox-empty">
                                                Nenhum nível hierárquico encontrado
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <span className="drawer-help-text">
                            A cor é definida no cadastro de níveis hierárquicos.
                        </span>
                    </div>

                    {/* Área Superior Imediata (Pai) - Searchable Combobox Unificado */}
                    <div className="drawer-form-group" ref={parentDropdownRef}>
                        <label className="drawer-label">
                            Área Superior Imediata (Pai)
                        </label>
                        <div className="jhe-combobox-container">
                            <button
                                type="button"
                                className={`jhe-combobox-trigger ${isParentDropdownOpen ? 'is-open' : ''}`}
                                onClick={() => setIsParentDropdownOpen(!isParentDropdownOpen)}
                                aria-expanded={isParentDropdownOpen}
                                aria-label="Selecione a área superior"
                            >
                                <div className="jhe-combobox-trigger-content">
                                    <Building2 size={16} className="jhe-combobox-trigger-icon" />
                                    <span className="jhe-combobox-trigger-label">
                                        {selectedParentNode ? selectedParentNode.titulo : 'Nenhuma (Área Raiz / Topo)'}
                                    </span>
                                </div>
                                <ChevronDown size={16} className="jhe-combobox-chevron" />
                            </button>

                            {isParentDropdownOpen && (
                                <div className="jhe-combobox-popover" role="listbox">
                                    <div className="jhe-combobox-search-wrapper">
                                        <Search size={14} className="jhe-combobox-search-icon" />
                                        <input
                                            type="text"
                                            value={parentSearchQuery}
                                            onChange={(e) => setParentSearchQuery(e.target.value)}
                                            placeholder="Buscar na estrutura..."
                                            className="jhe-combobox-search-input"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="jhe-combobox-list">
                                        {/* Opção para Nó Raiz (Sem Pai) */}
                                        <div
                                            role="option"
                                            aria-selected={formData.parent_id === null}
                                            className={`jhe-combobox-item jhe-combobox-root-option ${formData.parent_id === null ? 'active' : ''}`}
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, parent_id: null }));
                                                setIsParentDropdownOpen(false);
                                                setParentSearchQuery('');
                                            }}
                                        >
                                            <div className="jhe-combobox-item-content">
                                                <Building2 size={15} className="jhe-combobox-trigger-icon" />
                                                <div className="jhe-combobox-item-text">
                                                    <span className="jhe-combobox-item-title">Nenhuma (Área Raiz / Topo)</span>
                                                    <span className="jhe-combobox-item-subtitle">Sem subordinação hierárquica</span>
                                                </div>
                                            </div>
                                            {formData.parent_id === null && <Check size={14} className="jhe-combobox-check" />}
                                        </div>

                                        {/* Lista Hierárquica em Árvore */}
                                        {formattedTreeOptions && formattedTreeOptions.length > 0 ? (
                                            formattedTreeOptions.map((opt) => {
                                                const isDisabled = disabledParentIds.has(opt.id);
                                                const isSelected = formData.parent_id === opt.id;
                                                const depthClass = `depth-${Math.min(opt.depth, 5)}`;
                                                return (
                                                    <div
                                                        key={opt.id}
                                                        role="option"
                                                        aria-selected={isSelected}
                                                        aria-disabled={isDisabled}
                                                        className={`jhe-combobox-item ${depthClass} ${isSelected ? 'active' : ''} ${isDisabled ? 'is-disabled' : ''}`}
                                                        onClick={() => {
                                                            if (isDisabled) return;
                                                            setFormData(prev => ({ ...prev, parent_id: opt.id }));
                                                            setIsParentDropdownOpen(false);
                                                            setParentSearchQuery('');
                                                        }}
                                                    >
                                                        <div className="jhe-combobox-item-content">
                                                            {opt.depth > 0 && <span className="jhe-combobox-tree-branch">↳</span>}
                                                            <div className="jhe-combobox-item-text">
                                                                <span className="jhe-combobox-item-title">
                                                                    {opt.titulo} {isDisabled && <span className="jhe-combobox-item-subtitle">(Inválido / Descendente)</span>}
                                                                </span>
                                                                <span className="jhe-combobox-item-subtitle">{opt.nivel_nome}</span>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check size={14} className="jhe-combobox-check" />}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="jhe-combobox-empty">
                                                Nenhuma área encontrada
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
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
                            placeholder="ex: Dr. Hélio, Leandro Furlani"
                            className="drawer-input"
                        />
                    </div>

                    {/* E-mail Institucional */}
                    <div className="drawer-form-group">
                        <label className="drawer-label">
                            E-mail Institucional
                        </label>
                        <div className="drawer-input-icon-group">
                            <Mail size={16} className="drawer-icon-inside" />
                            <input
                                type="email"
                                value={formData.email_contato}
                                onChange={(e) => setFormData({ ...formData, email_contato: e.target.value })}
                                placeholder="ex: setor@jhe.com.br"
                                className="drawer-input drawer-input-with-icon"
                            />
                        </div>
                    </div>

                    {/* Telefone Institucional com Máscara */}
                    <div className="drawer-form-group">
                        <label className="drawer-label">
                            Telefone Institucional
                        </label>
                        <div className="drawer-input-icon-group">
                            <Phone size={16} className="drawer-icon-inside" />
                            <input
                                type="text"
                                value={formData.telefone}
                                onChange={handlePhoneChange}
                                placeholder="(11) 99999-9999"
                                className="drawer-input drawer-input-with-icon"
                            />
                        </div>
                    </div>

                    {/* Atribuições / Descrição */}
                    <div className="drawer-form-group">
                        <label className="drawer-label">
                            Atribuições / Descrição
                        </label>
                        <textarea
                            value={formData.descricao}
                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                            placeholder="Resumo das atividades e responsabilidades do setor..."
                            rows={3}
                            className="drawer-textarea"
                        />
                    </div>

                    {/* Pré-visualização do Card em Tempo Real */}
                    <div className="drawer-preview-box">
                        <div className="drawer-preview-header">
                            <span className="drawer-preview-title">PRÉ-VISUALIZAÇÃO DO CARD</span>
                            <span className="drawer-preview-status">Atualização em tempo real</span>
                        </div>
                        <div className="drawer-preview-canvas">
                            <div className="jhe-live-preview-card">
                                <div className={`preview-top-border slug-accent-${currentNivel.slug || 'equipe'}`} />
                                <div className="preview-card-body">
                                    <div className="preview-avatar-circle">
                                        <User className="preview-avatar-icon" />
                                    </div>
                                    <div className="preview-card-info">
                                        <div className="preview-line-title">
                                            {formData.titulo.trim() || 'Nome da nova área'}
                                        </div>
                                        <div className="preview-line-level">
                                            {currentNivel.nome ? currentNivel.nome.toUpperCase() : (formData.tipo || 'EQUIPE').toUpperCase()}
                                        </div>
                                        {formData.responsavel && formData.responsavel.trim() !== '' && (
                                            <div className="preview-line-responsavel">
                                                {formData.responsavel.trim()}
                                            </div>
                                        )}
                                    </div>
                                </div>
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
                                    {isCreateMode ? 'Criando área...' : 'Salvando...'}
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    {isCreateMode ? 'Criar área' : 'Salvar alterações'}
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
