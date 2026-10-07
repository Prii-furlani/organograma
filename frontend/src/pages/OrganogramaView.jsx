/**
 * Cabeçalho Arquitetural: Tela Principal do Sistema (Visualização e Gerenciamento do Organograma).
 * Integra React Flow, Toolbar, Modal de Login, Modal de Detalhes e RBAC.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { ReactFlow, Background, Controls, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import MindMapNode from '../components/MindMapNode';
import Toolbar from '../components/Toolbar';
import HelpTooltip from '../components/HelpTooltip';
import NodeDetailsModal from '../components/NodeDetailsModal';
import LoginModal from '../components/LoginModal';
import { useOrganograma } from '../hooks/useOrganograma';
import { useDarkMode } from '../hooks/useDarkMode';
import { fetchOrganogramaTree } from '../api/organogramaApi';
import { Loader2 } from 'lucide-react';
import { Handle, Position } from '@xyflow/react';

// Nó auxiliar invisível para roteamento ortogonal (Espinha Dorsal e Barramento)
const JunctionNode = ({ id }) => (
    <div style={{ width: 1, height: 1, pointerEvents: 'none' }}>
        <Handle type="target" position={Position.Top} id="top" style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Left} id="left" style={{ opacity: 0 }} />
        <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
        <Handle type="target" position={Position.Right} id="right-target" style={{ opacity: 0 }} />
    </div>
);

const nodeTypes = {
    mindmap: MindMapNode,
    junction: JunctionNode
};

function OrganogramaContent() {
    const [treeData, setTreeData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [selectedNode, setSelectedNode] = useState(null);
    const [showHelp, setShowHelp] = useState(true);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    
    const { fitView } = useReactFlow();
    const { isDark, toggleDarkMode } = useDarkMode();

    const loadData = useCallback(async () => {
        try {
            const data = await fetchOrganogramaTree();
            setTreeData(data);
        } catch (err) {
            console.error("Erro ao carregar mapa:", err);
            setError("Não foi possível carregar o organograma. Verifique o servidor.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Busca os dados da API ao montar o componente
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Lógica para clique no nó e abertura do modal
    const handleNodeClick = useCallback((nodeData) => {
        setSelectedNode(nodeData);
    }, []);

    // Hook customizado que gerencia o estado dos nós visuais
    const { nodes, edges, onNodesChange, onEdgesChange } = useOrganograma(treeData, handleNodeClick);

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
        <div className="w-screen h-screen bg-canvas relative overflow-hidden">
            <Toolbar 
                onToggleHelp={() => setShowHelp(!showHelp)} 
                isDark={isDark}
                onToggleDarkMode={toggleDarkMode}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
            />
            
            <HelpTooltip 
                isVisible={showHelp} 
                onClose={() => setShowHelp(false)} 
            />

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                fitView
                minZoom={0.1}
                maxZoom={2}
                className="bg-canvas"
            >
                <Background color={isDark ? "#1e293b" : "#cbd5e1"} gap={20} size={2} />
                <Controls className="hidden md:flex" />
            </ReactFlow>

            {/* Modal Lateral de Detalhes e Gerenciamento */}
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
