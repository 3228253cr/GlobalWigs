import { describe, it, expect } from 'vitest';
import lib from '../js/lib.js';

const {
    escapeHtml,
    currencySymbol,
    calcOrderTotal,
    formatOrderTotal,
    monthStartISO,
    calcMonthRevenue,
    sanitizePhoneForWa,
    filterOrders,
    filterCustomers,
} = lib;

describe('escapeHtml', () => {
    it('escapes the five HTML-significant characters', () => {
        expect(escapeHtml(`<img src=x onerror="alert('xss')">`))
            .toBe('&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;');
    });

    it('escapes ampersand first to avoid double-encoding', () => {
        expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
        expect(escapeHtml('&lt;')).toBe('&amp;lt;');
    });

    it('handles null, undefined, numbers', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
        expect(escapeHtml(42)).toBe('42');
    });
});

describe('currencySymbol', () => {
    it('maps known currencies', () => {
        expect(currencySymbol('USD')).toBe('$');
        expect(currencySymbol('ILS')).toBe('₪');
        expect(currencySymbol('EUR')).toBe('€');
    });

    it('falls back to $ for unknown or missing', () => {
        expect(currencySymbol('GBP')).toBe('$');
        expect(currencySymbol('')).toBe('$');
        expect(currencySymbol(undefined)).toBe('$');
    });
});

describe('calcOrderTotal', () => {
    it('adds price + ext fee', () => {
        expect(calcOrderTotal(100, 25, 'USD')).toEqual({ total: 125, symbol: '$' });
    });

    it('coerces strings and treats blank/NaN as 0', () => {
        expect(calcOrderTotal('100.5', '', 'EUR')).toEqual({ total: 100.5, symbol: '€' });
        expect(calcOrderTotal('abc', null, 'ILS')).toEqual({ total: 0, symbol: '₪' });
    });
});

describe('formatOrderTotal', () => {
    it('formats with two decimals and the right symbol', () => {
        expect(formatOrderTotal(100, 25.5, 'USD')).toBe('$ 125.50');
        expect(formatOrderTotal(0, 0, 'EUR')).toBe('€ 0.00');
    });
});

describe('monthStartISO', () => {
    it('returns YYYY-MM-01 for the given date', () => {
        expect(monthStartISO(new Date(2026, 0, 15))).toBe('2026-01-01');
        expect(monthStartISO(new Date(2026, 11, 31))).toBe('2026-12-01');
    });
});

describe('calcMonthRevenue', () => {
    const now = new Date(2026, 3, 30); // April 30, 2026

    it('sums total_amount for current-month, non-cancelled orders', () => {
        const orders = [
            { order_date: '2026-04-01', total_amount: '100', status: 'new' },
            { order_date: '2026-04-15', total_amount: 50.5, status: 'shipped' },
            { order_date: '2026-04-20', total_amount: '999', status: 'cancelled' },
            { order_date: '2026-03-31', total_amount: '500', status: 'new' },
        ];
        expect(calcMonthRevenue(orders, now)).toBe(150.5);
    });

    it('returns 0 for empty/invalid input', () => {
        expect(calcMonthRevenue([], now)).toBe(0);
        expect(calcMonthRevenue(null, now)).toBe(0);
    });

    it('skips orders with missing or non-numeric total_amount', () => {
        const orders = [
            { order_date: '2026-04-01', status: 'new' },
            { order_date: '2026-04-02', total_amount: 'not-a-number', status: 'new' },
            { order_date: '2026-04-03', total_amount: 25, status: 'new' },
        ];
        expect(calcMonthRevenue(orders, now)).toBe(25);
    });
});

describe('sanitizePhoneForWa', () => {
    it('strips non-digits', () => {
        expect(sanitizePhoneForWa('+972 (50) 123-4567')).toBe('972501234567');
    });

    it('handles null/empty', () => {
        expect(sanitizePhoneForWa('')).toBe('');
        expect(sanitizePhoneForWa(null)).toBe('');
        expect(sanitizePhoneForWa(undefined)).toBe('');
    });
});

describe('filterOrders', () => {
    const orders = [
        { order_number: 'ORD-001', customers: { name: 'Alice' } },
        { order_number: 'ORD-002', customers: { name: 'Bob' } },
        { order_number: 'XYZ-003', customers: null },
    ];

    it('returns all orders when no search', () => {
        expect(filterOrders(orders)).toHaveLength(3);
        expect(filterOrders(orders, { search: '' })).toHaveLength(3);
    });

    it('matches order number case-insensitively', () => {
        expect(filterOrders(orders, { search: 'ord-001' })).toHaveLength(1);
        expect(filterOrders(orders, { search: 'XYZ' })).toHaveLength(1);
    });

    it('matches customer name and tolerates null customers', () => {
        expect(filterOrders(orders, { search: 'alice' })).toHaveLength(1);
        expect(filterOrders(orders, { search: 'bob' })).toHaveLength(1);
        expect(() => filterOrders(orders, { search: 'zzz' })).not.toThrow();
    });
});

describe('filterCustomers', () => {
    const customers = [
        { name: 'Alice', phone: '050-1234567', email: 'alice@example.com' },
        { name: 'Bob', phone: '052-7654321', email: 'bob@example.com' },
        { name: 'Carol', phone: null, email: null },
    ];

    it('returns all when no search', () => {
        expect(filterCustomers(customers, '')).toHaveLength(3);
    });

    it('searches name, phone, email', () => {
        expect(filterCustomers(customers, 'alice')).toHaveLength(1);
        expect(filterCustomers(customers, '7654')).toHaveLength(1);
        expect(filterCustomers(customers, 'bob@example')).toHaveLength(1);
    });

    it('does not crash on null fields', () => {
        expect(() => filterCustomers(customers, 'carol')).not.toThrow();
        expect(filterCustomers(customers, 'carol')).toHaveLength(1);
    });
});
