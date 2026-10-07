/**
 * Cabeçalho Arquitetural: Componente Raiz da Aplicação Frontend.
 * Envolve a aplicação no AuthProvider para gerenciar o estado global de autenticação e RBAC.
 */

import React from 'react';
import OrganogramaView from './pages/OrganogramaView';
import { AuthProvider } from './context/AuthContext';

function App() {
    return (
        <AuthProvider>
            <main className="w-screen h-screen">
                <OrganogramaView />
            </main>
        </AuthProvider>
    );
}

export default App;
