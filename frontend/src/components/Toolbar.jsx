/**
 * Cabeçalho Arquitetural: Barra de Ferramentas Superior.
 * Fornece botões utilitários para controlar o mapa, como zoom, centralização,
 * e um botão de ajuda.
 */

import React from 'react';
import { ZoomIn, ZoomOut, Maximize, HelpCircle } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

function Toolbar({ onToggleHelp }) {
    const { zoomIn, zoomOut, fitView } = useReactFlow();

    return (
        <div className="toolbar-container">
            <button 
                onClick={() => zoomIn()} 
                className="toolbar-btn"
                title="Aumentar Zoom"
            >
                <ZoomIn size={20} />
            </button>
            <button 
                onClick={() => zoomOut()} 
                className="toolbar-btn"
                title="Diminuir Zoom"
            >
                <ZoomOut size={20} />
            </button>
            <button 
                onClick={() => fitView({ duration: 800 })} 
                className="toolbar-btn"
                title="Centralizar Organograma"
            >
                <Maximize size={20} />
            </button>
            
            <div className="toolbar-divider"></div>
            
            <button 
                onClick={onToggleHelp} 
                className="help-btn"
                title="Ajuda e Navegação"
            >
                <HelpCircle size={18} />
                Como usar
            </button>
        </div>
    );
}

export default Toolbar;
