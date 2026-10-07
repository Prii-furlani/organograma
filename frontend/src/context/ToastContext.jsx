/**
 * Cabeçalho Arquitetural: Contexto Global de Notificações Toast.
 * Fornece feedback visual dinâmico de sucesso e erro em tempo real.
 * Zero CSS inline: estilização centralizada em organograma.css.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success', duration = 4000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Renderizador de Toasts */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast-item toast-${toast.type}`}>
                        {toast.type === 'success' && <CheckCircle2 size={18} className="toast-icon" />}
                        {toast.type === 'error' && <AlertTriangle size={18} className="toast-icon" />}
                        {toast.type === 'info' && <Info size={18} className="toast-icon" />}
                        <span className="toast-message">{toast.message}</span>
                        <button 
                            onClick={() => removeToast(toast.id)} 
                            className="toast-close-btn"
                            title="Fechar notificação"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast deve ser utilizado dentro de um ToastProvider');
    }
    return context;
}
