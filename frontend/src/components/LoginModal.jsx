/**
 * Cabeçalho Arquitetural: Modal Elegante de Autenticação / Login (RBAC).
 * Permite que administradores, diretores e coordenadores façam login com credenciais seguras.
 * Suporta salvamento automático de senhas em navegadores (Google Chrome/Edge), alternador de visualização de senha e 'Lembre-se de mim'.
 * Zero CSS inline: utiliza classes do organograma.css com suporte completo a Dark Mode.
 */

import React, { useState } from 'react';
import { X, Mail, Lock, LogIn, Loader2, ShieldCheck, UserCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function LoginModal({ isOpen, onClose }) {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [showSenha, setShowSenha] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    const { login, isLoading, loginError } = useAuth();

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(email, senha, rememberMe);
        if (success) {
            setEmail('');
            setSenha('');
            onClose();
        }
    };

    const handleFillDemo = (demoEmail, demoSenha) => {
        setEmail(demoEmail);
        setSenha(demoSenha);
    };

    return (
        <div className="login-modal-overlay">
            <div className="login-modal-card">
                {/* Header */}
                <div className="login-modal-header">
                    <div className="login-header-title">
                        <ShieldCheck size={26} className="login-header-icon" />
                        <h2>Autenticação de Usuário</h2>
                    </div>
                    <button onClick={onClose} type="button" className="modal-close-btn" title="Fechar modal">
                        <X size={20} />
                    </button>
                </div>

                {/* Subtitle */}
                <p className="login-modal-subtitle">
                    Insira suas credenciais para desbloquear permissões de edição no organograma.
                </p>

                {/* Mensagem de Erro */}
                {loginError && (
                    <div className="login-error-banner">
                        {loginError}
                    </div>
                )}

                {/* Formulário Estruturado para Salvamento Automático do Navegador */}
                <form onSubmit={handleSubmit} className="login-form">
                    {/* Campo de E-mail */}
                    <div className="login-field">
                        <label htmlFor="login-email" className="login-label">
                            <Mail size={16} /> E-mail Corporativo
                        </label>
                        <input
                            id="login-email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu.email@jhe.com.br"
                            className="login-input"
                        />
                    </div>

                    {/* Campo de Senha com Olho Alternador */}
                    <div className="login-field">
                        <label htmlFor="login-password" className="login-label">
                            <Lock size={16} /> Senha de Acesso
                        </label>
                        <div className="login-input-wrapper">
                            <input
                                id="login-password"
                                name="password"
                                type={showSenha ? 'text' : 'password'}
                                autoComplete="current-password"
                                required
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                placeholder="••••••••"
                                className="login-input"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSenha(!showSenha)}
                                className="login-password-toggle-btn"
                                title={showSenha ? "Ocultar senha" : "Exibir senha"}
                            >
                                {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Checkbox Lembre-se de mim */}
                    <div className="login-remember-field">
                        <label className="login-checkbox-label">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="login-checkbox-input"
                            />
                            <span>Manter conectado neste dispositivo (Lembre-se de mim)</span>
                        </label>
                    </div>

                    {/* Atalhos Rápidos para Demonstração */}
                    <div className="demo-credentials-box">
                        <span className="demo-credentials-title">Acesso Rápido de Teste:</span>
                        <div className="demo-buttons-group">
                            <button
                                type="button"
                                onClick={() => handleFillDemo('admin@jhe.com.br', 'Admin@123')}
                                className="demo-btn admin-demo-btn"
                            >
                                <UserCheck size={14} /> Admin Geral
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFillDemo('leandro@jhe.com.br', 'leandro123')}
                                className="demo-btn director-demo-btn"
                            >
                                <UserCheck size={14} /> Leandro (Diretor TI)
                            </button>
                        </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="login-modal-footer">
                        <button
                            type="button"
                            onClick={onClose}
                            className="login-cancel-btn"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="login-submit-btn"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Autenticando...
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    Entrar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default LoginModal;
