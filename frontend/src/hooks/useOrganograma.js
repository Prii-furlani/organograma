import { useState, useCallback, useEffect, useRef } from 'react';
import { useNodesState, useEdgesState, MarkerType, useReactFlow } from '@xyflow/react';

// Constantes de Layout e Espaçamento
const NODE_WIDTH = 200; // Padronizado conforme CSS para 200px
const NODE_HEIGHT = 160;
const RANK_SEP = 60; // Espaço vertical entre níveis
const INDENT = 40; // Recuo para filhos em lista
const COL_SPACING = 260; // Distância fixa de 260px entre o início de cada bloco

// Coordenadas X imutáveis das 5 Colunas Principais (Em relação ao centro CEO X=0)
const COL_X = {
    20: -520, // Coluna 1: Comercial (Esquerda)
    40: -260, // Coluna 2: Operações (Centro-Esquerda)
    1:  0,    // Coluna 3: Tronco Central (Co-CEOs)
    12: 0,    // Coluna 3: Tronco Central (OIA)
    80: 260,  // Coluna 4: Administrativa (Centro-Direita)
    120: 520  // Coluna 5: TI (Direita)
};

// Mapeamento Estrito das hastes do Staff por Nível Vertical
const STAFF_LEVELS = [
    { left: 2, right: 6 }, // Nível 0: Secretaria (2) e Planejamento (6)
    { left: 3, right: 7 }, // Nível 1: Compliance (3) e SGI (7)
    { left: 5, right: null } // Nível 2: ESG (5) e vazio
];

// Mapeamento das duas sub-colunas exigidas para Operações e Administrativa
const LEFT_IDS_40 = [41, 43, 45, 55, 65]; // Administrativo, Planejamento, Edificação, Habitação, Transporte
const RIGHT_IDS_80 = [81, 82, 86, 90];    // Controladoria e filhos principais à direita

export function useOrganograma(initialTree, onNodeClick) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [collapsedNodes, setCollapsedNodes] = useState(new Set());
    const initialized = useRef(false);
    const { fitView } = useReactFlow();

    const collapseRecursively = useCallback((nodeId, nextSet) => {
        nextSet.add(nodeId);
        const findAndCollapse = (nodesList) => {
            for (let n of nodesList) {
                if (n.id === nodeId) {
                    const cascade = (childNode) => {
                        if (childNode.children && childNode.children.length > 0) {
                            nextSet.add(childNode.id);
                            childNode.children.forEach(cascade);
                        }
                    };
                    if (n.children) n.children.forEach(cascade);
                    return true;
                }
                if (n.children && n.children.length > 0) {
                    if (findAndCollapse(n.children)) return true;
                }
            }
            return false;
        };
        findAndCollapse(initialTree);
    }, [initialTree]);

    const toggleCollapse = useCallback((nodeId) => {
        setCollapsedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                collapseRecursively(nodeId, next);
            }
            return next;
        });
    }, [collapseRecursively]);

    const initializeCollapsedState = useCallback(() => {
        if (!initialTree || initialTree.length === 0 || initialized.current) return;
        const initialCollapsed = new Set();
        
        const traverseToCollapse = (node) => {
            if (node.children && node.children.length > 0) {
                initialCollapsed.add(node.id);
                node.children.forEach(child => traverseToCollapse(child));
            }
        };
        
        initialTree.forEach(rootNode => traverseToCollapse(rootNode));
        setCollapsedNodes(initialCollapsed);
        initialized.current = true;
    }, [initialTree]);

    const buildFlowData = useCallback(() => {
        if (!initialTree || initialTree.length === 0 || !initialized.current) return;

        const newNodes = [];
        const newEdges = [];

        // PASSO 1: Calcular alturas relativas
        const calculateHeight = (node) => {
            const isCollapsed = collapsedNodes.has(node.id);
            const hasChildren = node.children && node.children.length > 0;
            node.subtreeHeight = NODE_HEIGHT;
            
            if (hasChildren && !isCollapsed) {
                if (node.id === 1) {
                    // Tronco Central
                    let oiaNode = node.children.find(c => c.id === 12);
                    
                    // Altura da espinha dorsal é determinada pelos níveis de Staff (3 níveis)
                    let spineHeight = STAFF_LEVELS.length * (NODE_HEIGHT + RANK_SEP);
                    
                    if (oiaNode) {
                        calculateHeight(oiaNode);
                        spineHeight += oiaNode.subtreeHeight + RANK_SEP;
                    }
                    
                    node.children.forEach(c => {
                        if (c.tipo === 'diretoria') calculateHeight(c);
                    });
                    
                    node.spineHeight = spineHeight;
                    node.subtreeHeight = NODE_HEIGHT + RANK_SEP + spineHeight;
                    
                } else if (node.id === 40 || node.id === 80) {
                    let leftHeight = 0;
                    let rightHeight = 0;
                    node.children.forEach((child) => {
                        calculateHeight(child);
                        let isLeft = false;
                        if (node.id === 40) isLeft = LEFT_IDS_40.includes(child.id);
                        if (node.id === 80) isLeft = !RIGHT_IDS_80.includes(child.id);
                        
                        if (isLeft) leftHeight += child.subtreeHeight + RANK_SEP;
                        else rightHeight += child.subtreeHeight + RANK_SEP;
                    });
                    node.subtreeHeight = NODE_HEIGHT + RANK_SEP + Math.max(leftHeight, rightHeight);
                } else {
                    let childrenHeight = 0;
                    node.children.forEach(child => {
                        calculateHeight(child);
                        childrenHeight += child.subtreeHeight + RANK_SEP;
                    });
                    node.subtreeHeight = NODE_HEIGHT + RANK_SEP + childrenHeight;
                }
            }
        };

        // Função universal para arestas estritamente retas sem setas
        const createEdge = (source, target, className = 'edge-theme-default', sourceHandle = null, targetHandle = null) => {
            newEdges.push({
                id: `e${source}-${target}`,
                source: String(source),
                target: String(target),
                sourceHandle,
                targetHandle,
                type: 'step', // 'step' força ângulos retos. Com cantos secos ou curvos (se usar borderRadius, eu aplico zero para ficar clean 90deg)
                animated: false,
                className,
                // Sem markerEnd para remover a ponta da seta
            });
        };

        // PASSO 2: Posicionar com coordenadas absolutas
        const assignPositions = (node, x, y) => {
            const isCollapsed = collapsedNodes.has(node.id);
            const hasChildren = node.children && node.children.length > 0;
            
            let finalX = x;
            if (COL_X[node.id] !== undefined) {
                finalX = COL_X[node.id];
            }
            
            newNodes.push({
                id: String(node.id),
                type: 'mindmap',
                position: { x: finalX, y: y },
                data: { ...node, isCollapsed, hasChildren, onNodeClick, onToggleCollapse: toggleCollapse }
            });

            if (hasChildren && !isCollapsed) {
                if (node.id === 1) {
                    let spineChildren = node.children.filter(c => c.tipo === 'staff' || c.tipo === 'apoio');
                    let oiaNode = node.children.find(c => c.id === 12);
                    let diretorias = node.children.filter(c => c.tipo === 'diretoria');
                    
                    let currentSpineY = y + NODE_HEIGHT + RANK_SEP;
                    let lastJunctionId = String(node.id);
                    let lastJunctionSourceHandle = null; // null usa o default do bottom
                    
                    // Constrói a espinha dorsal nivel por nivel
                    STAFF_LEVELS.forEach((level, i) => {
                        let junctionY = currentSpineY;
                        let junctionId = `spine_junc_${i}`;
                        
                        // Nó invisível na espinha (Center X = finalX + 100, pois width do mindmap é 200)
                        // Como JunctionNode tem width=1, devemos colocá-lo no centro exato do CEO (finalX + 100)
                        newNodes.push({
                            id: junctionId,
                            type: 'junction',
                            position: { x: finalX + (NODE_WIDTH / 2), y: junctionY + (NODE_HEIGHT / 2) },
                            data: { isCollapsed: false, hasChildren: false }
                        });
                        
                        // Linha vertical descendo o tronco
                        createEdge(lastJunctionId, junctionId, 'edge-theme-ceo', lastJunctionSourceHandle, 'top');
                        
                        // Galho esquerdo
                        if (level.left) {
                            let child = spineChildren.find(c => c.id === level.left);
                            if (child) {
                                let childX = finalX - NODE_WIDTH - 60; // 60px de distância do tronco
                                assignPositions(child, childX, junctionY);
                                // Linha horizontal saindo do Junction (Left) para o Child (Right)
                                createEdge(junctionId, child.id, `edge-theme-${child.tipo}`, 'left', 'right-target');
                            }
                        }
                        
                        // Galho direito
                        if (level.right) {
                            let child = spineChildren.find(c => c.id === level.right);
                            if (child) {
                                let childX = finalX + NODE_WIDTH + 60;
                                assignPositions(child, childX, junctionY);
                                // Linha horizontal saindo do Junction (Right) para o Child (Left)
                                createEdge(junctionId, child.id, `edge-theme-${child.tipo}`, 'right', 'left-target');
                            }
                        }
                        
                        currentSpineY += NODE_HEIGHT + RANK_SEP;
                        lastJunctionId = junctionId;
                        lastJunctionSourceHandle = 'bottom';
                    });
                    
                    // Barramento de Distribuição das Diretorias
                    let routerY = currentSpineY; // Altura livre abaixo do Staff
                    let routerJunctionId = 'bus_router';
                    
                    newNodes.push({
                        id: routerJunctionId,
                        type: 'junction',
                        position: { x: finalX + (NODE_WIDTH / 2), y: routerY },
                        data: { isCollapsed: false, hasChildren: false }
                    });
                    
                    // Fecha a última perna vertical da espinha até o barramento
                    createEdge(lastJunctionId, routerJunctionId, 'edge-theme-ceo', lastJunctionSourceHandle, 'top');

                    // As diretorias ficam 50px abaixo do barramento
                    let diretoriasY = routerY + 50;

                    diretorias.forEach(dir => {
                        let dirX = COL_X[dir.id];
                        let dirJuncId = `bus_junc_${dir.id}`;
                        
                        newNodes.push({
                            id: dirJuncId,
                            type: 'junction',
                            position: { x: dirX + (NODE_WIDTH / 2), y: routerY },
                            data: { isCollapsed: false, hasChildren: false }
                        });
                        
                        // Haste horizontal no barramento principal
                        createEdge(routerJunctionId, dirJuncId, 'edge-theme-ceo', dirX < 0 ? 'left' : 'right', dirX < 0 ? 'right-target' : 'left-target');
                        
                        // Queda vertical limpa de 50px
                        createEdge(dirJuncId, dir.id, `edge-theme-${dir.tipo}`, 'bottom', null); // null usa o default do top
                        
                        assignPositions(dir, dirX, diretoriasY);
                    });
                    
                    // A OIA desce direto do centro do barramento
                    if (oiaNode) {
                        createEdge(routerJunctionId, oiaNode.id, `edge-theme-${oiaNode.tipo}`, 'bottom', null);
                        assignPositions(oiaNode, finalX, diretoriasY);
                    }
                    
                } else if (node.id === 40 || node.id === 80) {
                    let leftY = y + NODE_HEIGHT + RANK_SEP;
                    let rightY = y + NODE_HEIGHT + RANK_SEP;
                    
                    node.children.forEach(child => {
                        let isLeft = false;
                        if (node.id === 40) isLeft = LEFT_IDS_40.includes(child.id);
                        if (node.id === 80) isLeft = !RIGHT_IDS_80.includes(child.id);
                        
                        let childX = isLeft ? finalX - (NODE_WIDTH / 2 + 10) : finalX + (NODE_WIDTH / 2 + 10);
                        createEdge(node.id, child.id, `edge-theme-${child.tipo}`, null, null);
                        
                        if (isLeft) {
                            assignPositions(child, childX, leftY);
                            leftY += child.subtreeHeight + RANK_SEP;
                        } else {
                            assignPositions(child, childX, rightY);
                            rightY += child.subtreeHeight + RANK_SEP;
                        }
                    });
                } else {
                    let currentChildY = y + NODE_HEIGHT + RANK_SEP;
                    node.children.forEach(child => {
                        createEdge(node.id, child.id, `edge-theme-${child.tipo}`, null, null);
                        assignPositions(child, finalX + INDENT, currentChildY);
                        currentChildY += child.subtreeHeight + RANK_SEP;
                    });
                }
            }
        };

        initialTree.forEach(root => {
            calculateHeight(root);
            assignPositions(root, COL_X[1], 0);
        });
        
        setNodes(newNodes);
        setEdges(newEdges);
        
        setTimeout(() => { fitView({ duration: 800 }); }, 100);

    }, [initialTree, collapsedNodes, toggleCollapse, onNodeClick, setNodes, setEdges, fitView]);

    useEffect(() => {
        initializeCollapsedState();
    }, [initializeCollapsedState]);

    useEffect(() => {
        if (initialized.current) {
            buildFlowData();
        }
    }, [buildFlowData]);

    return {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange
    };
}
