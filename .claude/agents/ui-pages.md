---
name: ui-pages
description: Skill for adding or editing HTML pages in GlobalWigs. Covers page structure, Bootstrap RTL, navigation, and shared script conventions.
---

# UI Pages — Global Air Export

## Page Structure Template
Every page follows this skeleton:
```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title — Global Air Export</title>
  <!-- Bootstrap RTL -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Navbar (copy from dashboard.html) -->
  <nav class="navbar navbar-dark bg-dark">…</nav>

  <div class="container-fluid py-3">
    <!-- Page content here -->
  </div>

  <!-- Toast notification (copy from dashboard.html) -->
  <div class="toast-container position-fixed top-0 end-0 p-3">
    <div id="toast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body" id="toastMsg"></div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="js/config.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    (async () => {
      const session = await requireAuth();
      if (!session) return;

      // Page-specific logic here
    })();
  </script>
</body>
</html>
```

## Navigation Links
Keep the navbar consistent across all pages:
- `index.html` — Login (no nav)
- `dashboard.html` — Dashboard (active on dashboard)
- `order.html` — New Order / Edit Order
- `customers.html` — Customers
- `settings.html` — Settings (agents & suppliers)

## RTL Conventions
- Use `dir="rtl"` on `<html>` (already in template)
- Use Bootstrap RTL CDN (`bootstrap.rtl.min.css`), not the standard one
- Use `text-end` / `text-start` (not left/right) for alignment
- Table columns: most-important info on the right side
