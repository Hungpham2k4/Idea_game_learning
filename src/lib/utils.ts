/**
 * @file src/lib/utils.ts
 * @description Core utility functions shared across the entire project.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ─── Tailwind Class Merging ─────────────────────────────────────────────────

/**
 * `cn` — Merge Tailwind classes safely.
 * Combines clsx (conditional classes) with tailwind-merge (conflict resolution).
 *
 * @example
 *   cn('px-4 py-2', isActive && 'bg-primary-500', className)
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

// ─── Number / Currency Formatting ──────────────────────────────────────────

/**
 * Format a number as Vietnamese Đồng (VND).
 * @example formatVND(1500000) → '1.500.000 ₫'
 */
export function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style:    'currency',
        currency: 'VND',
    }).format(amount);
}

/**
 * Format a large number with shorthand suffix (K, M, B).
 * @example formatCompact(1_500_000) → '1.5M'
 */
export function formatCompact(value: number, locale = 'en'): string {
    return new Intl.NumberFormat(locale, {
        notation:       'compact',
        maximumFractionDigits: 1,
    }).format(value);
}

// ─── String Helpers ─────────────────────────────────────────────────────────

/**
 * Truncate a string to `maxLength` characters, appending an ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return `${str.slice(0, maxLength).trimEnd()}…`;
}

/**
 * Convert a string to a URL-friendly slug.
 * @example slugify('Bất Động Sản') → 'bat-dong-san'
 */
export function slugify(str: string): string {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

// ─── Date Helpers ───────────────────────────────────────────────────────────

/**
 * Format a date in Vietnamese locale.
 * @example formatDate(new Date()) → 'ngày 24 tháng 6 năm 2026'
 */
export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('vi-VN', {
        year:  'numeric',
        month: 'long',
        day:   'numeric',
    }).format(d);
}
