// Mom i want the db schemas
// okay sweetie here it is
/*
-- Create new table with UUID primary key
CREATE TABLE images (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	data text NOT NULL,
	mimetype text NOT NULL
);

CREATE TABLE post_ips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    ip_hash text NOT NULL,
    created_at timestamp DEFAULT NOW()
);

CREATE TABLE banned_ips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash text NOT NULL UNIQUE,
    banned_at timestamp DEFAULT NOW(),
    banned_by text DEFAULT 'admin'
);


CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE INDEX idx_post_ips_post_id ON post_ips(post_id);
CREATE INDEX idx_post_ips_ip_hash ON post_ips(ip_hash);
CREATE INDEX idx_banned_ips_ip_hash ON banned_ips(ip_hash);

-- Create admin sessions table
CREATE TABLE admin_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token text NOT NULL UNIQUE,
    created_at timestamp DEFAULT NOW(),
    expires_at timestamp NOT NULL,
    ip_hash text,
    user_agent text,
    is_active boolean DEFAULT true
);

-- Create index for fast session lookups
CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Create admin users table (in case you want multiple admins later)
CREATE TABLE admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamp DEFAULT NOW(),
    is_active boolean DEFAULT true
);

-- Insert default admin user (you should change this password!)
-- Password is 'admin123' - CHANGE THIS IMMEDIATELY!
INSERT INTO admin_users (username, password_hash) 
VALUES ('admin', '$2b$10$Ym9yzES/c/HMvuGN93/Dzu/4ZwWg2RWFtX8CATIR3bcOQzN4Vr43C');

Thank you mom
no problem sweetie */

require("dotenv").config();
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const { createClient } = require("@supabase/supabase-js");
const TemplateEngine = require("./template-engine");
const banCheck = require("./middleware/banCheck");
const createPublicRoutes = require("./routes/public");
const createGalleryRoutes = require("./routes/gallery");
const createLeaderboardRoutes = require("./routes/leaderboard");
const createAdminRoutes = require("./routes/admin");
const session = require("express-session");

const app = express();
const upload = multer();
const PORT = process.env.PORT || 3000;
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");

// Initialize template engine
const templates = new TemplateEngine(path.join(__dirname, "views"));

app.use(express.static(path.join(process.cwd(), "src", "public")));

if (process.env.LOCKED === "true") {
  app.use((req, res) => {
    res.status(403).send("down, come back later");
  });
}

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Session middleware for admin authentication
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Use the modular routes
const bannedIPMiddleware = banCheck.checkBannedIP(supabase, templates);
app.use(
  "/",
  createPublicRoutes(supabase, templates, upload, bannedIPMiddleware)
);
app.use("/", createGalleryRoutes(supabase, templates));
app.use("/", createLeaderboardRoutes(supabase, templates));
app.use("/", createAdminRoutes(supabase, templates, app));

// Security middleware
app.use((req, res, next) => {
  const forbiddenParams = ["env", "process", "secret"];
  for (const param of forbiddenParams) {
    if (req.query[param] !== undefined) {
      return res.status(403).send("Forbidden");
    }
  }
  next();
});

app.listen(PORT, () => {
  console.log(`pissandshitimages running on http://localhost:${PORT}`);
});
