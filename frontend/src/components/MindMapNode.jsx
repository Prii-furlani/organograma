/**
 * Cabeçalho Arquitetural: Componente visual que representa cada nó no React Flow.
 * Estilizado sem uso de inline styles, utilizando classes mapeadas e variáveis de CSS (paleta JHE).
 * Exibe botões de expandir (+/-) e botão flutuante de Edição Rápida quando no Modo Edição.
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Users, Building, Shield, Target, Activity, Settings, BarChart, Edit3, Lock, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Mapeia os ícones armazenados no banco para os componentes Lucide reais.
 */
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

/**
 * Mapeia o tipo do nó para as classes semânticas de nível hierárquico (Design Tokens JHE).
 */
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

/**
 * Renderiza um nó do organograma com título, tipo e botões de ação e expansão.
 */
function MindMapNode({ data }) {
    const IconComponent = IconMap[data.icone] || IconMap.default;
    
    const isCollapsed = data.isCollapsed;
    const hasChildren = data.hasChildren;
    const childrenCount = data.childrenCount || 0;
    const isEditMode = data.isEditMode;
    const canEdit = data.canEdit;

    // Define a classe semântica de nível hierárquico e tema sem CSS inline
    const themeClass = getLevelClasses(data.tipo);
    const collapseClass = isCollapsed ? 'node-collapsed' : 'node-expanded';

    // Determina a classe de escopo RBAC no Modo Edição
    let scopeClass = '';
    let nodeTooltip = 'Clique no nó para ver detalhes no modal lateral';

    if (isEditMode) {
        if (canEdit) {
            scopeClass = 'node-editable-scope';
            nodeTooltip = 'Você possui permissão de edição para esta área.';
        } else {
            scopeClass = 'node-locked-scope';
            nodeTooltip = 'Área sob gestão de outra liderança (somente leitura)';
        }
    }

    // Layout especial para o card dos Co-CEOs
    if (data.tipo === 'ceo' && data.lideres_json && Array.isArray(data.lideres_json)) {
        return (
            <div 
                className={`jhe-node-card node-ceo-card ${themeClass} ${collapseClass} ${scopeClass}`}
                onClick={() => {
                    if (data.onNodeClick) data.onNodeClick(data);
                }}
                title={nodeTooltip}
            >
                <div className="node-accent-bar" />
                <Handle type="target" position={Position.Top} className="node-handle node-handle-top" />
                
                {isEditMode && canEdit && (
                    <button
                        className="node-quick-edit-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (data.onEditNode) data.onEditNode(data);
                        }}
                        title="Editar esta área"
                    >
                        <Edit3 size={14} />
                    </button>
                )}

                <h3 className="node-title ceo-title">
                    {data.titulo}
                </h3>
                
                <div className="ceo-leaders-container">
                    {data.lideres_json.map((lider, idx) => {
                        const fallbackInitials = idx === 0 ? 'DH' : 'DV';
                        return (
                            <div key={idx} className="ceo-leader-item">
                                <div className="ceo-avatar-wrapper squircle">
                                    <img 
                                        src={lider.foto} 
                                        alt={lider.nome} 
                                        className="ceo-avatar" 
                                        onError={(e) => { 
                                            e.target.style.display = 'none'; 
                                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; 
                                        }} 
                                    />
                                    <div className="ceo-avatar-fallback">
                                        {fallbackInitials}
                                    </div>
                                </div>
                                <span className="ceo-name">{lider.nome}</span>
                            </div>
                        );
                    })}
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
                            <span className="pill-icon">{isCollapsed ? <ChevronRight size={12} strokeWidth={3}/> : <ChevronDown size={12} strokeWidth={3}/>}</span>
                            <span className="pill-count">{childrenCount}</span>
                        </button>
                    </div>
                )}

                <Handle type="source" position={Position.Bottom} className="node-handle node-handle-bottom" />
            </div>
        );
    }

    // Layout padrão para os demais nós
    return (
        <div 
            className={`jhe-node-card node-standard-card ${themeClass} ${collapseClass} ${scopeClass}`}
            onClick={() => {
                if (data.onNodeClick) data.onNodeClick(data);
            }}
            title={nodeTooltip}
        >
            <div className="node-accent-bar" />
            
            {/* Conector Superior */}
            <Handle type="target" position={Position.Top} className="node-handle node-handle-top" />
            
            {/* Conectores Laterais Exclusivos para a Espinha Dorsal e Barramento */}
            <Handle type="target" position={Position.Left} id="left-target" className="node-handle node-handle-left-target" />
            <Handle type="target" position={Position.Right} id="right-target" className="node-handle node-handle-right-target" />
            <Handle type="source" position={Position.Left} id="left" className="node-handle node-handle-left" />
            <Handle type="source" position={Position.Right} id="right" className="node-handle node-handle-right" />
            
            {/* Botão Flutuante de Edição Rápida (Exibido no Modo Edição para Usuários com Permissão) */}
            {isEditMode && canEdit && (
                <button
                    className="node-quick-edit-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (data.onEditNode) data.onEditNode(data);
                    }}
                    title="Editar esta área"
                >
                    <Edit3 size={14} />
                </button>
            )}

            {isEditMode && !canEdit && (
                <div className="node-locked-badge" title="Área sob gestão de outra liderança (somente leitura)">
                    <Lock size={12} />
                </div>
            )}

            {/* Layout Interno - Duas Colunas (Icone + Textos) */}
            <div className="node-content-horizontal">
                {/* Coluna Esquerda: Squircle */}
                <div className="node-avatar-block squircle">
                    <IconComponent size={20} className="node-avatar-icon" />
                </div>
                
                {/* Coluna Direita: Textos Hierárquicos */}
                <div className="node-text-block">
                    <div className="node-title">{data.titulo}</div>
                    
                    {data.descricao || data.responsavel ? (
                        <div className="node-responsavel-text">{data.descricao || data.responsavel}</div>
                    ) : (
                        <div className="node-responsavel-text empty-responsavel">—</div>
                    )}
                    
                    <div className="node-area-text">{data.tipo || 'Área'}</div>
                </div>
            </div>

            {/* Expander Pill */}
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
                        <span className="pill-icon">{isCollapsed ? <ChevronRight size={12} strokeWidth={3}/> : <ChevronDown size={12} strokeWidth={3}/>}</span>
                        <span className="pill-count">{childrenCount}</span>
                    </button>
                </div>
            )}

            {/* Conector Inferior */}
            <Handle type="source" position={Position.Bottom} id="bottom" className="node-handle node-handle-bottom" />
        </div>
    );
}

export default MindMapNode;
