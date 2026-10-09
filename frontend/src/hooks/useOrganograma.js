/**
 * Cabeçalho Arquitetural: Hook customizado responsável por gerenciar a árvore do organograma.
 * Implementa o modelo oficial JHE Engenharia (Nível Executivo Corporativo):
 * 1. Controle de Viewport UX: Preserva zoom do usuário e realiza pan suave local no toggle de nós.
 * 2. Erradicação total de linhas diagonais (100% ortogonais a 90° e retas a 180°).
 * 3. Padrão "Espinha Central Bipolar" para a Diretoria de Operações (40).
 * 4. Haste Lateral Esquerda Mestra para TI (120) com Paternidade Direta em smoothstep.
 * 5. Recuo hierárquico em degrau (80px) para sub-níveis.
 * 6. Gap vertical padronizado em 32px para respiração visual e legibilidade.
 * 7. Arestas 100% alinhadas sem desnível vertical em azul institucional (#194775 / #61CBE8).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNodesState, useEdgesState, useReactFlow } from '@xyflow/react';
import { getLayoutedElements } from '../utils/organogramaLayout';

// Constantes de Layout e Espaçamento Executivo (Dagre / Grid Organograma)
const NODE_WIDTH = 360;               // Largura padronizada do card (260px)
const CARD_BASE_HEIGHT = 298;          // Altura mínima padronizada do card sem pílula (88px)
const PILL_HEIGHT_EXT = 120;           // Extensão inferior da pílula de contagem (px)
const EFFECTIVE_NODE_HEIGHT = 318;    // Altura efetiva total do card com pílula (88 + 16 = 104px)
const EFFECTIVE_CEO_HEIGHT = 256;     // Altura efetiva do Co-CEOs com pílula (120 + 16 = 136px)
const VERTICAL_GAP = 520;              // Espaçamento vertical entre níveis (ranksep: 80px)
const STEP_Y = EFFECTIVE_NODE_HEIGHT + VERTICAL_GAP; // 184px (passo vertical padrão de topo a topo)
const MIN_GAP = 60;                   // Espaçamento horizontal uniforme entre áreas irmãs (nodesep: 60px)
const OFFSET_COL = 280;               // Offset horizontal para colunas bipolares e contratos (280px)

// Aliases globais para compatibilidade interna do layout engine
const NODE_HEIGHT = EFFECTIVE_NODE_HEIGHT;
const RANK_SEP = VERTICAL_GAP;

const getNodeWidth = (node) => {
    if (!node) return NODE_WIDTH;
    if (String(node.id) === '1' || node.parent_id === null || node.parent_id === undefined) return 290;
    return NODE_WIDTH;
};

const getNodeHeight = (node) => {
    if (!node) return EFFECTIVE_NODE_HEIGHT;
    if (String(node.id) === '1' || node.parent_id === null || node.parent_id === undefined) return EFFECTIVE_CEO_HEIGHT;
    return EFFECTIVE_NODE_HEIGHT;
};

// Mapeamento das hastes do Staff por Nível Vertical (tronco central)
const STAFF_LEVELS = [
    { left: 2, right: 6 },   // Nível 0: Secretaria (2) [esq] e Planejamento (6) [dir]
    { left: 3, right: 7 },   // Nível 1: Compliance (3) [esq] e SGI (7) [dir]
    { left: 5, right: null }  // Nível 2: ESG (5) [esq]
];

// Mapeamento estrito em 5 Níveis Bipolares da Diretoria de Operações (40)
const OPS_LEVELS = [
    { left: 41, right: 42 }, // Level 0: Adm Operacional [esq] | Metodologia Técnico-Social [dir]
    { left: 43, right: 50 }, // Level 1: Planejamento e Controle (+Apoio 44) [esq] | Unid. Educação [dir]
    { left: 45, right: 60 }, // Level 2: Unid. Edificação [esq] | Unid. Saneamento [dir]
    { left: 55, right: 70 }, // Level 3: Unid. Habitação [esq] | Unid. DIA [dir]
    { left: 65, right: null }// Level 4: Unid. Transporte [esq] | vazio [dir]
];

// Mapeamento em 4 Níveis Bipolares da Diretoria Administrativa (80)
const ADMIN_LEVELS = [
    { leftId: 93, rightId: 81 }, // Level 0: Financeiro (93) [esq] | Controladoria (81) [dir]
    { leftId: 97, rightId: 82 }, // Level 1: Recursos Humanos (97) [esq] | Contabilidade (82) [dir]
    { leftId: 106, rightId: 85 }, // Level 2: Jurídico (106) [esq] | Administrativo (85) [dir]
    { leftId: 108, rightId: null } // Level 3: Manutenção (108) [esq] | Vazio [dir]
];

// IDs de sub-coluna para a Diretoria Administrativa (80)
const RIGHT_IDS_80 = [81, 82, 85, 86, 90]; // Controladoria e filhos principais à direita

import { useAuth } from '../context/AuthContext';

// IDs das Unidades de Negócio em Operações
const UNIDADES_OPERACAOE_IDS = [45, 50, 55, 60, 65, 70];

// IDs das Gerências da Diretoria de Tecnologia e Inovação (120)
const GERENCIASI_TI_IDS = [121, 123, 125, 128];

export function useOrganograma(initialTree, onNodeClick, isEditMode = false, onEditNode = null, allNodesFlat = []) {
    const { hasPermissionToEdit } = useAuth();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [collapsedNodes, setCollapsedNodes] = useState(new Set());
    const [highlightedNodeId, setHighlightedNodeId] = useState(null);
    const initialized = useRef(false);

    // Controle de UX e Câmera/Viewport
    const hasDoneInitialFitView = useRef(false);
    const lastToggledNodeId = useRef(null);

    const { fitView, setCenter, getViewport, getNodes } = useReactFlow();


    // Função para recolher recursivamente os subordinados
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

    // Alterna o estado de expansão/recolhimento de um nó (registrando o nó para pan suave)
    const toggleCollapse = useCallback((nodeId) => {
        lastToggledNodeId.current = nodeId;
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

    // Inicializa o estado com todos os nós com filhos colapsados por padrão (incluindo Nível 0 Co-CEOs)
    const initializeCollapsedState = useCallback(() => {
        if (!initialTree || initialTree.length === 0 || initialized.current) return;
        const initialCollapsed = new Set();

        const collapseAllFromLevel0 = (node, level = 0) => {
            if (node.children && node.children.length > 0) {
                // Todos os nós que possuem filhos (incluindo Nível 0: Co-CEOs) iniciam colapsados (isCollapsed = true)
                if (level >= 0) {
                    initialCollapsed.add(node.id);
                }
                node.children.forEach(child => collapseAllFromLevel0(child, level + 1));
            }
        };

        initialTree.forEach(rootNode => collapseAllFromLevel0(rootNode, 0));
        setCollapsedNodes(initialCollapsed);
        initialized.current = true;
    }, [initialTree]);

    // =========================================================================
    // MEDIÇÃO DE SUB-ÁRVORE (Subtree Bounding Box)
    // =========================================================================
    const measureSubtree = useCallback((node, currentCollapsed) => {
        if (!node) return { subtreeHeight: NODE_HEIGHT, leftMargin: NODE_WIDTH / 2, rightMargin: NODE_WIDTH / 2 };

        const isCollapsed = currentCollapsed.has(node.id);
        const visibleChildren = (!isCollapsed && node.children && node.children.length > 0) ? node.children : [];

        if (visibleChildren.length === 0) {
            return {
                subtreeHeight: NODE_HEIGHT,
                leftMargin: NODE_WIDTH / 2,   // 100px
                rightMargin: NODE_WIDTH / 2   // 100px
            };
        }

        // Caso Especial: Diretoria de Operações (40) - Bipolar Spine
        if (node.id === 40) {
            let totalH = NODE_HEIGHT;
            let maxL = NODE_WIDTH / 2;
            let maxR = NODE_WIDTH / 2;

            const allChildren = node.children || [];

            OPS_LEVELS.forEach(lvl => {
                const leftNode = lvl.left ? allChildren.find(c => c.id === lvl.left) : null;
                const rightNode = lvl.right ? allChildren.find(c => c.id === lvl.right) : null;

                const mLeft = leftNode ? measureSubtree(leftNode, currentCollapsed) : { subtreeHeight: 0, leftMargin: 0, rightMargin: 0 };
                const mRight = rightNode ? measureSubtree(rightNode, currentCollapsed) : { subtreeHeight: 0, leftMargin: 0, rightMargin: 0 };

                if (leftNode) {
                    const leftExt = OFFSET_COL + mLeft.leftMargin; // 260px offset à esquerda + margem esquerda
                    if (leftExt > maxL) maxL = leftExt;
                }
                if (rightNode) {
                    const rightExt = OFFSET_COL + mRight.rightMargin; // 260px offset à direita + margem direita
                    if (rightExt > maxR) maxR = rightExt;
                }

                const levelH = Math.max(mLeft.subtreeHeight, mRight.subtreeHeight);
                totalH += RANK_SEP + levelH;
            });

            return { subtreeHeight: totalH, leftMargin: maxL, rightMargin: maxR };
        }

        // Caso Especial: Diretoria de Tecnologia e Inovação (120)
        if (node.id === 120) {
            let totalH = NODE_HEIGHT + 25;
            let maxR = NODE_WIDTH / 2;

            visibleChildren.forEach(gerencia => {
                const mG = measureSubtree(gerencia, currentCollapsed);
                totalH += RANK_SEP + mG.subtreeHeight;
                // Gerência posicionada na coluna +80px (card de x+80 a x+280)
                const rExt = 80 + mG.rightMargin;
                if (rExt > maxR) maxR = rExt;
            });

            return { subtreeHeight: totalH, leftMargin: NODE_WIDTH / 2, rightMargin: maxR };
        }

        // Caso Especial: Gerências de TI (121 BI e Dados, 123 Desenvol. Sistemas, 125 Gov TI, 128 Inovação)
        if (GERENCIASI_TI_IDS.includes(node.id)) {
            let totalH = NODE_HEIGHT;
            let maxR = NODE_WIDTH / 2;

            visibleChildren.forEach(child => {
                const mC = measureSubtree(child, currentCollapsed);
                totalH += RANK_SEP + mC.subtreeHeight;
                // Sub-cards subordinados posicionados com recuo hierárquico de 80px à direita da gerência (ou seja, +160px da TI)
                const rExt = 80 + mC.rightMargin;
                if (rExt > maxR) maxR = rExt;
            });

            return { subtreeHeight: totalH, leftMargin: NODE_WIDTH / 2, rightMargin: maxR };
        }

        // Caso Especial: Unidades de Negócio em Operações (45, 50, 55, 60, 65)
        if (UNIDADES_OPERACAOE_IDS.includes(node.id)) {
            const isRightCol = [50, 60, 70].includes(node.id);
            let maxExt = NODE_WIDTH / 2;
            let maxH = NODE_HEIGHT;

            visibleChildren.forEach(child => {
                const m = measureSubtree(child, currentCollapsed);
                const ext = OFFSET_COL + (isRightCol ? m.rightMargin : m.leftMargin);
                if (ext > maxExt) maxExt = ext;
                if (m.subtreeHeight > maxH) maxH = m.subtreeHeight;
            });

            if (isRightCol) {
                return { subtreeHeight: maxH, leftMargin: NODE_WIDTH / 2, rightMargin: maxExt };
            } else {
                return { subtreeHeight: maxH, leftMargin: maxExt, rightMargin: NODE_WIDTH / 2 };
            }
        }

        // Caso Especial: Contrato N (46, 51, 56, 61, 66)
        if ([46, 51, 56, 61, 66].includes(node.id)) {
            let totalH = NODE_HEIGHT;
            let maxR = NODE_WIDTH / 2;

            visibleChildren.forEach(child => {
                const m = measureSubtree(child, currentCollapsed);
                totalH += RANK_SEP + m.subtreeHeight;
                const rExt = 60 + m.rightMargin; // Subordinados empilhados 60px à direita da haste
                if (rExt > maxR) maxR = rExt;
            });

            return { subtreeHeight: totalH, leftMargin: NODE_WIDTH / 2, rightMargin: maxR };
        }

        // Caso Especial: Planejamento e Controle (43) com Apoio (44) à sua esquerda
        if (node.id === 43) {
            let totalH = NODE_HEIGHT;
            let maxL = NODE_WIDTH / 2;
            let maxR = NODE_WIDTH / 2;

            visibleChildren.forEach(child => {
                const m = measureSubtree(child, currentCollapsed);
                totalH = Math.max(totalH, m.subtreeHeight);
                const lExt = OFFSET_COL + m.leftMargin;
                if (lExt > maxL) maxL = lExt;
            });

            return { subtreeHeight: totalH, leftMargin: maxL, rightMargin: maxR };
        }

        // Caso Especial: Recursos Humanos (97) - Bifurcação Horizontal (Adm. Pessoal 102 [esq] | DHO 98 [dir])
        if (node.id === 97) {
            const isCollapsed = currentCollapsed.has(97);
            if (isCollapsed || !node.children || node.children.length === 0) {
                return { subtreeHeight: NODE_HEIGHT, leftMargin: NODE_WIDTH / 2, rightMargin: NODE_WIDTH / 2 };
            }

            const admPessoal = node.children.find(c => c.id === 102);
            const dho = node.children.find(c => c.id === 98);

            const mAdm = admPessoal ? measureSubtree(admPessoal, currentCollapsed) : { subtreeHeight: 0, leftMargin: 0, rightMargin: 0 };
            const mDho = dho ? measureSubtree(dho, currentCollapsed) : { subtreeHeight: 0, leftMargin: 0, rightMargin: 0 };

            const totalH = NODE_HEIGHT + RANK_SEP + Math.max(mAdm.subtreeHeight, mDho.subtreeHeight);
            const maxL = 160 + mAdm.leftMargin;
            const maxR = 160 + mDho.rightMargin;

            return { subtreeHeight: totalH, leftMargin: maxL, rightMargin: maxR };
        }

        // Caso Especial: Diretoria Administrativa (80) - Espinha Central Bipolar (4 Níveis)
        if (node.id === 80) {
            let totalH = NODE_HEIGHT;
            let maxL = NODE_WIDTH / 2;
            let maxR = NODE_WIDTH / 2;

            const findNodeInSubtree = (rootNode, targetId) => {
                if (!rootNode) return null;
                if (rootNode.id === targetId) return rootNode;
                if (rootNode.children) {
                    for (let c of rootNode.children) {
                        const found = findNodeInSubtree(c, targetId);
                        if (found) return found;
                    }
                }
                return null;
            };

            ADMIN_LEVELS.forEach(lvl => {
                const leftNode = lvl.leftId ? findNodeInSubtree(node, lvl.leftId) : null;
                const rightNode = lvl.rightId ? findNodeInSubtree(node, lvl.rightId) : null;

                const mLeft = leftNode ? measureSubtree(leftNode, currentCollapsed) : { subtreeHeight: 0, leftMargin: 0, rightMargin: 0 };
                const mRight = rightNode ? measureSubtree(rightNode, currentCollapsed) : { subtreeHeight: 0, leftMargin: 0, rightMargin: 0 };

                if (leftNode) {
                    const leftExt = OFFSET_COL + mLeft.leftMargin;
                    if (leftExt > maxL) maxL = leftExt;
                }
                if (rightNode) {
                    const rightExt = OFFSET_COL + mRight.rightMargin;
                    if (rightExt > maxR) maxR = rightExt;
                }

                const levelH = Math.max(mLeft.subtreeHeight, mRight.subtreeHeight, NODE_HEIGHT);
                totalH += RANK_SEP + levelH;
            });

            return { subtreeHeight: totalH, leftMargin: maxL, rightMargin: maxR };
        }

        // Padrão Geral: Coluna Vertical Única
        let totalH = NODE_HEIGHT;
        let maxL = NODE_WIDTH / 2;
        let maxR = NODE_WIDTH / 2;

        visibleChildren.forEach(child => {
            const m = measureSubtree(child, currentCollapsed);
            totalH += RANK_SEP + m.subtreeHeight;
            if (m.leftMargin > maxL) maxL = m.leftMargin;
            if (m.rightMargin > maxR) maxR = m.rightMargin;
        });

        return { subtreeHeight: totalH, leftMargin: maxL, rightMargin: maxR };
    }, []);

    // =========================================================================
    // CONSTRUÇÃO DO FLUXO DO REACT FLOW
    // =========================================================================
    // =========================================================================
    // CONSTRUÇÃO RECURSIVA E PURA DO FLUXO DO REACT FLOW (SEM DUMMY NODES)
    // =========================================================================
    const buildFlowData = useCallback(() => {
        if (!initialTree || initialTree.length === 0 || !initialized.current) return;

        const visibleNodes = [];

        const traverse = (nodeList) => {
            if (!nodeList || !Array.isArray(nodeList)) return;

            nodeList.forEach((nodeData) => {
                const strId = String(nodeData.id);
                const parentId = nodeData.parent_id;
                const isCollapsed = collapsedNodes.has(nodeData.id);
                const hasChildren = Boolean(nodeData.children && nodeData.children.length > 0);
                const childrenCount = hasChildren ? nodeData.children.length : 0;
                const canEdit = hasPermissionToEdit ? hasPermissionToEdit(nodeData.id) : false;
                const isHighlighted = highlightedNodeId !== null && String(nodeData.id) === String(highlightedNodeId);

                // TRAVA OBRIGATÓRIA: Apenas o nó Raiz (id === 1 ou parent_id === null/undefined) é identificado como Co-CEOs
                const isRootCeo = strId === '1' || parentId === null || parentId === undefined;

                visibleNodes.push({
                    id: strId,
                    type: 'mindmap',
                    parent_id: parentId,
                    data: {
                        ...nodeData,
                        parent_id: parentId,
                        isRootCeo,
                        isCollapsed,
                        hasChildren,
                        childrenCount,
                        isEditMode,
                        canEdit,
                        isHighlighted,
                        onNodeClick,
                        onEditNode,
                        onToggleCollapse: toggleCollapse
                    }
                });

                if (!isCollapsed && hasChildren) {
                    traverse(nodeData.children);
                }
            });
        };

        traverse(initialTree);

        const edgesToLayout = visibleNodes
            .filter((n) => n.parent_id !== null && n.parent_id !== undefined && n.parent_id !== '')
            .map((n) => ({
                id: `e-${String(n.parent_id)}-${String(n.id)}`,
                source: String(n.parent_id),
                target: String(n.id),
                type: 'smoothstep',
                className: 'jhe-organograma-edge',
                animated: false,
                style: { stroke: '#94A3B8', strokeWidth: 1.5 },
            }));

        const layouted = getLayoutedElements(visibleNodes, edgesToLayout);

        setNodes(layouted.nodes);
        setEdges(layouted.edges);

        // CONTROLE DE VIEWPORT E CÂMERA (UX MELHORADA COM ANIMATION FRAME)
        window.requestAnimationFrame(() => {
            if (!hasDoneInitialFitView.current) {
                fitView({ padding: 0.15, duration: 300 });
                hasDoneInitialFitView.current = true;
            } else if (lastToggledNodeId.current) {
                const toggledId = String(lastToggledNodeId.current);
                const targetNode = layouted.nodes.find(n => String(n.id) === toggledId);
                if (targetNode) {
                    const currentZoom = getViewport().zoom;
                    const w = targetNode.data?.isRootCeo ? 380 : 260;
                    const h = targetNode.data?.isRootCeo ? 170 : 92;
                    const nodeCenterX = targetNode.position.x + (w / 2);
                    const nodeCenterY = targetNode.position.y + (h / 2);
                    setCenter(nodeCenterX, nodeCenterY, { duration: 400, zoom: currentZoom });
                }
                lastToggledNodeId.current = null;
            }
        });

    }, [initialTree, collapsedNodes, highlightedNodeId, toggleCollapse, onNodeClick, onEditNode, isEditMode, hasPermissionToEdit, setNodes, setEdges, fitView, setCenter, getViewport]);

    useEffect(() => {
        initializeCollapsedState();
    }, [initializeCollapsedState]);

    useEffect(() => {
        if (initialized.current) {
            buildFlowData();
        }
    }, [buildFlowData]);

    // Expandir toda a estrutura do organograma
    const expandAll = useCallback(() => {
        setCollapsedNodes(new Set());
        window.requestAnimationFrame(() => {
            fitView({ padding: 0.15, duration: 300 });
        });
    }, [fitView]);

    // Recolher toda a estrutura (mantendo apenas Co-CEOs visíveis)
    const collapseAll = useCallback(() => {
        if (!initialTree || initialTree.length === 0) return;
        const allParentIds = new Set();
        const collectParents = (node) => {
            if (node.children && node.children.length > 0) {
                allParentIds.add(node.id);
                node.children.forEach(collectParents);
            }
        };
        initialTree.forEach(root => collectParents(root));
        setCollapsedNodes(allParentIds);
        window.requestAnimationFrame(() => {
            fitView({ padding: 0.15, duration: 300 });
        });
    }, [initialTree, fitView]);

    // Focar e centralizar em um nó via Busca Global com expansão de ancestrais e animação de pulso ciano (2s)
    const focusNode = useCallback((targetId) => {
        if (!targetId) return;
        const numId = typeof targetId === 'number' ? targetId : parseInt(targetId, 10);

        // 1. Expansão recursiva de todos os ancestrais do nó pesquisado até a raiz
        const parentsToExpand = new Set();
        const findAncestors = (currId) => {
            const node = allNodesFlat.find(n => n.id === currId);
            if (node && node.parent_id !== null && node.parent_id !== undefined) {
                parentsToExpand.add(node.parent_id);
                findAncestors(node.parent_id);
            }
        };
        findAncestors(numId);

        // Desbloqueia e expande o caminho do Co-CEO até o nó pesquisado
        setCollapsedNodes(prev => {
            const next = new Set(prev);
            let changed = false;
            parentsToExpand.forEach(pId => {
                if (next.has(pId)) {
                    next.delete(pId);
                    changed = true;
                }
            });
            return changed ? next : prev;
        });

        // 2. Dispara a animação de pulso/glow ciano por 2 segundos (2000ms)
        setHighlightedNodeId(numId);
        setTimeout(() => {
            setHighlightedNodeId(null);
        }, 2000);

        // 3. Recalcula as coordenadas e move a câmera via getNodes() do React Flow após a renderização
        setTimeout(() => {
            const currentNodes = getNodes ? getNodes() : [];
            const targetNode = currentNodes.find(n => String(n.id) === String(numId));
            if (targetNode) {
                const width = targetNode.measured?.width || targetNode.width || getNodeWidth(targetNode.data) || 260;
                const height = targetNode.measured?.height || targetNode.height || getNodeHeight(targetNode.data) || 88;
                const centerX = targetNode.position.x + (width / 2);
                const centerY = targetNode.position.y + (height / 2);
                setCenter(centerX, centerY, { zoom: 1.25, duration: 600 });
            }
        }, 150);
    }, [allNodesFlat, getNodes, setCenter]);


    return {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        expandAll,
        collapseAll,
        focusNode
    };
}
