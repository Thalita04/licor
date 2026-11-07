-- ========================================================
-- DOSE CERTA LICORES ARTESANAIS — ESQUEMA DE BANCO DE DADOS
-- Dialeto: PostgreSQL (Compatível 13+)
-- ========================================================

-- Criação da tabela de usuários administradores
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criação da tabela de conteúdos institucionais configuráveis
CREATE TABLE IF NOT EXISTS site_content (
    key VARCHAR(100) PRIMARY KEY,
    section VARCHAR(100) NOT NULL,
    label VARCHAR(200) NOT NULL,
    value TEXT NOT NULL,
    field_type VARCHAR(50) NOT NULL DEFAULT 'text',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criação da galeria de fotos institucionais
CREATE TABLE IF NOT EXISTS gallery_images (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'geral',
    image_url VARCHAR(500) NOT NULL,
    description TEXT,
    volume VARCHAR(50) DEFAULT '375 ml',
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criação de mensagens institucionais recebidas
CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(200),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Histórico de auditoria / ações no painel administrativo
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(150),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- DADOS INICIAIS (SEEDS)
-- ========================================================

-- Conteúdo inicial institucional
INSERT INTO site_content (key, section, label, value, field_type) VALUES
('hero_tagline', 'home', 'Tagline Principal', 'Da natureza para a garrafa', 'text'),
('hero_title', 'home', 'Título do Banner Principal', 'Mais que um licor, um encontro.', 'text'),
('hero_subtitle', 'home', 'Subtítulo do Banner', 'Produção artesanal com respeito à terra, aos ingredientes selecionados e ao tempo de maturação perfeito.', 'textarea'),
('brand_presentation_title', 'home', 'Título da Apresentação', 'A Essência da Dose Certa', 'text'),
('brand_presentation_text', 'home', 'Texto de Apresentação', 'Nascida da paixão pela botânica e pela alquimia dos sabores brasileiros, a Dose Certa combina métodos tradicionais de infusão e maceração com frutas, ervas e especiarias cuidadosamente selecionadas. Cada garrafa é envasada manualmente em pequenos lotes com respeito total ao tempo.', 'textarea'),
('about_story_title', 'sobre', 'Título da História', 'Nossa Trajetória e Filosofia', 'text'),
('about_story_text', 'sobre', 'História Completa', 'A Dose Certa surgiu da vontade de resgatar o valor dos encontros ao redor da mesa. Longe das produções industriais massificadas, acreditamos que a verdadeira nobreza de um licor reside na paciência: no tempo que a planta leva para crescer, na maceração lenta que extrai óleos essenciais puros e no instante em que a garrafa é aberta entre amigos.', 'textarea'),
('about_pillars', 'sobre', 'Pilares da Marca', '1. Ingredientes 100% Selecionados: Frutas frescas, café de origem e ervas aromáticas puras.\n2. Lotes Exclusivos: Cada tiragem é numerada e controlada artesanalmente.\n3. Sem Aditivos Químicos: Cor e aroma puramente naturais, fiéis à botânica.', 'textarea'),
('contact_instagram', 'contato', 'Instagram Oficial', '@dose.certa_licores.artesanais', 'text'),
('contact_instagram_url', 'contato', 'Link Instagram', 'https://www.instagram.com/dose.certa_licores.artrsanais?obrf=bGtmbXR1M3oyd210&utm_source=qr', 'text'),
('contact_email', 'contato', 'E-mail Institucional', 'contato@dosecertalicores.com.br', 'text'),
('contact_phone', 'contato', 'Telefone / WhatsApp Institucional', '(11) 98765-4321', 'text'),
('contact_location', 'contato', 'Localização / Origem', 'São Paulo — Brasil | Produção em Pequenos Lotes', 'text'),
('contact_schedule', 'contato', 'Atendimento Institucional', 'Segunda a Sexta, das 09h às 18h', 'text')
ON CONFLICT (key) DO NOTHING;

-- Imagens iniciais da galeria institucional (usando as fotos reais fornecidas)
INSERT INTO gallery_images (title, category, image_url, description, volume, is_featured, display_order) VALUES
('Licor Artesanal de Café', 'sabores', '/assets/images/licor-cafe.jpg', 'Infusão aromática de grãos especiais de café com doçura balanceada e notas tostadas marcantes.', '375 ml', TRUE, 1),
('Licor Flor de Laranjeira', 'sabores', '/assets/images/licor-flor-laranjeira.jpg', 'Perfil floral sofisticado e delicado, evocando os pomares cítricos e a brisa da primavera.', '375 ml', TRUE, 2),
('Licor de Capim-Santo', 'sabores', '/assets/images/licor-capim-santo.jpg', 'Frescor herbal inconfundível, notas cítricas e acabamento aveludado e revigorante.', '375 ml', TRUE, 3),
('Emblema Oficial Dose Certa', 'identidade', '/assets/images/logo-dose-certa.jpg', 'Identidade visual que celebra as folhas botânicas, a lua, as estrelas e a nobreza artesanal.', 'Oficial', FALSE, 4)
ON CONFLICT DO NOTHING;
