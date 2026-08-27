/**
 * @file src/config/site.ts
 * @description Core project configuration — SITE_CONFIG & AUTH_CONFIG.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  HOW TO USE                                                         │
 * │  1. Update SITE_CONFIG with your project's real info before deploy. │
 * │  2. AUTH_CONFIG.isLoggedIn = true bypasses all login checks.        │
 * │     Replace with real JWT/session logic when backend is ready.      │
 * └─────────────────────────────────────────────────────────────────────┘
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SiteConfig {
    /** Human-readable site name shown in title tags, headers, footer. */
    name: string;
    /** Short tagline shown in meta descriptions and hero sections. */
    tagline: string;
    /** Production URL — used for canonical links and OG tags. */
    url: string;
    /** Default meta description for pages without a custom one. */
    defaultDescription: string;
    /** Default OG image absolute URL. Use a 1200×630 image. */
    defaultOgImage: string;
    /** Default locale for HTML lang attribute and OG locale. */
    locale: string;
    /** Contact info — used in footer, floating buttons, schema.org. */
    contact: {
        phone: string;
        email: string;
        address: string;
        zalo?: string;
        googleMapEmbed?: string;
    };
}

export interface AuthConfig {
    /**
     * MOCK AUTH — hardcoded for development & demo.
     * Set to `true`  → all /admin/* routes are accessible without login.
     * Set to `false` → Astro will redirect to `/` (or your login page).
     *
     * @todo Replace this entire object with a real JWT validation call
     *       (e.g., verify token from cookies via an API endpoint) before
     *       going live.
     */
    isLoggedIn: boolean;
    /** Role used to conditionally render admin menu items. */
    role: 'ADMIN' | 'EDITOR' | 'VIEWER';
    /** Display name shown in the admin header. */
    displayName: string;
}

// ─── Exports ───────────────────────────────────────────────────────────────

/**
 * SITE_CONFIG — central source of truth for site identity and SEO defaults.
 * Update before deploying to a new project.
 */
export const SITE_CONFIG: SiteConfig = {
    name:               'CodeQuest',
    tagline:            'Không dùng chuột. Không spam phím. Muốn thắng phải biết code.',
    url:                'https://codequest.example.edu.vn',
    defaultDescription: 'Nền tảng game hoá việc học lập trình cho sinh viên IT: điều khiển nhân vật bằng SQL, Linux, Git, Java — mở khoá từng game theo trình độ.',
    defaultOgImage:     'https://codequest.example.edu.vn/og-default.png',
    locale:             'vi_VN',
    contact: {
        phone:   '0900 000 000',
        email:   'codequest@example.edu.vn',
        address: 'Khoa Công nghệ Thông tin',
        zalo:    '0900000000',
        googleMapEmbed: '',
    },
};

/**
 * Tên cookie do backend NestJS set khi đăng nhập.
 * - cq_refresh : httpOnly, chứa refresh token (client không đọc được)
 * - cq_session : "<username>:<role>" — chỉ dùng để Astro SSR chặn route sớm,
 *                mọi kiểm tra quyền THẬT vẫn nằm ở backend.
 */
export const SESSION_COOKIE = 'cq_session';

/** Đọc role từ cookie phiên (dùng trong Astro frontmatter). */
export function readSessionCookie(raw?: string | null): { username: string; role: string } | null {
    if (!raw) return null;
    const [username, role] = raw.split(':');
    if (!username || !role) return null;
    return { username, role };
}

/**
 * AUTH_CONFIG — hardcoded mock auth for development.
 * isLoggedIn: true  → skip all auth redirects in admin routes.
 * isLoggedIn: false → Astro will redirect unauthenticated users to `/`.
 */
export const AUTH_CONFIG: AuthConfig = {
    isLoggedIn:  true,   // ← không còn dùng để chặn /admin (đã thay bằng cookie cq_session)
    role:        'ADMIN',
    displayName: 'Super Admin',
};
