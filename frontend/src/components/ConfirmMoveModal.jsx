import React, { useEffect, useRef } from 'react';
import { ArrowRight, CornerDownRight, X } from 'lucide-react';
import { updateNode } from '../api/organogramaApi';
import { useToast } from '../context/ToastContext';

function ConfirmMoveModal({ isOpen, onClose, draggedNode, targetNode, onRefreshTree }) {
    const confirmBtnRef = useRef(null);
    const { addToast } = useToast();

    // Foco automático e tecla ESC
    useEffect(() => {
        if (isOpen) {
            // Dá um pequeno tempo para o modal renderizar antes de focar
            setTimeout(() => {
                if (confirmBtnRef.current) {
                    confirmBtnRef.current.focus();
                }
            }, 100);

            const handleKeyDown = (e) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    if (!isOpen || !draggedNode || !targetNode) return null;

    const handleConfirm = async () => {
        try {
            await updateNode(draggedNode.id, { parent_id: targetNode.id });
            onRefreshTree();
            addToast({
                title: 'Área Movimentada',
                message: `"${draggedNode.titulo}" agora responde a "${targetNode.titulo}".`,
                type: 'success'
            });
            onClose();
        } catch (error) {
            console.error('Erro ao mover nó:', error);
            addToast({
                title: 'Erro de Movimentação',
                message: 'Não foi possível alterar a subordinação.',
                type: 'error'
            });
            onClose();
        }
    };

    return (
        <div className="jhe-move-overlay" onClick={onClose}>
            <div className="jhe-move-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="jhe-move-header">
                    <div className="jhe-move-header-left">
                        <div className="jhe-move-icon-wrapper">
                            <ArrowRight size={24} strokeWidth={2.5} />
                        </div>
                        <div className="jhe-move-title-block">
                            <span className="jhe-move-category">Reorganizar Estrutura</span>
                            <h2 className="jhe-move-title">Confirmar nova liderança?</h2>
                        </div>
                    </div>
                    <button className="jhe-move-close-btn" onClick={onClose} title="Cancelar e Fechar">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="jhe-move-body">
                    <div className="jhe-move-compare-container">
                        {/* Card Esquerdo (Quem se move) */}
                        <div className="jhe-move-card">
                            <span className="jhe-move-card-label">Área Movimentada</span>
                            <span className="jhe-move-card-title">{draggedNode.titulo}</span>
                            <span className="jhe-move-card-subtitle">{draggedNode.descricao || draggedNode.tipo || 'Área'}</span>
                        </div>

                        {/* Seta Divisória */}
                        <div className="jhe-move-arrow-center">
                            <CornerDownRight size={28} strokeWidth={2} />
                        </div>

                        {/* Card Direito (Novo Pai) */}
                        <div className="jhe-move-card">
                            <span className="jhe-move-card-label">Nova Área Superior</span>
                            <span className="jhe-move-card-title">{targetNode.titulo}</span>
                            <span className="jhe-move-card-subtitle">{targetNode.descricao || targetNode.tipo || 'Liderança Executiva'}</span>
                        </div>
                    </div>

                    <div className="jhe-move-banner">
                        Todos os subordinados de <strong>{draggedNode.titulo}</strong> acompanham o card e permanecem vinculados à mesma estrutura.
                    </div>
                </div>

                {/* Footer */}
                <div className="jhe-move-footer">
                    <button className="jhe-move-btn-cancel" onClick={onClose}>
                        Cancelar
                    </button>
                    <button 
                        ref={confirmBtnRef}
                        className="jhe-move-btn-confirm" 
                        onClick={handleConfirm}
                    >
                        Confirmar movimentação
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmMoveModal;
