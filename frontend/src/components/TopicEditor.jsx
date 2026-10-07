import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Plus, User, Edit3, Trash2, ChevronDown, ChevronRight, GripVertical, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { deleteNode } from '../api/organogramaApi';
import ConfirmMoveModal from './ConfirmMoveModal';

const TopicItem = ({ 
    node, 
    level, 
    onOpenCreateDrawer, 
    onEditNode, 
    onRefreshTree,
    searchQuery,
    onMoveRequest
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isDragOver, setIsDragOver] = useState(false);

    const hasChildren = node.children && node.children.length > 0;

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
        e.dataTransfer.setData('text/plain', node.id);
        e.stopPropagation();
    };

    const handleDragOver = (e) => {
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
        
        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId || draggedId === String(node.id)) return;

        onMoveRequest(draggedId, node);
    };

    const handleDelete = () => {
        Swal.fire({
            title: 'Excluir área?',
            text: `A área "${node.titulo}" e todos os seus subordinados serão excluídos permanentemente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#cbd5e1',
            confirmButtonText: 'Sim, excluir'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await deleteNode(node.id);
                    onRefreshTree();
                    Swal.fire('Excluído!', 'A área foi removida.', 'success');
                } catch (error) {
                    Swal.fire('Erro', 'Não foi possível excluir a área.', 'error');
                }
            }
        });
    };

    return (
        <div className="flex flex-col w-full">
            <div 
                className={`flex items-center py-3 px-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${isDragOver ? 'bg-blue-50 border-blue-300' : ''}`}
                draggable
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Linhas de indentação visual e seta */}
                <div className="flex items-center self-stretch">
                    {Array.from({ length: level }).map((_, i) => (
                        <div key={i} className="w-10 flex-shrink-0 border-l border-gray-200 h-full min-h-[48px]"></div>
                    ))}
                </div>

                <div className="w-6 flex items-center justify-center mr-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    {hasChildren ? (
                        isExpanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />
                    ) : (
                        <div className="w-4"></div>
                    )}
                </div>

                {/* Ícone */}
                <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-blue-900 mr-4 flex-shrink-0 cursor-grab active:cursor-grabbing">
                    <User size={18} />
                </div>

                {/* Textos */}
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-bold text-gray-900 truncate">{node.titulo}</span>
                    <span className="text-xs font-semibold text-amber-700 truncate uppercase mt-0.5">{node.descricao || node.tipo || 'Área'}</span>
                    <span className="text-[10px] text-gray-500 truncate mt-0.5 capitalize">{node.tipo}</span>
                </div>

                {/* Coluna Subordinados */}
                <div className="w-48 flex items-center text-xs text-gray-500 font-medium">
                    <User size={12} className="mr-1.5" />
                    {diretos} diretos • {abaixo} abaixo
                </div>

                {/* Ações */}
                <div className="w-32 flex items-center justify-end gap-3 text-gray-400">
                    <button onClick={() => onOpenCreateDrawer(node)} className="hover:text-blue-600 transition-colors" title="Adicionar Subordinado">
                        <Plus size={16} />
                    </button>
                    <button onClick={() => onEditNode(node)} className="hover:text-blue-600 transition-colors" title="Editar">
                        <Edit3 size={16} />
                    </button>
                    <button onClick={handleDelete} className="hover:text-red-600 transition-colors" title="Excluir">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Filhos renderizados recursivamente */}
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
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');

    // Estados do Modal de Mover
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [moveDraggedNode, setMoveDraggedNode] = useState(null);
    const [moveTargetNode, setMoveTargetNode] = useState(null);

    const handleMoveRequest = (draggedId, targetNode) => {
        const draggedNode = findNodeInTree(treeData, draggedId);
        if (!draggedNode) return;

        // Validação: Bloquear mover para a própria subárvore
        if (isDescendant(draggedNode, targetNode.id)) {
            Swal.fire('Movimento inválido', 'Você não pode mover uma área para dentro de si mesma ou de seus próprios subordinados.', 'error');
            return;
        }

        // Tudo certo, abre o modal
        setMoveDraggedNode(draggedNode);
        setMoveTargetNode(targetNode);
        setIsMoveModalOpen(true);
    };

    return (
        <div className="absolute inset-0 bg-[#F8FAFC] flex flex-col z-50 overflow-hidden">
            {/* Top Navbar */}
            <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                        title="Voltar ao organograma"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-[#0F2C4A] flex items-center justify-center text-white">
                        <GripVertical size={18} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-amber-700 tracking-wider uppercase">Administração da Estrutura</span>
                        <span className="text-lg font-bold text-[#0F2C4A] leading-tight">Editor em tópicos</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Localizar um tópico..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-72 h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <button 
                        onClick={() => onOpenCreateDrawer(null)}
                        className="h-10 px-5 bg-[#0F2C4A] hover:bg-[#194775] text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-md"
                    >
                        <Plus size={16} />
                        Novo tópico
                    </button>
                </div>
            </header>

            {/* Sub header info */}
            <div className="bg-[#FFFDF9] border-b border-amber-100 px-6 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0">
                <div className="flex items-center gap-2 font-medium">
                    <AlertCircle size={14} className="text-amber-600" />
                    <strong>{user?.nome_completo}</strong> - {user?.role_global?.toUpperCase()}
                    <span className="text-amber-300 mx-2">|</span>
                    <span className="text-amber-700/80">Arraste um tópico sobre outro para alterar sua área superior.</span>
                </div>
                <div className="flex items-center gap-2 text-amber-700/80">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full border border-amber-300 text-[10px]">?</span>
                    Use as setas para expandir ou recolher os níveis
                </div>
            </div>

            {/* Tabela Header */}
            <div className="flex-1 overflow-auto p-8 flex justify-center">
                <div className="w-full max-w-6xl bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    
                    <div className="flex items-center px-4 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <div className="flex-1 pl-14">Estrutura e Hierarquia</div>
                        <div className="w-48">Subordinados</div>
                        <div className="w-32 text-right pr-6">Ações</div>
                    </div>

                    <div className="flex flex-col pb-4">
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
                            <div className="p-8 text-center text-gray-500 text-sm">
                                Nenhuma área encontrada no organograma.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmMoveModal 
                isOpen={isMoveModalOpen}
                onClose={() => setIsMoveModalOpen(false)}
                draggedNode={moveDraggedNode}
                targetNode={moveTargetNode}
                onRefreshTree={onRefreshTree}
            />
        </div>
    );
}

export default TopicEditor;
