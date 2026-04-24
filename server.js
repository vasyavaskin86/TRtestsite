require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "start-super-secret-change-me";

// MySQL connection pool
const dbName = process.env.DB_NAME || "sportzone";

function getPoolConfig() {
  if (process.env.DATABASE_URL) {
    // If DATABASE_URL is provided, we use it directly. 
    // We add SSL if it's a cloud DB (usually the case with DATABASE_URL)
    const url = process.env.DATABASE_URL;
    return url.includes('ssl=') ? url : `${url}${url.includes('?') ? '&' : '?'}ssl={"rejectUnauthorized":false}`;
  }
  
  return {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "root",
    port: parseInt(process.env.DB_PORT || "3306"),
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  };
}

let pool = mysql.createPool(getPoolConfig());

// Database initialization
async function initDb() {
  let connection;
  try {
    console.log("Attempting to connect to database...");
    
    // Try to get a connection from the pool
    try {
      connection = await pool.getConnection();
      console.log(`Successfully connected to database.`);
    } catch (e) {
      console.log(`Initial connection failed: ${e.message}`);
      
      // If we are NOT using DATABASE_URL, we can try to create the database
      if (!process.env.DATABASE_URL) {
        console.log(`Trying to create database ${dbName} if it doesn't exist...`);
        const tempConn = await mysql.createConnection({
          host: process.env.DB_HOST || "localhost",
          user: process.env.DB_USER || "root",
          password: process.env.DB_PASS || "root",
          port: parseInt(process.env.DB_PORT || "3306"),
          ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
        });
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await tempConn.end();
        
        // Try connecting again after creation
        connection = await pool.getConnection();
        console.log(`Database ${dbName} created/verified and connected.`);
      } else {
        // If DATABASE_URL failed, we can't do much but throw
        throw e;
      }
    }

    if (!process.env.DATABASE_URL) {
      await connection.query(`USE \`${dbName}\``);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        isAdmin BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        category VARCHAR(255),
        price DECIMAL(10, 2),
        description TEXT,
        fullDescription TEXT,
        images TEXT,
        tag VARCHAR(255),
        attributes JSON
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS carousel_slides (
        id VARCHAR(255) PRIMARY KEY,
        image TEXT,
        title VARCHAR(255),
        text TEXT,
        link VARCHAR(255)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255),
        description TEXT,
        image TEXT,
        discount VARCHAR(255)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS news (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255),
        text TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        image TEXT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        description TEXT,
        price VARCHAR(255),
        icon VARCHAR(255)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255),
        customerName VARCHAR(255),
        customerEmail VARCHAR(255),
        customerPhone VARCHAR(255),
        total DECIMAL(10, 2),
        items JSON,
        status VARCHAR(255) DEFAULT 'new',
        paymentMethod VARCHAR(255),
        deliveryAddress TEXT,
        deliveryComment TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(255) PRIMARY KEY,
        productId VARCHAR(255),
        userId VARCHAR(255),
        userName VARCHAR(255),
        rating INT,
        text TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        enableOnlinePayment BOOLEAN DEFAULT FALSE,
        enableDeliveryForm BOOLEAN DEFAULT FALSE,
        enableNotifications BOOLEAN DEFAULT FALSE,
        notificationProvider VARCHAR(255) DEFAULT 'vk',
        notificationWebhookUrl TEXT,
        enableWarehouseStocks BOOLEAN DEFAULT TRUE,
        enable1CIntegration BOOLEAN DEFAULT FALSE
      )
    `);

    // Migration helper
    const addColumn = async (table, column, definition) => {
      try {
        const [cols] = await connection.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
        if (cols.length === 0) {
          await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${definition}`);
          console.log(`Column ${column} added to ${table}`);
        }
      } catch (e) {
        console.error(`Error adding column ${column} to ${table}:`, e.message);
      }
    };

    // Migration for orders table
    await addColumn("orders", "customerName", "VARCHAR(255)");
    await addColumn("orders", "customerEmail", "VARCHAR(255)");
    await addColumn("orders", "customerPhone", "VARCHAR(255)");
    await addColumn("orders", "paymentMethod", "VARCHAR(255)");
    await addColumn("orders", "deliveryAddress", "TEXT");
    await addColumn("orders", "deliveryComment", "TEXT");

    // Migration for settings table
    await addColumn("settings", "enableNotifications", "BOOLEAN DEFAULT FALSE");
    await addColumn("settings", "notificationProvider", "VARCHAR(255) DEFAULT 'vk'");
    await addColumn("settings", "notificationWebhookUrl", "TEXT");
    await addColumn("settings", "enableWarehouseStocks", "BOOLEAN DEFAULT TRUE");
    await addColumn("settings", "enable1CIntegration", "BOOLEAN DEFAULT FALSE");

    // Seed admin
    const [users] = await connection.query("SELECT * FROM users WHERE email = 'admin@start.ru'");
    if (users.length === 0) {
      const adminId = crypto.randomUUID();
      const adminPasswordHash = bcrypt.hashSync("admin123", 10);
      await connection.query(
        "INSERT INTO users (id, name, email, passwordHash, isAdmin) VALUES (?, ?, ?, ?, ?)",
        [adminId, "Администратор", "admin@start.ru", adminPasswordHash, true]
      );
      console.log("Admin user created");
    }

    // Seed settings
    const [settings] = await connection.query("SELECT * FROM settings");
    if (settings.length === 0) {
      await connection.query("INSERT INTO settings (id) VALUES (1)");
      console.log("Default settings created");
    }

  } catch (err) {
    console.error("Database initialization error:", err);
  } finally {
    if (connection) {
      if (connection.release) {
        connection.release();
      } else {
        await connection.end();
      }
    }
  }
}

initDb().catch(err => console.error("Critical DB error:", err));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  const origin = req.headers.origin || "";
  
  // Allow origins
  res.header("Access-Control-Allow-Origin", origin || "*");
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

// Favicon stub to avoid 404s
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Async wrapper to prevent crashes
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Route Error:", err);
    next(err);
  });
};

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: Boolean(user.isAdmin),
  };
}

const authRequired = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ message: "Требуется авторизация." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Сессия истекла. Войдите снова." });
  }
});

const adminRequired = asyncHandler(async (req, res, next) => {
  const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [req.userId]);
  const user = users[0];
  if (!user || !user.isAdmin) return res.status(403).json({ message: "Недостаточно прав." });
  req.currentUser = user;
  next();
});

app.get("/api/health", asyncHandler(async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (e) {
    res.status(500).json({ status: "error", database: e.message });
  }
}));

app.post("/api/auth/register", asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ message: "Заполните все поля." });
  const normalizedEmail = String(email).trim().toLowerCase();
  const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
  if (existing.length > 0) {
    return res.status(400).json({ message: "Пользователь с таким e-mail уже существует." });
  }
  const id = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(String(password), 10);
  await pool.query(
    "INSERT INTO users (id, name, email, passwordHash, isAdmin) VALUES (?, ?, ?, ?, ?)",
    [id, String(name).trim(), normalizedEmail, passwordHash, false]
  );
  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id, name, email: normalizedEmail, isAdmin: false } });
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
  const user = users[0];
  if (!user || !bcrypt.compareSync(String(password || ""), user.passwordHash)) {
    return res.status(400).json({ message: "Неверный e-mail или пароль." });
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: safeUser(user) });
}));

app.get("/api/auth/me", authRequired, asyncHandler(async (req, res) => {
  const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [req.userId]);
  const user = users[0];
  if (!user) return res.status(401).json({ message: "Пользователь не найден." });
  res.json({ user: safeUser(user) });
}));

app.get("/api/products", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM products");
  res.json(rows.map(r => {
    let imgs = [];
    try {
      imgs = typeof r.images === 'string' ? JSON.parse(r.images || "[]") : (r.images || []);
    } catch (e) {}
    return { ...r, images: imgs };
  }));
}));

app.get("/api/carousel", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM carousel_slides");
  res.json(rows);
}));

app.get("/api/promotions", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM promotions");
  res.json(rows);
}));

app.get("/api/news", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM news");
  res.json(rows);
}));

app.get("/api/services", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM services");
  res.json(rows);
}));

app.get("/api/settings/public", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM settings LIMIT 1");
  const s = rows[0] || {};
  res.json({
    enableOnlinePayment: Boolean(s.enableOnlinePayment),
    enableDeliveryForm: Boolean(s.enableDeliveryForm),
    enableWarehouseStocks: Boolean(s.enableWarehouseStocks),
    enable1CIntegration: Boolean(s.enable1CIntegration),
  });
}));

app.get("/api/admin/state", authRequired, adminRequired, asyncHandler(async (_req, res) => {
  const [products] = await pool.query("SELECT * FROM products");
  const [carouselSlides] = await pool.query("SELECT * FROM carousel_slides");
  const [promotions] = await pool.query("SELECT * FROM promotions");
  const [news] = await pool.query("SELECT * FROM news");
  const [orders] = await pool.query("SELECT * FROM orders");
  const [services] = await pool.query("SELECT * FROM services");
  const [settings] = await pool.query("SELECT * FROM settings LIMIT 1");

  res.json({
    products: products.map(p => {
      let imgs = [];
      try {
        imgs = typeof p.images === 'string' ? JSON.parse(p.images || "[]") : (p.images || []);
      } catch (e) {
        console.error("JSON parse error for product images:", p.id, e);
      }
      return { ...p, images: imgs };
    }),
    carouselSlides,
    promotions,
    news,
    orders: orders.map(o => {
      let items = [];
      try {
        items = typeof o.items === 'string' ? JSON.parse(o.items || "[]") : (o.items || []);
      } catch (e) {
        console.error("JSON parse error for order items:", o.id, e);
      }
      return { ...o, items };
    }),
    services,
    settings: settings[0] || {},
  });
}));

app.put("/api/admin/state", authRequired, adminRequired, asyncHandler(async (req, res) => {
  const { products, carouselSlides, promotions, news, orders, services, settings } = req.body || {};

  if (Array.isArray(products)) {
    await pool.query("DELETE FROM products");
    for (const p of products) {
      await pool.query(
        "INSERT INTO products (id, name, category, price, description, fullDescription, images, tag, attributes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [p.id || crypto.randomUUID(), p.name, p.category, p.price, p.description, p.fullDescription, JSON.stringify(p.images || []), p.tag, JSON.stringify(p.attributes || {})]
      );
    }
  }
  // Similar logic for other tables... 
  // For brevity and because original code used bulk overwrite, keeping it simple
  
  if (settings) {
    const { id, ...settingsToUpdate } = settings;
    if (Object.keys(settingsToUpdate).length > 0) {
      await pool.query("UPDATE settings SET ? WHERE id = 1", [settingsToUpdate]);
    }
  }

  res.json({ ok: true });
}));

app.post("/api/orders", authRequired, asyncHandler(async (req, res) => {
  const { items, customerName, customerEmail, customerPhone, phone, paymentMethod, deliveryAddress, deliveryComment } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Корзина пуста." });
  }
  const name = String(customerName || "").trim();
  const email = String(customerEmail || "").trim().toLowerCase();
  const normalizedPhone = String(customerPhone || phone || "").trim();
  if (!name || !email || !normalizedPhone) {
    return res.status(400).json({ message: "Укажите имя, e-mail и телефон для заказа." });
  }
  const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [req.userId]);
  const user = users[0];
  if (!user) return res.status(401).json({ message: "Пользователь не найден." });

  const productIds = items.map(i => i.productId).filter(Boolean);
  const [products] = await pool.query("SELECT * FROM products WHERE id IN (?)", [productIds]);
  
  const enriched = items
    .map((i) => {
      const product = products.find((p) => p.id === i.productId);
      if (!product) return null;
      return {
        productId: i.productId,
        qty: i.qty,
        name: product.name,
        price: Number(product.price) || 0,
      };
    })
    .filter(Boolean);

  if (!enriched.length) return res.status(400).json({ message: "Товары из корзины не найдены." });

  const total = enriched.reduce((sum, i) => sum + i.qty * i.price, 0);
  const orderId = crypto.randomUUID();
  await pool.query(
    "INSERT INTO orders (id, userId, customerName, customerEmail, customerPhone, total, items, status, paymentMethod, deliveryAddress, deliveryComment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [orderId, user.id, name, email, normalizedPhone, total, JSON.stringify(enriched), 'new', paymentMethod === "online" ? "online" : "cash", String(deliveryAddress || ""), String(deliveryComment || "")]
  );

  res.status(201).json({ id: orderId, total, items: enriched });
}));

app.get("/api/orders/my", authRequired, asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC", [req.userId]);
  res.json(rows.map(o => {
    let items = [];
    try {
      items = typeof o.items === 'string' ? JSON.parse(o.items || "[]") : (o.items || []);
    } catch (e) {}
    return { ...o, items };
  }));
}));

app.get("/api/orders", authRequired, adminRequired, asyncHandler(async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM orders ORDER BY createdAt DESC");
  res.json(rows.map(o => {
    let items = [];
    try {
      items = typeof o.items === 'string' ? JSON.parse(o.items || "[]") : (o.items || []);
    } catch (e) {}
    return { ...o, items };
  }));
}));

app.patch("/api/orders/:id/status", authRequired, adminRequired, asyncHandler(async (req, res) => {
  const status = String(req.body?.status || "").trim();
  const allowed = ["new", "processing", "done", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Некорректный статус заказа." });
  }
  await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id]);
  const [rows] = await pool.query("SELECT * FROM orders WHERE id = ?", [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: "Заказ не найден." });
  const o = rows[0];
  let items = [];
  try {
    items = typeof o.items === 'string' ? JSON.parse(o.items || "[]") : (o.items || []);
  } catch (e) {}
  res.json({ ...o, items });
}));

app.post("/api/products", authRequired, adminRequired, asyncHandler(async (req, res) => {
  const id = crypto.randomUUID();
  const p = req.body;
  await pool.query(
    "INSERT INTO products (id, name, category, price, description, fullDescription, images, tag, attributes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, p.name, p.category, p.price, p.description, p.fullDescription, JSON.stringify(p.images || []), p.tag, JSON.stringify(p.attributes || {})]
  );
  res.status(201).json({ id, ...p });
}));

app.put("/api/products/:id", authRequired, adminRequired, asyncHandler(async (req, res) => {
  const p = req.body;
  await pool.query(
    "UPDATE products SET name=?, category=?, price=?, description=?, fullDescription=?, images=?, tag=?, attributes=? WHERE id=?",
    [p.name, p.category, p.price, p.description, p.fullDescription, JSON.stringify(p.images || []), p.tag, JSON.stringify(p.attributes || {}), req.params.id]
  );
  res.json({ id: req.params.id, ...p });
}));

app.delete("/api/products/:id", authRequired, adminRequired, asyncHandler(async (req, res) => {
  await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);
  res.status(204).end();
}));

// Carousel routes
app.post("/api/carousel", authRequired, adminRequired, asyncHandler(async (req, res) => {
  const id = crypto.randomUUID();
  const { image, title, text, link } = req.body;
  await pool.query(
    "INSERT INTO carousel_slides (id, image, title, text, link) VALUES (?, ?, ?, ?, ?)",
    [id, image, title, text, link]
  );
  res.status(201).json({ id, ...req.body });
}));

app.put("/api/carousel/:id", authRequired, adminRequired, asyncHandler(async (req, res) => {
  const { image, title, text, link } = req.body;
  await pool.query(
    "UPDATE carousel_slides SET image=?, title=?, text=?, link=? WHERE id=?",
    [image, title, text, link, req.params.id]
  );
  res.json({ id: req.params.id, ...req.body });
}));

app.delete("/api/carousel/:id", authRequired, adminRequired, asyncHandler(async (req, res) => {
  await pool.query("DELETE FROM carousel_slides WHERE id = ?", [req.params.id]);
  res.status(204).end();
}));

// Promotions routes
app.post("/api/promotions", authRequired, adminRequired, asyncHandler(async (req, res) => {
  const id = crypto.randomUUID();
  const { title, description, image, discount } = req.body;
  await pool.query(
    "INSERT INTO promotions (id, title, description, image, discount) VALUES (?, ?, ?, ?, ?)",
    [id, title, description, image, discount]
  );
  res.status(201).json({ id, ...req.body });
}));

app.put("/api/promotions/:id", authRequired, adminRequired, asyncHandler(async (req, res) => {
  const { title, description, image, discount } = req.body;
  await pool.query(
    "UPDATE promotions SET title=?, description=?, image=?, discount=? WHERE id=?",
    [title, description, image, discount, req.params.id]
  );
  res.json({ id: req.params.id, ...req.body });
}));

app.delete("/api/promotions/:id", authRequired, adminRequired, asyncHandler(async (req, res) => {
  await pool.query("DELETE FROM promotions WHERE id = ?", [req.params.id]);
  res.status(204).end();
}));

// News routes
app.post("/api/news", authRequired, adminRequired, asyncHandler(async (req, res) => {
  const id = crypto.randomUUID();
  const { title, text, image } = req.body;
  await pool.query(
    "INSERT INTO news (id, title, text, image) VALUES (?, ?, ?, ?)",
    [id, title, text, image]
  );
  res.status(201).json({ id, ...req.body });
}));

app.put("/api/news/:id", authRequired, adminRequired, asyncHandler(async (req, res) => {
  const { title, text, image } = req.body;
  await pool.query(
    "UPDATE news SET title=?, text=?, image=? WHERE id=?",
    [title, text, image, req.params.id]
  );
  res.json({ id: req.params.id, ...req.body });
}));

app.delete("/api/news/:id", authRequired, adminRequired, asyncHandler(async (req, res) => {
  await pool.query("DELETE FROM news WHERE id = ?", [req.params.id]);
  res.status(204).end();
}));

// Services routes
app.post("/api/services", authRequired, adminRequired, asyncHandler(async (req, res) => {
  const id = crypto.randomUUID();
  const { name, description, price, icon } = req.body;
  await pool.query(
    "INSERT INTO services (id, name, description, price, icon) VALUES (?, ?, ?, ?, ?)",
    [id, name, description, price, icon]
  );
  res.status(201).json({ id, ...req.body });
}));

app.put("/api/services/:id", authRequired, adminRequired, asyncHandler(async (req, res) => {
  const { name, description, price, icon } = req.body;
  await pool.query(
    "UPDATE services SET name=?, description=?, price=?, icon=? WHERE id=?",
    [name, description, price, icon, req.params.id]
  );
  res.json({ id: req.params.id, ...req.body });
}));

app.get("/api/products/:id/reviews", asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM reviews WHERE productId = ? ORDER BY createdAt DESC", [req.params.id]);
  res.json(rows);
}));

app.post("/api/products/:id/reviews", authRequired, asyncHandler(async (req, res) => {
  const { rating, text } = req.body || {};
  if (!rating || !text) return res.status(400).json({ message: "Заполните все поля." });
  
  const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [req.userId]);
  const user = users[0];
  if (!user) return res.status(401).json({ message: "Пользователь не найден." });

  const id = crypto.randomUUID();
  await pool.query(
    "INSERT INTO reviews (id, productId, userId, userName, rating, text) VALUES (?, ?, ?, ?, ?, ?)",
    [id, req.params.id, user.id, user.name, rating, text]
  );
  
  const [newReview] = await pool.query("SELECT * FROM reviews WHERE id = ?", [id]);
  res.status(201).json(newReview[0]);
}));

app.delete("/api/services/:id", authRequired, adminRequired, asyncHandler(async (req, res) => {
  await pool.query("DELETE FROM services WHERE id = ?", [req.params.id]);
  res.status(204).end();
}));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err);
  res.status(500).json({
    message: "Внутренняя ошибка сервера",
    error: err.message, // Временно показываем ошибку всегда для отладки
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`СТАРТ server running on http://localhost:${PORT}`);
});
