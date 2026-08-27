/**
 * @file src/components/game/stages/TowerStage.tsx
 * @description Sân khấu Tower Defense: đường đi, ô xây tháp, quái theo từng tick.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
    state: any;
    frames: any[];
    config: any;
}

const TOWER_ICON: Record<string, string> = {
    ARCHER: '🏹',
    CANNON: '💣',
    MAGE: '🔮',
};

const ENEMY_ICON: Record<string, string> = {
    goblin: '👺',
    orc: '👹',
    bat: '🦇',
    boss: '🐲',
};

const TowerStage: React.FC<Props> = ({ state, frames, config }) => {
    const [tick, setTick] = useState(0);
    const [playing, setPlaying] = useState(false);
    const timer = useRef<number | null>(null);

    useEffect(() => {
        setTick(0);
        setPlaying(frames.length > 1);
    }, [frames]);

    useEffect(() => {
        if (!playing) return;
        if (tick >= frames.length - 1) {
            setPlaying(false);
            return;
        }
        timer.current = window.setTimeout(() => setTick((t) => t + 1), 220);
        return () => {
            if (timer.current) window.clearTimeout(timer.current);
        };
    }, [playing, tick, frames.length]);

    const path: { x: number; y: number }[] = state?.path ?? config?.path ?? [];
    const spots: { x: number; y: number }[] = state?.buildSpots ?? config?.buildSpots ?? [];
    const width = state?.width ?? config?.width ?? Math.max(...path.map((p) => p.x), 8) + 1;
    const height = state?.height ?? config?.height ?? 4;

    const frame = frames.length ? frames[Math.min(tick, frames.length - 1)] : null;
    const towers = frame?.towers ?? state?.towers ?? [];
    const enemies = frame?.enemies ?? [];
    const baseHp = frame?.baseHp ?? state?.baseHp ?? config?.base?.hp ?? 0;
    const baseMax = state?.baseMaxHp ?? config?.base?.hp ?? baseHp;
    const gold = frame?.gold ?? state?.gold ?? config?.gold ?? 0;
    const wave = frame?.wave ?? 0;

    const cell = width > 12 ? 40 : 48;
    const pathKeys = useMemo(() => new Set(path.map((p) => `${p.x},${p.y}`)), [path]);
    const spotKeys = useMemo(() => new Set(spots.map((p) => `${p.x},${p.y}`)), [spots]);
    const goal = path[path.length - 1];

    return (
        <div className="cq-panel flex min-h-0 flex-1 flex-col">
            <div className="cq-panel-head">
                <span>Chiến trường</span>
                <span className="flex items-center gap-3 normal-case tracking-normal">
                    <span className="text-cq-gold">🪙 {gold}</span>
                    <span className="text-cq-rose">
                        🏰 {Math.max(0, baseHp)}/{baseMax}
                    </span>
                    {wave > 0 && <span className="text-cq-neon">Đợt {wave}</span>}
                    <span className="text-cq-muted">🗼 {towers.length}</span>
                </span>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto p-4">
                <div
                    className="relative rounded-lg border border-cq-line bg-cq-screen/60 p-2"
                    style={{ width: width * cell + 16 }}
                >
                    <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${width}, ${cell}px)` }}>
                        {Array.from({ length: height }).flatMap((_, y) =>
                            Array.from({ length: width }).map((__, x) => {
                                const isPath = pathKeys.has(`${x},${y}`);
                                const isSpot = spotKeys.has(`${x},${y}`);
                                const isGoal = goal && goal.x === x && goal.y === y;
                                return (
                                    <div
                                        key={`${x}-${y}`}
                                        className={`grid place-items-center border border-slate-900/60 ${
                                            isGoal
                                                ? 'bg-rose-900/40'
                                                : isPath
                                                  ? 'bg-amber-900/25'
                                                  : isSpot
                                                    ? 'bg-emerald-900/25'
                                                    : 'bg-slate-900/40'
                                        }`}
                                        style={{ width: cell, height: cell }}
                                        title={isSpot ? `Ô xây tháp (${x}, ${y})` : isPath ? 'Đường quái đi' : ''}
                                    >
                                        {isGoal && <span style={{ fontSize: cell * 0.5 }}>🏰</span>}
                                        {isSpot && !towers.some((t: any) => t.x === x && t.y === y) && (
                                            <span className="font-mono text-[10px] text-emerald-500/70">
                                                {x},{y}
                                            </span>
                                        )}
                                    </div>
                                );
                            }),
                        )}
                    </div>

                    {/* Tháp */}
                    {towers.map((t: any) => (
                        <div
                            key={t.id}
                            className="pointer-events-none absolute grid place-items-center"
                            style={{ left: 8 + t.x * cell, top: 8 + t.y * cell, width: cell, height: cell }}
                            title={`${t.type} cấp ${t.level} · ${t.damage} sát thương · tầm ${t.range}`}
                        >
                            <span style={{ fontSize: cell * 0.5 }}>{TOWER_ICON[t.type] ?? '🗼'}</span>
                            <span className="absolute -bottom-0.5 rounded bg-cq-screen/85 px-1 font-mono text-[9px] text-cq-neon">
                                Lv{t.level}
                            </span>
                        </div>
                    ))}

                    {/* Quái */}
                    {enemies.map((e: any) => (
                        <div
                            key={e.id}
                            className="pointer-events-none absolute grid place-items-center transition-all duration-200"
                            style={{ left: 8 + e.x * cell, top: 8 + e.y * cell, width: cell, height: cell }}
                        >
                            <span style={{ fontSize: cell * 0.45 }}>{ENEMY_ICON[e.type] ?? '👾'}</span>
                            <span className="absolute bottom-0 h-1 w-8 overflow-hidden rounded bg-cq-screen">
                                <span
                                    className="block h-full bg-cq-rose"
                                    style={{ width: `${Math.max(0, (e.hp / e.maxHp) * 100)}%` }}
                                />
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {frames.length > 1 && (
                <div className="flex items-center gap-3 border-t border-cq-line px-4 py-2.5">
                    <button
                        type="button"
                        onClick={() => {
                            if (tick >= frames.length - 1) setTick(0);
                            setPlaying((p) => !p);
                        }}
                        className="cq-btn-ghost !px-2.5 !py-1 text-xs"
                    >
                        {playing ? '⏸ Tạm dừng' : '▶ Xem lại trận'}
                    </button>
                    <input
                        type="range"
                        min={0}
                        max={frames.length - 1}
                        value={tick}
                        onChange={(e) => {
                            setPlaying(false);
                            setTick(Number(e.target.value));
                        }}
                        className="h-1 flex-1 accent-cq-neon"
                    />
                    <span className="w-16 shrink-0 text-right font-mono text-[11px] text-cq-muted">
                        {tick + 1}/{frames.length}
                    </span>
                </div>
            )}

            {frame?.events?.length > 0 && (
                <p className="truncate border-t border-cq-line px-4 py-2 text-xs text-cq-muted">
                    ▸ {frame.events[frame.events.length - 1]}
                </p>
            )}
        </div>
    );
};

export default TowerStage;
