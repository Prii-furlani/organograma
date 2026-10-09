/**
 * Cabeçalho Arquitetural: Tela Principal do Sistema (Visualização Executiva e Gerenciamento).
 * Layout descentralizado com Navbar superior executiva, Toolbar flutuante no canto inferior esquerdo,
 * botão flutuante de Ajuda no canto inferior direito e interatividade travável do canvas.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { ReactFlow, Background, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import MindMapNode from '../components/MindMapNode';
import Navbar from '../components/Navbar';
import EditModeBanner from '../components/EditModeBanner';
import CanvasControls from '../components/CanvasControls';
import HelpFloatingBtn from '../components/HelpFloatingBtn';
import HelpTooltip from '../components/HelpTooltip';
import NodeDetailsModal from '../components/NodeDetailsModal';
import NodeDrawerEditor from '../components/NodeDrawerEditor';
import TopicEditor from '../components/TopicEditor';
import LoginModal from '../components/LoginModal';
import UserManagementModal from '../components/UserManagementModal';
import FirstPasswordModal from '../components/FirstPasswordModal';
import TermsModal from '../components/TermsModal';
import { useAuth } from '../context/AuthContext';
import { useOrganograma } from '../hooks/useOrganograma';

import { useDarkMode } from '../hooks/useDarkMode';
import { fetchOrganogramaTree, fetchFlatNodesList } from '../api/organogramaApi';
import { Loader2 } from 'lucide-react';
import { Handle, Position } from '@xyflow/react';

import { StraightHorizontalEdge, StraightVerticalEdge, StepLTurnEdge, StraightEdge, OrthogonalStepEdge } from '../components/CustomEdges';

// Nó auxiliar invisível para roteamento ortogonal (Espinha Dorsal e Barramento)
const JunctionNode = ({ id }) => (
    <div className="junction-node-wrapper">
        <Handle type="target" position={Position.Top} id="top" className="junction-handle" />
        <Handle type="source" position={Position.Bottom} id="bottom" className="junction-handle" />
        <Handle type="source" position={Position.Left} id="left" className="junction-handle" />
        <Handle type="target" position={Position.Left} id="left-target" className="junction-handle" />
        <Handle type="source" position={Position.Right} id="right" className="junction-handle" />
        <Handle type="target" position={Position.Right} id="right-target" className="junction-handle" />
    </div>
);

const nodeTypes = {
    mindmap: MindMapNode,
    junction: JunctionNode
};

const edgeTypes = {
    straightHorizontal: StraightHorizontalEdge,
    straightVertical: StraightVerticalEdge,
    stepLTurn: StepLTurnEdge,
    straight: StraightEdge,
    step: OrthogonalStepEdge
};

function OrganogramaContent() {
    const { user } = useAuth();
    const [treeData, setTreeData] = useState([]);

    const [allNodesFlat, setAllNodesFlat] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [selectedNode, setSelectedNode] = useState(null);
    const [showHelp, setShowHelp] = useState(false); // Fecha ajuda por padrão em apresentações
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    
    // Estados do Modo Edição e Drawer Editor
    const [isEditMode, setIsEditMode] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerNodeData, setDrawerNodeData] = useState(null);
    const [parentNodeForCreate, setParentNodeForCreate] = useState(null);

    // Estado da Trava do Canvas (Lock/Unlock)
    const [isCanvasLocked, setIsCanvasLocked] = useState(false);

    const { isDark, toggleDarkMode } = useDarkMode();

    // Carrega a árvore e a lista plana para os selects do Drawer
    const loadData = useCallback(async () => {
        try {
            const [tree, flat] = await Promise.all([
                fetchOrganogramaTree(),
                fetchFlatNodesList()
            ]);
            setTreeData(tree);
            setAllNodesFlat(flat);
        } catch (err) {
            console.error("Erro ao carregar mapa:", err);
            setError("Não foi possível carregar o organograma. Verifique o servidor.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleNodeClick = useCallback((nodeData) => {
        setSelectedNode(nodeData);
    }, []);

    // Abertura do Drawer de Edição para um nó existente
    const handleEditNode = useCallback((nodeData) => {
        setDrawerNodeData(nodeData);
        setParentNodeForCreate(null);
        setIsDrawerOpen(true);
    }, []);

    // Abertura do Drawer para Criar Nova Área
    const handleOpenCreateDrawer = useCallback((parentNode = null) => {
        setDrawerNodeData(null);
        setParentNodeForCreate(parentNode);
        setIsDrawerOpen(true);
    }, []);

    // Hook customizado que gerencia o estado dos nós visuais
    const { 
        nodes, 
        edges, 
        onNodesChange, 
        onEdgesChange, 
        expandAll, 
        collapseAll, 
        focusNode 
    } = useOrganograma(
        treeData, 
        handleNodeClick,
        isEditMode,
        handleEditNode,
        allNodesFlat
    );

    if (isLoading) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-canvas text-main">
                <Loader2 size={48} className="animate-spin mb-4 text-cyan-500" />
                <h2 className="text-xl font-semibold">Montando Organograma...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-canvas text-red-600 p-8 text-center">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Ops! Ocorreu um erro.</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen bg-canvas relative overflow-hidden flex flex-col">
            {!isEditMode ? (
                <>
                    {/* 1. Navbar Executiva no Topo */}
                    <Navbar 
                        onOpenLoginModal={() => setIsLoginModalOpen(true)}
                        isEditMode={isEditMode}
                        onToggleEditMode={() => setIsEditMode(!isEditMode)}
                        onOpenCreateDrawer={() => handleOpenCreateDrawer(null)}
                        onOpenUserMgmt={() => setIsUserMgmtOpen(true)}
                        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                        allNodesFlat={allNodesFlat}
                        onFocusNode={focusNode}
                    />

                    {/* Canvas Principal do React Flow */}
                    <div className="flex-1 relative w-full h-full">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            nodesDraggable={false}
                            nodesConnectable={false}
                            panOnDrag={!isCanvasLocked}
                            zoomOnScroll={!isCanvasLocked}
                            zoomOnPinch={!isCanvasLocked}
                            panOnScroll={false}
                            fitView
                            minZoom={0.1}
                            maxZoom={2}
                            className="bg-canvas"
                        >
                            <Background color={isDark ? "#1e293b" : "#cbd5e1"} gap={20} size={2} />
                        </ReactFlow>

                        {/* 2. Barra Flutuante de Controles no Canto Inferior Esquerdo */}
                        <CanvasControls 
                            isDark={isDark}
                            onToggleDarkMode={toggleDarkMode}
                            isCanvasLocked={isCanvasLocked}
                            onToggleCanvasLock={() => setIsCanvasLocked(!isCanvasLocked)}
                            onExpandAll={expandAll}
                            onCollapseAll={collapseAll}
                        />

                        {/* 3. Botão Flutuante de Ajuda no Canto Inferior Direito */}
                        <HelpFloatingBtn 
                            onClick={() => setShowHelp(!showHelp)}
                        />

                        {/* 4. Footer Institucional (Copyright) */}
                        <footer className="jhe-footer">
                            © 2026 JHE Engenharia. Todos os direitos reservados.
                        </footer>
                    </div>
                </>
            ) : (
                <TopicEditor 
                    treeData={treeData} 
                    onClose={() => setIsEditMode(false)}
                    onOpenCreateDrawer={handleOpenCreateDrawer}
                    onEditNode={handleEditNode}
                    onRefreshTree={loadData}
                />
            )}
            
            {/* Modais da Aplicação */}
            <HelpTooltip 
                isVisible={showHelp} 
                onClose={() => setShowHelp(false)} 
            />

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />

            <UserManagementModal
                isOpen={isUserMgmtOpen}
                onClose={() => setIsUserMgmtOpen(false)}
                allNodesFlat={allNodesFlat}
            />

            <FirstPasswordModal
                isOpen={Boolean(user && (user.primeiro_acesso === true || user.primeiro_acesso === 1))}
                isFirstAccess={true}
            />

            <FirstPasswordModal
                isOpen={isChangePasswordOpen}
                onClose={() => setIsChangePasswordOpen(false)}
                isFirstAccess={false}
            />

            <TermsModal />


            <NodeDrawerEditor
                isOpen={isDrawerOpen}
                nodeData={drawerNodeData}
                parentNodeForCreate={parentNodeForCreate}
                allNodesFlat={allNodesFlat}
                onClose={() => setIsDrawerOpen(false)}
                onRefreshTree={loadData}
            />

            <NodeDetailsModal 
                nodeData={selectedNode} 
                onClose={() => setSelectedNode(null)} 
                onRefreshTree={loadData}
            />
        </div>
    );
}

export default function OrganogramaView() {
    return (
        <ReactFlowProvider>
            <OrganogramaContent />
        </ReactFlowProvider>
    );
}
