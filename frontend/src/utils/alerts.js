/**
 * Cabeçalho Arquitetural: Módulo Centralizado de Alertas e Confirmações Visuais Executivas.
 * Encapsula o SweetAlert2 desabilitando estilos inline padrão (buttonsStyling: false).
 * Aplica estritamente as classes CSS semânticas (.jhe-swal-*) integradas ao Design System JHE (Light & Dark).
 */

import Swal from 'sweetalert2';

// Base Themed SweetAlert com estilos de botões via CSS do organograma.css
const JheSwal = Swal.mixin({
    buttonsStyling: false,
    customClass: {
        popup: 'jhe-swal-popup',
        title: 'jhe-swal-title',
        htmlContainer: 'jhe-swal-html',
        confirmButton: 'jhe-swal-confirm-btn',
        cancelButton: 'jhe-swal-cancel-btn',
        denyButton: 'jhe-swal-deny-btn',
        actions: 'jhe-swal-actions',
        icon: 'jhe-swal-icon'
    }
});

// Toast discreto de feedback no canto superior direito (Timer 3s)
const ToastMixin = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
        popup: 'jhe-swal-toast-popup',
        title: 'jhe-swal-toast-title',
        timerProgressBar: 'jhe-swal-toast-progress'
    },
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

/**
 * Dispara notificação flutuante tipo Toast
 * @param {string} message - Texto da notificação
 * @param {'success'|'error'|'warning'|'info'} type - Tipo de alerta
 */
export function showToast(message, type = 'success') {
    ToastMixin.fire({
        icon: type,
        title: message
    });
}

/**
 * Modal de confirmação de exclusão segura de nó do organograma
 * @param {string} nodeName - Nome do setor/área a ser excluído
 * @param {number|boolean} childrenCount - Quantidade de filhos subordinados (ou boolean se possui filhos)
 * @returns {Promise<boolean>} Resolvido como true se o usuário confirmou
 */
export async function confirmDeleteNode(nodeName, childrenCount = 0) {
    const hasChildren = typeof childrenCount === 'number' ? childrenCount > 0 : !!childrenCount;
    const numChildren = typeof childrenCount === 'number' ? childrenCount : 0;

    let warningText = `Tem certeza que deseja excluir permanentemente o setor <strong>"${nodeName || 'Selecionado'}"</strong>?`;
    
    if (hasChildren) {
        warningText += `<div className="jhe-swal-warning-box">
            ⚠️ <strong>ATENÇÃO CRÍTICA:</strong> Esta área possui <strong>${numChildren > 0 ? numChildren : 'vários'} nó(s) subordinado(s)</strong> vinculados! A exclusão removerá toda a sub-árvore em cascata no banco de dados MySQL.
        </div>`;
    }

    const result = await JheSwal.fire({
        title: 'Excluir Área do Organograma?',
        html: warningText,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir área',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        focusCancel: true
    });

    return result.isConfirmed;
}

/**
 * Modal SweetAlert2 corporativo para exclusão em cascata com trava de segurança de digitação ('EXCLUIR').
 * @param {string} nodeName - Nome da área a ser excluída
 * @param {number} affectedCount - Total de setores subordinados que serão afetados
 * @returns {Promise<boolean>} Resolvido como true se o usuário digitou EXCLUIR e confirmou
 */
export async function confirmCascadeDeleteNode(nodeName, affectedCount) {
    const result = await JheSwal.fire({
        title: 'Atenção: Exclusão Estrutural em Cascata',
        html: `
            <div class="jhe-cascade-modal-body">
                <div class="jhe-cascade-warning-text">
                    A exclusão de <strong>${nodeName || 'este setor'}</strong> removerá permanentemente esta área e todos os seus <strong>${affectedCount} setores subordinados</strong>.
                </div>
                <div class="jhe-cascade-instruction">
                    Para autorizar esta operação, digite <span class="jhe-cascade-keyword">EXCLUIR</span> no campo abaixo:
                </div>
            </div>
        `,
        input: 'text',
        inputPlaceholder: 'Digite EXCLUIR',
        inputAttributes: {
            autocapitalize: 'characters',
            autocomplete: 'off',
            spellcheck: 'false',
            class: 'jhe-swal-cascade-input'
        },
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir estrutura',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        focusCancel: true,
        didOpen: () => {
            const confirmBtn = Swal.getConfirmButton();
            const input = Swal.getInput();
            if (confirmBtn && input) {
                confirmBtn.disabled = true;
                confirmBtn.classList.add('is-disabled');

                input.addEventListener('input', (e) => {
                    const text = e.target.value.trim();
                    if (text === 'EXCLUIR') {
                        confirmBtn.disabled = false;
                        confirmBtn.classList.remove('is-disabled');
                    } else {
                        confirmBtn.disabled = true;
                        confirmBtn.classList.add('is-disabled');
                    }
                });
            }
        },
        preConfirm: (inputValue) => {
            if (inputValue !== 'EXCLUIR') {
                Swal.showValidationMessage('Você deve digitar exatamente a palavra EXCLUIR para confirmar.');
                return false;
            }
            return true;
        }
    });

    return result.isConfirmed;
}

/**
 * Modal SweetAlert2 de Confirmação de Transferência Hierárquica (Drag & Drop com subordinados).
 * @param {string} nodeName - Nome da área a ser movida
 * @param {number} affectedCount - Total de subordinados
 * @param {string} targetParentName - Nome da nova área superior (pai)
 * @returns {Promise<boolean>} Resolvido como true se o usuário confirmou
 */
export async function confirmHierarchyTransfer(nodeName, affectedCount, targetParentName) {
    const result = await JheSwal.fire({
        title: 'Confirmar Transferência de Setor?',
        html: `
            <div class="jhe-transfer-modal-body">
                <p class="jhe-transfer-text">
                    Deseja mover a área <strong>${nodeName || 'Selecionada'}</strong> e seus <strong>${affectedCount}</strong> subordinados para baixo de <strong>${targetParentName || 'Nova Área'}</strong>?
                </p>
                <div class="jhe-transfer-note">
                    A subordinação de todos os nós descendentes será reorganizada hierarquicamente.
                </div>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Confirmar Transferência',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        focusCancel: true
    });

    return result.isConfirmed;
}

/**
 * Modal para confirmação de descarte de edições não salvas
 * @returns {Promise<boolean>} Resolvido como true se o usuário quer descartar e sair
 */
export async function confirmUnsavedChanges() {
    const result = await JheSwal.fire({
        title: 'Descartar alterações?',
        html: 'Existem dados modificados que ainda não foram salvos. Deseja realmente fechar o formulário e perder as alterações?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sim, descartar',
        cancelButtonText: 'Continuar editando',
        reverseButtons: true
    });

    return result.isConfirmed;
}

/**
 * Modal de confirmação de exclusão permanente de usuário
 * @param {string} userName - Nome completo do colaborador
 * @returns {Promise<boolean>}
 */
export async function confirmDeleteUser(userName) {
    const result = await JheSwal.fire({
        title: 'Remover Colaborador?',
        html: `Tem certeza que deseja remover o usuário <strong>"${userName}"</strong> do sistema?`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir colaborador',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        focusCancel: true
    });

    return result.isConfirmed;
}

/**
 * Modal de confirmação de alteração de status (Ativar/Desativar) de usuário
 * @param {string} userName - Nome do colaborador
 * @param {boolean} newStatus - true para ativar, false para desativar
 * @returns {Promise<boolean>}
 */
export async function confirmToggleUserStatus(userName, newStatus) {
    const statusAction = newStatus ? 'ativar' : 'desativar';
    const result = await JheSwal.fire({
        title: `${newStatus ? 'Ativar' : 'Desativar'} Acesso?`,
        html: `Deseja realmente <strong>${statusAction}</strong> o acesso do usuário <strong>"${userName}"</strong> ao sistema?`,
        icon: newStatus ? 'info' : 'warning',
        showCancelButton: true,
        confirmButtonText: `Sim, ${statusAction}`,
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    });

    return result.isConfirmed;
}

/**
 * Modal de confirmação de reset de senha de usuário para a provisória Jhe@2026
 * @param {string} userName - Nome do colaborador
 * @returns {Promise<boolean>}
 */
export async function confirmResetUserPassword(userName) {
    const result = await JheSwal.fire({
        title: 'Resetar Senha de Usuário?',
        html: `Resetar senha do usuário <strong>"${userName}"</strong> para o padrão <strong>Jhe@2026</strong>?<br/><br/><small style="color: #64748B;">O usuário será forçado a redefinir a senha no próximo login.</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, resetar senha',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    });

    return result.isConfirmed;
}

export default JheSwal;

