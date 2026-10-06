/**
 * Cabeçalho Arquitetural: Componente de Painel Lateral/Modal.
 * Exibe os detalhes completos de um nó selecionado pelo usuário.
 * Melhora a acessibilidade e a visualização de textos longos (como descrições).
 */

import React from 'react';
import { X, Mail, User, Info } from 'lucide-react';

/**
 * Renderiza os detalhes de um nó quando clicado.
 * @param {Object} props.nodeData - Dados do nó selecionado
 * @param {Function} props.onClose - Função para fechar o modal
 */
function NodeDetailsModal({ nodeData, onClose }) {
    if (!nodeData) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col">
            {/* Header com a cor do tema */}
            <div 
                className={`p-6 text-white relative bg-theme-${nodeData.tipo || 'default'}`}
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-1 rounded-full transition-colors"
                    title="Fechar detalhes"
                >
                    <X size={24} />
                </button>
                <h2 className="text-2xl font-bold pr-8">{nodeData.titulo}</h2>
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-semibold uppercase tracking-wider mt-2">
                    {nodeData.tipo}
                </span>
            </div>

            {/* Corpo de Detalhes */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
                
                {/* Responsável */}
                <div>
                    <h3 className="text-gray-500 font-semibold text-sm flex items-center gap-2 mb-1">
                        <User size={16} /> Responsável / Liderança
                    </h3>
                    <p className="text-lg font-medium text-gray-800">
                        {nodeData.responsavel || 'Não definido'}
                    </p>
                </div>

                {/* E-mail */}
                {nodeData.email_contato && (
                    <div>
                        <h3 className="text-gray-500 font-semibold text-sm flex items-center gap-2 mb-1">
                            <Mail size={16} /> E-mail de Contato
                        </h3>
                        <a href={`mailto:${nodeData.email_contato}`} className="text-blue-600 hover:underline">
                            {nodeData.email_contato}
                        </a>
                    </div>
                )}

                {/* Descrição */}
                <div>
                    <h3 className="text-gray-500 font-semibold text-sm flex items-center gap-2 mb-2">
                        <Info size={16} /> Atribuições e Descrição
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-700 leading-relaxed">
                        {nodeData.descricao || 'Nenhuma descrição detalhada informada.'}
                    </div>
                </div>
                
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 text-center">
                <button 
                    onClick={onClose}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
                >
                    Fechar
                </button>
            </div>
        </div>
    );
}

export default NodeDetailsModal;
