/**
 * Cabeçalho Arquitetural: Hook customizado para gerenciar a lógica de layout do Organograma.
 * Este layout implementa 5 COLUNAS ESTRUTURAIS FIXAS para as Diretorias,
 * e um roteamento avançado (Spine / Fishbone) para os staffs do Co-CEOs.
 */

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
    20: - (COL_SPACING * 2), // Coluna 1: Comercial (Esquerda)
    40: - COL_SPACING,       // Coluna 2: Operações (Centro-Esquerda)
    1:  0,                   // Coluna 3: Tronco Central (Co-CEOs, Staff, OIA)
    12: 0,                   // Coluna 3: Tronco Central (OIA)
    80: COL_SPACING,         // Coluna 4: Administrativa (Centro-Direita)
    120: (COL_SPACING * 2)   // Coluna 5: TI (Direita)
};

// Mapeamento Estrito das hastes do Staff (IDs das áreas de apoio do CEO)
const STAFF_LEFT_IDS = [2, 3, 5]; // Secretaria Executiva, Compliance, ESG
const STAFF_RIGHT_IDS = [6, 7];   // Planejamento Estratégico, SGI

// Mapeamento das duas sub-colunas exigidas para Operações e Administrativa
const LEFT_IDS_40 = [41, 43, 45, 55, 65]; // Administrativo, Planejamento, Edificação, Habitação, Transporte
const RIGHT_IDS_80 = [81, 82, 86, 90];    // Controladoria e filhos principais à direita

export function useOrganograma(initialTree, onNodeClick) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [collapsedNodes, setCollapsedNodes] = useState(new Set());
    const initialized = useRef(false);
    const { fitView } = useReactFlow();

    // Função auxiliar para ocultar (adicionar ao collapsedSet) um nó e TODOS os seus descendentes (Cascata)
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
                // Ao expandir um nó pai (+), apenas tiramos o pai do set de recolhidos.
                // Como os filhos diretos (e netos) já estavam em "collapsedNodes" durante a inicialização
                // ou ao fechar, eles continuarão fechados (netos) enquanto o filho direto aparecerá.
                next.delete(nodeId);
            } else {
                // Ao fechar um nó pai (-), oculte em cascata todos os seus descendentes.
                collapseRecursively(nodeId, next);
            }
            return next;
        });
    }, [collapseRecursively]);

    const initializeCollapsedState = useCallback(() => {
        if (!initialTree || initialTree.length === 0 || initialized.current) return;
        const initialCollapsed = new Set();
        
        const traverseToCollapse = (node) => {
            // Todos os nós que possuem filhos devem iniciar FECHADOS (Oculta todo mundo inicialmente)
            if (node.children && node.children.length > 0) {
                initialCollapsed.add(node.id);
                node.children.forEach(child => traverseToCollapse(child));
            }
        };
        
        initialTree.forEach(rootNode => traverseToCollapse(rootNode));
        setCollapsedNodes(initialCollapsed);
        initialized.current = true;
    }, [initialTree]);

    /**
     * Motor Arquitetural Híbrido - 5 Colunas Fixas
     */
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
                    // Tronco Central (CEO -> Staff -> Diretorias + OIA)
                    let spineChildren = node.children.filter(c => c.tipo === 'staff' || c.tipo === 'apoio');
                    let oiaNode = node.children.find(c => c.id === 12);
                    
                    let leftSpineHeight = 0;
                    let rightSpineHeight = 0;
                    
                    spineChildren.forEach((child) => {
                        calculateHeight(child);
                        if (STAFF_LEFT_IDS.includes(child.id)) {
                            leftSpineHeight += child.subtreeHeight + RANK_SEP;
                        } else {
                            rightSpineHeight += child.subtreeHeight + RANK_SEP;
                        }
                    });
                    
                    let spineHeight = Math.max(leftSpineHeight, rightSpineHeight);
                    
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
                    // Operações e Adm: 2 sub-colunas internas
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
                    // Empilhamento vertical simples (1 coluna)
                    let childrenHeight = 0;
                    node.children.forEach(child => {
                        calculateHeight(child);
                        childrenHeight += child.subtreeHeight + RANK_SEP;
                    });
                    node.subtreeHeight = NODE_HEIGHT + RANK_SEP + childrenHeight;
                }
            }
        };

        const createEdge = (source, target, className = 'edge-theme-default') => {
            newEdges.push({
                id: `e${source}-${target}`,
                source: String(source),
                target: String(target),
                type: 'smoothstep',
                animated: false,
                className,
                borderRadius: 10,
                // Sem markerEnd para remover a ponta da seta
            });
        };

        // PASSO 2: Posicionar com coordenadas absolutas e rígidas
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
                    // Tronco Central
                    let spineChildren = node.children.filter(c => c.tipo === 'staff' || c.tipo === 'apoio');
                    let oiaNode = node.children.find(c => c.id === 12);
                    let diretorias = node.children.filter(c => c.tipo === 'diretoria');
                    
                    let currentLeftY = y + NODE_HEIGHT + RANK_SEP;
                    let currentRightY = y + NODE_HEIGHT + RANK_SEP;
                    
                    // Posiciona o Staff em zigue-zague ou lado a lado
                    spineChildren.forEach((child) => {
                        let isLeft = STAFF_LEFT_IDS.includes(child.id);
                        let childX = isLeft ? finalX - NODE_WIDTH - 20 : finalX + NODE_WIDTH + 20;
                        
                        createEdge(node.id, child.id, `edge-theme-${child.tipo}`);
                        
                        if (isLeft) {
                            assignPositions(child, childX, currentLeftY);
                            currentLeftY += child.subtreeHeight + RANK_SEP;
                        } else {
                            assignPositions(child, childX, currentRightY);
                            currentRightY += child.subtreeHeight + RANK_SEP;
                        }
                    });
                    
                    // Calcula o final da coluna do Staff para empurrar as Diretorias para baixo
                    let baseSpineY = Math.max(currentLeftY, currentRightY);
                    
                    // As diretorias ficam uniformemente distribuídas no eixo X, todas na mesma coordenada Y
                    let diretoriasY = baseSpineY + 60; // Espaço vertical livre

                    diretorias.forEach(dir => {
                        // Conexão direta CEO -> Diretoria
                        createEdge(node.id, dir.id, `edge-theme-${dir.tipo}`);
                        assignPositions(dir, 0, diretoriasY); // X sobrescrito por COL_X no topo
                    });
                    
                    // OIA
                    if (oiaNode) {
                        createEdge(node.id, oiaNode.id, `edge-theme-${oiaNode.tipo}`);
                        assignPositions(oiaNode, finalX, diretoriasY);
                    }
                    
                } else if (node.id === 40 || node.id === 80) {
                    // Subdivide a coluna da Diretoria em 2 sub-colunas
                    let leftY = y + NODE_HEIGHT + RANK_SEP;
                    let rightY = y + NODE_HEIGHT + RANK_SEP;
                    
                    node.children.forEach(child => {
                        let isLeft = false;
                        if (node.id === 40) isLeft = LEFT_IDS_40.includes(child.id);
                        if (node.id === 80) isLeft = !RIGHT_IDS_80.includes(child.id);
                        
                        let childX = isLeft ? finalX - (NODE_WIDTH / 2 + 10) : finalX + (NODE_WIDTH / 2 + 10);
                        createEdge(node.id, child.id, `edge-theme-${child.tipo}`);
                        
                        if (isLeft) {
                            assignPositions(child, childX, leftY);
                            leftY += child.subtreeHeight + RANK_SEP;
                        } else {
                            assignPositions(child, childX, rightY);
                            rightY += child.subtreeHeight + RANK_SEP;
                        }
                    });
                } else {
                    // Coluna Vertical padrão indentada
                    let currentChildY = y + NODE_HEIGHT + RANK_SEP;
                    node.children.forEach(child => {
                        createEdge(node.id, child.id, `edge-theme-${child.tipo}`);
                        assignPositions(child, finalX + INDENT, currentChildY);
                        currentChildY += child.subtreeHeight + RANK_SEP;
                    });
                }
            }
        };
                    
                } else if (node.id === 40 || node.id === 80) {
                    // Subdivide a coluna da Diretoria em 2 sub-colunas de expansão
                    let leftY = y + NODE_HEIGHT + RANK_SEP;
                    let rightY = y + NODE_HEIGHT + RANK_SEP;
                    
                    node.children.forEach(child => {
                        let isLeft = false;
                        if (node.id === 40) isLeft = LEFT_IDS_40.includes(child.id);
                        if (node.id === 80) isLeft = !RIGHT_IDS_80.includes(child.id);
                        
                        let childX = isLeft ? finalX - (NODE_WIDTH / 2 + 10) : finalX + (NODE_WIDTH / 2 + 10);
                        createEdge(node.id, child.id, `edge-theme-${child.tipo}`);
                        
                        if (isLeft) {
                            assignPositions(child, childX, leftY);
                            leftY += child.subtreeHeight + RANK_SEP;
                        } else {
                            assignPositions(child, childX, rightY);
                            rightY += child.subtreeHeight + RANK_SEP;
                        }
                    });
                } else {
                    // Coluna Vertical padrão indentada para ramificações internas (ex: dentro das gerências)
                    let currentChildY = y + NODE_HEIGHT + RANK_SEP;
                    node.children.forEach(child => {
                        createEdge(node.id, child.id, `edge-theme-${child.tipo}`);
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

    // Primeiro step: Inicializar estado collapsed
    useEffect(() => {
        initializeCollapsedState();
    }, [initializeCollapsedState]);

    // Segundo step: Calcular Layout sempre que a árvore mudar
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
