import React, { useEffect, useState } from 'react';
import { X, Search, Printer, Calendar, User, Activity, Edit3, Plus, Trash2, ArrowRight } from 'lucide-react';
import { getOrganogramaLogs } from '../api/organogramaApi';
import { useAuth } from '../context/AuthContext';
import { exportAuditPdf } from '../utils/exportAuditPdf';
import Swal from 'sweetalert2';

function AuditLogsModal({ isOpen, onClose }) {
    const { user: usuarioLogado } = useAuth() || {};
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [userId, setUserId] = useState('todos');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');

    // Users list for dropdown
    const [usuariosUnicos, setUsuariosUnicos] = useState([]);

    useEffect(() => {
        if (isOpen) {
            fetchLogs();
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose, userId, dataInicio, dataFim]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await getOrganogramaLogs({ 
                usuario_id: userId, 
                data_inicio: dataInicio, 
                data_fim: dataFim 
            });
            setLogs(data);

            // Populate unique users for filter if not done yet
            if (usuariosUnicos.length === 0 && data.length > 0 && userId === 'todos') {
                const mapUsers = {};
                data.forEach(log => {
                    if (log.usuario_id && !mapUsers[log.usuario_id]) {
                        mapUsers[log.usuario_id] = {
                            id: log.usuario_id,
                            nome: log.usuario_nome
                        };
                    }
                });
                const sortedUsers = Object.values(mapUsers).sort((a, b) => a.nome.localeCompare(b.nome));
                setUsuariosUnicos(sortedUsers);
            }
        } catch (error) {
            console.error('Erro ao buscar logs:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const formatDate = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleDateString('pt-BR') + ', ' + d.toLocaleTimeString('pt-BR');
    };

    const getActionData = (log) => {
        switch (log.tipo_acao) {
            case 'CRIACAO': return { badge: 'jhe-audit-badge-create', label: 'CRIACAO', title: 'Criação de Área' };
            case 'EDICAO': return { badge: 'jhe-audit-badge-edit', label: 'EDICAO', title: 'Edição Estrutural' };
            case 'MOVIMENTACAO': return { badge: 'jhe-audit-badge-move', label: 'MOVIMENTACAO', title: 'Movimentação de Área' };
            case 'EXCLUSAO': return { badge: 'jhe-audit-badge-delete', label: 'EXCLUSAO', title: 'Exclusão Estrutural' };
            default: return { badge: '', label: log.tipo_acao, title: 'Ação no Sistema' };
        }
    };

    const parseDetalhes = (detalhes) => {
        if (!detalhes) return {};
        if (typeof detalhes === 'string') {
            try {
                return JSON.parse(detalhes);
            } catch (e) {
                return {};
            }
        }
        return detalhes;
    };

    const renderActionDetail = (log) => {
        const det = parseDetalhes(log.detalhes);
        switch (log.tipo_acao) {
            case 'CRIACAO':
                return <>Criou a área <strong>'{log.alvo_nome}'</strong> (nível: {det.tipo || 'Equipe'}).</>;
            case 'EDICAO':
                return <>Atualizou os dados da área <strong>'{log.alvo_nome}'</strong>.</>;
            case 'MOVIMENTACAO': {
                const de = det.de || det.origem || 'Origem';
                const para = det.para || det.destino || 'Destino';
                return (
                    <>
                        Moveu '{log.alvo_nome}': {de} <span className="jhe-detail-change-arrow">➔</span> {para}
                    </>
                );
            }
            case 'EXCLUSAO':
                return <>Excluiu a área <strong>'{log.alvo_nome}'</strong> ({det.excluidos_count || 1} áreas removidas no total).</>;
            default:
                return <>Ação na área <strong>'{log.alvo_nome}'</strong>.</>;
        }
    };

    const handleExportPDF = async () => {
        if (!logs || logs.length === 0) {
            return Swal.fire('Aviso', 'Não há registros para exportar com os filtros atuais.', 'info');
        }

        const usuarioNome = userId === 'todos' 
            ? 'Todos os Usuários' 
            : usuariosUnicos.find(u => u.id === parseInt(userId))?.nome || 'Todos os Usuários';

        try {
            await exportAuditPdf({
                logs,
                filtros: {
                    usuarioNome,
                    dataInicio,
                    dataFim
                },
                usuarioLogado
            });
        } catch (error) {
            console.error('Erro ao gerar PDF de auditoria:', error);
            Swal.fire('Erro', error.message || 'Falha ao gerar relatório PDF.', 'error');
        }
    };

    return (
        <div className="jhe-audit-modal-overlay" onClick={onClose}>
            <div className="jhe-audit-modal-content" onClick={e => e.stopPropagation()}>
                <div className="jhe-audit-header">
                    <div>
                        <div className="jhe-audit-header-title">
                            🔍 FILTROS DE AUDITORIA
                        </div>
                        <div className="jhe-audit-header-subtitle">
                            Filtre por usuário específico e intervalo de datas para exportação em PDF
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="jhe-audit-export-btn" onClick={handleExportPDF}>
                            🖨️ Exportar PDF Personalizado
                        </button>
                        <button className="jhe-logs-close-btn" onClick={onClose} title="Fechar Modal">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="jhe-audit-body">
                    {/* CARD SUPERIOR: FILTROS */}
                    <div className="jhe-audit-card">
                        <div className="jhe-audit-filters-grid">
                            <div className="jhe-audit-filter-group">
                                <label className="jhe-audit-filter-label">USUÁRIO</label>
                                <select 
                                    className="jhe-audit-filter-input"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                >
                                    <option value="todos">Todos os Usuários</option>
                                    {usuariosUnicos.map(u => (
                                        <option key={u.id} value={u.id}>{u.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="jhe-audit-filter-group">
                                <label className="jhe-audit-filter-label">DATA INÍCIO</label>
                                <input 
                                    type="date"
                                    className="jhe-audit-filter-input"
                                    value={dataInicio}
                                    onChange={(e) => setDataInicio(e.target.value)}
                                />
                            </div>
                            <div className="jhe-audit-filter-group">
                                <label className="jhe-audit-filter-label">DATA FIM</label>
                                <input 
                                    type="date"
                                    className="jhe-audit-filter-input"
                                    value={dataFim}
                                    onChange={(e) => setDataFim(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* CARD INFERIOR: TABELA */}
                    <div className="jhe-audit-card" style={{ marginBottom: 0 }}>
                        <div className="jhe-audit-table-header">
                            <div className="jhe-audit-table-title">
                                REGISTROS ENCONTRADOS ({logs.length})
                            </div>
                            <div className="jhe-audit-table-meta">
                                Ordenado por data mais recente
                            </div>
                        </div>

                        <div className="jhe-audit-table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                            <table className="jhe-audit-table">
                                <thead>
                                    <tr>
                                        <th>DATA & HORA</th>
                                        <th>USUÁRIO</th>
                                        <th>AÇÃO / LOCAL</th>
                                        <th>DETALHAMENTO DA ALTERAÇÃO (DE ➔ PARA)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>Carregando registros...</td>
                                        </tr>
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>Nenhum registro encontrado para os filtros atuais.</td>
                                        </tr>
                                    ) : (
                                        logs.map(log => {
                                            const actionData = getActionData(log);
                                            return (
                                                <tr key={log.id}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(log.criado_em)}</td>
                                                    <td>
                                                        <span className="jhe-audit-user-pill">
                                                            <User size={14} />
                                                            {log.usuario_nome}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <strong>{actionData.title}</strong>
                                                        <div className={`mt-1 ${actionData.badge}`}>
                                                            {actionData.label}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="jhe-audit-detail">
                                                            {renderActionDetail(log)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuditLogsModal;
