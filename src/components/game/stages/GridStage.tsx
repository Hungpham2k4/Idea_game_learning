/**
 * @file src/components/game/stages/GridStage.tsx
 * @description Sân khấu dạng lưới ô cho Code Dungeon và Java Robot Factory.
 *              Phát lại từng frame mà engine trả về để người chơi thấy nhân vật
 *              di chuyển đúng theo code mình viết.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface GridEntity {
    id: string;
    type: string;
    x: number;
    y: number;
    hp?: number;
    name?: string;
    open?: boolean;
    collected?: boolean;
    dead?: boolean;
}

interface GridPlayer {
    x: number;
    y: number;
    dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
    hp: number;
    maxHp: number;
    keys: number;
    gems: number;
}

interface GridFrame {
    action: string;
    player: GridPlayer;
    entities: GridEntity[];
    message?: string;
    turn: number;
}

interface Props {
    state: any;
    frames: GridFrame[];
    /** Cấu hình gốc của màn (dùng khi chưa chạy lần nào) */
    config: any;
    theme: string;
}

const DIR_ROTATION: Record<string, string> = {
    RIGHT: 'rotate(0deg)',
    DOWN: 'rotate(90deg)',
    LEFT: 'rotate(180deg)',
    UP: 'rotate(270deg)',
};

const ENTITY_ICON: Record<string, string> = {
    enemy: '👹',
    gem: '💎',
    key: '🗝️',
    door: '🚪',
    exit: '🏁',
    box: '📦',
    chip: '🔩',
    trap: '🕳️',
};

const GridStage: React.FC<Props> = ({ state, frames, config, theme }) => {
    const [frameIndex, setFrameIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(320);
    const timer = useRef<number | null>(null);

    // Có kết quả mới → phát lại từ đầu
    useEffect(() => {
        setFrameIndex(0);
        setPlaying(frames.length > 1);
    }, [frames]);

    useEffect(() => {
        if (!playing) return;
        if (frameIndex >= frames.length - 1) {
            setPlaying(false);
            return;
        }
        timer.current = window.setTimeout(() => setFrameIndex((i) => i + 1), speed);
        return () => {
            if (timer.current) window.clearTimeout(timer.current);
        };
    }, [playing, frameIndex, frames.length, speed]);

    // Nguồn dữ liệu: frame đang phát → trạng thái cuối → cấu hình ban đầu
    const view = useMemo(() => {
        const tiles: string[][] =
            state?.tiles ??
            (config?.grid?.rows ?? []).map((r: string) => r.split('')) ??
            [];

        if (frames.length > 0) {
            const frame = frames[Math.min(frameIndex, frames.length - 1)];
            return { tiles, player: frame.player, entities: frame.entities, message: frame.message, turn: frame.turn };
        }

        return {
            tiles,
            player: state?.player ?? config?.player ?? { x: 0, y: 0, dir: 'RIGHT', hp: 100, maxHp: 100, keys: 0, gems: 0 },
            entities: (state?.entities ?? config?.entities ?? []) as GridEntity[],
            message: undefined,
            turn: 0,
        };
    }, [state, frames, frameIndex, config]);

    /**
     * So khung hiện tại với khung trước để biết quái nào vừa mất máu / vừa gục.
     * Nhờ vậy số sát thương hiện đúng lúc đòn đánh diễn ra.
     */
    const previousFrame = frames.length && frameIndex > 0 ? frames[frameIndex - 1] : null;

    const damageByEntity = useMemo(() => {
        const map = new Map<string, number>();
        if (!previousFrame) return map;
        for (const e of view.entities) {
            const old = previousFrame.entities.find((p) => p.id === e.id);
            if (old && old.hp !== undefined && e.hp !== undefined && e.hp < old.hp) {
                map.set(e.id, old.hp - e.hp);
            }
        }
        return map;
    }, [previousFrame, view.entities]);

    const killedThisFrame = useMemo(() => {
        if (!previousFrame) return [] as GridEntity[];
        return view.entities.filter(
            (e) => e.dead && !previousFrame.entities.find((p) => p.id === e.id)?.dead,
        );
    }, [previousFrame, view.entities]);

    const height = view.tiles.length;
    const width = view.tiles[0]?.length ?? 0;
    const cell = width > 12 || height > 8 ? 38 : 46;

    const playerIcon = theme === 'robot' ? '🤖' : '🧙';
    const isDead = state?.dead;
    const hasWon = state?.won;

    return (
        <div className="cq-panel flex min-h-0 flex-1 flex-col">
            <div className="cq-panel-head">
                <span>Sân khấu</span>
                <span className="flex items-center gap-3 normal-case tracking-normal">
                    <span className="text-cq-rose">
                        ♥ {view.player.hp}/{view.player.maxHp ?? view.player.hp}
                    </span>
                    <span className="text-cq-neon">💎 {view.player.gems ?? 0}</span>
                    {(view.player.keys ?? 0) > 0 && <span className="text-cq-gold">🗝️ {view.player.keys}</span>}
                    <span className="text-cq-muted">lượt {view.turn}</span>
                </span>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto p-4">
                <div
                    className="relative rounded-lg border border-cq-line bg-cq-screen/60 p-2"
                    style={{ width: width * cell + 16, minWidth: width * cell + 16 }}
                >
                    {/* Nền: các ô */}
                    <div
                        className="grid gap-0"
                        style={{ gridTemplateColumns: `repeat(${width}, ${cell}px)` }}
                    >
                        {view.tiles.flatMap((row, y) =>
                            row.map((tile, x) => (
                                <div
                                    key={`${x}-${y}`}
                                    className={`border border-slate-900/60 ${
                                        tile === '#'
                                            ? 'bg-slate-700/70'
                                            : tile === '~'
                                              ? 'bg-sky-900/60'
                                              : tile === '^'
                                                ? 'bg-rose-950/50'
                                                : 'bg-slate-900/40'
                                    }`}
                                    style={{ width: cell, height: cell }}
                                >
                                    {tile === '^' && <span className="grid h-full place-items-center text-sm opacity-70">🕳️</span>}
                                </div>
                            )),
                        )}
                    </div>

                    {/* Vật thể */}
                    {view.entities
                        .filter((e) => !e.dead && !e.collected)
                        .map((e) => {
                            // Quái vừa trúng đòn ở khung này → rung + hiện số sát thương
                            const damage = damageByEntity.get(e.id);
                            return (
                                <div
                                    key={e.id}
                                    className={`pointer-events-none absolute grid place-items-center transition-all duration-200 ${
                                        damage ? 'animate-cq-shake' : ''
                                    }`}
                                    style={{ left: 8 + e.x * cell, top: 8 + e.y * cell, width: cell, height: cell }}
                                    title={e.name ?? e.type}
                                >
                                    <span style={{ fontSize: cell * 0.55 }}>
                                        {e.type === 'door' && e.open ? '🔓' : (ENTITY_ICON[e.type] ?? '❓')}
                                    </span>

                                    {damage !== undefined && (
                                        <span className="animate-cq-float-up absolute -top-2 font-mono text-sm font-black text-cq-rose">
                                            -{damage}
                                        </span>
                                    )}

                                    {e.type === 'enemy' && e.hp !== undefined && (
                                        <span className="absolute -bottom-0.5 rounded bg-cq-screen/80 px-1 font-mono text-[9px] text-cq-rose">
                                            {e.hp}
                                        </span>
                                    )}
                                </div>
                            );
                        })}

                    {/* Quái vừa bị hạ — hiện nổ rồi tan */}
                    {killedThisFrame.map((e) => (
                        <div
                            key={`dead-${e.id}`}
                            className="animate-cq-fade-out pointer-events-none absolute grid place-items-center"
                            style={{ left: 8 + e.x * cell, top: 8 + e.y * cell, width: cell, height: cell }}
                        >
                            <span style={{ fontSize: cell * 0.6 }}>💥</span>
                        </div>
                    ))}

                    {/* Nhân vật */}
                    <div
                        className="pointer-events-none absolute grid place-items-center transition-all duration-200 ease-out"
                        style={{ left: 8 + view.player.x * cell, top: 8 + view.player.y * cell, width: cell, height: cell }}
                    >
                        <span
                            className={isDead ? 'opacity-40 grayscale' : ''}
                            style={{ fontSize: cell * 0.6, transform: DIR_ROTATION[view.player.dir] ?? '' }}
                        >
                            {isDead ? '💀' : playerIcon}
                        </span>
                    </div>

                    {hasWon && frameIndex >= frames.length - 1 && (
                        <div className="animate-cq-pop pointer-events-none absolute inset-0 grid place-items-center rounded-lg bg-cq-lime/10">
                            <span className="rounded-lg bg-cq-screen/85 px-4 py-2 text-sm font-bold text-cq-lime">
                                🏁 Đã tới đích!
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Điều khiển phát lại */}
            {frames.length > 1 && (
                <div className="flex items-center gap-3 border-t border-cq-line px-4 py-2.5">
                    <button
                        type="button"
                        onClick={() => {
                            if (frameIndex >= frames.length - 1) setFrameIndex(0);
                            setPlaying((p) => !p);
                        }}
                        className="cq-btn-ghost !px-2.5 !py-1 text-xs"
                    >
                        {playing ? '⏸ Tạm dừng' : '▶ Phát lại'}
                    </button>

                    <input
                        type="range"
                        min={0}
                        max={frames.length - 1}
                        value={frameIndex}
                        onChange={(e) => {
                            setPlaying(false);
                            setFrameIndex(Number(e.target.value));
                        }}
                        className="h-1 flex-1 accent-cq-neon"
                    />

                    <span className="w-16 shrink-0 text-right font-mono text-[11px] text-cq-muted">
                        {frameIndex + 1}/{frames.length}
                    </span>

                    <select
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value))}
                        className="rounded border border-cq-line bg-cq-raised px-1.5 py-1 text-[11px] text-cq-muted"
                    >
                        <option value={600}>0.5x</option>
                        <option value={320}>1x</option>
                        <option value={140}>2x</option>
                        <option value={60}>4x</option>
                    </select>
                </div>
            )}

            {view.message && (
                <p className="border-t border-cq-line px-4 py-2 text-xs text-cq-muted">▸ {view.message}</p>
            )}
        </div>
    );
};

export default GridStage;
