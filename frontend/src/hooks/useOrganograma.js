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

// Constantes de Layout e Espaçamento
const NODE_WIDTH = 250;       // Largura base do card de Diretoria/OIA em px
const NODE_HEIGHT = 150;      // Altura base do card de Diretoria/OIA em px
const RANK_SEP = 72;          // Espaçamento vertical constante de 52px entre cards (respiração visual ampla)
const MIN_GAP = 200;           // Espaçamento horizontal mínimo de 50px entre diretorias
const OFFSET_COL = 270;       // Offset horizontal para colunas bipolares e contratos

const getNodeWidth = (node) => {
    if (!node) return 200;
    if (node.tipo === 'ceo') return 230;
    if (node.tipo === 'diretoria' || node.tipo === 'oia' || node.id === 12) return 220;
    if (node.tipo === 'staff') return 205;
    if (node.tipo === 'gerencia' || node.tipo === 'coordenacao' || node.tipo === 'unidade') return 200;
    return 175;
};

const getNodeHeight = (node) => {
    if (!node) return 96;
    if (node.tipo === 'ceo') return 110;
    if (node.tipo === 'diretoria' || node.tipo === 'oia' || node.id === 12) return 105;
    if (node.tipo === 'staff') return 98;
    if (node.tipo === 'gerencia' || node.tipo === 'coordenacao' || node.tipo === 'unidade') return 96;
    return 86;
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

export function useOrganograma(initialTree, onNodeClick, isEditMode = false, onEditNode = null) {
    const { hasPermissionToEdit } = useAuth();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [collapsedNodes, setCollapsedNodes] = useState(new Set());
    const initialized = useRef(false);

    // Controle de UX e Câmera/Viewport
    const hasDoneInitialFitView = useRef(false);
    const lastToggledNodeId = useRef(null);

    const { fitView, setCenter, getViewport } = useReactFlow();

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
    const buildFlowData = useCallback(() => {
        if (!initialTree || initialTree.length === 0 || !initialized.current) return;

        const newNodes = [];
        const newEdges = [];
        const addedNodeIds = new Set(); // Evita duplicação de nós

        // Helper para criar arestas ortogonais/diretas sem desnível vertical
        const createEdge = (
            source,
            target,
            className = 'edge-theme-default',
            sourceHandle = null,
            targetHandle = null,
            type = 'straight'
        ) => {
            const edgeId = `e${source}-${target}`;
            if (newEdges.some(e => e.id === edgeId)) return;
            newEdges.push({
                id: edgeId,
                source: String(source),
                target: String(target),
                sourceHandle,
                targetHandle,
                type, // 'straight' garante alinhamento 100% reto a 180°, 'smoothstep' / 'step' para degraus ortogonais
                animated: false,
                className
            });
        };

        // Helper para adicionar nó garantindo unicidade
        const addNode = (nodeData, x, y) => {
            const strId = String(nodeData.id);
            if (addedNodeIds.has(strId)) return;
            addedNodeIds.add(strId);

            const isCollapsed = collapsedNodes.has(nodeData.id);
            const hasChildren = nodeData.children && nodeData.children.length > 0;
            const childrenCount = hasChildren ? nodeData.children.length : 0;
            const canEdit = hasPermissionToEdit ? hasPermissionToEdit(nodeData.id) : false;

            newNodes.push({
                id: strId,
                type: 'mindmap',
                position: { x, y },
                data: {
                    ...nodeData,
                    isCollapsed,
                    hasChildren,
                    childrenCount,
                    isEditMode,
                    canEdit,
                    onNodeClick,
                    onEditNode,
                    onToggleCollapse: toggleCollapse
                }
            });
        };

        const rootNode = initialTree[0];
        if (!rootNode) return;

        // 1. Identifica os ramos principais
        const spineChildren = rootNode.children ? rootNode.children.filter(c => c.tipo === 'staff' || c.tipo === 'apoio') : [];
        const oiaNode = rootNode.children ? rootNode.children.find(c => c.id === 12) : null;
        const diretorias = rootNode.children ? rootNode.children.filter(c => c.tipo === 'diretoria') : [];

        const dir20 = diretorias.find(d => d.id === 20);  // Comercial
        const dir40 = diretorias.find(d => d.id === 40);  // Operações
        const dir80 = diretorias.find(d => d.id === 80);  // Administrativa
        const dir120 = diretorias.find(d => d.id === 120);// TI

        // 2. Medição de todos os blocos
        const m20 = dir20 ? measureSubtree(dir20, collapsedNodes) : { subtreeHeight: NODE_HEIGHT, leftMargin: 100, rightMargin: 100 };
        const m40 = dir40 ? measureSubtree(dir40, collapsedNodes) : { subtreeHeight: NODE_HEIGHT, leftMargin: 100, rightMargin: 100 };
        const m80 = dir80 ? measureSubtree(dir80, collapsedNodes) : { subtreeHeight: NODE_HEIGHT, leftMargin: 100, rightMargin: 100 };
        const m120 = dir120 ? measureSubtree(dir120, collapsedNodes) : { subtreeHeight: NODE_HEIGHT, leftMargin: 100, rightMargin: 100 };
        const mOIA = oiaNode ? measureSubtree(oiaNode, collapsedNodes) : { subtreeHeight: NODE_HEIGHT, leftMargin: 100, rightMargin: 100 };

        // Medição dos elementos do Staff para determinar os limites do Tronco Central
        let staffMaxLeftExt = 100;
        let staffMaxRightExt = 100;

        STAFF_LEVELS.forEach(level => {
            if (level.left) {
                const n = spineChildren.find(c => c.id === level.left);
                if (n) {
                    const m = measureSubtree(n, collapsedNodes);
                    const ext = OFFSET_COL + m.leftMargin;
                    if (ext > staffMaxLeftExt) staffMaxLeftExt = ext;
                }
            }
            if (level.right) {
                const n = spineChildren.find(c => c.id === level.right);
                if (n) {
                    const m = measureSubtree(n, collapsedNodes);
                    const ext = OFFSET_COL + m.rightMargin;
                    if (ext > staffMaxRightExt) staffMaxRightExt = ext;
                }
            }
        });

        const leftMarginTronco = Math.max(staffMaxLeftExt, mOIA.leftMargin, 100);
        const rightMarginTronco = Math.max(staffMaxRightExt, mOIA.rightMargin, 100);

        // 3. CÁLCULO DINÂMICO DAS POSIÇÕES X DAS COLUNAS (Subtree Bounding Box)
        const X_TRONCO = 0;
        const X_OPERACOES = -leftMarginTronco - MIN_GAP - m40.rightMargin;
        const X_COMERCIAL = (X_OPERACOES - m40.leftMargin) - MIN_GAP - m20.rightMargin;

        const X_ADMINISTRATIVA = rightMarginTronco + MIN_GAP + m80.leftMargin;
        const X_TI = (X_ADMINISTRATIVA + m80.rightMargin) + MIN_GAP + m120.leftMargin;

        // 4. POSICIONAMENTO DO TRONCO CENTRAL (Co-CEOs & Staff Spine)
        addNode(rootNode, X_TRONCO, 0);

        // Se o Co-CEOs (Nível 0) estiver colapsado, a estrutura abaixo (Staff, Diretorias e subordinados) permanece oculta
        if (!collapsedNodes.has(rootNode.id)) {
            let currentSpineY = getNodeHeight(rootNode) + RANK_SEP;
            let lastSpineJunctionId = String(rootNode.id);
            let lastSpineHandle = null;

            // Montagem da Espinha Dorsal do Staff
            STAFF_LEVELS.forEach((level, i) => {
                const junctionId = `spine_junc_${i}`;
                const junctionY = currentSpineY;

                let levelHeightLeft = getNodeHeight({ tipo: 'staff' });
                let levelHeightRight = getNodeHeight({ tipo: 'staff' });

                newNodes.push({
                    id: junctionId,
                    type: 'junction',
                    position: { x: X_TRONCO + (getNodeWidth(rootNode) / 2), y: junctionY + (getNodeHeight({ tipo: 'staff' }) / 2) },
                    data: { isCollapsed: false, hasChildren: false }
                });

                createEdge(lastSpineJunctionId, junctionId, 'edge-theme-ceo', lastSpineHandle, 'top', 'straightVertical');

                // Galho Esquerdo do Staff (Conexão Reta Horizontal)
                if (level.left) {
                    const leftChild = spineChildren.find(c => c.id === level.left);
                    if (leftChild) {
                        const childX = X_TRONCO - OFFSET_COL;
                        addNode(leftChild, childX, junctionY);
                        createEdge(junctionId, leftChild.id, `edge-theme-${leftChild.tipo}`, 'left', 'right-target', 'straightHorizontal');

                        const mLeft = measureSubtree(leftChild, collapsedNodes);
                        levelHeightLeft = mLeft.subtreeHeight;

                        if (!collapsedNodes.has(leftChild.id) && leftChild.children && leftChild.children.length > 0) {
                            let subY = junctionY + getNodeHeight(leftChild) + RANK_SEP;
                            leftChild.children.forEach(c => {
                                addNode(c, childX, subY);
                                createEdge(leftChild.id, c.id, `edge-theme-${c.tipo}`, null, null, 'straightVertical');
                                subY += getNodeHeight(c) + RANK_SEP;
                            });
                        }
                    }
                }

                // Galho Direito do Staff (Conexão Reta Horizontal)
                if (level.right) {
                    const rightChild = spineChildren.find(c => c.id === level.right);
                    if (rightChild) {
                        const childX = X_TRONCO + OFFSET_COL;
                        addNode(rightChild, childX, junctionY);
                        createEdge(junctionId, rightChild.id, `edge-theme-${rightChild.tipo}`, 'right', 'left-target', 'straightHorizontal');

                        const mRight = measureSubtree(rightChild, collapsedNodes);
                        levelHeightRight = mRight.subtreeHeight;

                        if (!collapsedNodes.has(rightChild.id) && rightChild.children && rightChild.children.length > 0) {
                            let subY = junctionY + getNodeHeight(rightChild) + RANK_SEP;
                            let prevChildId = rightChild.id;
                            rightChild.children.forEach((c, idx) => {
                                addNode(c, childX, subY);
                                if (idx === 0) {
                                    createEdge(prevChildId, c.id, `edge-theme-${c.tipo}`, null, null, 'straightVertical');
                                } else {
                                    createEdge(prevChildId, c.id, `edge-theme-${c.tipo}`, 'bottom', 'top', 'straightVertical');
                                }
                                prevChildId = c.id;
                                subY += getNodeHeight(c) + RANK_SEP;
                            });
                        }
                    }
                }

                const stepHeight = Math.max(levelHeightLeft, levelHeightRight);
                currentSpineY += stepHeight + RANK_SEP;
                lastSpineJunctionId = junctionId;
                lastSpineHandle = 'bottom';
            });

            // Barramento Router para as Diretorias
            const routerY = currentSpineY;
            const routerJunctionId = 'bus_router';

            newNodes.push({
                id: routerJunctionId,
                type: 'junction',
                position: { x: X_TRONCO + (getNodeWidth(rootNode) / 2), y: routerY },
                data: { isCollapsed: false, hasChildren: false }
            });

            createEdge(lastSpineJunctionId, routerJunctionId, 'edge-theme-ceo', lastSpineHandle, 'top', 'straightVertical');

            const diretoriasY = routerY + 50;

            // 5. OIA (Gerência Técnica Geral OIA) - Espinha Vertical Única
            if (oiaNode) {
                createEdge(routerJunctionId, oiaNode.id, `edge-theme-${oiaNode.tipo}`, 'bottom', null, 'straightVertical');
                addNode(oiaNode, X_TRONCO, diretoriasY);

                if (!collapsedNodes.has(oiaNode.id) && oiaNode.children && oiaNode.children.length > 0) {
                    let currentOiaY = diretoriasY + getNodeHeight(oiaNode) + RANK_SEP;
                    let prevOiaId = oiaNode.id;

                    oiaNode.children.forEach((c, idx) => {
                        addNode(c, X_TRONCO, currentOiaY);
                        if (idx === 0) {
                            createEdge(prevOiaId, c.id, `edge-theme-${c.tipo}`, null, null, 'straightVertical');
                        } else {
                            createEdge(prevOiaId, c.id, `edge-theme-${c.tipo}`, 'bottom', 'top', 'straightVertical');
                        }
                        prevOiaId = c.id;
                        currentOiaY += getNodeHeight(c) + RANK_SEP;
                    });
                }
            }

            // 6. POSICIONAMENTO E CONEXÕES DAS 4 DIRETORIAS
            const dirList = [
                { node: dir20, x: X_COMERCIAL },
                { node: dir40, x: X_OPERACOES },
                { node: dir80, x: X_ADMINISTRATIVA },
                { node: dir120, x: X_TI }
            ];

            dirList.forEach(({ node, x }) => {
                if (!node) return;

                const dirJuncId = `bus_junc_${node.id}`;
                newNodes.push({
                    id: dirJuncId,
                    type: 'junction',
                    position: { x: x + (getNodeWidth(node) / 2), y: routerY },
                    data: { isCollapsed: false, hasChildren: false }
                });

                const isLeftBus = x < X_TRONCO;
                createEdge(
                    routerJunctionId,
                    dirJuncId,
                    'edge-theme-ceo',
                    isLeftBus ? 'left' : 'right',
                    isLeftBus ? 'right-target' : 'left-target',
                    'straightHorizontal'
                );
                createEdge(dirJuncId, node.id, `edge-theme-${node.tipo}`, 'bottom', null, 'straightVertical');

                addNode(node, x, diretoriasY);

                // 7. EXPANSÃO DE FILHOS DAS DIRETORIAS
                if (!collapsedNodes.has(node.id) && node.children && node.children.length > 0) {
                    if (node.id === 40) {
                        // =========================================================
                        // DIRETORIA DE OPERAÇÕES (40) - ESPINHA CENTRAL BIPOLAR
                        // =========================================================
                        const opsSpineX = x + (NODE_WIDTH / 2);
                        let currentOpsY = diretoriasY + NODE_HEIGHT + RANK_SEP;
                        let lastOpsJunctionId = String(node.id);
                        let lastOpsHandle = null;

                        const allOpsChildren = node.children;

                        // Helper para renderizar Contrato N e sua sub-ramificação em cascata
                        const renderContratoBranch = (unidadeNode, isRightSide, parentY) => {
                            if (!unidadeNode.children || unidadeNode.children.length === 0) return 0;
                            const contratoNode = unidadeNode.children[0];
                            if (!contratoNode) return 0;

                            const contratoX = isRightSide ? (x + OFFSET_COL + OFFSET_COL) : (x - OFFSET_COL - OFFSET_COL);
                            const contratoY = parentY;

                            addNode(contratoNode, contratoX, contratoY);

                            // Conexão RETA 100% Horizontal sem degrau
                            createEdge(
                                unidadeNode.id,
                                contratoNode.id,
                                `edge-theme-${contratoNode.tipo}`,
                                isRightSide ? 'right' : 'left',
                                isRightSide ? 'left-target' : 'right-target',
                                'straight'
                            );

                            let branchHeight = NODE_HEIGHT;

                            // Sub-ramificação em cascata abaixo do Contrato N
                            if (!collapsedNodes.has(contratoNode.id) && contratoNode.children && contratoNode.children.length > 0) {
                                const hasteX = contratoX + 20; // Haste vertical contínua a 20px no card do contrato
                                const subCardsX = contratoX + 60; // Cards subordinados empilhados 60px à direita da haste
                                let currentSubY = contratoY + NODE_HEIGHT + RANK_SEP;
                                let lastHasteJuncId = String(contratoNode.id);

                                contratoNode.children.forEach((subC, sIdx) => {
                                    const hasteJuncId = `haste_junc_${contratoNode.id}_${sIdx}`;
                                    const subCardCenterY = currentSubY + (NODE_HEIGHT / 2);

                                    newNodes.push({
                                        id: hasteJuncId,
                                        type: 'junction',
                                        position: { x: hasteX, y: subCardCenterY },
                                        data: { isCollapsed: false, hasChildren: false }
                                    });

                                    createEdge(lastHasteJuncId, hasteJuncId, `edge-theme-${contratoNode.tipo}`, sIdx === 0 ? 'bottom' : 'bottom', 'top', 'straight');

                                    addNode(subC, subCardsX, currentSubY);
                                    createEdge(hasteJuncId, subC.id, `edge-theme-${subC.tipo}`, 'right', 'left-target', 'straight');

                                    lastHasteJuncId = hasteJuncId;
                                    currentSubY += NODE_HEIGHT + RANK_SEP;
                                });

                                branchHeight = currentSubY - parentY;
                            }

                            return branchHeight;
                        };

                        OPS_LEVELS.forEach((lvl, lvlIdx) => {
                            const opsJuncId = `ops_junc_${lvlIdx}`;
                            const juncY = currentOpsY;
                            const spineJunctionCenterY = juncY + (NODE_HEIGHT / 2);

                            newNodes.push({
                                id: opsJuncId,
                                type: 'junction',
                                position: { x: opsSpineX, y: spineJunctionCenterY },
                                data: { isCollapsed: false, hasChildren: false }
                            });

                            createEdge(lastOpsJunctionId, opsJuncId, `edge-theme-${node.tipo}`, lastOpsHandle, 'top', 'straight');

                            let leftBranchH = NODE_HEIGHT;
                            let rightBranchH = NODE_HEIGHT;

                            // Coluna da Esquerda
                            if (lvl.left) {
                                const leftChild = allOpsChildren.find(c => c.id === lvl.left);
                                if (leftChild) {
                                    const leftX = x - OFFSET_COL;
                                    addNode(leftChild, leftX, juncY);
                                    createEdge(opsJuncId, leftChild.id, `edge-theme-${leftChild.tipo}`, 'left', 'right-target', 'straight');

                                    if (leftChild.id === 43 && !collapsedNodes.has(43) && leftChild.children && leftChild.children.length > 0) {
                                        const apoioNode = leftChild.children[0];
                                        if (apoioNode) {
                                            const apoioX = leftX - OFFSET_COL;
                                            addNode(apoioNode, apoioX, juncY);
                                            createEdge(leftChild.id, apoioNode.id, `edge-theme-${apoioNode.tipo}`, 'left', 'right-target', 'straight');
                                        }
                                    }

                                    if (UNIDADES_OPERACAOE_IDS.includes(leftChild.id) && !collapsedNodes.has(leftChild.id)) {
                                        leftBranchH = renderContratoBranch(leftChild, false, juncY);
                                    }
                                }
                            }

                            // Coluna da Direita
                            if (lvl.right) {
                                const rightChild = allOpsChildren.find(c => c.id === lvl.right);
                                if (rightChild) {
                                    const rightX = x + OFFSET_COL;
                                    addNode(rightChild, rightX, juncY);
                                    createEdge(opsJuncId, rightChild.id, `edge-theme-${rightChild.tipo}`, 'right', 'left-target', 'straight');

                                    if (UNIDADES_OPERACAOE_IDS.includes(rightChild.id) && !collapsedNodes.has(rightChild.id)) {
                                        rightBranchH = renderContratoBranch(rightChild, true, juncY);
                                    }
                                }
                            }

                            const maxLevelH = Math.max(leftBranchH, rightBranchH, NODE_HEIGHT);
                            currentOpsY += maxLevelH + RANK_SEP;
                            lastOpsJunctionId = opsJuncId;
                            lastOpsHandle = 'bottom';
                        });

                    } else if (node.id === 120) {
                        // =========================================================
                        // DIRETORIA DE TECNOLOGIA E INOVAÇÃO (120)
                        // ESPINHA MESTRA COM RECUO DE 40px E GAP VERTICAL DE 45px
                        // =========================================================
                        const heightTI = getNodeHeight(node); // 105px
                        const widthTI = getNodeWidth(node);   // 220px

                        // 1. Alinhamento geométrico das gerências: centralizadas sob a TI (width 200px -> X = x + 10)
                        const gerenciasX = x + ((widthTI - 200) / 2); // Todos compartilham RIGOROSAMENTE X = x + 10px

                        // 2. Haste vertical mestra com offset estrito de exatamente 40px à esquerda da borda das gerências
                        const masterSpineX = gerenciasX - 40; // x - 30px

                        // 3. Gap vertical mínimo de 45px entre a base da TI e o topo do 1º card ("BI e Dados")
                        let currentTiY = diretoriasY + heightTI + 45;

                        // 4. Ponto de dobra em 90°: desce 20px verticalmente do Position.Bottom da TI antes de virar para a esquerda
                        const turnY = diretoriasY + heightTI + 20;

                        // Junction do ponto de dobra de 90°
                        const tiTurnJuncId = `ti_bus_turn_${node.id}`;
                        newNodes.push({
                            id: tiTurnJuncId,
                            type: 'junction',
                            position: { x: masterSpineX, y: turnY },
                            data: { isCollapsed: false, hasChildren: false }
                        });

                        // 5. Aresta principal de saída da TI (120): desce 20px e vira 90° à esquerda até a haste mestra
                        createEdge(
                            node.id,
                            tiTurnJuncId,
                            `edge-theme-${node.tipo}`,
                            'bottom',
                            'left-target',
                            'stepLTurn'
                        );

                        let lastMasterJuncId = tiTurnJuncId;

                        node.children.forEach((gerencia) => {
                            const gerenciaHeight = getNodeHeight(gerencia);
                            const gerenciaCenterY = currentTiY + (gerenciaHeight / 2);
                            const masterJuncId = `ti_master_junc_${gerencia.id}`;

                            // Junction na haste mestre alinhada RIGOROSAMENTE ao centro vertical da gerência (Y_haste === Y_card)
                            newNodes.push({
                                id: masterJuncId,
                                type: 'junction',
                                position: { x: masterSpineX, y: gerenciaCenterY },
                                data: { isCollapsed: false, hasChildren: false }
                            });

                            // Haste vertical mestre descendo 100% reto (straightVertical)
                            createEdge(
                                lastMasterJuncId,
                                masterJuncId,
                                `edge-theme-${node.tipo}`,
                                'bottom',
                                'top',
                                'straightVertical'
                            );

                            // Card da Gerência posicionado no prumo perfeito gerenciasX (x + 10)
                            addNode(gerencia, gerenciasX, currentTiY);

                            // Braço horizontal 100% reto a 180° (straightHorizontal) conectando da haste para Position.Left
                            createEdge(
                                masterJuncId,
                                gerencia.id,
                                `edge-theme-${gerencia.tipo}`,
                                'right',
                                'left-target',
                                'straightHorizontal'
                            );

                            let gerenciaSubtreeH = gerenciaHeight;

                            // Nível 2: Paternidade Direta do Nó Pai (gerência) aos Filhos (apoios/equipes)
                            if (!collapsedNodes.has(gerencia.id) && gerencia.children && gerencia.children.length > 0) {
                                const subCardsX = gerenciasX + 80;
                                let currentSubY = currentTiY + gerenciaHeight + RANK_SEP;

                                gerencia.children.forEach((subC) => {
                                    addNode(subC, subCardsX, currentSubY);

                                    createEdge(
                                        gerencia.id,
                                        subC.id,
                                        `edge-theme-${subC.tipo}`,
                                        'bottom',
                                        'left-target',
                                        'stepLTurn'
                                    );

                                    currentSubY += getNodeHeight(subC) + RANK_SEP;
                                });

                                gerenciaSubtreeH = currentSubY - currentTiY;
                            }

                            lastMasterJuncId = masterJuncId;
                            currentTiY += gerenciaSubtreeH + RANK_SEP;
                        });

                    } else if (node.id === 80) {
                        // =========================================================
                        // DIRETORIA ADMINISTRATIVA (80) - ESTRUTURA BIPOLAR OFICIAL JHE
                        // ESPINHA CENTRAL CONTINUA COM 2 COLUNAS E BIFURCAÇÃO HORIZONTAL DE RH
                        // =========================================================
                        const adminSpineX = x + (NODE_WIDTH / 2);
                        let currentAdminY = diretoriasY + NODE_HEIGHT + RANK_SEP;
                        let lastAdminJuncId = String(node.id);
                        let lastAdminHandle = 'bottom'; // Garante saída reta de Position.Bottom da Diretoria Administrativa

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

                        ADMIN_LEVELS.forEach((lvl, lvlIdx) => {
                            const adminJuncId = `admin_junc_${lvlIdx}`;
                            const juncY = currentAdminY;
                            const spineJuncCenterY = juncY + (NODE_HEIGHT / 2);

                            // Junction na haste central alinhada ao centro vertical das gerências (Y_haste === Y_card)
                            newNodes.push({
                                id: adminJuncId,
                                type: 'junction',
                                position: { x: adminSpineX, y: spineJuncCenterY },
                                data: { isCollapsed: false, hasChildren: false }
                            });

                            // Haste central descendo reto em 90° (ZERO DIAGONAL: X_origem === X_destino)
                            createEdge(
                                lastAdminJuncId,
                                adminJuncId,
                                'edge-theme-admin',
                                lastAdminHandle,
                                'top',
                                'step'
                            );

                            let leftBranchH = NODE_HEIGHT;
                            let rightBranchH = NODE_HEIGHT;

                            // ---------------------------------------------------------------------
                            // COLUNA DA ESQUERDA (Financeiro 93, RH 97, Jurídico 106, Manutenção 108)
                            // ---------------------------------------------------------------------
                            if (lvl.leftId) {
                                const leftChild = findNodeInSubtree(node, lvl.leftId);
                                if (leftChild) {
                                    const leftX = x - OFFSET_COL;
                                    addNode(leftChild, leftX, juncY);

                                    // Braço horizontal 100% reto a 90° entre a haste central e o handle direito do card (Y_haste === Y_card)
                                    createEdge(
                                        adminJuncId,
                                        leftChild.id,
                                        'edge-theme-admin',
                                        'left',
                                        'right-target',
                                        'step'
                                    );

                                    // Sub-ramificações do galho esquerdo
                                    if (!collapsedNodes.has(leftChild.id) && leftChild.children && leftChild.children.length > 0) {
                                        if (leftChild.id === 97) {
                                            // --- RECURSOS HUMANOS (97) - BIFURCAÇÃO HORIZONTAL OFICIAL ---
                                            const rhJuncId = `rh_bifurc_junc_${leftChild.id}`;
                                            const rhBifurcY = juncY + NODE_HEIGHT + 20;

                                            newNodes.push({
                                                id: rhJuncId,
                                                type: 'junction',
                                                position: { x: leftX + (NODE_WIDTH / 2), y: rhBifurcY },
                                                data: { isCollapsed: false, hasChildren: false }
                                            });

                                            createEdge(leftChild.id, rhJuncId, 'edge-theme-admin', 'bottom', 'top', 'step');

                                            const admPessoalNode = leftChild.children.find(c => c.id === 102);
                                            const dhoNode = leftChild.children.find(c => c.id === 98);
                                            const comInternaNode = leftChild.children.find(c => c.id === 105);

                                            let admH = NODE_HEIGHT;
                                            let dhoH = NODE_HEIGHT;

                                            // Lado Esquerdo de RH: Adm. Pessoal (102)
                                            // admX = leftX - 120 (card de leftX-120 a leftX+80, ou seja x-380 a x-180)
                                            if (admPessoalNode) {
                                                const admX = leftX - 120;
                                                const admY = rhBifurcY + RANK_SEP;
                                                addNode(admPessoalNode, admX, admY);
                                                createEdge(rhJuncId, admPessoalNode.id, 'edge-theme-admin', 'left', 'right-target', 'step');

                                                let currentAdmSubY = admY;

                                                if (!collapsedNodes.has(admPessoalNode.id) && admPessoalNode.children && admPessoalNode.children.length > 0) {
                                                    const admSubX = admX - 160;
                                                    let subY = admY + NODE_HEIGHT + RANK_SEP;
                                                    admPessoalNode.children.forEach(subC => {
                                                        addNode(subC, admSubX, subY);
                                                        createEdge(admPessoalNode.id, subC.id, 'edge-theme-admin', 'left', 'right-target', 'step');
                                                        subY += NODE_HEIGHT + RANK_SEP;
                                                    });
                                                    currentAdmSubY = subY - RANK_SEP;
                                                }

                                                // Comunicação Interna (105) fica abaixo de Adm. Pessoal (102)
                                                if (comInternaNode) {
                                                    const comY = currentAdmSubY + NODE_HEIGHT + RANK_SEP;
                                                    addNode(comInternaNode, admX, comY);
                                                    createEdge(admPessoalNode.id, comInternaNode.id, 'edge-theme-admin', 'bottom', 'top', 'step');
                                                    admH = (comY + NODE_HEIGHT) - juncY;
                                                } else {
                                                    admH = (currentAdmSubY + NODE_HEIGHT) - juncY;
                                                }
                                            }

                                            // Lado Direito de RH: DHO (98)
                                            // dhoX = leftX + 120 (card de leftX+120 a leftX+320, ou seja x-140 a x+60)
                                            // Mantém gap de 40px com Adm. Pessoal e recua 40px à esquerda da espinha central (adminSpineX at x+100)
                                            if (dhoNode) {
                                                const dhoX = leftX + 120;
                                                const dhoY = rhBifurcY + RANK_SEP;
                                                addNode(dhoNode, dhoX, dhoY);
                                                createEdge(rhJuncId, dhoNode.id, 'edge-theme-admin', 'right', 'left-target', 'step');

                                                if (!collapsedNodes.has(dhoNode.id) && dhoNode.children && dhoNode.children.length > 0) {
                                                    const dhoSubX = dhoX + 80;
                                                    let currentDhoSubY = dhoY + NODE_HEIGHT + RANK_SEP;
                                                    dhoNode.children.forEach(subC => {
                                                        addNode(subC, dhoSubX, currentDhoSubY);
                                                        createEdge(dhoNode.id, subC.id, 'edge-theme-admin', 'bottom', 'left-target', 'step');
                                                        currentDhoSubY += NODE_HEIGHT + RANK_SEP;
                                                    });
                                                    dhoH = currentDhoSubY - juncY;
                                                } else {
                                                    dhoH = (dhoY + NODE_HEIGHT) - juncY;
                                                }
                                            }

                                            leftBranchH = Math.max(admH, dhoH);

                                        } else {
                                            // Outros nós esquerdos (Financeiro 93, Jurídico 106, Manutenção 108)
                                            const subCardsX = leftX - 160;
                                            let currentSubY = juncY + NODE_HEIGHT + RANK_SEP;

                                            leftChild.children.forEach(subC => {
                                                addNode(subC, subCardsX, currentSubY);
                                                createEdge(leftChild.id, subC.id, 'edge-theme-admin', 'left', 'right-target', 'step');
                                                currentSubY += NODE_HEIGHT + RANK_SEP;
                                            });

                                            leftBranchH = currentSubY - juncY;
                                        }
                                    }
                                }
                            }

                            // ---------------------------------------------------------------------
                            // COLUNA DA DIREITA (Controladoria 81, Contabilidade 82, Administrativo 85)
                            // ---------------------------------------------------------------------
                            if (lvl.rightId) {
                                const rightChild = findNodeInSubtree(node, lvl.rightId);
                                if (rightChild) {
                                    const rightX = x + OFFSET_COL;
                                    addNode(rightChild, rightX, juncY);

                                    // Braço horizontal 100% reto entre a haste central e o handle esquerdo do card (Y_haste === Y_card)
                                    createEdge(
                                        adminJuncId,
                                        rightChild.id,
                                        'edge-theme-admin',
                                        'right',
                                        'left-target',
                                        'step'
                                    );

                                    // Sub-ramificações do galho direito (Controladoria 81, Contabilidade 82, Administrativo 85)
                                    if (!collapsedNodes.has(rightChild.id) && rightChild.children && rightChild.children.length > 0) {
                                        const subCardsX = rightX + 160;
                                        let currentSubY = juncY + NODE_HEIGHT + RANK_SEP;

                                        rightChild.children.forEach(subC => {
                                            addNode(subC, subCardsX, currentSubY);
                                            createEdge(rightChild.id, subC.id, 'edge-theme-admin', 'right', 'left-target', 'step');

                                            if (!collapsedNodes.has(subC.id) && subC.children && subC.children.length > 0) {
                                                const subSubCardsX = subCardsX + 80;
                                                let currentSubSubY = currentSubY + NODE_HEIGHT + RANK_SEP;

                                                subC.children.forEach(subSubC => {
                                                    addNode(subSubC, subSubCardsX, currentSubSubY);
                                                    createEdge(subC.id, subSubC.id, 'edge-theme-admin', 'bottom', 'left-target', 'step');

                                                    if (!collapsedNodes.has(subSubC.id) && subSubC.children && subSubC.children.length > 0) {
                                                        let currentDeepY = currentSubSubY + NODE_HEIGHT + RANK_SEP;
                                                        subSubC.children.forEach(deepC => {
                                                            addNode(deepC, subSubCardsX + 60, currentDeepY);
                                                            createEdge(subSubC.id, deepC.id, 'edge-theme-admin', 'bottom', 'left-target', 'step');
                                                            currentDeepY += NODE_HEIGHT + RANK_SEP;
                                                        });
                                                        currentSubSubY = currentDeepY;
                                                    } else {
                                                        currentSubSubY += NODE_HEIGHT + RANK_SEP;
                                                    }
                                                });

                                                currentSubY = currentSubSubY;
                                            } else {
                                                currentSubY += NODE_HEIGHT + RANK_SEP;
                                            }
                                        });

                                        rightBranchH = currentSubY - juncY;
                                    }
                                }
                            }

                            const maxLevelH = Math.max(leftBranchH, rightBranchH, NODE_HEIGHT);
                            currentAdminY += maxLevelH + RANK_SEP;
                            lastAdminJuncId = adminJuncId;
                        });

                    } else {
                        // --- DIRETORIA COMERCIAL (20) ---
                        let currentY = diretoriasY + NODE_HEIGHT + RANK_SEP;

                        node.children.forEach(child => {
                            addNode(child, x, currentY);
                            createEdge(node.id, child.id, `edge-theme-${child.tipo}`, null, null, 'straight');

                            if (!collapsedNodes.has(child.id) && child.children && child.children.length > 0) {
                                let subY = currentY + NODE_HEIGHT + RANK_SEP;
                                child.children.forEach(subC => {
                                    addNode(subC, x, subY);
                                    createEdge(child.id, subC.id, `edge-theme-${subC.tipo}`, null, null, 'straight');
                                    subY += NODE_HEIGHT + RANK_SEP;
                                });
                                currentY = subY;
                            } else {
                                currentY += NODE_HEIGHT + RANK_SEP;
                            }
                        });
                    }
                }
            });
        } // fecha if (!collapsedNodes.has(rootNode.id))

        setNodes(newNodes);
        setEdges(newEdges);

        // CONTROLE DE VIEWPORT E CÂMERA (UX MELHORADA)
        setTimeout(() => {
            if (!hasDoneInitialFitView.current) {
                // Executa fitView EXCLUSIVAMENTE uma única vez no carregamento inicial da página
                fitView({ duration: 800 });
                hasDoneInitialFitView.current = true;
            } else if (lastToggledNodeId.current) {
                // Preserva o nível de zoom do usuário e faz um pan suave para recentralizar o nó clicado
                const toggledId = String(lastToggledNodeId.current);
                const targetNode = newNodes.find(n => n.id === toggledId);
                if (targetNode) {
                    const currentZoom = getViewport().zoom;
                    const nodeCenterX = targetNode.position.x + (NODE_WIDTH / 2);
                    const nodeCenterY = targetNode.position.y + (NODE_HEIGHT / 2);
                    setCenter(nodeCenterX, nodeCenterY, { duration: 400, zoom: currentZoom });
                }
                lastToggledNodeId.current = null;
            }
        }, 50);

    }, [initialTree, collapsedNodes, measureSubtree, toggleCollapse, onNodeClick, setNodes, setEdges, fitView, setCenter, getViewport]);

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
