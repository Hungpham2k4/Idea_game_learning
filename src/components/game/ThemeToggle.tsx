/**
 * @file src/components/game/ThemeToggle.tsx
 * @description Nút đổi giao diện sáng / tối.
 *
 * Theme được ghi vào `data-theme` trên thẻ <html> và nhớ trong localStorage.
 * Toàn bộ màu của khu vực game là biến CSS (xem global.css) nên chỉ cần đổi
 * thuộc tính này là cả trang đổi màu, không phải sửa từng component.
 */
import React, { useEffect, useState } from 'react';

export type CqTheme = 'dark' | 'light';
const STORAGE_KEY = 'cq_theme';

/** Đọc theme đang áp dụng trên thẻ <html>. */
function currentTheme(): CqTheme {
    if (typeof document === 'undefined') return 'dark';
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: CqTheme): void {
    document.documentElement.setAttribute('data-theme', theme);
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        /* trình duyệt chặn localStorage — vẫn đổi được trong phiên này */
    }
}

const ThemeToggle: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    const [theme, setTheme] = useState<CqTheme>('dark');

    // Đồng bộ với giá trị script trong <head> đã đặt trước khi React chạy
    useEffect(() => {
        setTheme(currentTheme());
    }, []);

    function toggle() {
        const next: CqTheme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        setTheme(next);
    }

    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            onClick={toggle}
            title={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            className={`group relative flex items-center rounded-lg border border-cq-line bg-cq-panel transition-colors hover:border-cq-neon/60 ${
                compact ? 'h-8 w-8 justify-center' : 'h-8 gap-1 px-1'
            }`}
        >
            {compact ? (
                <span className="text-sm">{isDark ? '🌙' : '☀️'}</span>
            ) : (
                <>
                    <span
                        className={`grid h-6 w-6 place-items-center rounded-md text-xs transition-colors ${
                            isDark ? 'bg-cq-raised text-cq-neon' : 'text-cq-muted'
                        }`}
                    >
                        🌙
                    </span>
                    <span
                        className={`grid h-6 w-6 place-items-center rounded-md text-xs transition-colors ${
                            !isDark ? 'bg-cq-raised text-cq-gold' : 'text-cq-muted'
                        }`}
                    >
                        ☀️
                    </span>
                </>
            )}
        </button>
    );
};

export default ThemeToggle;
