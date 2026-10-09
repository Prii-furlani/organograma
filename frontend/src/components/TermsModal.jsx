/**
 * Cabeçalho Arquitetural: Componente Modal Executivo de Termo de Aceite Dinâmico (Termos de Serviço).
 * Design minimalista e elegante (referência shadcn/ui).
 * Bloqueia compulsoriamente o acesso caso o usuário logado ainda não tenha aceito a versão vigente do termo no MySQL.
 * Zero CSS Inline: estilização baseada nas classes `.jhe-terms-*` em `organograma.css`.
 */

import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { fetchTermoVigente, aceitarTermo } from '../api/organogramaApi';
import { showToast } from '../utils/alerts';
import { useAuth } from '../context/AuthContext';

function TermsModal() {
    const { user, isAuthenticated, logout, updateUserSession } = useAuth();
    const [termoVigente, setTermoVigente] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Carrega o termo vigente do banco de dados quando o usuário está autenticado
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const loadTermo = async () => {
            setIsLoading(true);
            try {
                const data = await fetchTermoVigente();
                setTermoVigente(data);
            } catch (err) {
                console.error('Erro ao carregar termo de serviço vigente:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadTermo();
    }, [isAuthenticated, user]);

    // O modal só é exibido se o usuário estiver logado, não tiver primeiro acesso pendente, e a versão aceita for diferente da versão vigente
    const needsAcceptance = Boolean(
        isAuthenticated &&
        user &&
        !user.primeiro_acesso &&
        termoVigente &&
        user.termo_aceite_versao !== termoVigente.versao
    );

    if (!needsAcceptance) return null;

    // Ação de Aceite dos Termos
    const handleAccept = async () => {
        if (!termoVigente) return;
        setIsSubmitting(true);
        try {
            const res = await aceitarTermo(termoVigente.versao);
            
            // Atualiza os dados do usuário no AuthContext
            const updatedUser = {
                ...user,
                termo_aceite_versao: termoVigente.versao,
                termo_aceite_em: res.termo_aceite_em
            };
            if (updateUserSession) {
                updateUserSession(updatedUser);
            }

            showToast('Termos de Serviço aceitos com sucesso!', 'success');
        } catch (err) {
            console.error('Erro ao aceitar termos:', err);
            showToast('Não foi possível registrar o aceite. Tente novamente.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Ação de Declínio (Desloga o usuário)
    const handleDecline = () => {
        showToast('É necessário aceitar os Termos de Serviço para utilizar a plataforma.', 'warning');
        logout();
    };

    return (
        <div className="jhe-terms-overlay">
            <div className="jhe-terms-card">
                
                {/* Header Alinhado: Lado Esquerdo com Ícone + Coluna de Texto, Lado Direito com Badge de Versão */}
                <div className="jhe-terms-header">
                    <div className="jhe-terms-header-left">
                        <div className="jhe-terms-icon-box">
                            <FileText size={22} />
                        </div>
                        <div className="jhe-terms-header-text">
                            <h2 className="jhe-terms-title">
                                {termoVigente.titulo || 'Termos de Serviço'}
                            </h2>
                            <p className="jhe-terms-subtitle">
                                {termoVigente.subtitulo || 'Revise os termos antes de aceitar o acordo.'}
                            </p>
                        </div>
                    </div>
                    <span className="jhe-terms-version-badge">
                        v{termoVigente.versao || '1.0'}
                    </span>
                </div>

                {/* Caixa Central Rolável com Leitura Confortável e Tópicos Destacados */}
                <div className="jhe-terms-content-box">
                    {termoVigente.conteudo ? (
                        termoVigente.conteudo.split('\n\n').map((paragraph, index) => {
                            const match = paragraph.match(/^(\d+\.\s+[^\n]+)([\s\S]*)/);
                            if (match) {
                                return (
                                    <p key={index} className="jhe-terms-paragraph">
                                        <strong className="jhe-terms-topic-title">{match[1]}</strong>
                                        {match[2]}
                                    </p>
                                );
                            }
                            return (
                                <p key={index} className="jhe-terms-paragraph">
                                    {paragraph}
                                </p>
                            );
                        })
                    ) : null}
                </div>

                {/* Rodapé com Botões Distribuídos nas Extremidades */}
                <div className="jhe-terms-actions">
                    <button
                        type="button"
                        onClick={handleDecline}
                        disabled={isSubmitting}
                        className="jhe-terms-btn-decline"
                    >
                        <XCircle size={16} />
                        Declínio
                    </button>

                    <button
                        type="button"
                        onClick={handleAccept}
                        disabled={isSubmitting}
                        className="jhe-terms-btn-accept"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Registrando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={16} />
                                Aceite
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}

export default TermsModal;
