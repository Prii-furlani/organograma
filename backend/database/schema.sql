-- =============================================================================
-- ARQUIVO: backend/database/schema.sql
-- DESCRIÇÃO: Estrutura canônica e dados iniciais do banco de dados MySQL / phpMyAdmin.
-- OBSERVAÇÃO: Não utilizar migrations. Qualquer modificação de tabela deve ser feita
--             diretamente neste arquivo, mantendo o reflexo idêntico ao ambiente de produção.
-- =============================================================================

-- Criação do banco de dados (caso não exista)
CREATE DATABASE IF NOT EXISTS `organograma_db`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `organograma_db`;

-- =============================================================================
-- TABELA: organograma_nos
-- O QUE FAZ: Armazena a estrutura hierárquica completa do mapa mental / organograma.
-- COMO FUNCIONA:
--   - 'parent_id' aponta para o nó pai.
--   - 'parent_id' = NULL define o nó raiz (ex.: Co-CEOs).
--   - O relacionamento com 'ON DELETE CASCADE' garante que ao remover um setor pai,
--     todos os seus subordinados sejam removidos em cascata.
-- =============================================================================
CREATE TABLE IF NOT EXISTS `organograma_nos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único sequencial do nó',
  `parent_id` INT NULL DEFAULT NULL COMMENT 'Chave estrangeira para o nó pai. NULL indica raiz (ex: Co-CEOs)',
  `titulo` VARCHAR(150) NOT NULL COMMENT 'Nome exibido no card (Ex: Diretoria Comercial, Licitação)',
  `tipo` ENUM(
      'ceo',          -- Alta liderança executiva (Nível 0)
      'diretoria',    -- Grandes diretorias da organização (Nível 1)
      'gerencia',     -- Gerências executivas (Nível 2)
      'coordenacao',  -- Coordenações de área (Nível 2)
      'unidade',      -- Unidades setoriais de negócio (Nível 2)
      'staff',        -- Áreas de apoio direto e assessoria da presidência (Nível 2)
      'equipe',       -- Células operacionais, núcleos ou grupos de trabalho (Nível 3)
      'contrato',     -- Contratos operacionais vinculados (Nível 3)
      'apoio'         -- Funções acessórias ou de suporte direto a uma célula (Nível 3)
  ) NOT NULL DEFAULT 'equipe' COMMENT 'Classificação do nó para layout, cores e permissões',
  `responsavel` VARCHAR(150) NULL DEFAULT NULL COMMENT 'Nome da pessoa líder, diretor ou gestor responsável',
  `lideres_json` JSON NULL DEFAULT NULL COMMENT 'Lista estruturada de líderes (usada em Co-CEOs para nomes e fotos)',
  `email_contato` VARCHAR(150) NULL DEFAULT NULL COMMENT 'E-mail corporativo do setor ou responsável',
  `descricao` TEXT NULL COMMENT 'Texto explicativo exibido no modal/tooltip sobre as atribuições do setor',
  `cor_tema` VARCHAR(20) NOT NULL DEFAULT '#0284c7' COMMENT 'Cor hexadecimal do nó para renderização no mapa mental',
  `icone` VARCHAR(50) NULL DEFAULT 'users' COMMENT 'Identificador do ícone Lucide/FontAwesome para o card',
  `ordem` INT NOT NULL DEFAULT 0 COMMENT 'Posição horizontal de exibição em relação aos irmãos',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Flag de status: 1 = ativo/visível, 0 = inativo/oculto',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data e hora da inclusão no sistema',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data e hora da última modificação',

  -- Relacionamento autorreferencial
  CONSTRAINT `fk_organograma_parent`
    FOREIGN KEY (`parent_id`)
    REFERENCES `organograma_nos` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela central de nós do organograma interativo';

-- Índices de performance para busca em árvore e listagens
CREATE INDEX `idx_organograma_parent` ON `organograma_nos` (`parent_id`);
CREATE INDEX `idx_organograma_ativo_ordem` ON `organograma_nos` (`ativo`, `ordem`);


-- =============================================================================
-- DADOS INICIAIS (SEED) DO ORGANOGRAMA
-- Mapeamento completo e fiel à estrutura do organograma corporativo.
-- =============================================================================

-- 1. NÓ RAIZ (Co-CEOs)
INSERT INTO `organograma_nos` (`id`, `parent_id`, `titulo`, `tipo`, `descricao`, `cor_tema`, `ordem`, `lideres_json`) VALUES
(1, NULL, 'Co-CEOs', 'ceo', 'Liderança executiva máxima da empresa.', '#0f172a', 1, '[{"nome": "Dr. Hélio", "foto": "/avatars/helio.png"}, {"nome": "Dr. Viol", "foto": "/avatars/viol.png"}]');

-- 2. STAFF / ASSESSORIAS DIRETAS (Ligadas aos Co-CEOs)
INSERT INTO `organograma_nos` (`id`, `parent_id`, `titulo`, `tipo`, `descricao`, `cor_tema`, `ordem`) VALUES
(2, 1, 'Secretaria Executiva', 'staff', 'Suporte administrativo e executivo direto aos Co-CEOs.', '#475569', 1),
(3, 1, 'Compliance', 'staff', 'Garante conformidade com normas, integridade corporativa e governança.', '#475569', 2),
(4, 3, 'Apoio ao Compliance', 'apoio', 'Equipe de apoio e suporte operacional de compliance.', '#64748b', 1),
(5, 1, 'ESG', 'staff', 'Práticas de governança ambiental, social e corporativa.', '#475569', 3),
(6, 1, 'Planejamento Estratégico', 'staff', 'Monitoramento e desenho das metas e diretrizes de longo prazo.', '#475569', 4),
(7, 1, 'SGI', 'staff', 'Sistema de Gestão Integrada.', '#475569', 5),
(8, 7, 'Qualidade', 'equipe', 'Gestão dos padrões de qualidade de processos.', '#64748b', 1),
(9, 7, 'Segurança do Trabalho', 'equipe', 'Saúde e segurança operacional dos colaboradores.', '#64748b', 2),
(10, 7, 'Meio Ambiente', 'equipe', 'Controle ambiental e sustentabilidade nas operações.', '#64748b', 3),
(11, 7, 'Responsabilidade Social', 'equipe', 'Projetos e impacto social comunitário.', '#64748b', 4),
(12, 1, 'Gerência Técnica Geral do Organograma de Inspeção Acreditada - OIA', 'gerencia', 'Gestão técnica das auditorias e inspeções acreditadas.', '#334155', 6),
(13, 12, 'Consultoria', 'equipe', 'Consultoria técnica de conformidade.', '#64748b', 1),
(14, 12, 'Equipe de SGCI', 'equipe', 'Equipe de controle interno e inspeção.', '#64748b', 2),
(15, 12, 'Equipe Técnica de Inspeção', 'equipe', 'Técnicos de campo e validação técnica.', '#64748b', 3),
(16, 12, 'Equipe de Auditoria', 'equipe', 'Auditores de conformidade das inspeções.', '#64748b', 4);

-- 3. DIRETORIA COMERCIAL E SUBORDINADOS
INSERT INTO `organograma_nos` (`id`, `parent_id`, `titulo`, `tipo`, `descricao`, `cor_tema`, `ordem`) VALUES
(20, 1, 'Diretoria Comercial', 'diretoria', 'Gestão das oportunidades de negócios, vendas públicas, privadas e marketing.', '#0284c7', 2),
(21, 20, 'Consultoria / Novos Negócios', 'gerencia', 'Prospecção e estruturação de novas frentes de negócio.', '#0ea5e9', 1),
(22, 20, 'Licitação', 'gerencia', 'Análise de editais e condução de licitações públicas.', '#0ea5e9', 2),
(23, 20, 'Vendas', 'gerencia', 'Coordenação das forças de vendas públicas e privadas.', '#0ea5e9', 3),
(24, 23, 'Vendas Públicas', 'equipe', 'Execução de vendas voltadas ao setor governamental.', '#38bdf8', 1),
(25, 23, 'Apoio ao Comercial', 'apoio', 'Suporte operacional a vendas públicas.', '#7dd3fc', 2),
(26, 23, 'Vendas Privadas', 'equipe', 'Vendas corporativas para o setor privado.', '#38bdf8', 3),
(27, 23, 'CS / Pós Vendas', 'equipe', 'Customer Success e atendimento de pós-venda ao cliente.', '#38bdf8', 4),
(28, 23, 'Apoio ao Comercial (Privado)', 'apoio', 'Suporte operacional a vendas privadas.', '#7dd3fc', 5),
(29, 20, 'Marketing e Comunicação', 'gerencia', 'Posicionamento de marca, mídia e comunicação externa.', '#0ea5e9', 4);

-- 4. DIRETORIA DE OPERAÇÕES E SUBORDINADOS
INSERT INTO `organograma_nos` (`id`, `parent_id`, `titulo`, `tipo`, `descricao`, `cor_tema`, `ordem`) VALUES
(40, 1, 'Diretoria de Operações', 'diretoria', 'Gestão operacional de obras, contratos e entregas técnicas.', '#16a34a', 3),
(41, 40, 'Administrativo Operacional', 'gerencia', 'Gestão administrativa de campo e suporte a obras.', '#22c55e', 1),
(42, 40, 'Metodologia Técnico-Social', 'gerencia', 'Desenvolvimento de métodos de atuação técnico-social em contratos.', '#22c55e', 2),
(43, 40, 'Planejamento e Controle', 'gerencia', 'Controle orçamentário, cronogramas e entregas de contratos.', '#22c55e', 3),
(44, 43, 'Apoio ao Planejamento e Controle', 'apoio', 'Assistência técnica ao controle operacional.', '#86efac', 1),
(45, 40, 'Unidade de Negócios Edificação', 'unidade', 'Gestão dos contratos de construção e edificações.', '#15803d', 4),
(46, 45, 'Contrato N (Edificação)', 'contrato', 'Célula operacional representativa de cada contrato de Edificação.', '#4ade80', 1),
(47, 46, 'Administrativo', 'apoio', 'Administração local do contrato de edificação.', '#bbf7d0', 1),
(48, 46, 'Planejamento', 'apoio', 'Planejamento e cronograma da obra.', '#bbf7d0', 2),
(49, 46, 'Equipe Contrato', 'equipe', 'Corpo técnico e operacional alocado na obra.', '#bbf7d0', 3),
(50, 40, 'Unidade de Negócios Educação', 'unidade', 'Gestão dos contratos do setor de educação.', '#15803d', 5),
(51, 50, 'Contrato N (Educação)', 'contrato', 'Contrato específico de educação.', '#4ade80', 1),
(52, 51, 'Administrativo', 'apoio', 'Administração do contrato de educação.', '#bbf7d0', 1),
(53, 51, 'Planejamento', 'apoio', 'Planejamento das ações educacionais.', '#bbf7d0', 2),
(54, 51, 'Equipe Contrato', 'equipe', 'Profissionais de execução do projeto de educação.', '#bbf7d0', 3),
(55, 40, 'Unidade de Negócios Habitação', 'unidade', 'Contratos de moradia popular e habitacional.', '#15803d', 6),
(56, 55, 'Contrato N (Habitação)', 'contrato', 'Contrato de habitação.', '#4ade80', 1),
(57, 56, 'Administrativo', 'apoio', 'Administração do contrato de habitação.', '#bbf7d0', 1),
(58, 56, 'Planejamento', 'apoio', 'Planejamento de obras habitacionais.', '#bbf7d0', 2),
(59, 56, 'Equipe Contrato', 'equipe', 'Execução de campo em habitação.', '#bbf7d0', 3),
(60, 40, 'Unidade de Negócios Saneamento', 'unidade', 'Contratos de água, esgoto e drenagem.', '#15803d', 7),
(61, 60, 'Contrato N (Saneamento)', 'contrato', 'Contrato de saneamento.', '#4ade80', 1),
(62, 61, 'Administrativo', 'apoio', 'Administração do contrato de saneamento.', '#bbf7d0', 1),
(63, 61, 'Planejamento', 'apoio', 'Planejamento das obras de saneamento.', '#bbf7d0', 2),
(64, 61, 'Equipe Contrato', 'equipe', 'Execução em campo de saneamento.', '#bbf7d0', 3),
(65, 40, 'Unidade de Negócios Transporte', 'unidade', 'Contratos de infraestrutura viária e mobilidade.', '#15803d', 8),
(66, 65, 'Contrato N (Transporte)', 'contrato', 'Contrato de transporte.', '#4ade80', 1),
(67, 66, 'Administrativo', 'apoio', 'Administração do contrato de transporte.', '#bbf7d0', 1),
(68, 66, 'Planejamento', 'apoio', 'Planejamento das obras de transporte.', '#bbf7d0', 2),
(69, 66, 'Equipe Contrato', 'equipe', 'Operação em campo de infraestrutura de transporte.', '#bbf7d0', 3),
(70, 40, 'Unidade de Negócios DIA', 'unidade', 'Unidade de Negócios DIA.', '#15803d', 9);

-- 5. DIRETORIA ADMINISTRATIVA E SUBORDINADOS
INSERT INTO `organograma_nos` (`id`, `parent_id`, `titulo`, `tipo`, `descricao`, `cor_tema`, `ordem`) VALUES
(80, 1, 'Diretoria Administrativa', 'diretoria', 'Gestão financeira, contábil, compras, recursos humanos e jurídico.', '#d97706', 4),
(81, 80, 'Controladoria', 'gerencia', 'Supervisão contábil, fiscal, suprimentos e infraestrutura predial.', '#f59e0b', 1),
(82, 80, 'Contabilidade', 'gerencia', 'Gestão fiscal e relatórios societários.', '#f59e0b', 2),
(83, 82, 'Contabilidade Geral', 'apoio', 'Lançamentos contábeis e fechamentos de balanço.', '#fde68a', 1),
(84, 82, 'Contabilidade Fiscal', 'apoio', 'Apuração de tributos e conformidade com o fisco.', '#fde68a', 2),
(85, 80, 'Administrativo', 'gerencia', 'Gestão de compras, facilities, patrimônio e guarda documental.', '#f59e0b', 3),
(86, 85, 'Gestão Estratégica de Compras', 'equipe', 'Compras corporativas, negociações estratégicas e cotações.', '#fbbf24', 1),
(87, 86, 'Aquisição de Ativos, Equipamentos e Serviços Técnicos', 'apoio', 'Compra de bens duráveis e contratação técnica especializada.', '#fde68a', 1),
(88, 87, 'Apoio Técnico para Aquisição', 'apoio', 'Validação técnica dos editais de compras.', '#fef3c7', 1),
(89, 86, 'Equipe: Compras de Bens de Consumo', 'apoio', 'Compras recorrentes e suprimentos diários.', '#fde68a', 2),
(90, 85, 'Facilities / Serviços Gerais', 'equipe', 'Manutenção predial e administração do espaço corporativo.', '#fbbf24', 2),
(91, 85, 'Gestão de Patrimônio', 'apoio', 'Controle e tombamento de ativos e móveis.', '#fde68a', 3),
(92, 85, 'Arquivos', 'apoio', 'Guarda documental física e digital da companhia.', '#fde68a', 4),
(93, 80, 'Financeiro', 'gerencia', 'Gestão do fluxo de caixa, pagamentos e recebimentos.', '#f59e0b', 2),
(94, 93, 'Contas a Pagar', 'equipe', 'Processamento e liquidação das obrigações da empresa.', '#fbbf24', 1),
(95, 93, 'Contas a Receber', 'equipe', 'Cobrança, faturamento e recebíveis de clientes.', '#fbbf24', 2),
(96, 93, 'Tesouraria', 'equipe', 'Gestão bancária, conciliações e investimentos.', '#fbbf24', 3),
(97, 80, 'Recursos Humanos', 'gerencia', 'Gestão de pessoas, folha, recrutamento e treinamento.', '#f59e0b', 3),
(98, 97, 'DHO (Desenvolvimento Humano e Organizacional)', 'equipe', 'Atração, retenção e aprimoramento de talentos.', '#fbbf24', 1),
(99, 98, 'Recrutamento & Seleção', 'apoio', 'Processos seletivos e contratações.', '#fde68a', 1),
(100, 98, 'Treinamento', 'apoio', 'Capacitação contínua e cursos internos.', '#fde68a', 2),
(101, 98, 'Desenvolvimento', 'apoio', 'Planos de carreira e avaliação de desempenho.', '#fde68a', 3),
(102, 97, 'Adm. Pessoal', 'equipe', 'Departamento pessoal, folha de pagamento e benefícios.', '#fbbf24', 2),
(103, 102, 'CLT', 'apoio', 'Controle e rotinas de colaboradores com carteira assinada.', '#fde68a', 1),
(104, 102, 'Pessoa Jurídica', 'apoio', 'Controle de prestadores terceirizados e contratos PJ.', '#fde68a', 2),
(105, 97, 'Comunicação Interna', 'apoio', 'Endomarketing e informativos para os colaboradores.', '#fbbf24', 3),
(106, 80, 'Jurídico', 'gerencia', 'Contencioso, contratos e assessoria jurídica corporativa.', '#f59e0b', 4),
(107, 106, 'Apoio ao Jurídico', 'apoio', 'Apoio operacional e protocolo de peças jurídicas.', '#fbbf24', 1),
(108, 80, 'Manutenção', 'gerencia', 'Manutenção preventiva e corretiva das instalações.', '#f59e0b', 5),
(109, 108, 'Apoio à Manutenção', 'apoio', 'Assistência aos serviços de manutenção predial.', '#fbbf24', 1);

-- 6. DIRETORIA DE TECNOLOGIA E INOVAÇÃO E SUBORDINADOS
INSERT INTO `organograma_nos` (`id`, `parent_id`, `titulo`, `tipo`, `descricao`, `cor_tema`, `ordem`) VALUES
(120, 1, 'Diretoria de Tecnologia e Inovação', 'diretoria', 'Liderança técnica em sistemas, dados, infraestrutura e inovação digital.', '#7c3aed', 5),
(121, 120, 'BI e Dados', 'gerencia', 'Business Intelligence, análise de dados e dashboards executivos.', '#8b5cf6', 1),
(122, 121, 'Apoio a Dados', 'apoio', 'Engenharia, extração e saneamento de bases de dados.', '#c4b5fd', 1),
(123, 120, 'Desenvolvimento de Sistemas', 'gerencia', 'Criação e sustentação das aplicações corporativas internas.', '#8b5cf6', 2),
(124, 123, 'Desenvolvedor', 'equipe', 'Engenheiros de software full-stack, front-end e back-end.', '#c4b5fd', 1),
(125, 120, 'Governança de TI', 'gerencia', 'Políticas de segurança da informação, compliance de TI e infraestrutura.', '#8b5cf6', 3),
(126, 125, 'Apoio à Governança de TI', 'apoio', 'Documentação, auditoria técnica e processos de TI.', '#c4b5fd', 1),
(127, 125, 'Apoio à Infraestrutura', 'apoio', 'Redes, servidores em nuvem, links e suporte de hardware.', '#c4b5fd', 2),
(128, 120, 'Inovação', 'gerencia', 'Pesquisa de novas tecnologias e ideação de produtos.', '#8b5cf6', 4),
(129, 128, 'Negócios e Inovação', 'equipe', 'Alinhamento da tecnologia com as necessidades de negócio.', '#c4b5fd', 1),
(130, 128, 'Product Owner / Especialista em Requisitos', 'apoio', 'Levantamento de histórias de usuário, requisitos e backlog.', '#ddd6fe', 1);

-- =============================================================================
-- TABELA: usuarios
-- O QUE FAZ: Armazena os usuários credenciados no sistema de organograma.
-- =============================================================================
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único do usuário',
  `nome_completo` VARCHAR(150) NOT NULL COMMENT 'Nome completo do usuário',
  `email` VARCHAR(150) NOT NULL UNIQUE COMMENT 'E-mail corporativo único para login',
  `senha_hash` VARCHAR(255) NOT NULL COMMENT 'Hash da senha criptografada com bcrypt',
  `role_global` ENUM('admin', 'diretor', 'coordenador', 'colaborador') NOT NULL DEFAULT 'colaborador' COMMENT 'Papel global do usuário',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Flag de status: 1 = ativo, 0 = inativo',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de última modificação'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de usuários cadastrados';

-- =============================================================================
-- TABELA: usuario_cargos_nos (Relacionamento N:N)
-- O QUE FAZ: Associa um usuário a um ou múltiplos nós do organograma (acumulação de cargos).
-- =============================================================================
CREATE TABLE IF NOT EXISTS `usuario_cargos_nos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL COMMENT 'Chave estrangeira para o usuário',
  `no_id` INT NOT NULL COMMENT 'Chave estrangeira para o nó do organograma',
  `papel_no_cargo` VARCHAR(100) NOT NULL DEFAULT 'Titular' COMMENT 'Ex: Titular, Interino, Acumulação',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ucn_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ucn_no` FOREIGN KEY (`no_id`) REFERENCES `organograma_nos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uk_usuario_no` (`usuario_id`, `no_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vínculos N:N entre usuários e cargos/nós do organograma';

-- =============================================================================
-- DADOS INICIAIS DE USUÁRIOS E PERMISSÕES (SEED)
-- Admin (admin@jhe.com.br / admin123)
-- Leandro (leandro@jhe.com.br / leandro123)
-- =============================================================================
INSERT INTO `usuarios` (`id`, `nome_completo`, `email`, `senha_hash`, `role_global`, `ativo`) VALUES
(1, 'Administrador do Sistema', 'admin@jhe.com.br', '$2b$10$OpRhpntsUipE3m1.67pI6uyL4OzeLH3gJnq2FihfpV4u3N/BMv/PW', 'admin', 1),
(2, 'Leandro Furlani', 'leandro@jhe.com.br', '$2b$10$FsmsI91RPiMGKqIqoaUA1.RLY17nh0Vo0mIBtdKhalSaaBk6SrLyq', 'diretor', 1)
ON DUPLICATE KEY UPDATE `nome_completo` = VALUES(`nome_completo`);

INSERT INTO `usuario_cargos_nos` (`usuario_id`, `no_id`, `papel_no_cargo`) VALUES
(2, 120, 'Titular'),
(2, 128, 'Acumulação')
ON DUPLICATE KEY UPDATE `papel_no_cargo` = VALUES(`papel_no_cargo`);

