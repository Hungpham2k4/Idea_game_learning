/**
 * @file src/lib/arena.ts
 * @description Lớp truy cập Code Arena: REST cho tra cứu, Socket.IO cho trận đấu.
 *
 * Vì sao tách khỏi `codequest.ts`: đấu trường là thứ duy nhất trong dự án cần
 * kết nối thường trực. Gom riêng để phần còn lại của trang không phải tải mã
 * socket, và để logic kết nối lại nằm một chỗ.
 */
import { io, type Socket } from 'socket.io-client';
import { apiFetch, getToken } from './codequest';

// ─── Kiểu dữ liệu (khớp với server) ──────────────────────────────────────────

export type ArenaMode = 'territory' | 'battle' | 'survival' | 'board';
export type RoomPhase = 'lobby' | 'writing' | 'resolving' | 'review' | 'finished';

export interface ArenaMap {
    id: string;
    slug: string;
    name: string;
    description: string;
    mode: ArenaMode;
    width: number;
    height: number;
    minPlayers: number;
    maxPlayers: number;
    totalRounds: number;
    writeSeconds: number;
    briefing: string;
    isActive: boolean;
    sortOrder: number;
    layout: Record<string, any>;
    rules: Record<string, any>;
}

export interface ArenaPlayerState {
    id: string;
    name: string;
    slot: number;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
    score: number;
    kills: number;
    deaths: number;
    alive: boolean;
    respawnIn: number;
    shielded: boolean;
}

export interface ArenaWorld {
    mode: ArenaMode;
    width: number;
    height: number;
    round: number;
    totalRounds: number;
    walls: string[];
    owners: Record<string, string>;
    resources: { x: number; y: number; amount: number }[];
    players: ArenaPlayerState[];
    creeps: { id: string; x: number; y: number; hp: number; maxHp: number }[];
    goals: string[];
}

export interface ArenaFrame {
    kind: string;
    actorId?: string;
    targetId?: string;
    from?: { x: number; y: number };
    to?: { x: number; y: number };
    at?: { x: number; y: number };
    amount?: number;
    text: string;
}

export interface ArenaStanding {
    userId: string;
    name: string;
    slot: number;
    score: number;
    delta: number;
    hp: number;
    energy: number;
    tiles: number;
    kills: number;
    alive: boolean;
}

export interface RoomSeat {
    userId: string;
    name: string;
    username: string;
    slot: number;
    ready: boolean;
    connected: boolean;
    isHost: boolean;
    submitted?: boolean;
}

export interface RoomState {
    matchId: string;
    roomCode: string;
    phase: RoomPhase;
    round: number;
    totalRounds: number;
    secondsLeft: number;
    map: Pick<
        ArenaMap,
        | 'id'
        | 'slug'
        | 'name'
        | 'mode'
        | 'width'
        | 'height'
        | 'briefing'
        | 'writeSeconds'
        | 'totalRounds'
        | 'minPlayers'
        | 'maxPlayers'
    >;
    hostId: string | null;
    seats: RoomSeat[];
    world: ArenaWorld | null;
    standings: ArenaStanding[];
    myCode: string;
}

export interface RoundResult {
    round: number;
    frames: ArenaFrame[];
    standings: ArenaStanding[];
    world: ArenaWorld;
    finished: boolean;
    coopOutcome: 'win' | 'lose' | null;
    errors: { userId: string; error: string; line: number | null }[];
    reviewSeconds: number;
}

export interface RoundFeedback {
    round: number;
    output: string[];
    error: string | null;
    errorLine: number | null;
    actions: number;
    steps: number;
}

export interface ArenaDocs {
    groups: {
        title: string;
        note?: string;
        entries: { signature: string; summary: string; cost: number; example?: string }[];
    }[];
    tips: string[];
}

/** Màu quân theo slot — phải khớp SLOT_COLORS ở server. */
export const SLOT_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#a855f7', '#38bdf8', '#ec4899'];

export const MODE_LABEL: Record<ArenaMode, string> = {
    territory: 'Chiếm lãnh thổ',
    battle: 'Đấu sinh tồn',
    survival: 'Hợp tác chống quái',
    board: 'Cờ tỷ phú lập trình',
};

export const MODE_HINT: Record<ArenaMode, string> = {
    territory: 'Điểm cộng dồn theo số ô bạn giữ được mỗi lượt',
    battle: 'Điểm theo sát thương gây ra và số mạng hạ được',
    survival: 'Cả phòng cùng phe — sống hết số lượt là cùng thắng',
    board: 'Đổ xúc xắc đi quanh bàn, dừng ô thử thách thì phải giải bài',
};

// ─── REST ────────────────────────────────────────────────────────────────────

export const arenaApi = {
    maps: () => apiFetch<ArenaMap[]>('/arena/maps', { anonymous: true }),
    docs: () => apiFetch<ArenaDocs>('/arena/docs', { anonymous: true }),
    rooms: () => apiFetch<any[]>('/arena/rooms'),
    createRoom: (mapSlug: string, isPrivate = false) =>
        apiFetch<{ roomCode: string; matchId: string }>('/arena/rooms', {
            method: 'POST',
            body: { mapSlug, isPrivate },
        }),
    room: (code: string) => apiFetch<any>(`/arena/rooms/${code}`),
    ongoing: () => apiFetch<any[]>('/arena/ongoing'),
    history: (take = 20) => apiFetch<any[]>(`/arena/history?take=${take}`),
    replay: (matchId: string) => apiFetch<any>(`/arena/replay/${matchId}`),

    admin: {
        maps: () => apiFetch<ArenaMap[]>('/admin/arena/maps'),
        createMap: (body: Record<string, any>) => apiFetch('/admin/arena/maps', { method: 'POST', body }),
        updateMap: (id: string, body: Record<string, any>) =>
            apiFetch(`/admin/arena/maps/${id}`, { method: 'PATCH', body }),
        deleteMap: (id: string) => apiFetch(`/admin/arena/maps/${id}`, { method: 'DELETE' }),
        matches: (take = 40) => apiFetch<any[]>(`/admin/arena/matches?take=${take}`),
        live: () => apiFetch<any[]>('/admin/arena/live'),

        // Ngân hàng bài tập cho bàn cờ
        problems: () => apiFetch<any[]>('/admin/arena/problems'),
        createProblem: (body: Record<string, any>) =>
            apiFetch('/admin/arena/problems', { method: 'POST', body }),
        updateProblem: (id: string, body: Record<string, any>) =>
            apiFetch(`/admin/arena/problems/${id}`, { method: 'PATCH', body }),
        deleteProblem: (id: string) => apiFetch(`/admin/arena/problems/${id}`, { method: 'DELETE' }),
        problemStats: () => apiFetch<any[]>('/admin/arena/problem-stats'),
    },
};

// ─── Socket ──────────────────────────────────────────────────────────────────

/**
 * Địa chỉ namespace realtime.
 *
 * PUBLIC_API_URL trỏ tới `.../api/v1`, còn socket nằm ở gốc máy chủ nên phải
 * cắt bỏ phần đường dẫn. Làm sai chỗ này thì socket lặng lẽ không kết nối được
 * mà REST vẫn chạy bình thường — rất khó lần ra.
 */
export function arenaSocketUrl(): string {
    const base = (import.meta.env.PUBLIC_API_URL as string | undefined) ?? 'http://localhost:8080/api/v1';
    try {
        return new URL(base).origin;
    } catch {
        return 'http://localhost:8080';
    }
}

export function connectArena(): Socket {
    return io(`${arenaSocketUrl()}/arena`, {
        auth: { token: getToken() },
        // Cho phép hạ cấp sang long-polling: mạng trường học và một số proxy
        // chặn WebSocket, mất kết nối giữa buổi thực hành là hỏng cả buổi học.
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 800,
        withCredentials: true,
    });
}

export const tileKey = (x: number, y: number): string => `${x},${y}`;
