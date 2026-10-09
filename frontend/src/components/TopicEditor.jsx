import React, { useState } from 'react';
import { ArrowLeft, Search, Plus, User, Edit3, Trash2, ChevronDown, ChevronRight, GripVertical, AlertCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { deleteNode, moveNode } from '../api/organogramaApi';
import { confirmCascadeDeleteNode, confirmDeleteNode, confirmHierarchyTransfer, showToast } from '../utils/alerts';

const TopicItem = ({ 
    node, 
    level, 
    onOpenCreateDrawer, 
    onEditNode, 
    onRefreshTree,
    searchQuery,
    onMoveRequest
}) => {
    const { hasPermissionToEdit } = useAuth();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isDragOver, setIsDragOver] = useState(false);

    const hasChildren = node.children && node.children.length > 0;
    const canEdit = hasPermissionToEdit ? hasPermissionToEdit(node.id) : false;

    // Calcula contagens
    const diretos = hasChildren ? node.children.length : 0;
    let abaixo = 0;
    const countAbaixo = (n) => {
        if (n.children) {
            abaixo += n.children.length;
            n.children.forEach(countAbaixo);
        }
    };
    countAbaixo(node);

    // Filtra pela busca
    const matchSearch = node.titulo?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        node.descricao?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Se tem busca, verifica se algum filho dá match para manter este pai visível
    const hasChildMatch = (n) => {
        if (!n.children) return false;
        return n.children.some(c => 
            c.titulo?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            c.descricao?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            hasChildMatch(c)
        );
    };

    const isVisible = searchQuery === '' || matchSearch || hasChildMatch(node);

    if (!isVisible) return null;

    const handleDragStart = (e) => {
        if (!canEdit) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', node.id);
        e.stopPropagation();
    };

    const handleDragOver = (e) => {
        if (!canEdit) return;
        e.preventDefault();
        setIsDragOver(true);
        e.stopPropagation();
    };

    const handleDragLeave = (e) => {
        setIsDragOver(false);
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        e.stopPropagation();
        
        if (!canEdit) {
            Swal.fire({
                title: 'Acesso negado',
                text: 'Você não tem permissão para alterar setores fora da sua diretoria.',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId || draggedId === String(node.id)) return;

        onMoveRequest(draggedId, node);
    };

    const handleDelete = async () => {
        if (!canEdit) {
            Swal.fire({
                title: 'Acesso negado',
                text: 'Você não tem permissão para alterar setores fora da sua diretoria.',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        let totalSubordinados = 0;
        const countSubordinados = (n) => {
            if (n.children && n.children.length > 0) {
                totalSubordinados += n.children.length;
                n.children.forEach(countSubordinados);
            }
        };
        countSubordinados(node);

        let confirmed = false;
        if (totalSubordinados > 0) {
            confirmed = await confirmCascadeDeleteNode(node.titulo, totalSubordinados);
        } else {
            confirmed = await confirmDeleteNode(node.titulo, 0);
        }

        if (confirmed) {
            try {
                await deleteNode(node.id);
                await onRefreshTree();
                showToast(`A área "${node.titulo}" foi removida com sucesso.`, 'success');
            } catch (error) {
                console.error('Erro ao deletar área:', error);
                const errorMsg = error.response?.data?.error || 'Não foi possível excluir a área.';
                Swal.fire('Erro na exclusão', errorMsg, 'error');
            }
        }
    };

    return (
        <div className="topic-item-wrapper">
            {/* Linha Principal do Tópico (3 Colunas) */}
            <div 
                className={`topic-row-bar ${isDragOver ? 'is-drag-over' : ''} ${!canEdit ? 'is-scope-locked' : ''}`}
                draggable={canEdit}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Coluna 1: Informações e Indentação (Flex 1) */}
                <div className="topic-col-info">
                    {/* Linhas de indentação visual */}
                    <div className="topic-indent-group">
                        {Array.from({ length: level }).map((_, i) => (
                            <div key={i} className="topic-indent-guide" />
                        ))}
                    </div>

                    {/* Seta de expansão */}
                    <div className="topic-chevron-box" onClick={() => setIsExpanded(!isExpanded)}>
                        {hasChildren ? (
                            isExpanded ? <ChevronDown size={16} className="topic-chevron-icon" /> : <ChevronRight size={16} className="topic-chevron-icon" />
                        ) : (
                            <div className="w-4" />
                        )}
                    </div>

                    {/* Squircle do Avatar */}
                    <div className="topic-avatar-squircle">
                        <User className="topic-avatar-icon" />
                    </div>

                    {/* Textos com Alto Contraste */}
                    <div className="topic-text-group">
                        <div className="flex items-center gap-2">
                            <span className="topic-title">{node.titulo}</span>
                            {!canEdit && (
                                <span className="topic-scope-lock-badge" title="Fora do seu escopo de edição">
                                    <ShieldAlert size={12} />
                                    Somente leitura
                                </span>
                            )}
                        </div>
                        <span className="topic-subtitle">{node.descricao || node.tipo || 'Área'}</span>
                        <span className="topic-category">{node.tipo}</span>
                    </div>
                </div>

                {/* Coluna 2: Subordinados (Fixa 180px) */}
                <div className="topic-col-subordinates">
                    <User size={12} className="mr-1.5" />
                    {diretos} diretos • {abaixo} abaixo
                </div>

                {/* Coluna 3: Ações (Fixa 120px) */}
                <div className="topic-col-actions">
                    <button 
                        onClick={() => canEdit && onOpenCreateDrawer(node)} 
                        className={`topic-action-btn ${!canEdit ? 'is-disabled' : ''}`} 
                        disabled={!canEdit}
                        title={canEdit ? "Adicionar Subordinado" : "Sem permissão para adicionar subordinados neste setor"}
                    >
                        <Plus size={16} />
                    </button>
                    <button 
                        onClick={() => canEdit && onEditNode(node)} 
                        className={`topic-action-btn ${!canEdit ? 'is-disabled' : ''}`} 
                        disabled={!canEdit}
                        title={canEdit ? "Editar" : "Sem permissão para editar este setor"}
                    >
                        <Edit3 size={16} />
                    </button>
                    <button 
                        onClick={() => canEdit && handleDelete()} 
                        className={`topic-action-btn topic-delete-btn ${!canEdit ? 'is-disabled' : ''}`} 
                        disabled={!canEdit}
                        title={canEdit ? "Excluir" : "Sem permissão para excluir este setor"}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Filhos renderizados recursivamente (Flex Column) */}
            {hasChildren && isExpanded && (
                <div className="flex flex-col w-full relative">
                    {node.children.map(child => (
                        <TopicItem 
                            key={child.id} 
                            node={child} 
                            level={level + 1} 
                            onOpenCreateDrawer={onOpenCreateDrawer}
                            onEditNode={onEditNode}
                            onRefreshTree={onRefreshTree}
                            searchQuery={searchQuery}
                            onMoveRequest={onMoveRequest}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Helper function to find a node by ID in tree
const findNodeInTree = (nodes, id) => {
    for (const node of nodes) {
        if (String(node.id) === String(id)) return node;
        if (node.children) {
            const found = findNodeInTree(node.children, id);
            if (found) return found;
        }
    }
    return null;
};

// Verifica se childId é um descendente de rootNode
const isDescendant = (rootNode, childId) => {
    if (!rootNode.children) return false;
    for (const child of rootNode.children) {
        if (String(child.id) === String(childId)) return true;
        if (isDescendant(child, childId)) return true;
    }
    return false;
};

function TopicEditor({ treeData, onClose, onOpenCreateDrawer, onEditNode, onRefreshTree }) {
    const { user, hasPermissionToEdit } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');

    const handleMoveRequest = async (draggedId, targetNode) => {
        const draggedNode = findNodeInTree(treeData, draggedId);
        if (!draggedNode) return;

        // Validação de permissão de escopo no nó arrastado
        if (!hasPermissionToEdit(draggedNode.id)) {
            Swal.fire({
                title: 'Acesso negado',
                text: 'Você não tem permissão para alterar setores fora da sua diretoria.',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        // Validação de permissão de escopo no nó de destino
        if (!hasPermissionToEdit(targetNode.id)) {
            Swal.fire({
                title: 'Acesso negado',
                text: 'Você não tem permissão para transferir setores para fora da sua diretoria.',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        // Validação: não mover para si mesmo
        if (String(draggedNode.id) === String(targetNode.id)) {
            return;
        }

        // Validação: Bloquear mover para a própria subárvore
        if (isDescendant(draggedNode, targetNode.id)) {
            Swal.fire('Movimento inválido', 'Você não pode mover uma área para dentro de si mesma ou de seus próprios subordinados.', 'error');
            return;
        }

        // Conta subordinados do nó arrastado
        let subCount = 0;
        const countSubs = (n) => {
            if (n.children && n.children.length > 0) {
                subCount += n.children.length;
                n.children.forEach(countSubs);
            }
        };
        countSubs(draggedNode);

        if (subCount > 0) {
            const confirmed = await confirmHierarchyTransfer(draggedNode.titulo, subCount, targetNode.titulo);
            if (!confirmed) {
                // Usuário cancelou: reverte e mantém na árvore original
                return;
            }
        }

        try {
            await moveNode(draggedNode.id, targetNode.id);
            await onRefreshTree();
            showToast(`Área "${draggedNode.titulo}" transferida com sucesso.`, 'success');
        } catch (error) {
            console.error('Erro ao transferir setor:', error);
            const errorMsg = error.response?.data?.error || 'Não foi possível transferir o setor.';
            Swal.fire('Erro na transferência', errorMsg, 'error');
        }
    };

    const handleCreateNewRoot = () => {
        const role = String(user?.role_global || '').toUpperCase();
        if (role !== 'ADMIN') {
            Swal.fire({
                title: 'Acesso restrito',
                text: 'Apenas Administradores podem criar tópicos raiz. Para criar um setor subordinado à sua área, clique no botão (+) ao lado da sua diretoria ou coordenação.',
                icon: 'info',
                confirmButtonText: 'Entendido'
            });
            return;
        }
        onOpenCreateDrawer(null);
    };

    return (
        <div className="topic-editor-container">
            {/* Top Navbar */}
            <header className="topic-editor-navbar">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        title="Voltar ao organograma"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-[#0F2C4A] dark:bg-[#12284C] flex items-center justify-center text-white dark:text-[#61CBE8]">
                        <GripVertical size={18} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-[#EDB580] tracking-wider uppercase">Administração da Estrutura</span>
                        <span className="text-lg font-bold text-[#0F2C4A] dark:text-white leading-tight">Editor em tópicos</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Localizar um tópico..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-72 h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <button 
                        onClick={handleCreateNewRoot}
                        className="h-10 px-5 bg-[#0F2C4A] hover:bg-[#194775] dark:bg-[#61CBE8] dark:hover:bg-white dark:text-[#020931] text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-md"
                    >
                        <Plus size={16} />
                        Novo tópico
                    </button>
                </div>
            </header>

            {/* Sub header info */}
            <div className="topic-editor-info-bar">
                <div className="flex items-center gap-2 font-medium">
                    <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
                    <strong>{user?.nome_completo}</strong> - {user?.role_global?.toUpperCase()}
                    <span className="text-amber-300 dark:text-amber-600 mx-2">|</span>
                    <span>Arraste um tópico sobre outro para alterar sua área superior.</span>
                </div>
                <div className="flex items-center gap-2 opacity-80">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full border border-amber-300 text-[10px]">?</span>
                    Use as setas para expandir ou recolher os níveis
                </div>
            </div>

            {/* Container da Tabela com Scroll Interno */}
            <main className="topic-editor-main-area">
                <div className="topic-editor-card">
                    
                    {/* Cabeçalho FIXO da Tabela (Coerente com as 3 colunas) */}
                    <div className="topic-table-header">
                        <div className="flex-1 pl-14">Estrutura e Hierarquia</div>
                        <div className="w-[180px] flex-shrink-0">Subordinados</div>
                        <div className="w-[120px] flex-shrink-0 text-right pr-6">Ações</div>
                    </div>

                    {/* Corpo Scrollável da Lista */}
                    <div className="topic-table-body">
                        {treeData.map(node => (
                            <TopicItem 
                                key={node.id} 
                                node={node} 
                                level={0} 
                                onOpenCreateDrawer={onOpenCreateDrawer}
                                onEditNode={onEditNode}
                                onRefreshTree={onRefreshTree}
                                searchQuery={searchQuery}
                                onMoveRequest={handleMoveRequest}
                            />
                        ))}
                        
                        {treeData.length === 0 && (
                            <div className="p-8 text-center text-gray-500 dark:text-slate-400 text-sm">
                                Nenhuma área encontrada no organograma.
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default TopicEditor;
