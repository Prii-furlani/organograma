/**
 * Cabeçalho Arquitetural: Componente de Painel Lateral / Modal de Detalhes e Gerenciamento do Nó.
 * Exibe informações completas e disponibiliza botões de ação e edição EXCLUSIVAMENTE para nós
 * onde o usuário logado possui permissão hierárquica por sub-árvore.
 * Zero CSS inline: utiliza estilos em organograma.css adaptáveis a temas Claro/Escuro.
 */

import React, { useState, useEffect } from 'react';
import { X, Mail, User, Info, Edit, Plus, Trash2, ShieldCheck, Lock, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateNode, createNode, deleteNode } from '../api/organogramaApi';

function NodeDetailsModal({ nodeData, onClose, onRefreshTree }) {
    const { hasPermissionToEdit } = useAuth();
    
    const [isEditing, setIsEditing] = useState(false);
    const [isAddingChild, setIsAddingChild] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionError, setActionError] = useState(null);

    // Formulário de Edição
    const [formData, setFormData] = useState({
        titulo: '',
        tipo: 'equipe',
        responsavel: '',
        email_contato: '',
        descricao: '',
        cor_tema: '#0284c7'
    });

    // Formulário de Novo Subordinado
    const [newChildData, setNewChildData] = useState({
        titulo: '',
        tipo: 'equipe',
        responsavel: '',
        email_contato: '',
        descricao: ''
    });

    useEffect(() => {
        if (nodeData) {
            setFormData({
                titulo: nodeData.titulo || '',
                tipo: nodeData.tipo || 'equipe',
                responsavel: nodeData.responsavel || '',
                email_contato: nodeData.email_contato || '',
                descricao: nodeData.descricao || '',
                cor_tema: nodeData.cor_tema || '#0284c7'
            });
            setIsEditing(false);
            setIsAddingChild(false);
            setActionError(null);
        }
    }, [nodeData]);

    if (!nodeData) return null;

    const canEdit = hasPermissionToEdit(nodeData.id);

    // Salva edições do nó atual
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setActionError(null);

        try {
            await updateNode(nodeData.id, {
                ...nodeData,
                ...formData
            });
            setIsEditing(false);
            if (onRefreshTree) onRefreshTree();
        } catch (err) {
            setActionError(err.response?.data?.error || 'Erro ao salvar alterações do nó.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Cria um novo nó filho
    const handleAddChild = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setActionError(null);

        try {
            await createNode({
                parent_id: nodeData.id,
                ...newChildData
            });
            setIsAddingChild(false);
            setNewChildData({ titulo: '', tipo: 'equipe', responsavel: '', email_contato: '', descricao: '' });
            if (onRefreshTree) onRefreshTree();
        } catch (err) {
            setActionError(err.response?.data?.error || 'Erro ao adicionar subordinado.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Exclui o nó atual
    const handleDeleteNode = async () => {
        if (!window.confirm(`Tem certeza que deseja excluir "${nodeData.titulo}" e todos os seus subordinados em cascata?`)) {
            return;
        }

        setIsSubmitting(true);
        setActionError(null);

        try {
            await deleteNode(nodeData.id);
            onClose();
            if (onRefreshTree) onRefreshTree();
        } catch (err) {
            setActionError(err.response?.data?.error || 'Erro ao excluir nó.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay modal-open">
            {/* Header com o tema do nó */}
            <div className={`modal-header bg-theme-${nodeData.tipo || 'default'}`}>
                <button 
                    onClick={onClose}
                    className="modal-close-btn"
                    title="Fechar painel"
                >
                    <X size={20} />
                </button>
                
                <h2 className="modal-node-title">{nodeData.titulo}</h2>
                
                <div className="modal-badge-group">
                    <span className="node-badge-chip">
                        {nodeData.tipo}
                    </span>
                    {canEdit ? (
                        <span className="permission-chip permission-allowed">
                            <ShieldCheck size={12} /> Gerenciamento Ativo
                        </span>
                    ) : (
                        <span className="permission-chip permission-readonly">
                            <Lock size={12} /> Apenas Leitura
                        </span>
                    )}
                </div>
            </div>

            {/* Mensagem de Erro da Ação */}
            {actionError && (
                <div className="modal-error-banner">
                    {actionError}
                </div>
            )}

            {/* Conteúdo Principal */}
            <div className="modal-body-container">
                {isEditing ? (
                    /* FORMULÁRIO DE EDIÇÃO */
                    <form onSubmit={handleSaveEdit} className="modal-form">
                        <h3 className="modal-form-title">Editar Setor / Nó</h3>
                        
                        <div className="form-group">
                            <label className="form-label">Título do Setor</label>
                            <input
                                type="text"
                                required
                                value={formData.titulo}
                                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tipo de Nó</label>
                            <select
                                value={formData.tipo}
                                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                className="form-select"
                            >
                                <option value="diretoria">Diretoria</option>
                                <option value="gerencia">Gerência</option>
                                <option value="coordenacao">Coordenação</option>
                                <option value="unidade">Unidade de Negócios</option>
                                <option value="staff">Staff / Assessoria</option>
                                <option value="equipe">Equipe / Célula</option>
                                <option value="contrato">Contrato</option>
                                <option value="apoio">Apoio</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Responsável / Gestor</label>
                            <input
                                type="text"
                                value={formData.responsavel}
                                onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                                className="form-input"
                                placeholder="Nome do gestor"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">E-mail de Contato</label>
                            <input
                                type="email"
                                value={formData.email_contato}
                                onChange={(e) => setFormData({ ...formData, email_contato: e.target.value })}
                                className="form-input"
                                placeholder="contato@jhe.com.br"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Descrição e Atribuições</label>
                            <textarea
                                value={formData.descricao}
                                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                className="form-textarea"
                                rows={3}
                            />
                        </div>

                        <div className="modal-form-buttons">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn-primary"
                            >
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Salvar Alterações
                            </button>
                        </div>
                    </form>

                ) : isAddingChild ? (
                    /* FORMULÁRIO DE ADICIONAR SUBORDINADO */
                    <form onSubmit={handleAddChild} className="modal-form">
                        <h3 className="modal-form-title">Adicionar Subordinado a "{nodeData.titulo}"</h3>
                        
                        <div className="form-group">
                            <label className="form-label">Título do Novo Nó</label>
                            <input
                                type="text"
                                required
                                value={newChildData.titulo}
                                onChange={(e) => setNewChildData({ ...newChildData, titulo: e.target.value })}
                                placeholder="Ex: Novo Núcleo Técnico"
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tipo de Nó</label>
                            <select
                                value={newChildData.tipo}
                                onChange={(e) => setNewChildData({ ...newChildData, tipo: e.target.value })}
                                className="form-select"
                            >
                                <option value="equipe">Equipe / Célula</option>
                                <option value="gerencia">Gerência</option>
                                <option value="coordenacao">Coordenação</option>
                                <option value="contrato">Contrato</option>
                                <option value="apoio">Apoio</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Responsável</label>
                            <input
                                type="text"
                                value={newChildData.responsavel}
                                onChange={(e) => setNewChildData({ ...newChildData, responsavel: e.target.value })}
                                className="form-input"
                                placeholder="Nome do responsável"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Descrição</label>
                            <textarea
                                value={newChildData.descricao}
                                onChange={(e) => setNewChildData({ ...newChildData, descricao: e.target.value })}
                                className="form-textarea"
                                rows={2}
                            />
                        </div>

                        <div className="modal-form-buttons">
                            <button
                                type="button"
                                onClick={() => setIsAddingChild(false)}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn-primary"
                            >
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                Criar Subordinado
                            </button>
                        </div>
                    </form>

                ) : (
                    /* VISUALIZAÇÃO DOS DETALHES */
                    <div className="modal-details-view">
                        <div className="detail-item">
                            <h4 className="detail-label"><User size={16} /> Responsável / Liderança</h4>
                            <p className="detail-value">{nodeData.responsavel || 'Não definido'}</p>
                        </div>

                        {nodeData.email_contato && (
                            <div className="detail-item">
                                <h4 className="detail-label"><Mail size={16} /> E-mail de Contato</h4>
                                <a href={`mailto:${nodeData.email_contato}`} className="detail-link">
                                    {nodeData.email_contato}
                                </a>
                            </div>
                        )}

                        <div className="detail-item">
                            <h4 className="detail-label"><Info size={16} /> Atribuições e Descrição</h4>
                            <div className="detail-description-box">
                                {nodeData.descricao || 'Nenhuma descrição detalhada informada.'}
                            </div>
                        </div>

                        {/* BARRA DE AÇÕES EXCLUSIVA PARA QUEM TEM PERMISSÃO */}
                        {canEdit && (
                            <div className="modal-actions-box">
                                <h4 className="actions-box-title">Gerenciamento Hierárquico</h4>
                                <div className="actions-buttons-grid">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="action-btn action-edit"
                                    >
                                        <Edit size={16} /> Editar Setor
                                    </button>
                                    <button
                                        onClick={() => setIsAddingChild(true)}
                                        className="action-btn action-add"
                                    >
                                        <Plus size={16} /> Add Subordinado
                                    </button>
                                    <button
                                        onClick={handleDeleteNode}
                                        className="action-btn action-delete"
                                    >
                                        <Trash2 size={16} /> Excluir Setor
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="modal-footer-container">
                <button onClick={onClose} className="btn-close-modal">
                    Fechar
                </button>
            </div>
        </div>
    );
}

export default NodeDetailsModal;
