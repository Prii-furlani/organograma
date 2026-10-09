/**
 * Cabeçalho Arquitetural: Card Flutuante Suspenso de Detalhes da Posição (Floating Detail Card).
 * Renderização condicional estrita: exibe apenas campos efetivamente preenchidos (sem placeholders).
 * Zero CSS inline: estilização exclusiva via classes em organograma.css (Light & Dark).
 */

import React from 'react';
import { Briefcase, X, MapPin, Mail, Phone, FileText } from 'lucide-react';

function NodeDetailsModal({ nodeData, onClose }) {
    if (!nodeData) return null;

    // Formatação amigável do nome do nível hierárquico
    const formatLevelName = (tipo) => {
        if (!tipo) return 'POSIÇÃO INST.';
        switch (String(tipo).toLowerCase()) {
            case 'ceo': return 'CO-CEOS';
            case 'diretoria': return 'DIRETORIA';
            case 'oia': return 'OIA / ASSESSORIA';
            case 'staff': return 'STAFF';
            case 'gerencia': return 'GERÊNCIA';
            case 'coordenacao': return 'COORDENAÇÃO';
            case 'unidade': return 'UNIDADE DE NEGÓCIOS';
            case 'apoio': return 'APOIO';
            case 'equipe': return 'EQUIPE';
            case 'contrato': return 'CONTRATO';
            default: return String(tipo).toUpperCase();
        }
    };

    const responsavelText = nodeData.responsavel ? String(nodeData.responsavel).trim() : '';
    const emailValue = (nodeData.email_contato || nodeData.email || '').trim();
    const telefoneText = nodeData.telefone ? String(nodeData.telefone).trim() : '';
    const descricaoText = nodeData.descricao ? String(nodeData.descricao).trim() : '';

    const hasResponsavel = Boolean(responsavelText);
    const hasEmail = Boolean(emailValue);
    const hasTelefone = Boolean(telefoneText);
    const hasDescricao = Boolean(descricaoText);
    const hasAnyDetails = hasResponsavel || hasEmail || hasTelefone || hasDescricao;

    return (
        <div className="jhe-floating-detail-card">
            {/* Topo do Card (Header) */}
            <div className="jhe-floating-card-header">
                {/* Esquerda: Ícone de Maleta em Squircle (42x42px) */}
                <div className="jhe-floating-icon-squircle">
                    <Briefcase size={20} className="jhe-floating-briefcase-icon" />
                </div>

                {/* Direita: Botão de fechar (X) em Squircle arredondado */}
                <button 
                    onClick={onClose}
                    className="jhe-floating-close-btn"
                    title="Fechar detalhes"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Conteúdo Principal (Body) */}
            <div className="jhe-floating-card-body">
                {/* Rótulo Superior em Caixa Alta */}
                <div className="jhe-floating-label">
                    DETALHES DA POSIÇÃO
                </div>

                {/* Título: Nome do card selecionado em negrito 19px */}
                <h2 className="jhe-floating-title">
                    {nodeData.titulo || "Sem Nome"}
                </h2>

                {/* Nível: Badge em tom ocre */}
                <div className="jhe-floating-badge-container">
                    <span className="jhe-floating-badge">
                        {formatLevelName(nodeData.nivel_nome || nodeData.tipo)}
                    </span>
                </div>

                {/* Lista de Dados com Divisores Sutis - Renderização Condicional Estrita */}
                {hasAnyDetails && (
                    <div className="jhe-floating-data-list">
                        {/* ÁREA / GESTOR */}
                        {hasResponsavel && (
                            <div className="jhe-floating-data-item">
                                <div className="jhe-floating-item-icon">
                                    <MapPin size={16} />
                                </div>
                                <div className="jhe-floating-item-text">
                                    <span className="jhe-floating-item-label">RESPONSÁVEL / GESTOR</span>
                                    <span className="jhe-floating-item-value">
                                        {responsavelText}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* E-MAIL DE CONTATO */}
                        {hasEmail && (
                            <div className="jhe-floating-data-item">
                                <div className="jhe-floating-item-icon">
                                    <Mail size={16} />
                                </div>
                                <div className="jhe-floating-item-text">
                                    <span className="jhe-floating-item-label">E-MAIL DE CONTATO</span>
                                    <span className="jhe-floating-item-value">
                                        <a href={`mailto:${emailValue}`} className="jhe-floating-link">
                                            {emailValue}
                                        </a>
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* TELEFONE INSTITUCIONAL */}
                        {hasTelefone && (
                            <div className="jhe-floating-data-item">
                                <div className="jhe-floating-item-icon">
                                    <Phone size={16} />
                                </div>
                                <div className="jhe-floating-item-text">
                                    <span className="jhe-floating-item-label">TELEFONE INSTITUCIONAL</span>
                                    <span className="jhe-floating-item-value">
                                        {telefoneText}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* ATRIBUIÇÕES / DESCRIÇÃO */}
                        {hasDescricao && (
                            <div className="jhe-floating-data-item">
                                <div className="jhe-floating-item-icon">
                                    <FileText size={16} />
                                </div>
                                <div className="jhe-floating-item-text">
                                    <span className="jhe-floating-item-label">ATRIBUIÇÕES</span>
                                    <span className="jhe-floating-item-value">
                                        {descricaoText}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Rodapé: Dica de uso */}
            <div className="jhe-floating-card-footer">
                <p className="jhe-floating-hint-text">
                    Use os controles <strong className="jhe-floating-hint-accent">+</strong> e <strong className="jhe-floating-hint-accent">−</strong> no mapa para explorar os níveis abaixo desta posição.
                </p>
            </div>
        </div>
    );
}

export default NodeDetailsModal;
