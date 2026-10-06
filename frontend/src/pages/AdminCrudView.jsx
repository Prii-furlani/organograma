/**
 * Cabeçalho Arquitetural: Tela Administrativa (Em construção/Esboço).
 * Destinada a CRUD completo dos nós sem depender de inserções diretas no banco.
 * Por simplicidade neste MVP, mostra apenas uma mensagem de redirecionamento,
 * mas a estrutura foi criada conforme solicitação arquitetural.
 */

import React from 'react';

function AdminCrudView() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
            <div className="bg-white rounded-2xl shadow-xl p-10 max-w-2xl text-center border-t-4 border-blue-600">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Painel Administrativo</h1>
                <p className="text-gray-600 text-lg mb-8">
                    Esta tela está preparada na arquitetura para gerenciar a criação, edição e exclusão dos nós (departamentos) 
                    diretamente pela interface, utilizando a rota <code>/api/organograma</code>.
                </p>
                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg font-medium">
                    Atualmente os dados iniciais devem ser carregados via script SQL (database/schema.sql).
                </div>
            </div>
        </div>
    );
}

export default AdminCrudView;
