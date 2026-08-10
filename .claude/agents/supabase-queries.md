---
name: supabase-queries
description: Skill for writing Supabase queries in the GlobalWigs project. Covers table names, RLS patterns, and the shared `sb` client.
---

# Supabase Query Patterns — Global Air Export

## Client
The Supabase client is `sb`, defined and exported from `js/config.js` (included on every page).

## Key Tables
| Table | Description |
|-------|-------------|
| `orders` | Main orders (status, customer_id, agent_id, supplier_id, …) |
| `customers` | Customer records |
| `lookup_values` | Dropdown options (category, value, label, sort_order, is_active) |
| `agents` | Agent records (fetched via `getActiveRecords('agents')`) |
| `suppliers` | Supplier records (fetched via `getActiveRecords('suppliers')`) |

## Query Patterns

### Select with join
```js
const { data, error } = await sb
  .from('orders')
  .select('*, customers(name), agents(name)')
  .eq('is_active', true)
  .order('created_at', { ascending: false });
```

### Insert (returns new row)
```js
const { data, error } = await sb
  .from('orders')
  .insert(payload)
  .select()
  .single();
```

### Update
```js
const { error } = await sb
  .from('orders')
  .update({ status: 'shipped' })
  .eq('id', orderId);
```

### Soft delete — always use `is_active = false`, never hard delete
```js
const { error } = await sb
  .from('orders')
  .update({ is_active: false })
  .eq('id', orderId);
```

## Standard Error Handling
```js
const { data, error } = await sb.from('orders').select('*');
if (error) {
  showToast(error.message, 'danger');
  return;
}
```
