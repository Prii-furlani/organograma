/**
 * Cabeçalho Arquitetural: Utilitário para manipulação de estruturas de dados.
 * Transforma uma lista plana de nós, retornada pelo banco de dados (relacional),
 * em uma estrutura de árvore hierárquica (JSON aninhado) adequada para renderização no frontend.
 */

/**
 * Converte um array de nós em uma árvore hierárquica.
 * @param {Array<Object>} nodes - Lista plana de nós do organograma.
 * @returns {Array<Object>} Lista de nós raízes, contendo seus filhos na propriedade `children`.
 */
function buildTree(nodes) {
    const nodeMap = {};
    const roots = [];

    // Primeiro passo: inicializa o mapa de nós com a propriedade children
    nodes.forEach(node => {
        nodeMap[node.id] = { ...node, children: [] };
    });

    // Segundo passo: conecta os filhos aos seus respectivos pais
    nodes.forEach(node => {
        if (node.parent_id !== null && nodeMap[node.parent_id]) {
            // Se tem pai, adiciona ao array de children do pai
            nodeMap[node.parent_id].children.push(nodeMap[node.id]);
        } else {
            // Se parent_id for null ou o pai não for encontrado, é um nó raiz
            roots.push(nodeMap[node.id]);
        }
    });

    // Função recursiva para ordenar filhos pela propriedade 'ordem'
    function sortChildren(nodeList) {
        nodeList.sort((a, b) => a.ordem - b.ordem);
        nodeList.forEach(child => {
            if (child.children.length > 0) {
                sortChildren(child.children);
            }
        });
    }

    sortChildren(roots);

    return roots;
}

module.exports = { buildTree };
