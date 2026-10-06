/**
 * Cabeçalho Arquitetural: Componente de Dica/Instrução.
 * Renderiza um painel de ajuda flutuante para instruir o usuário 
 * a navegar pelo organograma interativo.
 */

import React from 'react';
import { MousePointer2, Move, ZoomIn, Hand } from 'lucide-react';

function HelpTooltip({ isVisible, onClose }) {
    if (!isVisible) return null;

    return (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-80 bg-white/95 backdrop-blur-md shadow-xl rounded-xl p-6 z-20 border border-blue-100 animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Como navegar?</h3>
            
            <ul className="space-y-4 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded text-blue-600 shrink-0">
                        <Move size={18} />
                    </div>
                    <div>
                        <strong>Mover:</strong> Clique e arraste no fundo vazio para pan/mover o mapa.
                    </div>
                </li>
                
                <li className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded text-blue-600 shrink-0">
                        <ZoomIn size={18} />
                    </div>
                    <div>
                        <strong>Zoom:</strong> Use o scroll do mouse ou pinça (touch) para dar zoom.
                    </div>
                </li>

                <li className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded text-blue-600 shrink-0">
                        <MousePointer2 size={18} />
                    </div>
                    <div>
                        <strong>Expandir/Recolher:</strong> Clique no botão (<code className="text-blue-600">v</code> / <code className="text-blue-600">^</code>) na parte inferior dos cards para mostrar ou esconder as equipes abaixo dele.
                    </div>
                </li>

                <li className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded text-blue-600 shrink-0">
                        <Hand size={18} />
                    </div>
                    <div>
                        <strong>Detalhes:</strong> Clique diretamente no card para abrir o painel lateral com mais detalhes do setor.
                    </div>
                </li>
            </ul>

            <button 
                onClick={onClose}
                className="mt-6 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
                Entendi
            </button>
        </div>
    );
}

export default HelpTooltip;
