import dagre from '@dagrejs/dagre';

export const getLayoutedElements = (nodes, edges) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({
        rankdir: 'TB',
        nodesep: 60,   // Distância horizontal uniforme entre irmãos
        ranksep: 90,   // Distância vertical segura entre níveis
        marginx: 40,
        marginy: 40,
    });

    nodes.forEach((node) => {
        const isCeo = String(node.id) === '1' || node.data?.isRootCeo;
        const width = isCeo ? 380 : 260;
        const height = isCeo ? 170 : 115; // Mantendo 115 para acomodar pílula
        dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const isCeo = String(node.id) === '1' || node.data?.isRootCeo;
        return {
            ...node,
            targetPosition: 'top',
            sourcePosition: 'bottom',
            position: {
                x: nodeWithPosition.x - (isCeo ? 190 : 130),
                y: nodeWithPosition.y - (isCeo ? 85 : 57), // 115 / 2 = 57.5 ~ 57
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

export default getLayoutedElements;
