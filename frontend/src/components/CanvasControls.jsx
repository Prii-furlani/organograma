/**
 * Cabeçalho Arquitetural: Barra Flutuante de Controles do Canvas no Canto Inferior Esquerdo.
 * Centraliza os botões de Zoom, Centralização (FitView), Alternância de Tema (Sol/Lua)
 * e Trava de Interatividade do Canvas (Lock/Unlock).
 * Zero CSS inline: utiliza estilos em organograma.css.
 */

import React from 'react';
import { ZoomIn, ZoomOut, Maximize, Sun, Moon, Lock, Unlock, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

function CanvasControls({ 
    isDark, 
    onToggleDarkMode, 
    isCanvasLocked, 
    onToggleCanvasLock,
    onExpandAll,
    onCollapseAll
}) {
    const { zoomIn, zoomOut, fitView } = useReactFlow();

    return (
        <div className="bottom-left-toolbar">
            <button 
                onClick={() => zoomIn()} 
                className="canvas-control-btn"
                title="Aumentar Zoom (+)"
            >
                <ZoomIn size={18} />
            </button>

            <button 
                onClick={() => zoomOut()} 
                className="canvas-control-btn"
                title="Diminuir Zoom (-)"
            >
                <ZoomOut size={18} />
            </button>

            <button 
                onClick={() => fitView({ duration: 800 })} 
                className="canvas-control-btn"
                title="Centralizar Organograma (FitView)"
            >
                <Maximize size={18} />
            </button>

            <div className="canvas-toolbar-divider"></div>

            <button 
                onClick={onExpandAll} 
                className="canvas-control-btn"
                title="Expandir toda a estrutura"
            >
                <ChevronsUpDown size={18} />
            </button>

            <button 
                onClick={onCollapseAll} 
                className="canvas-control-btn"
                title="Recolher para nível Co-CEOs"
            >
                <ChevronsDownUp size={18} />
            </button>

            <div className="canvas-toolbar-divider"></div>

            <button 
                onClick={onToggleDarkMode} 
                className="canvas-control-btn canvas-theme-btn"
                title={isDark ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
            >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button 
                onClick={onToggleCanvasLock} 
                className={`canvas-control-btn ${isCanvasLocked ? 'canvas-locked-active' : ''}`}
                title={isCanvasLocked ? "Canvas Travado (Clique para Destravar Navegação)" : "Travar Navegação do Canvas"}
            >
                {isCanvasLocked ? <Lock size={18} /> : <Unlock size={18} />}
            </button>
        </div>
    );
}

export default CanvasControls;
