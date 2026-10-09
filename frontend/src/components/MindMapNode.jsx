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
    const isHighlighted = data.isHighlighted;

    // Define a classe semântica de nível hierárquico e tema sem CSS inline
    const themeClass = getLevelClasses(data.tipo);
    const collapseClass = isCollapsed ? 'node-collapsed' : 'node-expanded';
    const highlightClass = isHighlighted ? 'node-highlighted jhe-node-highlighted' : '';

    // Linha 2 (Descrição) e Linha 3 (Nível • Responsável) — suprimidas quando vazias
    const descricaoTexto = data.descricao && String(data.descricao).trim() !== ''
        ? String(data.descricao).trim()
        : '';
    const nivelTexto = data.nivel_nome ? String(data.nivel_nome).trim() : '';
    const responsavelTexto = data.responsavel ? String(data.responsavel).trim() : '';
    const metaTexto = [nivelTexto, responsavelTexto].filter(Boolean).join(' • ');


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

    // Layout especial harmonizado para o card dos Co-CEOs
    if (data.tipo === 'ceo') {
        const leaders = (data.lideres_json && Array.isArray(data.lideres_json) && data.lideres_json.length > 0)
            ? data.lideres_json
            : [
                { nome: 'Dr. Hélio', initials: 'DH' },
                { nome: 'Dr. Viol', initials: 'DV' }
            ];

        return (
            <div 
                className={`jhe-ceo-card ${collapseClass} ${scopeClass} ${highlightClass}`}
                onClick={() => {
                    if (data.onNodeClick) data.onNodeClick(data);
                }}
                title={nodeTooltip}
            >
                {/* Faixa superior integrada aos cantos superiores */}
                <div className="jhe-ceo-accent-bar" />
                
                {/* Connector Handle Superior */}
                <Handle type="target" position={Position.Top} className="node-handle node-handle-top" />
                
                {/* Botão Flutuante de Edição Rápida no Modo Edição */}
                {isEditMode && canEdit && (
                    <button
                        className="jhe-ceo-quick-edit-btn"
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

                {/* Topo Central: Título e Subtítulo Institucional */}
                <div className="jhe-ceo-header">
                    <h3 className="jhe-ceo-title">
                        {data.titulo || "Co-CEOs"}
                    </h3>
                    <div className="jhe-ceo-subtitle">
                        DIREÇÃO EXECUTIVA
                    </div>
                </div>
                
                {/* Bloco dos Sócios: Dois Avatares Circulares (46x46px) com Gap de 36px */}
                <div className="jhe-ceo-leaders-grid">
                    {leaders.map((lider, idx) => {
                        const fallbackInitials = lider.initials || (idx === 0 ? 'DH' : 'DV');
                        return (
                            <div key={idx} className="jhe-ceo-leader-item">
                                <div className="jhe-ceo-avatar-circle">
                                    {lider.foto ? (
                                        <img 
                                            src={lider.foto} 
                                            alt={lider.nome || 'Líder'} 
                                            className="jhe-ceo-avatar-img" 
                                            onError={(e) => { 
                                                e.target.classList.add('has-error'); 
                                            }} 
                                        />
                                    ) : null}
                                    <div className="jhe-ceo-avatar-fallback">
                                        {fallbackInitials}
                                    </div>
                                </div>
                                <span className="jhe-ceo-leader-name">{lider.nome}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Pílula Inferior com Contagem (∨ 10) */}
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

                {/* Connector Handle Inferior */}
                <Handle type="source" position={Position.Bottom} className="node-handle node-handle-bottom" />
            </div>
        );
    }

    // Layout padrão para os demais nós
    return (
        <div 
            className={`jhe-node-card node-standard-card ${themeClass} ${collapseClass} ${scopeClass} ${highlightClass}`}
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

            {/* Layout Interno Padronizado: Squircle à esquerda + Bloco de Texto (3 linhas) à direita */}
            <div className="jhe-node-body">
                <div className="jhe-node-icon-box">
                    <IconComponent size={20} strokeWidth={2.25} />
                </div>
                
                <div className="jhe-node-text">
                    <div className="jhe-node-name">{data.titulo}</div>

                    {descricaoTexto && (
                        <div className="jhe-node-desc">{descricaoTexto}</div>
                    )}

                    {metaTexto && (
                        <div className="jhe-node-meta">{metaTexto}</div>
                    )}
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
