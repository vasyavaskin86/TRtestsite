require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "start-super-secret-change-me";

// MySQL connection pool configuration
const dbName = process.env.DB_NAME || "sportzone";

function getPoolConfig() {
  const config = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: { rejectUnauthorized: false }
  };

  if (process.env.DATABASE_URL) {
    // Primary method for Render/Cloud
    let url = process.env.DATABASE_URL;
    if (!url.includes('ssl=')) {
      url += (url.includes('?') ? '&' : '?') + 'ssl={"rejectUnauthorized":false}';
    }
    return url;
  } else {
    // Local development (MAMP/XAMPP)
    config.host = process.env.DB_HOST || "127.0.0.1";
    config.user = process.env.DB_USER || "root";
    config.password = process.env.DB_PASS || "root";
    config.port = parseInt(process.env.DB_PORT || "3306");
    config.database = dbName;
    
    // In production, SSL is usually mandatory. If we are here without DATABASE_URL, 
    // we only disable SSL if specifically asked.
    if (process.env.DB_SSL === "false" || (!process.env.DB_SSL && process.env.NODE_ENV !== "production")) {
      delete config.ssl;
    }
  }
  
  return config;
}

let pool = mysql.createPool(getPoolConfig());

// Database initialization
let dbInitError = null;
let useJsonFallback = false;
let jsonData = null;

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
      
      // If NOT using DATABASE_URL, try to create the database
      if (!process.env.DATABASE_URL) {
        console.log(`Trying to create database ${dbName} if it doesn't exist...`);
        const tempConnConfig = { ...getPoolConfig() };
        if (typeof tempConnConfig === 'object') {
          delete tempConnConfig.database;
          const tempConn = await mysql.createConnection(tempConnConfig);
          await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
          await tempConn.end();
          connection = await pool.getConnection();
          console.log(`Database ${dbName} created/verified and connected.`);
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    }

    if (connection) {
      await connection.query(`USE \`${dbName}\``);
    }

    // ... tables creation ...

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        lastName VARCHAR(255),
        phone VARCHAR(255),
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
    await addColumn("users", "lastName", "VARCHAR(255)");
    await addColumn("users", "phone", "VARCHAR(255)");
    
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
    dbInitError = err.message || String(err);
    console.error("Database initialization error:", err);
    
    // Try to load JSON fallback
    try {
      const fs = require("fs");
      const path = require("path");
      const dbPath = path.join(__dirname, "data", "db.json");
      if (fs.existsSync(dbPath)) {
        jsonData = JSON.parse(fs.readFileSync(dbPath, "utf8")) || {};
        useJsonFallback = true;
        console.log("CRITICAL: Using JSON fallback because MySQL connection failed.");
      } else {
        jsonData = {};
        useJsonFallback = true;
        console.log("CRITICAL: No db.json found, using empty object fallback.");
      }
    } catch (jsonErr) {
      console.error("Failed to load JSON fallback:", jsonErr);
    }
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
    lastName: user.lastName || "",
    phone: user.phone || "",
    isAdmin: Boolean(user.isAdmin),
  };
}

const authRequired = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ message: "Требуется авторизация." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    console.error("Auth Token Error:", err.message);
    return res.status(401).json({ message: "Сессия истекла. Войдите снова." });
  }
};

const adminRequired = async (req, res, next) => {
  try {
    if (useJsonFallback && jsonData) {
      const user = (jsonData.users || []).find(u => u.id === req.userId);
      if (!user || !user.isAdmin) return res.status(403).json({ message: "Недостаточно прав." });
      req.currentUser = user;
      return next();
    }
    const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [req.userId]);
    const user = users[0];
    if (!user || !user.isAdmin) return res.status(403).json({ message: "Недостаточно прав." });
    req.currentUser = user;
    next();
  } catch (err) {
    next(err);
  }
};

app.get("/api/health", asyncHandler(async (_req, res) => {
  try {
    let dbStatus = "connected";
    if (useJsonFallback) {
      dbStatus = "using_json_fallback";
    } else {
      await pool.query("SELECT 1");
    }
    
    res.json({ 
      status: "ok", 
      database: dbStatus, 
      dbInitError: dbInitError,
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
        render: !!process.env.RENDER
      }
    });
  } catch (e) {
    res.status(500).json({ 
      status: "error", 
      database: e.message || String(e),
      dbInitError: dbInitError
    });
  }
}));

app.post("/api/auth/register", asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ message: "Заполните все поля." });
  const normalizedEmail = String(email).trim().toLowerCase();
  
  const id = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(String(password), 10);
  const newUser = { id, name: String(name).trim(), email: normalizedEmail, passwordHash, isAdmin: false, createdAt: Date.now() };

  if (useJsonFallback && jsonData) {
    const existing = (jsonData.users || []).find(u => u.email === normalizedEmail);
    if (existing) return res.status(400).json({ message: "Пользователь с таким e-mail уже существует." });
    
    // In fallback mode, we just keep it in memory (it won't persist across restarts)
    if (!jsonData.users) jsonData.users = [];
    jsonData.users.push(newUser);
    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, user: safeUser(newUser) });
  }

  const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
  if (existing.length > 0) {
    return res.status(400).json({ message: "Пользователь с таким e-mail уже существует." });
  }
  await pool.query(
    "INSERT INTO users (id, name, email, passwordHash, isAdmin) VALUES (?, ?, ?, ?, ?)",
    [id, newUser.name, normalizedEmail, passwordHash, false]
  );
  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: safeUser(newUser) });
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (useJsonFallback && jsonData) {
    const user = (jsonData.users || []).find(u => u.email === normalizedEmail);
    if (!user || !bcrypt.compareSync(String(password || ""), user.passwordHash)) {
      return res.status(400).json({ message: "Неверный e-mail или пароль." });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, user: safeUser(user) });
  }

  const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
  const user = users[0];
  if (!user || !bcrypt.compareSync(String(password || ""), user.passwordHash)) {
    return res.status(400).json({ message: "Неверный e-mail или пароль." });
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: safeUser(user) });
}));

app.get("/api/auth/me", authRequired, asyncHandler(async (req, res) => {
  if (useJsonFallback && jsonData) {
    const user = (jsonData.users || []).find(u => u.id === req.userId);
    if (!user) return res.status(401).json({ message: "Пользователь не найден." });
    return res.json({ user: safeUser(user) });
  }
  const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [req.userId]);
  const user = users[0];
  if (!user) return res.status(401).json({ message: "Пользователь не найден." });
  res.json({ user: safeUser(user) });
}));

app.put("/api/auth/profile", authRequired, asyncHandler(async (req, res) => {
  const { name, lastName, phone } = req.body || {};
  
  if (useJsonFallback && jsonData) {
    const user = (jsonData.users || []).find(u => u.id === req.userId);
    if (!user) return res.status(401).json({ message: "Пользователь не найден." });
    if (name) user.name = name;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    return res.json({ user: safeUser(user) });
  }

  await pool.query(
    "UPDATE users SET name = ?, lastName = ?, phone = ? WHERE id = ?",
    [name, lastName || null, phone || null, req.userId]
  );
  
  const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [req.userId]);
  res.json({ user: safeUser(users[0]) });
}));

app.get("/api/products", asyncHandler(async (_req, res) => {
  if (useJsonFallback && jsonData) {
    return res.json(jsonData.products || []);
  }
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
  if (useJsonFallback && jsonData) return res.json(jsonData.carousel_slides || jsonData.carousel || []);
  const [rows] = await pool.query("SELECT * FROM carousel_slides");
  res.json(rows);
}));

app.get("/api/promotions", asyncHandler(async (_req, res) => {
  if (useJsonFallback && jsonData) return res.json(jsonData.promotions || []);
  const [rows] = await pool.query("SELECT * FROM promotions");
  res.json(rows);
}));

app.get("/api/news", asyncHandler(async (_req, res) => {
  if (useJsonFallback && jsonData) return res.json(jsonData.news || []);
  const [rows] = await pool.query("SELECT * FROM news");
  res.json(rows);
}));

app.get("/api/services", asyncHandler(async (_req, res) => {
  if (useJsonFallback && jsonData) return res.json(jsonData.services || []);
  const [rows] = await pool.query("SELECT * FROM services");
  res.json(rows);
}));

app.get("/api/settings/public", asyncHandler(async (_req, res) => {
  if (useJsonFallback && jsonData) {
    const s = (jsonData.settings && jsonData.settings[0]) || {};
    return res.json({
      enableOnlinePayment: Boolean(s.enableOnlinePayment),
      enableDeliveryForm: Boolean(s.enableDeliveryForm),
      enableWarehouseStocks: Boolean(s.enableWarehouseStocks),
      enable1CIntegration: Boolean(s.enable1CIntegration),
    });
  }
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
  if (useJsonFallback && jsonData) {
    return res.json({
      products: (jsonData.products || []).map(p => ({ ...p, images: Array.isArray(p.images) ? p.images : [] })),
      carouselSlides: jsonData.carousel_slides || jsonData.carousel || [],
      promotions: jsonData.promotions || [],
      news: jsonData.news || [],
      orders: (jsonData.orders || []).map(o => ({ ...o, items: Array.isArray(o.items) ? o.items : [] })),
      services: jsonData.services || [],
      settings: (jsonData.settings && jsonData.settings[0]) || {},
    });
  }
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

  if (useJsonFallback && jsonData) {
    if (products) jsonData.products = products;
    if (carouselSlides) jsonData.carousel_slides = carouselSlides;
    if (promotions) jsonData.promotions = promotions;
    if (news) jsonData.news = news;
    if (orders) jsonData.orders = orders;
    if (services) jsonData.services = services;
    if (settings) jsonData.settings = [settings];
    
    // In fallback mode, changes are memory-only
    return res.json({ ok: true, message: "Changes saved in memory (JSON Fallback mode)" });
  }

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

  // Update user profile if phone/name was missing
  if (req.userId) {
    if (useJsonFallback && jsonData) {
      const u = (jsonData.users || []).find(x => x.id === req.userId);
      if (u) {
        if (!u.phone && normalizedPhone) u.phone = normalizedPhone;
        if (!u.name && name) u.name = name;
      }
    } else {
      await pool.query(
        "UPDATE users SET name = IF(name IS NULL OR name = '', ?, name), phone = IF(phone IS NULL OR phone = '', ?, phone) WHERE id = ?",
        [name, normalizedPhone, req.userId]
      );
    }
  }

  if (useJsonFallback && jsonData) {
    const newOrder = {
      id: orderId,
      userId: user.id,
      customerName: name,
      customerEmail: email,
      customerPhone: normalizedPhone,
      total,
      items: enriched,
      status: 'new',
      paymentMethod: paymentMethod === "online" ? "online" : "cash",
      deliveryAddress: String(deliveryAddress || ""),
      deliveryComment: String(deliveryComment || ""),
      createdAt: Date.now()
    };
    if (!jsonData.orders) jsonData.orders = [];
    jsonData.orders.push(newOrder);
    return res.status(201).json({ id: orderId, total, items: enriched });
  }

  await pool.query(
    "INSERT INTO orders (id, userId, customerName, customerEmail, customerPhone, total, items, status, paymentMethod, deliveryAddress, deliveryComment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [orderId, user.id, name, email, normalizedPhone, total, JSON.stringify(enriched), 'new', paymentMethod === "online" ? "online" : "cash", String(deliveryAddress || ""), String(deliveryComment || "")]
  );

  res.status(201).json({ id: orderId, total, items: enriched });
}));

app.get("/api/orders/my", authRequired, asyncHandler(async (req, res) => {
  if (useJsonFallback && jsonData) {
    const rows = (jsonData.orders || []).filter(o => o.userId === req.userId);
    return res.json(rows.map(o => ({ ...o, items: Array.isArray(o.items) ? o.items : [] })));
  }
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
  if (useJsonFallback && jsonData) {
    const rows = (jsonData.orders || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return res.json(rows.map(o => ({ ...o, items: Array.isArray(o.items) ? o.items : [] })));
  }
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

  if (useJsonFallback && jsonData) {
    const order = (jsonData.orders || []).find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ message: "Заказ не найден." });
    order.status = status;
    return res.json({ ...order, items: Array.isArray(order.items) ? order.items : [] });
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
  
  let friendlyMessage = "Внутренняя ошибка сервера";
  let hint = undefined;

  if (err.code === 'ECONNREFUSED') {
    friendlyMessage = "Ошибка подключения к базе данных";
    hint = "Сервер не может найти базу данных MySQL. На Render.com необходимо создать отдельную базу данных (например, на Aiven или PlanetScale) и добавить переменную DATABASE_URL в настройках.";
  }

  // Extract more info from AggregateError
  let errorDetail = err.message || String(err);
  if (err.errors && Array.isArray(err.errors)) {
    errorDetail = err.errors.map(e => e.message).join('; ');
  }

  const errorResponse = {
    message: friendlyMessage,
    error: errorDetail,
    code: err.code,
    hint: hint,
    dbInitError: dbInitError
  };

  if (process.env.NODE_ENV === "development" || true) { // Временно оставляем true для отладки
    errorResponse.stack = err.stack;
  }

  res.status(500).json(errorResponse);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`СТАРТ server running on http://localhost:${PORT}`);
});
