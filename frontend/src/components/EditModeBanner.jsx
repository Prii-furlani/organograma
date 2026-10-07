/**
 * Cabeçalho Arquitetural: Barra de Notificação de Modo Edição Ativo.
 * Exibe feedback visual discreto diretamente abaixo da Navbar indicando o escopo
 * e as permissões ativas do usuário logado.
 * Zero CSS inline: utiliza estilos em organograma.css.
 */

import React from 'react';
import { Edit3, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function EditModeBanner({ isEditMode }) {
    const { user, isAuthenticated } = useAuth();

    if (!isEditMode || !isAuthenticated || !user) return null;

    const getScopeDescription = () => {
        if (user.role_global === 'admin') {
            return 'Você possui acesso total de administrador para criar, editar e excluir qualquer setor ou usuário.';
        }
        if (user.role_global === 'diretor' || user.role_global === 'coordenador') {
            return 'Você pode gerenciar e alterar as áreas sob sua liderança direta e seus subordinados.';
        }
        return 'Modo de visualização e leitura habilitado.';
    };

    const getRoleBadge = () => {
        if (user.role_global === 'admin') return 'Administrador Geral';
        if (user.role_global === 'diretor') return 'Diretor Executivo';
        if (user.role_global === 'coordenador') return 'Coordenador de Área';
        return 'Colaborador';
    };

    return (
        <div className="edit-mode-status-banner">
            <div className="banner-content-container">
                <div className="banner-left-info">
                    <span className="banner-badge-pulse">
                        <Edit3 size={14} />
                        Modo de Edição Ativo
                    </span>
                    <span className="banner-user-info">
                        • Usuário: <strong>{user.nome_completo}</strong> ({getRoleBadge()})
                    </span>
                </div>
                <div className="banner-right-scope">
                    <span className="banner-scope-text">
                        — {getScopeDescription()}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default EditModeBanner;
