/**
 * Cabeçalho Arquitetural: Componente Modal Executivo de Redefinição/Alteração de Senha.
 * Suporta modo Forçado (`isFirstAccess = true` no 1º login) e Modo Voluntário (`isFirstAccess = false` no menu de usuário).
 * Zero CSS Inline: estilização baseada nas classes `.jhe-first-password-*` em `organograma.css`.
 */

import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Loader2, ShieldCheck, X } from 'lucide-react';
import { definirPrimeiraSenha } from '../api/organogramaApi';
import { showToast } from '../utils/alerts';
import { useAuth } from '../context/AuthContext';

function FirstPasswordModal({ isOpen, onClose, isFirstAccess = false, onSuccess }) {
    const { user, token, updateUserData } = useAuth();
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
    const [showNovaSenha, setShowNovaSenha] = useState(false);
    const [showConfirmSenha, setShowConfirmSenha] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    if (!isOpen) return null;

    const handleCloseModal = () => {
        if (!isFirstAccess && onClose) {
            setNovaSenha('');
            setConfirmacaoSenha('');
            setErrorMsg(null);
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!novaSenha || novaSenha.trim().length < 6) {
            setErrorMsg('A nova senha deve possuir no mínimo 6 caracteres.');
            return;
        }

        if (novaSenha !== confirmacaoSenha) {
            setErrorMsg('A confirmação de senha não coincide com a nova senha.');
            return;
        }

        setIsSubmitting(true);

        try {
            const data = await definirPrimeiraSenha(
                novaSenha,
                confirmacaoSenha,
                user?.id,
                user?.email,
                token
            );

            // Atualiza o estado de sessão do usuário no AuthContext
            if (updateUserData) {
                updateUserData(data.user, data.token);
            }

            const successMessage = isFirstAccess 
                ? 'Senha configurada com sucesso!' 
                : 'Senha alterada com sucesso!';

            showToast(successMessage, 'success');

            if (onSuccess) {
                onSuccess(data);
            }

            if (!isFirstAccess && onClose) {
                setNovaSenha('');
                setConfirmacaoSenha('');
                onClose();
            }
        } catch (err) {
            console.error('Erro ao redefinir senha:', err);
            const errText = err.response?.data?.error || 'Erro ao redefinir senha. Tente novamente.';
            setErrorMsg(errText);
            showToast(errText, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="jhe-first-password-overlay">
            <div className="jhe-first-password-card">
                
                {/* Botão de Fechar (Apenas quando for alteração voluntária no menu) */}
                {!isFirstAccess && (
                    <button 
                        type="button" 
                        onClick={handleCloseModal} 
                        className="modal-close-btn jhe-password-close-pos" 
                        title="Fechar janela (Esc)"
                    >
                        <X size={20} />
                    </button>
                )}

                {/* Header Executivo em Squircle */}
                <div className="jhe-first-password-header">
                    <div className="jhe-first-password-icon-squircle">
                        <KeyRound size={28} />
                    </div>
                    <div>
                        <h2 className="jhe-first-password-title">
                            {isFirstAccess ? 'Bem-vindo à JHE Engenharia' : 'Alterar Senha de Acesso'}
                        </h2>
                        <p className="jhe-first-password-subtitle">
                            {isFirstAccess 
                                ? 'Por segurança, redefina sua senha de primeiro acesso para continuar.' 
                                : 'Defina sua nova credencial de acesso à plataforma.'
                            }
                        </p>
                    </div>
                </div>

                {/* Banner de Erro */}
                {errorMsg && (
                    <div className="drawer-error-banner">
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Formulário de Redefinição */}
                <form onSubmit={handleSubmit} className="jhe-first-password-form">
                    
                    {/* Campo 1: Nova Senha */}
                    <div className="jhe-first-password-field">
                        <label className="jhe-first-password-label">
                            Nova Senha *
                        </label>
                        <div className="jhe-first-password-input-wrapper">
                            <input
                                type={showNovaSenha ? 'text' : 'password'}
                                required
                                value={novaSenha}
                                onChange={(e) => setNovaSenha(e.target.value)}
                                placeholder="Digite sua nova senha (mínimo 6 dígitos)"
                                className="jhe-first-password-input"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowNovaSenha(!showNovaSenha)}
                                className="jhe-first-password-toggle-btn"
                                title={showNovaSenha ? "Ocultar senha" : "Exibir senha"}
                            >
                                {showNovaSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Campo 2: Confirme a Nova Senha */}
                    <div className="jhe-first-password-field">
                        <label className="jhe-first-password-label">
                            Confirme a Nova Senha *
                        </label>
                        <div className="jhe-first-password-input-wrapper">
                            <input
                                type={showConfirmSenha ? 'text' : 'password'}
                                required
                                value={confirmacaoSenha}
                                onChange={(e) => setConfirmacaoSenha(e.target.value)}
                                placeholder="Confirme sua nova senha"
                                className="jhe-first-password-input"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmSenha(!showConfirmSenha)}
                                className="jhe-first-password-toggle-btn"
                                title={showConfirmSenha ? "Ocultar senha" : "Exibir senha"}
                            >
                                {showConfirmSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="jhe-password-modal-actions">
                        {!isFirstAccess && (
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                disabled={isSubmitting}
                                className="jhe-password-btn-cancel"
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="jhe-password-btn-submit"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {isFirstAccess ? 'Configurando Senha...' : 'Salvando...'}
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={18} />
                                    {isFirstAccess ? 'Salvar Senha e Acessar' : 'Salvar Nova Senha'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default FirstPasswordModal;
