/**
 * Cabeçalho Arquitetural: Botão Flutuante de Ajuda no Canto Inferior Direito.
 * Botão circular minimalista com ícone HelpCircle (?) para abrir o modal de instruções.
 * Zero CSS inline: utiliza estilos em organograma.css.
 */

import React from 'react';
import { HelpCircle } from 'lucide-react';

function HelpFloatingBtn({ onClick }) {
    return (
        <button 
            onClick={onClick}
            className="bottom-right-help-btn"
            title="Como usar / Instruções de Navegação"
        >
            <HelpCircle size={22} />
        </button>
    );
}

export default HelpFloatingBtn;
