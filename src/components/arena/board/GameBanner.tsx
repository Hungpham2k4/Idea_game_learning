/**
 * @file src/components/arena/board/GameBanner.tsx
 * @description Băng thông báo lớn giữa màn hình cho từng sự kiện quan trọng.
 *
 * Trước đây mọi chuyện chỉ hiện thành một dòng chữ trong nhật ký bên phải:
 * tới lượt ai, dừng vào ô gì, giải đúng hay sai — tất cả đều là một dòng xám
 * nhỏ như nhau. Người chơi phải tự đọc mới biết chuyện gì vừa xảy ra.
 *
 * Băng này làm cái việc mà mọi trò chơi đều làm: **dừng lại một nhịp và nói to
 * ra** điều vừa xảy ra, rồi biến mất. Nhịp nghỉ đó mới là thứ tạo cảm giác
 * "một lượt vừa kết thúc".
 *
 * Băng KHÔNG chặn thao tác (`pointer-events: none`) — người chơi vẫn bấm được
 * xuyên qua nếu muốn làm nhanh.
 */
import React, { useEffect, useState } from 'react';

export type BannerKind =
    | 'yourTurn'
    | 'otherTurn'
    | 'problem'
    | 'solved'
    | 'failed'
    | 'chance'
    | 'trap'
    | 'bonus'
    | 'shield'
    | 'jail'
    | 'warp'
    | 'lap'
    | 'streak'
    | 'win';

export interface BannerItem {
    id: number;
    kind: BannerKind;
    title: string;
    subtitle?: string;
    /** Điểm cộng/trừ, hiện thành số lớn bên cạnh */
    amount?: number;
    /** Mili giây hiện trên màn hình */
    duration?: number;
}

interface Style {
    icon: string;
    ring: string;
    text: string;
    glow: string;
    /** Có bắn hạt giấy mừng không */
    confetti?: boolean;
}

const STYLE: Record<BannerKind, Style> = {
    yourTurn: { icon: '🎲', ring: 'border-cq-neon', text: 'text-cq-neon', glow: 'rgb(56 189 248)' },
    otherTurn: { icon: '⏳', ring: 'border-cq-line', text: 'text-cq-muted', glow: 'rgb(148 163 184)' },
    problem: { icon: '⌨️', ring: 'border-purple-400', text: 'text-purple-300', glow: 'rgb(168 85 247)' },
    solved: { icon: '✅', ring: 'border-emerald-400', text: 'text-emerald-300', glow: 'rgb(52 211 153)', confetti: true },
    failed: { icon: '❌', ring: 'border-rose-400', text: 'text-rose-300', glow: 'rgb(244 63 94)' },
    chance: { icon: '🎁', ring: 'border-amber-400', text: 'text-amber-300', glow: 'rgb(251 191 36)' },
    trap: { icon: '💥', ring: 'border-rose-400', text: 'text-rose-300', glow: 'rgb(244 63 94)' },
    bonus: { icon: '💎', ring: 'border-emerald-400', text: 'text-emerald-300', glow: 'rgb(52 211 153)', confetti: true },
    shield: { icon: '🛡️', ring: 'border-cyan-400', text: 'text-cyan-300', glow: 'rgb(34 211 238)' },
    jail: { icon: '⏸️', ring: 'border-slate-400', text: 'text-slate-300', glow: 'rgb(148 163 184)' },
    warp: { icon: '🌀', ring: 'border-indigo-400', text: 'text-indigo-300', glow: 'rgb(129 140 248)' },
    lap: { icon: '🏁', ring: 'border-cq-neon', text: 'text-cq-neon', glow: 'rgb(56 189 248)', confetti: true },
    streak: { icon: '🔥', ring: 'border-orange-400', text: 'text-orange-300', glow: 'rgb(251 146 60)', confetti: true },
    win: { icon: '👑', ring: 'border-cq-gold', text: 'text-cq-gold', glow: 'rgb(251 191 36)', confetti: true },
};

export const GameBanner: React.FC<{ item: BannerItem | null; onDone: () => void }> = ({ item, onDone }) => {
    useEffect(() => {
        if (!item) return;
        const t = setTimeout(onDone, item.duration ?? 2200);
        return () => clearTimeout(t);
    }, [item, onDone]);

    if (!item) return null;
    const s = STYLE[item.kind] ?? STYLE.otherTurn;

    return (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-40 grid place-items-center px-4">
            <div
                key={item.id}
                className="animate-cq-banner relative"
                style={{ ['--dur' as any]: `${item.duration ?? 2200}ms` }}
            >
                {/* Tia sáng toả ra phía sau */}
                <span
                    className="animate-cq-burst pointer-events-none absolute left-1/2 top-1/2 h-40 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ background: `radial-gradient(ellipse, ${s.glow}44, transparent 70%)` }}
                />

                <div
                    className={`relative flex items-center gap-4 rounded-2xl border-2 ${s.ring} bg-cq-panel/95 px-7 py-4 shadow-2xl backdrop-blur-md`}
                    style={{ boxShadow: `0 0 48px -12px ${s.glow}, 0 18px 40px -20px rgb(2 6 23 / 0.7)` }}
                >
                    <span className="text-4xl drop-shadow-lg">{s.icon}</span>

                    <div className="min-w-0">
                        <p className={`text-xl font-black leading-tight ${s.text}`}>{item.title}</p>
                        {item.subtitle && (
                            <p className="mt-0.5 text-sm leading-snug text-cq-muted">{item.subtitle}</p>
                        )}
                    </div>

                    {item.amount !== undefined && item.amount !== 0 && (
                        <span
                            className={`ml-2 shrink-0 font-mono text-3xl font-black tabular-nums ${
                                item.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                        >
                            {item.amount > 0 ? '+' : ''}
                            {item.amount}
                        </span>
                    )}
                </div>

                {s.confetti && <Confetti color={s.glow} />}
            </div>
        </div>
    );
};

/** Hạt giấy mừng bắn ra từ tâm băng thông báo. */
const Confetti: React.FC<{ color: string }> = ({ color }) => {
    const bits = React.useMemo(
        () =>
            Array.from({ length: 14 }, (_, i) => ({
                id: i,
                dx: (Math.random() - 0.5) * 320,
                dy: -60 - Math.random() * 90,
                rot: Math.random() * 540 - 270,
                dur: 900 + Math.random() * 700,
                delay: Math.random() * 180,
                size: 5 + Math.random() * 6,
                hue: i % 3,
            })),
        [],
    );

    const palette = [color, 'rgb(251 191 36)', 'rgb(255 255 255)'];

    return (
        <span className="pointer-events-none absolute inset-0 overflow-visible">
            {bits.map((b) => (
                <span
                    key={b.id}
                    className="animate-cq-confetti absolute left-1/2 top-1/2 block rounded-[2px]"
                    style={{
                        width: b.size,
                        height: b.size * 1.6,
                        backgroundColor: palette[b.hue],
                        ['--dx' as any]: `${b.dx}px`,
                        ['--dy' as any]: `${b.dy}px`,
                        ['--rot' as any]: `${b.rot}deg`,
                        ['--dur' as any]: `${b.dur}ms`,
                        animationDelay: `${b.delay}ms`,
                    }}
                />
            ))}
        </span>
    );
};

/**
 * Hàng đợi băng thông báo.
 *
 * Xếp hàng chứ không chồng lên nhau: một lượt có thể sinh ra vài sự kiện liên
 * tiếp (đi qua ô xuất phát → dừng ô thưởng → được thêm điểm), hiện cùng lúc thì
 * không đọc kịp cái nào.
 */
export function useBannerQueue(): {
    current: BannerItem | null;
    push: (b: Omit<BannerItem, 'id'>) => void;
    next: () => void;
    clear: () => void;
} {
    const [queue, setQueue] = useState<BannerItem[]>([]);

    return {
        current: queue[0] ?? null,
        push: (b) => setQueue((q) => [...q.slice(-4), { ...b, id: Date.now() + Math.random() }]),
        next: () => setQueue((q) => q.slice(1)),
        clear: () => setQueue([]),
    };
}

export default GameBanner;
