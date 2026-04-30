// Pure helpers — no DOM, no Supabase. Safe to unit-test.
// Loads as a regular <script> in the browser (attaches to window) and
// as a CommonJS module under Node/Vitest.
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        Object.assign(root, api);
    }
})(typeof self !== 'undefined' ? self : globalThis, function () {
    const CURRENCY_SYM = { USD: '$', ILS: '₪', EUR: '€' };

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function currencySymbol(code) {
        return CURRENCY_SYM[code] || '$';
    }

    function calcOrderTotal(unitPrice, extFee, currency) {
        const price = parseFloat(unitPrice) || 0;
        const ext = parseFloat(extFee) || 0;
        return { total: price + ext, symbol: currencySymbol(currency) };
    }

    function formatOrderTotal(unitPrice, extFee, currency) {
        const { total, symbol } = calcOrderTotal(unitPrice, extFee, currency);
        return `${symbol} ${total.toFixed(2)}`;
    }

    function monthStartISO(now) {
        const d = now || new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}-01`;
    }

    function calcMonthRevenue(orders, now) {
        if (!Array.isArray(orders)) return 0;
        const start = monthStartISO(now);
        return orders
            .filter(o => o && o.order_date >= start && o.status !== 'cancelled')
            .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    }

    function sanitizePhoneForWa(phone) {
        if (!phone) return '';
        return String(phone).replace(/[^0-9]/g, '');
    }

    function filterOrders(orders, opts) {
        if (!Array.isArray(orders)) return [];
        const search = opts && opts.search;
        if (!search) return orders.slice();
        const s = String(search).toLowerCase();
        return orders.filter(o =>
            (o.order_number || '').toLowerCase().includes(s) ||
            ((o.customers && o.customers.name) || '').toLowerCase().includes(s)
        );
    }

    function filterCustomers(customers, search) {
        if (!Array.isArray(customers)) return [];
        if (!search) return customers.slice();
        const s = String(search).toLowerCase();
        return customers.filter(c =>
            (c.name || '').toLowerCase().includes(s) ||
            (c.phone || '').includes(s) ||
            (c.email || '').toLowerCase().includes(s)
        );
    }

    return {
        escapeHtml,
        currencySymbol,
        calcOrderTotal,
        formatOrderTotal,
        monthStartISO,
        calcMonthRevenue,
        sanitizePhoneForWa,
        filterOrders,
        filterCustomers,
    };
});
