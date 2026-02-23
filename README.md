# Global Air Export - Wig Export Management System

## 🏗️ Architecture
- **Frontend:** HTML + CSS + JavaScript (hosted on GitHub Pages)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Cost:** FREE (both GitHub Pages and Supabase free tier)

## 📁 Files
```
├── index.html          # Login page
├── dashboard.html      # Orders dashboard
├── order.html          # New/Edit order form
├── customers.html      # Customer management
├── settings.html       # Agents & Suppliers
├── css/style.css       # Shared styles
├── js/config.js        # Supabase configuration
└── supabase-schema.sql # Database schema (run in SQL Editor)
```

## 🚀 Setup Instructions

### 1. Supabase
1. Go to Supabase Dashboard → SQL Editor
2. Paste `supabase-schema.sql` and run
3. Go to Authentication → Settings → Enable email auth

### 2. GitHub
1. Create repository: `GLOBAL_AIR_EXPORT`
2. Upload all files (except .sql)
3. Settings → Pages → Source: main branch
4. Site will be at: `https://USERNAME.github.io/GLOBAL_AIR_EXPORT/`

### 3. First Login
1. Open the site
2. Click "הרשמה" (signup)
3. Enter email + password
4. Check email for confirmation
5. Login and start!
