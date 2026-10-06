/**
 * Cabeçalho Arquitetural: Componente visual que representa cada nó no React Flow.
 * Estilizado sem uso de inline styles, utilizando classes mapeadas e variáveis de CSS (paleta JHE).
 * Contém um botão expansível (+/-) e ícones baseados no tipo do nó.
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Users, Building, Shield, Target, Activity, Settings, BarChart } from 'lucide-react';

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
    // Padrão
    default: Users
};

/**
 * Renderiza um nó do organograma com título, tipo e botão de expansão de filhos.
 */
function MindMapNode({ data }) {
    const IconComponent = IconMap[data.icone] || IconMap.default;
    
    const isCollapsed = data.isCollapsed;
    const hasChildren = data.hasChildren;

    // Define a classe de tema baseada no tipo para aplicar as cores corporativas sem CSS inline
    const themeClass = data.tipo ? `type-${data.tipo}` : 'type-default';
    const collapseClass = isCollapsed ? 'node-collapsed' : 'node-expanded';

    // Layout especial para o card dos Co-CEOs
    if (data.tipo === 'ceo' && data.lideres_json && Array.isArray(data.lideres_json)) {
        return (
            <div 
                className={`jhe-node-card ${themeClass} ${collapseClass}`}
                onClick={() => {
                    if (data.onNodeClick) data.onNodeClick(data);
                }}
                title="Clique no nó para ver detalhes no modal lateral"
            >
                <Handle type="target" position={Position.Top} id="top" className="!w-2 !h-2 !bg-transparent !border-none" />
                
                <h3 className="node-title ceo-title">
                    {data.titulo}
                </h3>
                
                <div className="ceo-leaders-container">
                    {data.lideres_json.map((lider, idx) => (
                        <div key={idx} className="ceo-leader-item">
                            <div className="ceo-avatar-wrapper">
                                <img src={lider.foto} alt={lider.nome} className="ceo-avatar" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + lider.nome + '&background=0f172a&color=fff'; }} />
                            </div>
                            <span className="ceo-name">{lider.nome}</span>
                        </div>
                    ))}
                </div>

                {hasChildren && (
                    <button 
                        className="collapse-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (data.onToggleCollapse) data.onToggleCollapse(data.id);
                        }}
                        title={isCollapsed ? "Expandir subordinados" : "Recolher subordinados"}
                    >
                        {isCollapsed ? '+' : '−'}
                    </button>
                )}

                <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-transparent !border-none" />
                <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !bg-transparent !border-none" />
            </div>
        );
    }

    // Layout padrão para os demais nós
    return (
        <div 
            className={`jhe-node-card ${themeClass} ${collapseClass}`}
            onClick={() => {
                if (data.onNodeClick) data.onNodeClick(data);
            }}
            title="Clique no nó para ver detalhes no modal lateral"
        >
            {/* Conector Superior */}
            <Handle type="target" position={Position.Top} id="top" className="!w-2 !h-2 !bg-transparent !border-none" />
            <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !bg-transparent !border-none" />
            
            {/* Conectores Laterais (Usados pelo Staff e Barramento) */}
            <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !bg-transparent !border-none" />
            <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !bg-transparent !border-none" />
            
            <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !bg-transparent !border-none" />
            <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !bg-transparent !border-none" />
            
            {/* Ícone e Título */}
            <div className="icon-container">
                <IconComponent size={24} />
            </div>
            
            <h3 className="node-title">
                {data.titulo}
            </h3>
            
            <span className="node-badge text-muted">
                {data.tipo}
            </span>
            
            {data.responsavel && (
                <span className="node-responsavel text-muted">
                    {data.responsavel}
                </span>
            )}

            {/* Botão de expandir/recolher filhos (+ / -) */}
            {hasChildren && (
                <button 
                    className="collapse-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (data.onToggleCollapse) data.onToggleCollapse(data.id);
                    }}
                    title={isCollapsed ? "Expandir subordinados" : "Recolher subordinados"}
                >
                    {isCollapsed ? '+' : '−'}
                </button>
            )}

            {/* Conectores Inferiores */}
            <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-transparent !border-none" />
            <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !bg-transparent !border-none" />
        </div>
    );
}

export default MindMapNode;
