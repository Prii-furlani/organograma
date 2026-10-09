import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Função utilitária para formatar detalhamentos de auditoria no PDF.
 * Garante que nunca caia no hífen "-" isolado quando houver dados.
 */
export const formatAuditDetail = (log) => {
    let det = log.detalhes;
    if (typeof det === 'string') {
        try {
            det = JSON.parse(det);
        } catch (e) {
            det = {};
        }
    }
    det = det || {};

    const alvo = log.alvo_nome || 'Área';

    // 1. MOVIMENTAÇÃO (de & para ou origem & destino)
    if (log.tipo_acao === 'MOVIMENTACAO' || det.de || det.para || det.origem || det.destino) {
        const de = det.de || det.origem || 'Não informado';
        const para = det.para || det.destino || 'Não informado';
        return `Moveu '${alvo}':\nDe: ${de} ➔ Para: ${para}`;
    }

    // 2. EDIÇÃO com alterações específicas
    if (det.alteracoes && typeof det.alteracoes === 'object') {
        const lines = Object.entries(det.alteracoes).map(([campo, val]) => {
            if (val && typeof val === 'object' && ('antes' in val || 'depois' in val)) {
                return `${campo}: "${val.antes ?? ''}" ➔ "${val.depois ?? ''}"`;
            }
            return `${campo}: ${JSON.stringify(val)}`;
        });
        if (lines.length > 0) return lines.join('\n');
    }

    if ('antes' in det || 'depois' in det) {
        const campo = det.campo || 'Dados';
        return `${campo}: "${det.antes ?? ''}" ➔ "${det.depois ?? ''}"`;
    }

    // 3. CRIAÇÃO
    if (log.tipo_acao === 'CRIACAO') {
        const tipo = det.tipo || det.nivel || 'Equipe';
        return `Criou a área '${alvo}' (nível: ${tipo})`;
    }

    // 4. EXCLUSÃO
    if (log.tipo_acao === 'EXCLUSAO') {
        const count = det.excluidos_count || det.count || 1;
        return `Excluiu a área '${alvo}' (${count} área(s) removida(s))`;
    }

    // 5. Descrição textual direta
    if (det.descricao) return det.descricao;
    if (det.mensagem) return det.mensagem;

    // 6. Outros atributos do objeto detalhes
    const keys = Object.keys(det);
    if (keys.length > 0) {
        return keys.map(k => `${k}: ${det[k]}`).join(', ');
    }

    // 7. Fallback seguro
    return `Alteração realizada na área '${alvo}'`;
};

/**
 * Tenta carregar a imagem da logo oficial JHE Engenharia
 */
const loadLogoImage = () => {
    return new Promise((resolve) => {
        const logoPaths = ['/logo.png', '/logo-jhe.png'];
        let tried = 0;

        const tryNext = () => {
            if (tried >= logoPaths.length) {
                resolve(null);
                return;
            }
            const path = logoPaths[tried++];
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const format = path.endsWith('.png') ? 'PNG' : 'JPEG';
                resolve({ img, format });
            };
            img.onerror = () => tryNext();
            img.src = path;
        };

        tryNext();
    });
};

/**
 * Exporta os logs de auditoria para PDF em design moderno, minimalista e executivo.
 * @param {Object} params - { logs, filtros: { usuarioNome, dataInicio, dataFim }, usuarioLogado }
 */
export const exportAuditPdf = async ({ logs, filtros = {}, usuarioLogado = null }) => {
    if (!logs || logs.length === 0) {
        throw new Error('Não há registros para exportar.');
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const logoData = await loadLogoImage();

    // 1. CABEÇALHO MODERNO & MINIMALISTA
    // Topo Esquerdo: Logo oficial da JHE Engenharia ou Fallback Textual
    if (logoData && logoData.img) {
        const maxW = 38;
        const maxH = 14;
        const w = logoData.img.width || 100;
        const h = logoData.img.height || 40;
        const ratio = Math.min(maxW / w, maxH / h);
        const finalW = w * ratio;
        const finalH = h * ratio;
        const yPos = 10 + (maxH - finalH) / 2;
        doc.addImage(logoData.img, logoData.format, 14, yPos, finalW, finalH);
    } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(10, 25, 47); // #0A192F
        doc.text('JHE ENGENHARIA', 14, 18);
    }

    // Topo Direito: Tag ocre "GOVERNANÇA & AUDITORIA CORPORATIVA" + Subtítulo cinza
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(180, 120, 60); // #B4783C
    doc.text('GOVERNANÇA & AUDITORIA CORPORATIVA', 196, 14, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // #64748B
    doc.text('Sistema de Gestão de Organograma', 196, 19, { align: 'right' });

    // Linha divisória suave
    doc.setDrawColor(226, 232, 240); // #E2E8F0
    doc.setLineWidth(0.4);
    doc.line(14, 27, 196, 27);

    // 2. BLOCO DE TÍTULO E METADADOS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(10, 25, 47); // #0A192F
    doc.text('Relatório de Alterações Estruturais', 14, 36);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // #475569

    const dataEmissao = new Date().toLocaleString('pt-BR');
    const responsavel = filtros.usuarioNome || 'Todos os Usuários';
    const periodo = (filtros.dataInicio || filtros.dataFim)
        ? `${filtros.dataInicio || 'Início'} até ${filtros.dataFim || 'Hoje'}`
        : 'Todo o Histórico';
    const usuarioLogadoNome = usuarioLogado?.nome_completo || usuarioLogado?.nome || 'Administrador';

    doc.text(`Emissão: ${dataEmissao}  |  Total de Registros: ${logs.length}`, 14, 43);
    doc.text(`Responsável Filtrado: ${responsavel}  |  Período: ${periodo}`, 14, 48);
    doc.text(`Gerado por: ${usuarioLogadoNome}`, 14, 53);

    // 3. DADOS DA TABELA
    const formatDate = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return String(isoString);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatActionTitle = (log) => {
        const alvo = log.alvo_nome ? `\n${log.alvo_nome}` : '';
        switch (log.tipo_acao) {
            case 'CRIACAO': return `Criação${alvo}`;
            case 'EDICAO': return `Edição${alvo}`;
            case 'MOVIMENTACAO': return `Movimentação${alvo}`;
            case 'EXCLUSAO': return `Exclusão${alvo}`;
            default: return `${log.tipo_acao || 'Ação'}${alvo}`;
        }
    };

    const tableRows = logs.map(log => [
        formatDate(log.criado_em),
        log.usuario_nome || 'Administrador',
        formatActionTitle(log),
        formatAuditDetail(log)
    ]);

    // 4. RENDERIZAÇÃO DA TABELA (theme: 'plain' clean modern)
    autoTable(doc, {
        startY: 58,
        margin: { left: 14, right: 14, top: 15, bottom: 20 },
        head: [['DATA & HORA', 'RESPONSÁVEL', 'AÇÃO / LOCAL', 'DETALHAMENTO DA ALTERAÇÃO (DE ➔ PARA)']],
        body: tableRows,
        theme: 'plain',
        styles: {
            font: 'helvetica',
            fontSize: 8,
            textColor: [51, 65, 85], // #334155
            cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
            lineWidth: { bottom: 0.2, top: 0, left: 0, right: 0 },
            lineColor: [226, 232, 240] // #E2E8F0
        },
        headStyles: {
            fillColor: [248, 250, 252], // #F8FAFC
            textColor: [10, 25, 47], // #0A192F
            fontStyle: 'bold',
            fontSize: 8.5,
            lineWidth: { bottom: 0.8, top: 0, left: 0, right: 0 },
            lineColor: [203, 213, 225] // #CBD5E1
        },
        alternateRowStyles: {
            fillColor: [255, 255, 255]
        },
        columnStyles: {
            0: { cellWidth: 32 },
            1: { cellWidth: 36 },
            2: { cellWidth: 34 },
            3: { cellWidth: 'auto' }
        }
    });

    // 5. RODAPÉ FIXO EM TODAS AS PÁGINAS
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Linha superior do rodapé
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(14, 284, 196, 284);

        // Texto do rodapé
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // #94A3B8
        doc.text(`Página ${i} de ${totalPages} - Confidencial JHE Engenharia`, 14, 290);
    }

    doc.save(`Auditoria_Estrutural_JHE_${new Date().toISOString().split('T')[0]}.pdf`);
};
