/**
 * Cabeçalho Arquitetural: Componente Raiz de Roteamento.
 * Gerencia a navegação entre a visualização pública (Mapa) e o painel Admin.
 */

import React from 'react';
import OrganogramaView from './pages/OrganogramaView';
// Importação comentada para futuro sistema de rotas (ex: react-router-dom)
// import AdminCrudView from './pages/AdminCrudView';

function App() {
    // Por enquanto, renderiza diretamente a view principal.
    // Numa aplicação completa, aqui estariam os <Routes> do react-router.
    return (
        <main className="w-screen h-screen">
            <OrganogramaView />
        </main>
    );
}

export default App;
