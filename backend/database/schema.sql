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
-- TABELA: niveis_hierarquicos
-- O QUE FAZ: Armazena os níveis hierárquicos e temas semânticos da JHE.
-- =============================================================================
CREATE TABLE IF NOT EXISTS `niveis_hierarquicos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único do nível hierárquico',
  `slug` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Identificador único textual (ex: ceo, staff, diretoria)',
  `nome` VARCHAR(100) NOT NULL COMMENT 'Nome de exibição institucional (ex: Co-CEOs, Staff, Diretoria)',
  `ordem_hierarquica` INT NOT NULL DEFAULT 1 COMMENT 'Ordem de precedência hierárquica (0 a N)',
  `classe_css` VARCHAR(50) NOT NULL COMMENT 'Classe CSS semântica definida em organograma.css',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Flag de status: 1 = ativo, 0 = inativo',
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de níveis hierárquicos institucionais JHE';

-- Dados Iniciais (Seed) dos Níveis Hierárquicos Institucionais JHE (Ordem ajustada 0-4)
INSERT INTO `niveis_hierarquicos` (`id`, `slug`, `nome`, `ordem_hierarquica`, `classe_css`, `ativo`) VALUES
(1, 'ceo', 'Co-CEOs', 0, 'level-ceo', 1),
(2, 'staff', 'Assessoria / Staff', 1, 'level-staff', 1),
(3, 'diretoria', 'Diretoria', 2, 'level-diretoria', 1),
(4, 'coordenacao', 'Coordenação', 3, 'level-coordenacao', 1),
(5, 'gerencia', 'Gerência', 3, 'level-coordenacao', 1),
(6, 'apoio', 'Apoio', 4, 'level-subordinado', 1),
(7, 'equipe', 'Equipe', 4, 'level-subordinado', 1),
(8, 'unidade', 'Unidade de Negócios', 3, 'level-coordenacao', 1),
(9, 'contrato', 'Contrato', 4, 'level-subordinado', 1),
(10, 'oia', 'OIA', 2, 'level-diretoria', 1)
ON DUPLICATE KEY UPDATE `nome` = VALUES(`nome`), `classe_css` = VALUES(`classe_css`), `ordem_hierarquica` = VALUES(`ordem_hierarquica`);

-- =============================================================================
-- TABELA: organograma_nos
-- O QUE FAZ: Armazena a estrutura hierárquica completa do mapa mental / organograma.
-- =============================================================================
CREATE TABLE IF NOT EXISTS `organograma_nos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único sequencial do nó',
  `parent_id` INT NULL DEFAULT NULL COMMENT 'Chave estrangeira para o nó pai. NULL indica raiz (ex: Co-CEOs)',
  `titulo` VARCHAR(255) NOT NULL COMMENT 'Nome exibido no card (Ex: Diretoria Comercial, Licitação)',
  `nivel_id` INT NOT NULL DEFAULT 7 COMMENT 'Chave estrangeira referenciando niveis_hierarquicos(id)',
  `responsavel` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Nome da pessoa líder, diretor ou gestor responsável',
  `lideres_json` JSON NULL DEFAULT NULL COMMENT 'Lista estruturada de líderes (usada em Co-CEOs para nomes e fotos)',
  `email_contato` VARCHAR(150) NULL DEFAULT NULL COMMENT 'E-mail corporativo do setor ou responsável',
  `telefone` VARCHAR(50) NULL DEFAULT NULL COMMENT 'Telefone corporativo ou institucional do setor',
  `descricao` TEXT NULL COMMENT 'Texto explicativo exibido no modal/tooltip sobre as atribuições do setor',
  `icone` VARCHAR(50) NULL DEFAULT 'users' COMMENT 'Identificador do ícone Lucide para o card',
  `ordem` INT NOT NULL DEFAULT 0 COMMENT 'Posição horizontal de exibição em relação aos irmãos',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Flag de status: 1 = ativo/visível, 0 = inativo/oculto',
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data e hora da inclusão no sistema',
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data e hora da última modificação',

  CONSTRAINT `fk_organograma_parent`
    FOREIGN KEY (`parent_id`)
    REFERENCES `organograma_nos` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
    
  CONSTRAINT `fk_organograma_nivel`
    FOREIGN KEY (`nivel_id`)
    REFERENCES `niveis_hierarquicos` (`id`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela central de nós do organograma interativo';

-- Índices de performance para busca em árvore e listagens
CREATE INDEX `idx_organograma_parent` ON `organograma_nos` (`parent_id`);
CREATE INDEX `idx_organograma_nivel` ON `organograma_nos` (`nivel_id`);
CREATE INDEX `idx_organograma_ativo_ordem` ON `organograma_nos` (`ativo`, `ordem`);

-- =============================================================================
-- DADOS INICIAIS (SEED) DO ORGANOGRAMA
-- Mapeamento completo e fiel à estrutura do organograma corporativo JHE.
-- =============================================================================

-- 1. NÓ RAIZ (Co-CEOs) [nivel_id = 1]
INSERT INTO `organograma_nos` (`id`, `parent_id`, `titulo`, `nivel_id`, `descricao`, `ordem`, `lideres_json`) VALUES
(1, NULL, 'Co-CEOs', 1, 'Liderança executiva máxima da empresa.', 1, '[{"nome": "Dr. Hélio", "foto": "/avatars/helio.png"}, {"nome": "Dr. Viol", "foto": "/avatars/viol.png"}]')
ON DUPLICATE KEY UPDATE `titulo`=VALUES(`titulo`);

-- 2. STAFF / ASSESSORIAS DIRETAS (Ligadas aos Co-CEOs) [nivel_id = 2 (staff), 6 (apoio), 7 (equipe), 5 (gerencia)]
INSERT IGNORE INTO `organograma_nos` (`id`, `parent_id`, `titulo`, `nivel_id`, `descricao`, `ordem`) VALUES
(2, 1, 'Secretaria Executiva', 2, 'Suporte administrativo e executivo direto aos Co-CEOs.', 1),
(3, 1, 'Compliance', 2, 'Garante conformidade com normas, integridade corporativa e governança.', 2),
(4, 3, 'Apoio ao Compliance', 6, 'Equipe de apoio e suporte operacional de compliance.', 1),
(5, 1, 'ESG', 2, 'Práticas de governança ambiental, social e corporativa.', 3),
(6, 1, 'Planejamento Estratégico', 2, 'Monitoramento e desenho das metas e diretrizes de longo prazo.', 4),
(7, 1, 'SGI', 2, 'Sistema de Gestão Integrada.', 5),
(8, 7, 'Qualidade', 7, 'Gestão dos padrões de qualidade de processos.', 1),
(9, 7, 'Segurança do Trabalho', 7, 'Saúde e segurança operacional dos colaboradores.', 2),
(10, 7, 'Meio Ambiente', 7, 'Controle ambiental e sustentabilidade nas operações.', 3),
(11, 7, 'Responsabilidade Social', 7, 'Projetos e impacto social comunitário.', 4),
(12, 1, 'Gerência Técnica Geral do Organograma de Inspeção Acreditada - OIA', 5, 'Gestão técnica das auditorias e inspeções acreditadas.', 6),
(13, 12, 'Consultoria', 7, 'Consultoria técnica de conformidade.', 1),
(14, 12, 'Equipe de SGCI', 7, 'Equipe de controle interno e inspeção.', 2),
(15, 12, 'Equipe Técnica de Inspeção', 7, 'Técnicos de campo e validação técnica.', 3),
(16, 12, 'Equipe de Auditoria', 7, 'Auditores de conformidade das inspeções.', 4);

-- 3. DIRETORIA COMERCIAL E SUBORDINADOS [nivel_id = 3 (diretoria), 5 (gerencia), 7 (equipe), 6 (apoio)]
INSERT IGNORE INTO `organograma_nos` (`id`, `parent_id`, `titulo`, `nivel_id`, `descricao`, `ordem`) VALUES
(20, 1, 'Diretoria Comercial', 3, 'Gestão das oportunidades de negócios, vendas públicas, privadas e marketing.', 2),
(21, 20, 'Consultoria / Novos Negócios', 5, 'Prospecção e estruturação de novas frentes de negócio.', 1),
(22, 20, 'Licitação', 5, 'Análise de editais e condução de licitações públicas.', 2),
(23, 20, 'Vendas', 5, 'Coordenação das forças de vendas públicas e privadas.', 3),
(24, 23, 'Vendas Públicas', 7, 'Execução de vendas voltadas ao setor governamental.', 1),
(25, 23, 'Apoio ao Comercial', 6, 'Suporte operacional a vendas públicas.', 2),
(26, 23, 'Vendas Privadas', 7, 'Vendas corporativas para o setor privado.', 3),
(27, 23, 'CS / Pós Vendas', 7, 'Customer Success e atendimento de pós-venda ao cliente.', 4),
(28, 23, 'Apoio ao Comercial (Privado)', 6, 'Suporte operacional a vendas privadas.', 5),
(29, 20, 'Marketing e Comunicação', 5, 'Posicionamento de marca, mídia e comunicação externa.', 4);

-- 4. DIRETORIA DE OPERAÇÕES E SUBORDINADOS [nivel_id = 3 (diretoria), 5 (gerencia), 6 (apoio), 8 (unidade), 9 (contrato), 7 (equipe)]
INSERT IGNORE INTO `organograma_nos` (`id`, `parent_id`, `titulo`, `nivel_id`, `descricao`, `ordem`) VALUES
(40, 1, 'Diretoria de Operações', 3, 'Gestão operacional de obras, contratos e entregas técnicas.', 3),
(41, 40, 'Administrativo Operacional', 5, 'Gestão administrativa de campo e suporte a obras.', 1),
(42, 40, 'Metodologia Técnico-Social', 5, 'Desenvolvimento de métodos de atuação técnico-social em contratos.', 2),
(43, 40, 'Planejamento e Controle', 5, 'Controle orçamentário, cronogramas e entregas de contratos.', 3),
(44, 43, 'Apoio ao Planejamento e Controle', 6, 'Assistência técnica ao controle operacional.', 1),
(45, 40, 'Unidade de Negócios Edificação', 8, 'Gestão dos contratos de construção e edificações.', 4),
(46, 45, 'Contrato N (Edificação)', 9, 'Célula operacional representativa de cada contrato de Edificação.', 1),
(47, 46, 'Administrativo', 6, 'Administração local do contrato de edificação.', 1),
(48, 46, 'Planejamento', 6, 'Planejamento e cronograma da obra.', 2),
(49, 46, 'Equipe Contrato', 7, 'Corpo técnico e operacional alocado na obra.', 3),
(50, 40, 'Unidade de Negócios Educação', 8, 'Gestão dos contratos do setor de educação.', 5),
(51, 50, 'Contrato N (Educação)', 9, 'Contrato específico de educação.', 1),
(52, 51, 'Administrativo', 6, 'Administração do contrato de educação.', 1),
(53, 51, 'Planejamento', 6, 'Planejamento das ações educacionais.', 2),
(54, 51, 'Equipe Contrato', 7, 'Profissionais de execução do projeto de educação.', 3),
(55, 40, 'Unidade de Negócios Habitação', 8, 'Contratos de moradia popular e habitacional.', 6),
(56, 55, 'Contrato N (Habitação)', 9, 'Contrato de habitação.', 1),
(57, 56, 'Administrativo', 6, 'Administração do contrato de habitação.', 1),
(58, 56, 'Planejamento', 6, 'Planejamento de obras habitacionais.', 2),
(59, 56, 'Equipe Contrato', 7, 'Execução de campo em habitação.', 3),
(60, 40, 'Unidade de Negócios Saneamento', 8, 'Contratos de água, esgoto e drenagem.', 7),
(61, 60, 'Contrato N (Saneamento)', 9, 'Contrato de saneamento.', 1),
(62, 61, 'Administrativo', 6, 'Administração do contrato de saneamento.', 1),
(63, 61, 'Planejamento', 6, 'Planejamento das obras de saneamento.', 2),
(64, 61, 'Equipe Contrato', 7, 'Execução em campo de saneamento.', 3),
(65, 40, 'Unidade de Negócios Transporte', 8, 'Contratos de infraestrutura viária e mobilidade.', 8),
(66, 65, 'Contrato N (Transporte)', 9, 'Contrato de transporte.', 1),
(67, 66, 'Administrativo', 6, 'Administração do contrato de transporte.', 1),
(68, 66, 'Planejamento', 6, 'Planejamento das obras de transporte.', 2),
(69, 66, 'Equipe Contrato', 7, 'Operação em campo de infraestrutura de transporte.', 3),
(70, 40, 'Unidade de Negócios DIA', 8, 'Unidade de Negócios DIA.', 9);

-- 5. DIRETORIA ADMINISTRATIVA E SUBORDINADOS [nivel_id = 3 (diretoria), 5 (gerencia), 6 (apoio), 7 (equipe)]
INSERT IGNORE INTO `organograma_nos` (`id`, `parent_id`, `titulo`, `nivel_id`, `descricao`, `ordem`) VALUES
(80, 1, 'Diretoria Administrativa', 3, 'Gestão financeira, contábil, compras, recursos humanos e jurídico.', 4),
(81, 80, 'Controladoria', 5, 'Supervisão contábil, fiscal, suprimentos e infraestrutura predial.', 1),
(82, 80, 'Contabilidade', 5, 'Gestão fiscal e relatórios societários.', 2),
(83, 82, 'Contabilidade Geral', 6, 'Lançamentos contábeis e fechamentos de balanço.', 1),
(84, 82, 'Contabilidade Fiscal', 6, 'Apuração de tributos e conformidade com o fisco.', 2),
(85, 80, 'Administrativo', 5, 'Gestão de compras, facilities, patrimônio e guarda documental.', 3),
(86, 85, 'Gestão Estratégica de Compras', 7, 'Compras corporativas, negociações estratégicas e cotações.', 1),
(87, 86, 'Aquisição de Ativos, Equipamentos e Serviços Técnicos', 6, 'Compra de bens duráveis e contratação técnica especializada.', 1),
(88, 87, 'Apoio Técnico para Aquisição', 6, 'Validação técnica dos editais de compras.', 1),
(89, 86, 'Equipe: Compras de Bens de Consumo', 6, 'Compras recorrentes e suprimentos diários.', 2),
(90, 85, 'Facilities / Serviços Gerais', 7, 'Manutenção predial e administração do espaço corporativo.', 2),
(91, 85, 'Gestão de Patrimônio', 6, 'Controle e tombamento de ativos e móveis.', 3),
(92, 85, 'Arquivos', 6, 'Guarda documental física e digital da companhia.', 4),
(93, 80, 'Financeiro', 5, 'Gestão do fluxo de caixa, pagamentos e recebimentos.', 2),
(94, 93, 'Contas a Pagar', 7, 'Processamento e liquidação das obrigações da empresa.', 1),
(95, 93, 'Contas a Receber', 7, 'Cobrança, faturamento e recebíveis de clientes.', 2),
(96, 93, 'Tesouraria', 7, 'Gestão bancária, conciliações e investimentos.', 3),
(97, 80, 'Recursos Humanos', 5, 'Gestão de pessoas, folha, recrutamento e treinamento.', 3),
(98, 97, 'DHO (Desenvolvimento Humano e Organizacional)', 7, 'Atração, retenção e aprimoramento de talentos.', 1),
(99, 98, 'Recrutamento & Seleção', 6, 'Processos seletivos e contratações.', 1),
(100, 98, 'Treinamento', 6, 'Capacitação contínua e cursos internos.', 2),
(101, 98, 'Desenvolvimento', 6, 'Planos de carreira e avaliação de desempenho.', 3),
(102, 97, 'Adm. Pessoal', 7, 'Departamento pessoal, folha de pagamento e benefícios.', 2),
(103, 102, 'CLT', 6, 'Controle e rotinas de colaboradores com carteira assinada.', 1),
(104, 102, 'Pessoa Jurídica', 6, 'Controle de prestadores terceirizados e contratos PJ.', 2),
(105, 97, 'Comunicação Interna', 6, 'Endomarketing e informativos para os colaboradores.', 3),
(106, 80, 'Jurídico', 5, 'Contencioso, contratos e assessoria jurídica corporativa.', 4),
(107, 106, 'Apoio ao Jurídico', 6, 'Apoio operacional e protocolo de peças jurídicas.', 1),
(108, 80, 'Manutenção', 5, 'Manutenção preventiva e corretiva das instalações.', 5),
(109, 108, 'Apoio à Manutenção', 6, 'Assistência aos serviços de manutenção predial.', 1);

-- 6. DIRETORIA DE TECNOLOGIA E INOVAÇÃO E SUBORDINADOS [nivel_id = 3 (diretoria), 5 (gerencia), 6 (apoio), 7 (equipe)]
INSERT IGNORE INTO `organograma_nos` (`id`, `parent_id`, `titulo`, `nivel_id`, `descricao`, `ordem`) VALUES
(120, 1, 'Diretoria de Tecnologia e Inovação', 3, 'Liderança técnica em sistemas, dados, infraestrutura e inovação digital.', 5),
(121, 120, 'BI e Dados', 5, 'Business Intelligence, análise de dados e dashboards executivos.', 1),
(122, 121, 'Apoio a Dados', 6, 'Engenharia, extração e saneamento de bases de dados.', 1),
(123, 120, 'Desenvolvimento de Sistemas', 5, 'Criação e sustentação das aplicações corporativas internas.', 2),
(124, 123, 'Desenvolvedor', 7, 'Engenheiros de software full-stack, front-end e back-end.', 1),
(125, 120, 'Governança de TI', 5, 'Políticas de segurança da informação, compliance de TI e infraestrutura.', 3),
(126, 125, 'Apoio à Governança de TI', 6, 'Documentação, auditoria técnica e processos de TI.', 1),
(127, 125, 'Apoio à Infraestrutura', 6, 'Redes, servidores em nuvem, links e suporte de hardware.', 2),
(128, 120, 'Inovação', 5, 'Pesquisa de novas tecnologias e ideação de produtos.', 4),
(129, 128, 'Negócios e Inovação', 7, 'Alinhamento da tecnologia com as necessidades de negócio.', 1),
(130, 128, 'Product Owner / Especialista em Requisitos', 6, 'Levantamento de histórias de usuário, requisitos e backlog.', 1);

-- =============================================================================
-- TABELA: usuarios
-- O QUE FAZ: Armazena os usuários credenciados no sistema de organograma.
-- =============================================================================
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único do usuário',
  `nome_completo` VARCHAR(255) NOT NULL COMMENT 'Nome completo do usuário',
  `email` VARCHAR(191) NOT NULL UNIQUE COMMENT 'E-mail corporativo único para login',
  `senha_hash` VARCHAR(255) NOT NULL COMMENT 'Hash da senha criptografada com bcrypt',
  `role_global` ENUM('admin', 'diretor', 'coordenador', 'colaborador') NOT NULL DEFAULT 'colaborador' COMMENT 'Papel global do usuário',
  `primeiro_acesso` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = precisa redefinir senha no login',
  `termo_aceite_versao` VARCHAR(20) NULL DEFAULT NULL COMMENT 'Versão dos Termos de Serviço aceitos',
  `termo_aceite_em` DATETIME NULL DEFAULT NULL COMMENT 'Data e hora do aceite dos termos',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Flag de status: 1 = ativo, 0 = inativo',
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de última modificação'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de usuários cadastrados';

-- =============================================================================
-- TABELA: termos_servico
-- O QUE FAZ: Armazena o Termo de Aceite / Termos de Serviço vigentes.
-- =============================================================================
CREATE TABLE IF NOT EXISTS `termos_servico` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único do termo',
  `titulo` VARCHAR(255) NOT NULL DEFAULT 'Termos de Serviço' COMMENT 'Título principal do modal',
  `subtitulo` VARCHAR(255) NOT NULL DEFAULT 'Revise os termos antes de aceitar o acordo.' COMMENT 'Subtítulo institucional',
  `conteudo` LONGTEXT NOT NULL COMMENT 'Texto completo dos Termos de Serviço',
  `versao` VARCHAR(20) NOT NULL DEFAULT '1.0' COMMENT 'Versão do documento (ex: 1.0, 1.1, 2.0)',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = termo ativo vigente, 0 = histórico',
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de última atualização'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de Termos de Serviço e Aceite Dinâmico';

-- Seed do Termo de Serviço Vigente Padrão JHE Engenharia
INSERT INTO `termos_servico` (`id`, `titulo`, `subtitulo`, `conteudo`, `versao`, `ativo`) VALUES
(1, 'Termos de Serviço', 'Revise os termos antes de aceitar o acordo.', 'Bem-vindo aos Termos de Serviço da JHE Engenharia.\n\n1. USO DA PLATAFORMA\nA plataforma de Organograma Corporativo da JHE Engenharia destina-se ao gerenciamento de setores, cargos e permissões institucionais. As informações contidas nesta aplicação são de caráter confidencial e restritas aos colaboradores autorizados.\n\n2. RESPONSABILIDADES DO USUÁRIO\nO usuário compromete-se a manter a confidencialidade de suas credenciais de acesso, não compartilhando sua senha com terceiros. Qualquer alteração realizada na estrutura organizacional através do seu perfil será registrada e auditada.\n\n3. PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)\nOs dados pessoais fornecidos (nome, e-mail corporativo e cargo) são utilizados exclusivamente para fins de autenticação, atribuição de responsabilidades e controle de acesso RBAC no sistema.\n\n4. PROPRIEDADE INTELECTUAL\nToda a estrutura visual, código-fonte e elementos gráficos da plataforma pertencem à JHE Engenharia. É vedada a reprodução total ou parcial sem autorização prévia por escrito.\n\n5. MODIFICAÇÕES DOS TERMOS\nA JHE Engenharia reserva-se o direito de atualizar estes termos periodicamente. As alterações entrarão em vigor após a publicação da nova versão na plataforma.', '1.0', 1)
ON DUPLICATE KEY UPDATE `titulo` = VALUES(`titulo`), `subtitulo` = VALUES(`subtitulo`), `conteudo` = VALUES(`conteudo`), `versao` = VALUES(`versao`);


-- =============================================================================
-- TABELA: usuario_cargos_nos (Relacionamento N:N)
-- O QUE FAZ: Associa um usuário a um ou múltiplos nós do organograma.
-- =============================================================================
CREATE TABLE IF NOT EXISTS `usuario_cargos_nos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL COMMENT 'Chave estrangeira para o usuário',
  `no_id` INT NOT NULL COMMENT 'Chave estrangeira para o nó do organograma',
  `papel_no_cargo` VARCHAR(100) NOT NULL DEFAULT 'Titular' COMMENT 'Ex: Titular, Interino, Acumulação',
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ucn_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ucn_no` FOREIGN KEY (`no_id`) REFERENCES `organograma_nos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uk_usuario_no` (`usuario_id`, `no_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vínculos N:N entre usuários e cargos/nós do organograma';

-- =============================================================================
-- DADOS INICIAIS DE USUÁRIOS E PERMISSÕES (SEED)
-- Admin (admin@jhe.com.br / Admin@123 ou admin123)
-- Leandro (leandro@jhe.com.br / leandro123)
-- =============================================================================
INSERT INTO `usuarios` (`id`, `nome_completo`, `email`, `senha_hash`, `role_global`, `primeiro_acesso`, `ativo`) VALUES
(1, 'Administrador do Sistema', 'admin@jhe.com.br', '$2b$10$Ep64l/dYVj1Jc.KjG.k4v.O8kO.YhIqYqX0K4t9oH3vBqA9C5P8aK', 'admin', 0, 1),
(2, 'Leandro Furlani', 'leandro@jhe.com.br', '$2b$10$HrGPsO1lw4K46M9UVnXMmu8DdUXVuSY8UW8obS809ecXZ0V7uTkQO', 'diretor', 0, 1)
ON DUPLICATE KEY UPDATE `nome_completo` = VALUES(`nome_completo`), `senha_hash` = VALUES(`senha_hash`), `role_global` = VALUES(`role_global`), `primeiro_acesso` = VALUES(`primeiro_acesso`);


INSERT INTO `usuario_cargos_nos` (`usuario_id`, `no_id`, `papel_no_cargo`) VALUES
(2, 120, 'Titular'),
(2, 128, 'Acumulação')
ON DUPLICATE KEY UPDATE `papel_no_cargo` = VALUES(`papel_no_cargo`);

