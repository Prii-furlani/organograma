/**
 * Cabeçalho Arquitetural: Componente Modal de Confirmação de Segurança (AlertDialog).
 * Exibido antes de ações destrutivas (como exclusão de áreas no organograma).
 * Alerta sobre exclusões em cascata quando a área possui nós subordinados cadastrados.
 * Zero CSS inline: estilizado via `.jhe-alert-box` e utilitários em organograma.css.
 */

import React from 'react';
import { AlertTriangle, Trash2, Loader2, ShieldAlert } from 'lucide-react';

function AlertDialog({
    isOpen,
    title = 'Tem certeza que deseja excluir esta área?',
    nodeTitle = '',
    childrenCount = 0,
    onConfirm,
    onCancel,
    isSubmitting = false
}) {
    if (!isOpen) return null;

    return (
        <div className="jhe-alert-backdrop">
            <div className="jhe-alert-box">
                {/* Cabeçalho de Alerta */}
                <div className="jhe-alert-header">
                    <ShieldAlert className="jhe-alert-icon" size={24} />
                    <h3 className="jhe-alert-title">{title}</h3>
                </div>

                {/* Corpo com Detalhes e Mensagens */}
                <div className="jhe-alert-body">
                    <p className="jhe-alert-message">
                        Você está prestes a excluir a área <strong>"{nodeTitle}"</strong>.
                    </p>

                    {childrenCount > 0 ? (
                        <div className="jhe-alert-warning-banner">
                            <AlertTriangle className="jhe-alert-warning-icon" size={20} />
                            <div>
                                <strong>Atenção: Ação Irreversível!</strong>
                                <p>
                                    Este setor possui <strong>{childrenCount} nó(s) subordinado(s)</strong> cadastrado(s). 
                                    Ao confirmar a exclusão, todos os nós descendentes também serão excluídos em cascata do banco de dados.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="drawer-help-text">
                            Esta área não possui subordinados vinculados. A exclusão removerá permanentemente o registro da tabela <code>organograma_nos</code>.
                        </p>
                    )}
                </div>

                {/* Rodapé com Botões de Ação */}
                <div className="jhe-alert-footer">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="jhe-alert-btn-cancel"
                    >
                        Cancelar
                    </button>
                    
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="jhe-alert-btn-confirm"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Excluindo...
                            </>
                        ) : (
                            <>
                                <Trash2 size={16} />
                                Confirmar Exclusão
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AlertDialog;
