/**
 * @file src/config/menu.ts
 * @description Navigation menu definitions for both Web (Astro) and Admin (React SPA).
 *
 * Usage:
 *   import { webMenu, adminMenu } from '@/config/menu';
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MenuItem {
    name:       string;
    url:        string;
    highlight?: boolean;
}

export interface MenuGroup {
    name:      string;
    url?:      string;
    children?: MenuItem[];
}

export interface AdminNavItem {
    /** Unique key for grouping / collapsing state */
    key:      string;
    label:    string;
    /** lucide-react icon name (import manually in AdminLayout) */
    icon:     string;
    path?:    string;
    children?: {
        key:   string;
        label: string;
        icon:  string;
        path:  string;
    }[];
}

// ─── Web Public Menu ────────────────────────────────────────────────────────

/**
 * Main navigation for the public website (Header.astro).
 * Customize per project.
 */
export const webMenu: (MenuItem | MenuGroup)[] = [
    { name: 'Trang chủ', url: '/' },
    { name: 'Bản đồ game', url: '/hub' },
    { name: 'Bảng xếp hạng', url: '/leaderboard' },
    { name: 'Hồ sơ', url: '/profile' },
];

// ─── Admin SPA Navigation ──────────────────────────────────────────────────

/**
 * Admin sidebar navigation for the React SPA.
 * AdminLayout.tsx reads this array to render the sidebar dynamically.
 */
export const adminMenu: AdminNavItem[] = [
    {
        key:   'overview',
        label: 'Tổng quan',
        icon:  'LayoutDashboard',
        children: [
            { key: 'dashboard', label: 'Bảng điều khiển', icon: 'LayoutDashboard', path: '/admin' },
            { key: 'submissions', label: 'Bài nộp', icon: 'FileCode', path: '/admin/submissions' },
        ],
    },
    {
        key:   'content',
        label: 'Nội dung game',
        icon:  'Gamepad2',
        children: [
            { key: 'games',  label: 'Danh sách game', icon: 'Gamepad2', path: '/admin/games' },
            { key: 'levels', label: 'Màn chơi',       icon: 'Layers',   path: '/admin/levels' },
        ],
    },
    {
        key:   'people',
        label: 'Người dùng',
        icon:  'Users',
        children: [
            { key: 'users', label: 'Sinh viên & giảng viên', icon: 'Users', path: '/admin/users' },
        ],
    },
    // ── Add more groups as your project grows ──────────────────────────────
    // {
    //     key:   'content',
    //     label: 'Nội dung',
    //     icon:  'FileText',
    //     children: [
    //         { key: 'news', label: 'Bài viết', icon: 'Newspaper', path: '/admin/news' },
    //     ],
    // },
];
