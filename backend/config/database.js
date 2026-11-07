const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let dbInstance = null;
let activeEngine = 'postgres';

// Criação do Pool PostgreSQL
function createPgPool() {
  const connectionConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'dose_certa_db',
        connectionTimeoutMillis: 3000,
      };

  return new Pool(connectionConfig);
}

// Wrapper unificado para executar queries
async function query(sql, params = []) {
  if (activeEngine === 'postgres') {
    return await dbInstance.query(sql, params);
  } else {
    // Modo SQLite Fallback: converte $1, $2 para ?
    return new Promise((resolve, reject) => {
      let sqliteSql = sql.replace(/\$(\d+)/g, '?');
      const isSelect = /^\s*(SELECT|PRAGMA)/i.test(sqliteSql);

      if (isSelect) {
        dbInstance.all(sqliteSql, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows: rows || [], rowCount: rows ? rows.length : 0 });
        });
      } else {
        dbInstance.run(sqliteSql, params, function (err) {
          if (err) return reject(err);
          // Se for INSERT com RETURNING id
          if (/RETURNING\s+id/i.test(sqliteSql)) {
            resolve({ rows: [{ id: this.lastID }], rowCount: this.changes });
          } else {
            resolve({ rows: [], rowCount: this.changes, lastID: this.lastID });
          }
        });
      }
    });
  }
}

// Inicializador de schema e dados iniciais
async function initDatabase() {
  const pgPool = createPgPool();

  try {
    // Tenta conectar ao PostgreSQL
    const client = await pgPool.connect();
    client.release();
    dbInstance = pgPool;
    activeEngine = 'postgres';
    console.log('[Banco de Dados] Conexão com PostgreSQL estabelecida com sucesso.');

    // Lê e executa schema.sql no PostgreSQL
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await dbInstance.query(schemaSql);
      console.log('[Banco de Dados] Schema e sementes do PostgreSQL validados.');
    }
  } catch (pgError) {
    console.warn(`[Banco de Dados] Aviso: Não foi possível conectar ao PostgreSQL (${pgError.message}).`);
    console.warn('[Banco de Dados] Ativando modo local SQLite autônomo para garantir execução imediata.');

    activeEngine = 'sqlite';
    const sqlitePath = path.join(__dirname, '../../database/dose_certa.sqlite');
    dbInstance = new sqlite3.Database(sqlitePath);

    await initSqliteSchema();
  }

  // Garante que o administrador padrão exista
  await ensureDefaultAdmin();
}

async function initSqliteSchema() {
  const runAsync = (sql) => new Promise((resolve, reject) => {
    dbInstance.run(sql, (err) => (err ? reject(err) : resolve()));
  });

  await runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      section TEXT NOT NULL,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      field_type TEXT NOT NULL DEFAULT 'text',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS gallery_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'geral',
      image_url TEXT NOT NULL,
      description TEXT,
      volume TEXT DEFAULT '375 ml',
      is_featured INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Sementes iniciais
  const defaultContents = [
    ['hero_tagline', 'home', 'Tagline Principal', 'Da natureza para a garrafa', 'text'],
    ['hero_title', 'home', 'Título do Banner Principal', 'Mais que um licor, um encontro.', 'text'],
    ['hero_subtitle', 'home', 'Subtítulo do Banner', 'Produção artesanal com respeito à terra, aos ingredientes selecionados e ao tempo de maturação perfeito.', 'textarea'],
    ['brand_presentation_title', 'home', 'Título da Apresentação', 'A Essência da Dose Certa', 'text'],
    ['brand_presentation_text', 'home', 'Texto de Apresentação', 'Nascida da paixão pela botânica e pela alquimia dos sabores brasileiros, a Dose Certa combina métodos tradicionais de infusão e maceração com frutas, ervas e especiarias cuidadosamente selecionadas. Cada garrafa é envasada manualmente em pequenos lotes com respeito total ao tempo.', 'textarea'],
    ['about_story_title', 'sobre', 'Título da História', 'Nossa Trajetória e Filosofia', 'text'],
    ['about_story_text', 'sobre', 'História Completa', 'A Dose Certa surgiu da vontade de resgatar o valor dos encontros ao redor da mesa. Longe das produções industriais massificadas, acreditamos que a verdadeira nobreza de um licor reside na paciência: no tempo que a planta leva para crescer, na maceração lenta que extrai óleos essenciais puros e no instante em que a garrafa é aberta entre amigos.', 'textarea'],
    ['about_pillars', 'sobre', 'Pilares da Marca', '1. Ingredientes 100% Selecionados: Frutas frescas, café de origem e ervas aromáticas puras.\n2. Lotes Exclusivos: Cada tiragem é numerada e controlada artesanalmente.\n3. Sem Aditivos Químicos: Cor e aroma puramente naturais, fiéis à botânica.', 'textarea'],
    ['contact_instagram', 'contato', 'Instagram Oficial', '@dose.certa_licores.artesanais', 'text'],
    ['contact_instagram_url', 'contato', 'Link Instagram', 'https://www.instagram.com/dose.certa_licores.artrsanais?obrf=bGtmbXR1M3oyd210&utm_source=qr', 'text'],
    ['contact_email', 'contato', 'E-mail Institucional', 'contato@dosecertalicores.com.br', 'text'],
    ['contact_phone', 'contato', 'Telefone / WhatsApp Institucional', '(11) 98765-4321', 'text'],
    ['contact_location', 'contato', 'Localização / Origem', 'São Paulo — Brasil | Produção em Pequenos Lotes', 'text'],
    ['contact_schedule', 'contato', 'Atendimento Institucional', 'Segunda a Sexta, das 09h às 18h', 'text']
  ];

  for (const item of defaultContents) {
    await new Promise((res) => {
      dbInstance.run(
        'INSERT OR IGNORE INTO site_content (key, section, label, value, field_type) VALUES (?, ?, ?, ?, ?)',
        item,
        () => res()
      );
    });
  }

  const defaultImages = [
    ['Licor Artesanal de Café', 'sabores', '/assets/images/licor-cafe.jpg', 'Infusão aromática de grãos especiais de café com doçura balanceada e notas tostadas marcantes.', '375 ml', 1, 1],
    ['Licor Flor de Laranjeira', 'sabores', '/assets/images/licor-flor-laranjeira.jpg', 'Perfil floral sofisticado e delicado, evocando os pomares cítricos e a brisa da primavera.', '375 ml', 1, 2],
    ['Licor de Capim-Santo', 'sabores', '/assets/images/licor-capim-santo.jpg', 'Frescor herbal inconfundível, notas cítricas e acabamento aveludado e revigorante.', '375 ml', 1, 3],
    ['Emblema Oficial Dose Certa', 'identidade', '/assets/images/logo-dose-certa.jpg', 'Identidade visual que celebra as folhas botânicas, a lua, as estrelas e a nobreza artesanal.', 'Oficial', 0, 4]
  ];

  const countRes = await query('SELECT COUNT(*) as count FROM gallery_images');
  const count = parseInt(countRes.rows[0].count, 10);
  if (count === 0) {
    for (const img of defaultImages) {
      await query(
        'INSERT INTO gallery_images (title, category, image_url, description, volume, is_featured, display_order) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        img
      );
    }
  }
  console.log('[Banco de Dados] Schema SQLite e sementes prontos.');
}

async function ensureDefaultAdmin() {
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@dosecerta.com.br';
  const adminName = process.env.ADMIN_DEFAULT_NAME || 'Administrador Dose Certa';
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'DoseCerta@2026';

  const userCheck = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (userCheck.rows.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(adminPassword, salt);
    await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [adminName, adminEmail, hash, 'admin']
    );
    console.log(`[Segurança] Administrador padrão inicializado: ${adminEmail}`);
  }
}

module.exports = {
  query,
  initDatabase,
  getEngine: () => activeEngine
};
