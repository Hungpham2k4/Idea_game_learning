/**
 * @file src/components/arena/MapThumb.tsx
 * @description Ảnh thu nhỏ của một bản đồ, tự chạy demo.
 *
 * Đây thay cho icon emoji ở sảnh. Emoji 🗺️ trông giống nhau ở mọi bản đồ và
 * không nói lên điều gì; còn ô này vẽ **đúng bản đồ thật** — tường ở đâu, ô xuất
 * phát ở đâu, năng lượng nằm chỗ nào — rồi cho vài quân đi lại và chiếm ô.
 *
 * Người chơi nhìn một cái là biết bản đồ chật hay rộng, nhiều tường hay trống,
 * trước khi bấm vào. Vừa sinh động vừa có ích, không phải trang trí suông.
 *
 * Chuyển động ở đây thuần trang trí, không phải mô phỏng luật chơi — nó không
 * bao giờ được hiểu nhầm thành kết quả thật vì demo chạy ở sảnh, chưa có trận nào.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SLOT_COLORS } from '../../lib/arena';

interface Props {
    width: number;
    height: number;
    layout: Record<string, any>;
    mode: string;
    /** Tắt chuyển động (dùng cho ô xem trước trong trang quản trị) */
    still?: boolean;
    className?: string;
}

interface Pawn {
    x: number;
    y: number;
    slot: number;
}

const key = (x: number, y: number) => `${x},${y}`;

const MapThumb: React.FC<Props> = ({ width, height, layout, mode, still = false, className = '' }) => {
    const w = Math.max(1, Number(width) || 1);
    const h = Math.max(1, Number(height) || 1);

    const walls = useMemo(
        () => new Set<string>((layout?.walls ?? []).map(([x, y]: number[]) => key(x, y))),
        [layout],
    );
    const resources = useMemo(
        () => new Set<string>((layout?.resources ?? []).map(([x, y]: number[]) => key(x, y))),
        [layout],
    );
    const spawns: [number, number][] = useMemo(() => layout?.spawns ?? [], [layout]);

    const [pawns, setPawns] = useState<Pawn[]>(() =>
        spawns.slice(0, 4).map(([x, y], i) => ({ x, y, slot: i })),
    );
    const [owned, setOwned] = useState<Record<string, number>>({});
    const tick = useRef(0);

    // ── Demo tự chạy ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (still || spawns.length === 0) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

        const id = setInterval(() => {
            tick.current += 1;

            setPawns((prev) =>
                prev.map((p, i) => {
                    // Mỗi quân đi theo một nhịp lệch nhau cho tự nhiên
                    const seed = tick.current + i * 3;
                    const dirs = [
                        [1, 0],
                        [0, 1],
                        [-1, 0],
                        [0, -1],
                    ];
                    const [dx, dy] = dirs[(seed * 7 + i * 5) % 4];
                    const nx = p.x + dx;
                    const ny = p.y + dy;
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return p;
                    if (walls.has(key(nx, ny))) return p;
                    return { ...p, x: nx, y: ny };
                }),
            );

            // Cứ vài nhịp thì cắm cờ một ô, rồi xoá bớt để không phủ kín bản đồ
            if (tick.current % 3 === 0) {
                setOwned((prev) => {
                    const next = { ...prev };
                    setPawns((ps) => {
                        for (const p of ps) next[key(p.x, p.y)] = p.slot;
                        return ps;
                    });
                    const keys = Object.keys(next);
                    if (keys.length > Math.max(6, Math.floor((w * h) / 6))) {
                        delete next[keys[0]];
                    }
                    return next;
                });
            }
        }, 900);

        return () => clearInterval(id);
    }, [still, spawns, walls, w, h]);

    const cell = 100 / w;
    const row = 100 / h;

    return (
        <div
            className={`relative overflow-hidden rounded-xl border border-cq-line/70 bg-cq-screen ${className}`}
            style={{ aspectRatio: `${w} / ${h}` }}
            aria-hidden="true"
        >
            {/* Lưới nền */}
            <div
                className="absolute inset-0 grid opacity-70"
                style={{ gridTemplateColumns: `repeat(${w}, 1fr)`, gridTemplateRows: `repeat(${h}, 1fr)` }}
            >
                {Array.from({ length: w * h }, (_, i) => {
                    const x = i % w;
                    const y = Math.floor(i / w);
                    const k = key(x, y);
                    const slot = owned[k];
                    return (
                        <div
                            key={k}
                            className="border-[0.5px] border-cq-line/25 transition-colors duration-700"
                            style={{
                                backgroundColor: walls.has(k)
                                    ? 'rgb(var(--cq-line) / 0.9)'
                                    : slot !== undefined
                                      ? `${SLOT_COLORS[slot % SLOT_COLORS.length]}44`
                                      : undefined,
                            }}
                        />
                    );
                })}
            </div>

            {/* Năng lượng nhấp nháy */}
            {[...resources].map((k) => {
                const [x, y] = k.split(',').map(Number);
                return (
                    <span
                        key={`r${k}`}
                        className="absolute animate-cq-breathe rounded-full bg-amber-400"
                        style={{
                            left: `${(x + 0.5) * cell}%`,
                            top: `${(y + 0.5) * row}%`,
                            width: `${cell * 0.42}%`,
                            aspectRatio: '1',
                            transform: 'translate(-50%, -50%)',
                            boxShadow: '0 0 8px rgba(251,191,36,0.8)',
                        }}
                    />
                );
            })}

            {/* Quân đi lại */}
            {pawns.map((p) => (
                <span
                    key={p.slot}
                    className="absolute rounded-full transition-all duration-700 ease-out"
                    style={{
                        left: `${(p.x + 0.5) * cell}%`,
                        top: `${(p.y + 0.5) * row}%`,
                        width: `${cell * 0.62}%`,
                        aspectRatio: '1',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: SLOT_COLORS[p.slot % SLOT_COLORS.length],
                        boxShadow: `0 0 10px ${SLOT_COLORS[p.slot % SLOT_COLORS.length]}`,
                    }}
                />
            ))}

            {/* Vệt quét kiểu màn hình radar */}
            {!still && (
                <span className="pointer-events-none absolute inset-x-0 top-0 h-[18%] animate-cq-scan bg-gradient-to-b from-transparent via-cq-neon/20 to-transparent" />
            )}

            {/* Nhãn kích thước: có nền mờ để không bị quân cờ đè lên khó đọc */}
            <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-cq-screen/85 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-cq-neon backdrop-blur-sm">
                {w}×{h}
            </span>
        </div>
    );
};

export default MapThumb;
