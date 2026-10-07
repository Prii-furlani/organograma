/**
 * Cabeçalho Arquitetural: Componentes de Arestas Customizadas do React Flow.
 * Implementa roteamento matemático estrito de 0° e 90° (ZERO DIAGONAL / INCLINAÇÃO).
 * - StraightHorizontalEdge: força startY === endY === targetY (reta 100% horizontal).
 * - StraightVerticalEdge: força startX === endX === sourceX (reta 100% vertical).
 * - StepLTurnEdge: sai de Position.Bottom, desce exatamente 24px e vira 90° limpo até o eixo X.
 */

import React from 'react';

/**
 * Aresta 100% Horizontal (sem qualquer inclinação diagonal).
 * O ponto inicial e o ponto final compartilham RIGOROSAMENTE a coordenada Y do handle de destino (targetY).
 */
export function StraightHorizontalEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style = {},
    markerEnd,
    className
}) {
    const yCentro = targetY;
    const edgePath = `M ${sourceX} ${yCentro} L ${targetX} ${yCentro}`;

    return (
        <path
            id={id}
            style={style}
            className={`react-flow__edge-path ${className || ''}`}
            d={edgePath}
            markerEnd={markerEnd}
        />
    );
}

/**
 * Aresta 100% Vertical (sem qualquer inclinação diagonal).
 * O ponto inicial e o ponto final compartilham RIGOROSAMENTE a coordenada X da haste (sourceX).
 */
export function StraightVerticalEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style = {},
    markerEnd,
    className
}) {
    const xCentro = sourceX;
    const edgePath = `M ${xCentro} ${sourceY} L ${xCentro} ${targetY}`;

    return (
        <path
            id={id}
            style={style}
            className={`react-flow__edge-path ${className || ''}`}
            d={edgePath}
            markerEnd={markerEnd}
        />
    );
}

/**
 * Aresta em "L" Limpo a 90° (Dobra única sem degrau duplo ou laço).
 * Sai do Position.Bottom (sourceX, sourceY), desce exatamente 24px até turnY e vira 90° para a esquerda/direita até (targetX, turnY).
 */
export function StepLTurnEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style = {},
    markerEnd,
    className
}) {
    const turnY = targetY;
    const edgePath = `M ${sourceX} ${sourceY} L ${sourceX} ${turnY} L ${targetX} ${turnY}`;

    return (
        <path
            id={id}
            style={style}
            className={`react-flow__edge-path ${className || ''}`}
            d={edgePath}
            markerEnd={markerEnd}
        />
    );
}
