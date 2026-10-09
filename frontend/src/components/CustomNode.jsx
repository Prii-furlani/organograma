/**
 * Cabeçalho Arquitetural: Componente CustomNode para renderização dos Cards do Organograma (JHE Engenharia).
 * Dimensão padronizada: largura de 260px e altura de 88px/92px.
 * Handles: Position.Top (in), Position.Bottom (out), Position.Left e Position.Right com a classe jhe-handle.
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Users, Building, Shield, Target, Activity, Settings, BarChart, ChevronDown, ChevronRight } from 'lucide-react';

const IconMap = {
    users: Users,
    building: Building,
    shield: Shield,
    target: Target,
    activity: Activity,
    settings: Settings,
    barChart: BarChart,
    default: Users
};

const getLevelClasses = (tipo) => {
    switch (tipo) {
        case 'ceo':
            return 'level-ceo type-ceo';
        case 'diretoria':
        case 'oia':
            return 'level-diretoria type-diretoria';
        case 'staff':
            return 'level-staff type-staff';
        case 'gerencia':
        case 'coordenacao':
        case 'unidade':
            return `level-coordenacao level-gerencia type-${tipo || 'gerencia'}`;
        case 'apoio':
        case 'equipe':
        case 'contrato':
        default:
            return `level-subordinado level-apoio type-${tipo || 'apoio'}`;
    }
};

export function CustomNode({ data }) {
    const IconComponent = IconMap[data.icone] || IconMap.default;
    
    const isCollapsed = data.isCollapsed;
    const hasChildren = data.hasChildren;
    const childrenCount = data.childrenCount || 0;
    const isEditMode = data.isEditMode;
    const canEdit = data.canEdit;
    const isHighlighted = data.isHighlighted;

    const themeClass = getLevelClasses(data.tipo);
    const collapseClass = isCollapsed ? 'node-collapsed' : 'node-expanded';
    const highlightClass = isHighlighted ? 'node-highlighted jhe-node-highlighted' : '';

    const descricaoTexto = data.descricao && String(data.descricao).trim() !== ''
        ? String(data.descricao).trim()
        : '';
    const nivelTexto = data.nivel_nome ? String(data.nivel_nome).trim() : '';
    const responsavelTexto = data.responsavel ? String(data.responsavel).trim() : '';
    const metaTexto = [nivelTexto, responsavelTexto].filter(Boolean).join(' • ');

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

    const isRootCeo = data.isRootCeo !== undefined 
        ? data.isRootCeo 
        : (String(data.id) === '1' && (data.parent_id === null || data.parent_id === undefined));

    if (isRootCeo) {
        const gestoresString = data.responsavel || data.gestor || "Dr. Hélio, Dr. Viol";
        const gestores = gestoresString
            .split(",")
            .map((nome) => nome.trim())
            .filter(Boolean);

        const getInitials = (nome) => {
            if (!nome) return 'DH';
            const partes = nome.trim().split(/\s+/).filter(Boolean);
            if (partes.length === 0) return 'DH';
            if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
            return (partes[0][0] + partes[1][0]).toUpperCase();
        };

        return (
            <div 
                className={`jhe-ceo-card ${collapseClass} ${scopeClass} ${highlightClass}`}
                onClick={() => data.onNodeClick && data.onNodeClick(data)}
                title={nodeTooltip}
            >
                <div className="jhe-ceo-accent-bar" />
                <Handle type="target" position={Position.Top} id="in" className="jhe-handle" />

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

                <Handle type="source" position={Position.Bottom} id="out" className="jhe-handle" />
            </div>
        );
    }

    return (
        <div 
            className={`jhe-node-card node-standard-card ${themeClass} ${collapseClass} ${scopeClass} ${highlightClass}`}
            onClick={() => data.onNodeClick && data.onNodeClick(data)}
            title={nodeTooltip}
        >
            <div className="node-accent-bar" />
            
            {/* Conectores Universais Padrão */}
            <Handle type="target" position={Position.Top} className="jhe-handle" />
            <Handle type="source" position={Position.Bottom} className="jhe-handle" />

            <div className="jhe-node-body">
                <div className="jhe-node-icon-box">
                    <IconComponent size={20} strokeWidth={2.25} />
                </div>
                
                <div className="jhe-node-text">
                    <div className="jhe-node-name">{data.titulo}</div>
                    {descricaoTexto && <div className="jhe-node-desc">{descricaoTexto}</div>}
                    {metaTexto && <div className="jhe-node-meta">{metaTexto}</div>}
                </div>
            </div>

            {hasChildren && (
                <div className="node-pill-badge-container">
                    <button 
                        className="node-pill-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (data.onToggleCollapse) data.onToggleCollapse(data.id);
                        }}
                        title={isCollapsed ? "Expandir subordinados" : "Recolher subordinados"}
                    >
                        <span className="pill-icon">
                            {isCollapsed ? <ChevronRight size={12} strokeWidth={3}/> : <ChevronDown size={12} strokeWidth={3}/>}
                        </span>
                        <span className="pill-count">{childrenCount}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default CustomNode;
