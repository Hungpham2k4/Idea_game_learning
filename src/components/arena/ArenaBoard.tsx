/**
 * @file src/components/arena/ArenaBoard.tsx
 * @description Bàn đấu: vẽ lưới và phát lại hoạt ảnh của một lượt.
 *
 * Hoạt ảnh được dựng từ chính các khung mà server tính ra, không viết tay ở
 * client. Nhờ vậy hình ảnh không bao giờ kể một câu chuyện khác với bảng điểm —
 * nếu bảng điểm nói bạn mất 25 máu thì trên bàn cũng phải hiện đúng -25.
 *
 * Cách tái dựng vị trí đầu lượt: server chỉ gửi thế giới SAU khi giải xong, còn
 * mỗi khung "move" mang theo cả `from` lẫn `to`. Vậy vị trí đầu lượt của một
 * người chính là `from` của khung di chuyển đầu tiên của họ; ai không có khung
 * di chuyển nào thì đứng yên, vị trí sau cũng là vị trí trước.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ArenaFrame, ArenaWorld } from '../../lib/arena';
import { SLOT_COLORS, tileKey } from '../../lib/arena';

interface Props {
    world: ArenaWorld | null;
    frames?: ArenaFrame[];
    /** Đổi giá trị này để bắt đầu phát lại một lượt mới */
    playbackKey?: string | number;
    /** Người đang xem — quân của họ được viền nổi bật */
    meId?: string;
    /** Mili giây cho mỗi khung */
    frameMs?: number;
    onFrame?: (frame: ArenaFrame, index: number) => void;
    onDone?: () => void;
}

interface FloatEffect {
    id: number;
    x: number;
    y: number;
    text: string;
    tone: 'damage' | 'heal' | 'gain' | 'info';
}

interface BeamEffect {
    id: number;
    from: { x: number; y: number };
    to: { x: number; y: number };
}

let effectSeq = 0;

const ArenaBoard: React.FC<Props> = ({
    world,
    frames = [],
    playbackKey,
    meId,
    frameMs = 620,
    onFrame,
    onDone,
}) => {
    // Vị trí hiển thị của từng quân trong lúc phát lại
    const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
    const [floats, setFloats] = useState<FloatEffect[]>([]);
    const [beams, setBeams] = useState<BeamEffect[]>([]);
    const [shielded, setShielded] = useState<Set<string>>(new Set());
    const [flashTiles, setFlashTiles] = useState<Record<string, string>>({});
    const [playing, setPlaying] = useState(false);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearTimers = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    };

    /** Vị trí của mọi quân ở ĐẦU lượt, suy ra từ các khung di chuyển. */
    const startPositions = useMemo(() => {
        const out: Record<string, { x: number; y: number }> = {};
        for (const p of world?.players ?? []) out[p.id] = { x: p.x, y: p.y };
        // Duyệt ngược để lấy khung di chuyển ĐẦU TIÊN của mỗi người
        for (let i = frames.length - 1; i >= 0; i--) {
            const f = frames[i];
            if (f.kind === 'move' && f.actorId && f.from) out[f.actorId] = { x: f.from.x, y: f.from.y };
        }
        return out;
    }, [world, frames]);

    // ── Phát lại ─────────────────────────────────────────────────────────────
    useEffect(() => {
        clearTimers();
        setFloats([]);
        setBeams([]);
        setShielded(new Set());
        setFlashTiles({});

        if (!world) return;

        if (frames.length === 0) {
            setPositions(Object.fromEntries((world.players ?? []).map((p) => [p.id, { x: p.x, y: p.y }])));
            setPlaying(false);
            return;
        }

        setPositions(startPositions);
        setPlaying(true);

        frames.forEach((frame, i) => {
            const t = setTimeout(() => {
                applyFrame(frame);
                onFrame?.(frame, i);
                if (i === frames.length - 1) {
                    const done = setTimeout(() => {
                        setPlaying(false);
                        onDone?.();
                    }, frameMs);
                    timers.current.push(done);
                }
            }, i * frameMs);
            timers.current.push(t);
        });

        return clearTimers;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playbackKey]);

    function pushFloat(x: number, y: number, text: string, tone: FloatEffect['tone']): void {
        const id = ++effectSeq;
        setFloats((prev) => [...prev, { id, x, y, text, tone }]);
        const t = setTimeout(() => setFloats((prev) => prev.filter((f) => f.id !== id)), 1400);
        timers.current.push(t);
    }

    function flashTile(x: number, y: number, color: string): void {
        const k = tileKey(x, y);
        setFlashTiles((prev) => ({ ...prev, [k]: color }));
        const t = setTimeout(() => {
            setFlashTiles((prev) => {
                const next = { ...prev };
                delete next[k];
                return next;
            });
        }, 900);
        timers.current.push(t);
    }

    function applyFrame(f: ArenaFrame): void {
        switch (f.kind) {
            case 'move':
            case 'creepMove':
                if (f.actorId && f.to) {
                    setPositions((prev) => ({ ...prev, [f.actorId!]: { x: f.to!.x, y: f.to!.y } }));
                }
                break;

            case 'blocked':
                if (f.at) pushFloat(f.at.x, f.at.y, '✕', 'info');
                break;

            case 'attack':
                if (f.from && f.to) {
                    const id = ++effectSeq;
                    setBeams((prev) => [...prev, { id, from: f.from!, to: f.to! }]);
                    const t = setTimeout(() => setBeams((prev) => prev.filter((b) => b.id !== id)), 520);
                    timers.current.push(t);
                }
                break;

            case 'damage':
            case 'creepAttack':
                if (f.at && f.amount) pushFloat(f.at.x, f.at.y, `-${f.amount}`, 'damage');
                break;

            case 'heal':
                if (f.at && f.amount) pushFloat(f.at.x, f.at.y, `+${f.amount}`, 'heal');
                break;

            case 'collect':
                if (f.at && f.amount) pushFloat(f.at.x, f.at.y, `+${f.amount} ⚡`, 'gain');
                break;

            case 'shield':
                if (f.actorId) {
                    setShielded((prev) => new Set(prev).add(f.actorId!));
                    if (f.at) pushFloat(f.at.x, f.at.y, '🛡', 'info');
                }
                break;

            case 'capture': {
                const color = SLOT_COLORS[slotOf(f.actorId) % SLOT_COLORS.length];
                if (f.at) flashTile(f.at.x, f.at.y, color);
                break;
            }

            case 'death':
            case 'creepDeath':
                if (f.at) pushFloat(f.at.x, f.at.y, '💀', 'info');
                break;

            case 'respawn':
                if (f.at) pushFloat(f.at.x, f.at.y, '✨', 'gain');
                break;

            default:
                break;
        }
    }

    function slotOf(id?: string): number {
        return world?.players.find((p) => p.id === id)?.slot ?? 0;
    }

    // ── Vẽ ───────────────────────────────────────────────────────────────────

    if (!world) {
        return (
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-dashed border-cq-line bg-cq-panel text-sm text-cq-dim">
                Bàn đấu sẽ hiện ở đây khi trận bắt đầu
            </div>
        );
    }

    const { width, height } = world;
    const wallSet = new Set(world.walls);
    const cellPct = 100 / width;
    const rowPct = 100 / height;

    const posOf = (id: string, fallback: { x: number; y: number }) => positions[id] ?? fallback;

    return (
        <div className="relative w-full select-none">
            <div
                className="relative w-full overflow-hidden rounded-2xl border border-cq-line bg-cq-bg"
                style={{ aspectRatio: `${width} / ${height}` }}
            >
                {/* Nền: ô lưới, tường, chủ sở hữu */}
                <div
                    className="absolute inset-0 grid"
                    style={{
                        gridTemplateColumns: `repeat(${width}, 1fr)`,
                        gridTemplateRows: `repeat(${height}, 1fr)`,
                    }}
                >
                    {Array.from({ length: width * height }, (_, i) => {
                        const x = i % width;
                        const y = Math.floor(i / width);
                        const k = tileKey(x, y);
                        const isWall = wallSet.has(k);
                        const owner = world.owners[k];
                        const ownerSlot = world.players.find((p) => p.id === owner)?.slot ?? -1;
                        const flash = flashTiles[k];

                        return (
                            <div
                                key={k}
                                className={[
                                    'relative border border-cq-line/25 transition-colors duration-500',
                                    isWall ? 'bg-cq-line/70' : '',
                                ].join(' ')}
                                style={
                                    !isWall && ownerSlot >= 0
                                        ? { backgroundColor: `${SLOT_COLORS[ownerSlot % SLOT_COLORS.length]}26` }
                                        : undefined
                                }
                            >
                                {flash && (
                                    <span
                                        className="absolute inset-0 animate-[cqFlash_0.9s_ease-out]"
                                        style={{ backgroundColor: `${flash}66` }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Tài nguyên */}
                {world.resources
                    .filter((r) => r.amount > 0)
                    .map((r) => (
                        <div
                            key={`res-${r.x}-${r.y}`}
                            className="pointer-events-none absolute grid place-items-center"
                            style={{
                                left: `${r.x * cellPct}%`,
                                top: `${r.y * rowPct}%`,
                                width: `${cellPct}%`,
                                height: `${rowPct}%`,
                            }}
                            title={`${r.amount} năng lượng`}
                        >
                            <span className="animate-[cqBreathe_2.4s_ease-in-out_infinite] text-[clamp(10px,2.2vw,20px)]">
                                ⚡
                            </span>
                        </div>
                    ))}

                {/* Đường đòn đánh */}
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`}>
                    {beams.map((b) => (
                        <line
                            key={b.id}
                            x1={b.from.x + 0.5}
                            y1={b.from.y + 0.5}
                            x2={b.to.x + 0.5}
                            y2={b.to.y + 0.5}
                            stroke="#f87171"
                            strokeWidth={0.09}
                            strokeLinecap="round"
                            opacity={0.9}
                        />
                    ))}
                </svg>

                {/* Quái */}
                {world.creeps.map((c) => {
                    const p = posOf(c.id, { x: c.x, y: c.y });
                    return (
                        <div
                            key={c.id}
                            className="pointer-events-none absolute grid place-items-center transition-all duration-500 ease-out"
                            style={{
                                left: `${p.x * cellPct}%`,
                                top: `${p.y * rowPct}%`,
                                width: `${cellPct}%`,
                                height: `${rowPct}%`,
                            }}
                            title={`Quái · ${c.hp} máu`}
                        >
                            <span className="text-[clamp(10px,2.4vw,22px)]">👹</span>
                        </div>
                    );
                })}

                {/* Người chơi */}
                {world.players.map((pl) => {
                    const p = posOf(pl.id, { x: pl.x, y: pl.y });
                    const color = SLOT_COLORS[pl.slot % SLOT_COLORS.length];
                    const isMe = pl.id === meId;
                    return (
                        <div
                            key={pl.id}
                            className="pointer-events-none absolute grid place-items-center transition-all duration-500 ease-out"
                            style={{
                                left: `${p.x * cellPct}%`,
                                top: `${p.y * rowPct}%`,
                                width: `${cellPct}%`,
                                height: `${rowPct}%`,
                                opacity: pl.alive ? 1 : 0.32,
                                zIndex: isMe ? 3 : 2,
                            }}
                            title={`${pl.name} · ${pl.hp}/${pl.maxHp} máu · ${pl.energy} năng lượng`}
                        >
                            <div className="relative grid h-[72%] w-[72%] place-items-center">
                                {shielded.has(pl.id) && (
                                    <span
                                        className="absolute inset-[-18%] rounded-full border-2 animate-[cqGlowRing_1.2s_ease-out_infinite]"
                                        style={{ borderColor: color }}
                                    />
                                )}
                                <span
                                    className={[
                                        'grid h-full w-full place-items-center rounded-full text-[clamp(8px,1.5vw,13px)] font-bold text-white shadow-lg',
                                        isMe ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : '',
                                        pl.alive ? '' : 'grayscale',
                                    ].join(' ')}
                                    style={{ backgroundColor: color }}
                                >
                                    {pl.alive ? initials(pl.name) : '💀'}
                                </span>
                                {/* Thanh máu */}
                                {pl.alive && (
                                    <span className="absolute -bottom-[22%] h-[10%] w-full overflow-hidden rounded-full bg-black/40">
                                        <span
                                            className="block h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${Math.max(0, Math.min(100, (pl.hp / pl.maxHp) * 100))}%`,
                                                backgroundColor: pl.hp > pl.maxHp * 0.35 ? '#4ade80' : '#f87171',
                                            }}
                                        />
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Số bay lên */}
                {floats.map((f) => (
                    <div
                        key={f.id}
                        className="pointer-events-none absolute grid place-items-center"
                        style={{
                            left: `${f.x * cellPct}%`,
                            top: `${f.y * rowPct}%`,
                            width: `${cellPct}%`,
                            height: `${rowPct}%`,
                            zIndex: 5,
                        }}
                    >
                        <span
                            className={[
                                'animate-[cqFloatUp_1.4s_ease-out_forwards] text-[clamp(9px,1.8vw,16px)] font-extrabold drop-shadow',
                                f.tone === 'damage' ? 'text-red-400' : '',
                                f.tone === 'heal' ? 'text-emerald-400' : '',
                                f.tone === 'gain' ? 'text-amber-300' : '',
                                f.tone === 'info' ? 'text-cq-dim' : '',
                            ].join(' ')}
                        >
                            {f.text}
                        </span>
                    </div>
                ))}
            </div>

            {playing && (
                <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">
                    ▶ đang phát lượt
                </span>
            )}
        </div>
    );
};

function initials(name: string): string {
    const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default ArenaBoard;
