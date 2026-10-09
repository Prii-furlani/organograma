/**
 * Cabeçalho Arquitetural: Componente CeoNode para renderização dedicada dos Co-CEOs.
 * Renderização dinâmica dos gestores a partir do campo data.responsavel (ou data.gestor).
 * Suporte a iniciais geradas dinamicamente e layout executivo (380px x min 165px).
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const getInitials = (nome) => {
    if (!nome) return 'DH';
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return 'DH';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
};

export function CeoNode({ data }) {
    const isCollapsed = data.isCollapsed;
    const hasChildren = data.hasChildren;
    const childrenCount = data.childrenCount || 0;
    const isEditMode = data.isEditMode;
    const canEdit = data.canEdit;
    const isHighlighted = data.isHighlighted;

    const collapseClass = isCollapsed ? 'node-collapsed' : 'node-expanded';
    const highlightClass = isHighlighted ? 'node-highlighted jhe-node-highlighted' : '';

    let scopeClass = '';
    let nodeTooltip = 'Clique no nó para ver detalhes';

    if (isEditMode) {
        if (canEdit) {
            scopeClass = 'node-editable-scope';
            nodeTooltip = 'Permissão de edição habilitada';
        } else {
            scopeClass = 'node-locked-scope';
            nodeTooltip = 'Somente leitura (outra liderança)';
        }
    }

    const gestoresString = data.responsavel || data.gestor || "Dr. Hélio, Dr. Viol";
    const gestores = gestoresString
        .split(",")
        .map((nome) => nome.trim())
        .filter(Boolean);

    return (
        <div 
            className={`jhe-ceo-card ${collapseClass} ${scopeClass} ${highlightClass}`}
            onClick={() => data.onNodeClick && data.onNodeClick(data)}
            title={nodeTooltip}
        >
            <div className="jhe-ceo-accent-bar" />
            <Handle type="target" position={Position.Top} className="jhe-handle" />

            <div className="jhe-ceo-header">
                <h3 className="jhe-ceo-title">{data.titulo || "Co-CEOs"}</h3>
                <div className="jhe-ceo-subtitle">DIREÇÃO EXECUTIVA</div>
            </div>

            <div className="jhe-ceo-avatars-row">
                {gestores.map((gestor, idx) => (
                    <div key={idx} className="jhe-ceo-avatar-item">
                        <div className="jhe-ceo-avatar-circle">
                            {getInitials(gestor)}
                        </div>
                        <span className="jhe-ceo-avatar-name">{gestor}</span>
                    </div>
                ))}
            </div>

            {hasChildren && (
                <div className="jhe-ceo-pill-badge-container">
                    <button 
                        className="jhe-ceo-pill-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (data.onToggleCollapse) data.onToggleCollapse(data.id);
                        }}
                        title={isCollapsed ? "Expandir subordinados" : "Recolher subordinados"}
                    >
                        <span className="jhe-ceo-pill-icon">
                            {isCollapsed ? <ChevronRight size={12} strokeWidth={3}/> : <ChevronDown size={12} strokeWidth={3}/>}
                        </span>
                        <span className="jhe-ceo-pill-count">{childrenCount}</span>
                    </button>
                </div>
            )}

            <Handle type="source" position={Position.Bottom} className="jhe-handle" />
        </div>
    );
}

export default CeoNode;

