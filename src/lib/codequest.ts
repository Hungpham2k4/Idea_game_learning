/**
 * @file src/lib/codequest.ts
 * @description Client gọi API CodeQuest (NestJS) + quản lý phiên đăng nhập.
 *
 * - Access token lưu ở localStorage (`cq_access`)
 * - Refresh token là cookie httpOnly do BE set → gọi /auth/refresh với credentials
 * - Mọi response của BE có dạng { success, data, meta } → hàm này bóc sẵn `data`
 */

export const API_BASE =
    (import.meta.env.PUBLIC_API_URL as string | undefined) ||
    (import.meta.env.VITE_API_URL as string | undefined) ||
    'http://localhost:8080/api/v1';

const ACCESS_KEY = 'cq_access';
const USER_KEY = 'cq_user';

// ─── Kiểu dữ liệu ────────────────────────────────────────────────────────────

export interface CqUser {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    classCode: string | null;
    xp: number;
    totalStars: number;
    streakDays: number;
    rating: number;
    level: number;
    title: string;
    xpForCurrentLevel: number;
    xpForNextLevel: number | null;
    stats?: { completedLevels: number; completedGames: number; submissions: number };
    badges?: { code: string; title: string; description: string; icon: string; earnedAt: string }[];
}

export interface CqGame {
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    description: string;
    engine: 'sql' | 'shell' | 'git' | 'script';
    runtime: string;
    subject: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    icon: string;
    color: string;
    orderIndex: number;
    skills: string[];
    totalLevels: number;
    status: string;
    locked: boolean;
    requirement: string;
    unlockProgress?: { current: number; target: number };
    stars: number;
    maxStars: number;
    levelsCompleted: number;
}

export interface CqLevelSummary {
    id: string;
    slug: string;
    index: number;
    title: string;
    brief: string;
    tags: string[];
    xpReward: number;
    parCommands: number;
    hintCount: number;
    objectiveCount: number;
    locked: boolean;
    status: string;
    stars: number;
    bestScore: number;
    attempts: number;
}

export interface CqGameDetail extends CqGame {
    levels: CqLevelSummary[];
}

export interface CqObjective {
    id: string;
    label: string;
    optional: boolean;
}

export interface CqPlayableLevel {
    id: string;
    index: number;
    slug: string;
    title: string;
    brief: string;
    starterCode: string;
    config: any;
    objectives: CqObjective[];
    tags: string[];
    xpReward: number;
    parCommands: number;
    timeLimitSec: number;
    hintCount: number;
    hintsUsed: number;
    progress: { status: string; stars: number; bestScore: number; attempts: number };
    game: {
        id: string;
        slug: string;
        title: string;
        engine: CqGame['engine'];
        runtime: string;
        subject: string;
        color: string;
        icon: string;
    };
}

export type CqOutputBlock =
    | { type: 'text'; text: string; tone?: 'info' | 'success' | 'error' | 'warn' | 'muted' }
    | { type: 'echo'; text: string }
    | { type: 'ascii'; text: string }
    | { type: 'table'; title?: string; columns: string[]; rows: any[][]; note?: string };

export interface CqRunResult {
    ok: boolean;
    completed: boolean;
    output: CqOutputBlock[];
    state: any;
    frames: any[];
    objectives: { id: string; label: string; done: boolean; optional: boolean; detail?: string }[];
    errors: { message: string; hint?: string; line?: number }[];
    metrics: Record<string, number>;
    feedback: string[];
}

export interface CqSubmitResponse {
    mode: 'submit';
    result: CqRunResult;
    scoring: { stars: number; score: number; xpEarned: number; notes: string[]; alreadyCompleted: boolean };
    progress: { levelStatus: string; levelStars: number; bestScore: number; attempts: number; gameCompleted: boolean };
    player: { xp: number; totalStars: number; level: number; title: string; xpForCurrentLevel: number; xpForNextLevel: number | null };
    rewards: { newlyUnlockedGames: string[]; badges: { code: string; title: string; description: string; icon: string }[] };
    nextLevel: { id: string; index: number; title: string } | null;
}

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public code = 'ERROR',
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

// ─── Phiên đăng nhập ─────────────────────────────────────────────────────────

export function getToken(): string | null {
    try {
        return localStorage.getItem(ACCESS_KEY);
    } catch {
        return null;
    }
}

export function getCachedUser(): CqUser | null {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? (JSON.parse(raw) as CqUser) : null;
    } catch {
        return null;
    }
}

export function saveSession(payload: { accessToken: string; user: CqUser }): void {
    try {
        localStorage.setItem(ACCESS_KEY, payload.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    } catch {
        /* trình duyệt chặn localStorage — bỏ qua */
    }
}

export function clearSession(): void {
    try {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(USER_KEY);
    } catch {
        /* bỏ qua */
    }
}

export function isLoggedIn(): boolean {
    return !!getToken();
}

// ─── Hàm gọi API ─────────────────────────────────────────────────────────────

interface FetchOptions {
    method?: string;
    body?: unknown;
    /** true = không gắn Authorization và không thử refresh */
    anonymous?: boolean;
    /** dùng nội bộ để tránh lặp vô hạn khi refresh */
    _retried?: boolean;
}

export async function apiFetch<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
    const token = options.anonymous ? null : getToken();

    const res = await fetch(`${API_BASE}${path}`, {
        method: options.method ?? 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    let payload: any = null;
    try {
        payload = await res.json();
    } catch {
        payload = null;
    }

    if (res.ok) return payload?.data as T;

    // Access token hết hạn → thử làm mới một lần rồi gọi lại
    if (res.status === 401 && !options.anonymous && !options._retried) {
        const refreshed = await tryRefresh();
        if (refreshed) return apiFetch<T>(path, { ...options, _retried: true });
        clearSession();
    }

    throw new ApiError(
        payload?.error?.message ?? payload?.message ?? 'Không kết nối được máy chủ.',
        res.status,
        payload?.error?.code ?? 'ERROR',
    );
}

async function tryRefresh(): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        if (!res.ok) return false;
        const json = await res.json();
        if (json?.data?.accessToken) {
            saveSession({ accessToken: json.data.accessToken, user: json.data.user });
            return true;
        }
    } catch {
        /* mất mạng */
    }
    return false;
}

// ─── API theo nhóm chức năng ─────────────────────────────────────────────────

export const cq = {
    // ── Xác thực ────────────────────────────────────────────────────────────
    async register(input: {
        email: string;
        username: string;
        password: string;
        displayName: string;
        classCode?: string;
        studentCode?: string;
    }) {
        const data = await apiFetch<{ accessToken: string; user: CqUser }>('/auth/register', {
            method: 'POST',
            body: input,
            anonymous: true,
        });
        saveSession(data);
        return data.user;
    },

    async login(identifier: string, password: string) {
        const data = await apiFetch<{ accessToken: string; user: CqUser }>('/auth/login', {
            method: 'POST',
            body: { identifier, password },
            anonymous: true,
        });
        saveSession(data);
        return data.user;
    },

    async logout() {
        try {
            await apiFetch('/auth/logout', { method: 'POST', body: {} });
        } catch {
            /* kệ, vẫn xoá phiên phía client */
        }
        clearSession();
    },

    me: () => apiFetch<CqUser>('/auth/me'),
    updateProfile: (input: { displayName?: string; classCode?: string; avatarUrl?: string }) =>
        apiFetch<CqUser>('/auth/me', { method: 'PATCH', body: input }),
    changePassword: (currentPassword: string, newPassword: string) =>
        apiFetch('/auth/password', { method: 'POST', body: { currentPassword, newPassword } }),

    // ── Game ────────────────────────────────────────────────────────────────
    games: () => apiFetch<CqGame[]>('/games'),
    game: (slug: string) => apiFetch<CqGameDetail>(`/games/${slug}`),
    level: (id: string) => apiFetch<CqPlayableLevel>(`/levels/${id}`),
    hint: (id: string, index: number) =>
        apiFetch<{ index: number; hint: string; hintsUsed: number; totalHints: number }>(
            `/levels/${id}/hint/${index}`,
        ),

    run: (id: string, code: string) =>
        apiFetch<{ mode: 'run'; result: CqRunResult; wouldComplete: boolean }>(`/levels/${id}/run`, {
            method: 'POST',
            body: { code },
        }),

    submit: (id: string, code: string, durationMs = 0) =>
        apiFetch<CqSubmitResponse>(`/levels/${id}/submit`, {
            method: 'POST',
            body: { code, durationMs },
        }),

    history: (id: string) => apiFetch<any[]>(`/levels/${id}/history`),

    // ── Tiến trình / xếp hạng / huy hiệu ────────────────────────────────────
    progress: () => apiFetch<any>('/progress/me'),
    badges: () => apiFetch<any[]>('/badges'),
    leaderboard: (scope: 'global' | 'class' | 'game' = 'global', value = '', limit = 50) =>
        apiFetch<{ rows: any[]; me: any }>(
            `/leaderboard?scope=${scope}&value=${encodeURIComponent(value)}&limit=${limit}`,
        ),
    classes: () => apiFetch<string[]>('/leaderboard/classes'),
    health: () => apiFetch<any>('/health', { anonymous: true }),

    // ── Quản trị ────────────────────────────────────────────────────────────
    admin: {
        stats: () => apiFetch<any>('/admin/stats'),
        users: (search = '', page = 1, limit = 20) =>
            apiFetch<any[]>(`/admin/users?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`),
        updateUser: (id: string, body: any) => apiFetch(`/admin/users/${id}`, { method: 'PATCH', body }),
        resetUser: (id: string) => apiFetch(`/admin/users/${id}/reset`, { method: 'POST', body: {} }),
        games: () => apiFetch<any[]>('/admin/games'),
        updateGame: (id: string, body: any) => apiFetch(`/admin/games/${id}`, { method: 'PATCH', body }),
        levels: (gameId: string) => apiFetch<any[]>(`/admin/games/${gameId}/levels`),
        level: (id: string) => apiFetch<any>(`/admin/levels/${id}`),
        updateLevel: (id: string, body: any) => apiFetch(`/admin/levels/${id}`, { method: 'PATCH', body }),
        testLevel: (id: string, code?: string) =>
            apiFetch<any>(`/admin/levels/${id}/test`, { method: 'POST', body: code ? { code } : {} }),
        submissions: (params: { userId?: string; gameSlug?: string; page?: number } = {}) => {
            const q = new URLSearchParams();
            if (params.userId) q.set('userId', params.userId);
            if (params.gameSlug) q.set('gameSlug', params.gameSlug);
            q.set('page', String(params.page ?? 1));
            return apiFetch<any[]>(`/admin/submissions?${q.toString()}`);
        },
    },
};

// ─── Tiện ích hiển thị ───────────────────────────────────────────────────────

export const SUBJECT_LABEL: Record<string, string> = {
    SQL: 'Cơ sở dữ liệu',
    LINUX: 'Hệ điều hành',
    GIT: 'Quản lý mã nguồn',
    JAVA: 'Lập trình Java',
    JS: 'Lập trình JavaScript',
    DEVOPS: 'DevOps',
};

export const DIFFICULTY_LABEL: Record<string, string> = {
    EASY: 'Dễ',
    MEDIUM: 'Trung bình',
    HARD: 'Khó',
};

export const ENGINE_LABEL: Record<string, string> = {
    sql: 'SQL',
    shell: 'Terminal',
    git: 'Git',
    script: 'Code',
};

/** Ngôn ngữ gợi ý cho khung soạn thảo theo engine. */
export const ENGINE_PLACEHOLDER: Record<string, string> = {
    sql: 'SELECT * FROM ...;',
    shell: 'ls\ncd /var/log',
    git: 'git log --oneline',
    script: 'MOVE RIGHT;',
};

export function starsText(stars: number, max = 3): string {
    return '★'.repeat(stars) + '☆'.repeat(Math.max(0, max - stars));
}
