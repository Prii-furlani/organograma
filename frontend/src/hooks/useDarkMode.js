/**
 * Cabeçalho Arquitetural: Hook customizado para gerenciamento do Tema Escuro (Dark Mode).
 * Controla o estado visual da aplicação, aplica a classe '.dark' na tag <html> raiz
 * e persiste a preferência do usuário no localStorage do navegador.
 */

import { useState, useEffect, useCallback } from 'react';

export function useDarkMode() {
    // Inicializa o estado lendo a preferência salva no localStorage (ou preferência do SO como fallback)
    const [isDark, setIsDark] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme === 'dark';
        }
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // Sincroniza a classe '.dark' na tag <html> e atualiza o localStorage a cada mudança
    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    // Função para alternar entre tema claro e escuro
    const toggleDarkMode = useCallback(() => {
        setIsDark(prev => !prev);
    }, []);

    return { isDark, toggleDarkMode };
}
