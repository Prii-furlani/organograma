/**
 * Cabeçalho Arquitetural: Componente Raiz da Aplicação Frontend.
 * Envolve a aplicação no AuthProvider para gerenciar o estado global de autenticação e RBAC.
 */

import React from 'react';
import OrganogramaView from './pages/OrganogramaView';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <main className="w-screen h-screen">
                    <OrganogramaView />
                </main>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
