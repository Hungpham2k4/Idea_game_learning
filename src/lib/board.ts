/**
 * @file src/lib/board.ts
 * @description Kiểu dữ liệu và hằng số cho chế độ cờ tỷ phú.
 *
 * Tách khỏi `arena.ts` vì bàn cờ chơi theo lượt, còn ba chế độ kia giải đồng
 * thời — hai bộ sự kiện socket gần như không giao nhau.
 */

export type TileKind = 'start' | 'problem' | 'chance' | 'trap' | 'bonus' | 'shield' | 'jail' | 'warp';

export interface BoardTile {
    kind: TileKind;
    label: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    points?: number;
    skipTurns?: number;
    target?: number;
    note?: string;
}

export interface BoardPlayerState {
    id: string;
    name: string;
    slot: number;
    position: number;
    score: number;
    shields: number;
    skipTurns: number;
    laps: number;
    solved: number;
    failed: number;
    streak: number;
    bestStreak: number;
}

export interface BoardWorld {
    tiles: BoardTile[];
    players: BoardPlayerState[];
    turnSlot: number;
    round: number;
    maxRounds: number;
    targetScore: number;
}

export interface BoardEvent {
    kind: string;
    actorId?: string;
    targetId?: string;
    dice?: number[];
    from?: number;
    to?: number;
    amount?: number;
    text: string;
}

export type BoardPhase = 'lobby' | 'awaitingRoll' | 'moving' | 'solving' | 'resolved' | 'finished';

export interface ProblemTest {
    args: unknown[];
    expected: unknown;
    note?: string;
}

export interface PublicProblem {
    id: string;
    slug: string;
    title: string;
    statement: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    functionName: string;
    signature: string;
    starterCode: Record<string, string>;
    sampleTests: ProblemTest[];
    hints: string[];
    /** Tổng số test kể cả test ẩn — để người chơi biết còn bao nhiêu phần chưa thấy */
    totalTests: number;
}

export interface BoardRoomState {
    kind: 'board';
    matchId: string;
    roomCode: string;
    phase: BoardPhase;
    secondsLeft: number;
    map: {
        id: string;
        slug: string;
        name: string;
        briefing: string;
        minPlayers: number;
        maxPlayers: number;
        maxRounds: number;
        targetScore: number;
    };
    hostId: string | null;
    seats: {
        userId: string;
        name: string;
        username: string;
        slot: number;
        ready: boolean;
        connected: boolean;
        isHost: boolean;
    }[];
    world: BoardWorld | null;
    currentPlayerId: string | null;
    isMyTurn: boolean;
    problem: PublicProblem | null;
    solverId: string | null;
    journal: BoardEvent[];
}

export interface TestOutcome {
    index: number;
    passed: boolean;
    args: unknown[];
    expected: unknown;
    got: unknown;
    error: string | null;
    hidden: boolean;
}

export interface MyGradeResult {
    passed: boolean;
    passedTests: number;
    totalTests: number;
    error: string | null;
    errorLine: number | null;
    details: TestOutcome[];
    output: string[];
}

/** Màu quân theo slot — phải khớp SLOT_COLORS ở server. */
export const SLOT_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#a855f7', '#38bdf8', '#ec4899'];

/** Hình thức của từng loại ô. Gom một chỗ để bàn cờ và trang quản trị vẽ giống nhau. */
export const TILE_STYLE: Record<TileKind, { icon: string; bg: string; name: string }> = {
    start: { icon: '🏁', bg: 'linear-gradient(160deg, #38bdf833, #38bdf80d)', name: 'Xuất phát' },
    problem: { icon: '⌨️', bg: 'linear-gradient(160deg, #a855f733, #a855f70d)', name: 'Thử thách' },
    chance: { icon: '🎁', bg: 'linear-gradient(160deg, #fbbf2433, #fbbf240d)', name: 'Cơ hội' },
    trap: { icon: '💥', bg: 'linear-gradient(160deg, #f8717133, #f871710d)', name: 'Chướng ngại' },
    bonus: { icon: '💎', bg: 'linear-gradient(160deg, #4ade8033, #4ade800d)', name: 'Thưởng' },
    shield: { icon: '🛡️', bg: 'linear-gradient(160deg, #22d3ee33, #22d3ee0d)', name: 'Khiên' },
    jail: { icon: '⏸️', bg: 'linear-gradient(160deg, #94a3b833, #94a3b80d)', name: 'Nghỉ lượt' },
    warp: { icon: '🌀', bg: 'linear-gradient(160deg, #818cf833, #818cf80d)', name: 'Dịch chuyển' },
};

export const DIFFICULTY_LABEL: Record<string, string> = {
    EASY: 'Dễ',
    MEDIUM: 'Trung bình',
    HARD: 'Khó',
};

export const DIFFICULTY_COLOR: Record<string, string> = {
    EASY: '#4ade80',
    MEDIUM: '#fbbf24',
    HARD: '#f87171',
};
