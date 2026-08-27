/**
 * @file src/components/game/stages/SqlStage.tsx
 * @description Sân khấu cho các game SQL — có hoạt ảnh.
 *
 * Thế giới game CHÍNH LÀ database, nên hoạt ảnh không được bịa: engine chụp ảnh
 * dữ liệu trước/sau mỗi câu lệnh rồi gửi về danh sách "khung hình". Component này
 * phát lại từng khung: khoá mục tiêu → tung đòn → thanh máu tụt → quái gục xuống.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface SqlEffect {
    kind: 'target' | 'damage' | 'heal' | 'change' | 'remove' | 'add';
    table: string;
    rowKey: string;
    label: string;
    column?: string;
    from?: any;
    to?: any;
    amount?: number;
    row?: Record<string, any>;
}

interface SqlFrame {
    index: number;
    command: string;
    sql: string;
    effects: SqlEffect[];
    narration: string[];
    database: { tables: TableData[] };
}

interface TableData {
    name: string;
    columns: { name: string; type?: string }[];
    rows: Record<string, any>[];
}

interface Props {
    state: any;
    config: any;
    frames?: SqlFrame[];
    onInsert?: (sql: string) => void;
}

/** Khoá nhận dạng dòng — phải trùng cách engine tính (src/engine/sql/frames.ts). */
function rowKeyOf(row: Record<string, any>): string {
    const idKey = Object.keys(row).find((k) => k.toLowerCase() === 'id');
    return idKey !== undefined ? `id:${String(row[idKey])}` : `raw:${JSON.stringify(row)}`;
}

const PHASE_MS = 900;

const SqlStage: React.FC<Props> = ({ state, config, frames = [], onInsert }) => {
    const scene = state?.scene ?? config?.scene ?? null;
    const initialTables: TableData[] = config?.database?.tables ?? [];

    // ── Bộ phát khung hình ──────────────────────────────────────────────────
    const [frameIndex, setFrameIndex] = useState(-1); // -1 = trạng thái ban đầu
    const [playing, setPlaying] = useState(false);
    const timer = useRef<number | null>(null);

    useEffect(() => {
        if (frames.length === 0) {
            setFrameIndex(-1);
            setPlaying(false);
            return;
        }
        setFrameIndex(-1);
        setPlaying(true);
    }, [frames]);

    useEffect(() => {
        if (!playing) return;
        if (frameIndex >= frames.length - 1) {
            setPlaying(false);
            return;
        }
        timer.current = window.setTimeout(() => setFrameIndex((i) => i + 1), PHASE_MS);
        return () => {
            if (timer.current) window.clearTimeout(timer.current);
        };
    }, [playing, frameIndex, frames.length]);

    const current = frameIndex >= 0 ? frames[frameIndex] : null;

    /** Dữ liệu đang hiển thị: theo khung đang phát, hoặc trạng thái cuối cùng. */
    const tables: TableData[] = useMemo(() => {
        if (current) return current.database.tables;
        if (frames.length > 0) return initialTables;
        return state?.database?.tables ?? initialTables;
    }, [current, frames.length, initialTables, state]);

    /** Hiệu ứng đang áp lên từng dòng ở khung hiện tại. */
    const effectByRow = useMemo(() => {
        const map = new Map<string, SqlEffect>();
        for (const e of current?.effects ?? []) map.set(`${e.table.toLowerCase()}::${e.rowKey}`, e);
        return map;
    }, [current]);

    /** Dòng vừa bị xoá ở khung này — vẫn vẽ ra để thấy nó gục xuống. */
    const removedRows = useMemo(
        () => (current?.effects ?? []).filter((e) => e.kind === 'remove'),
        [current],
    );

    const find = (name?: string) => tables.find((t) => t.name.toLowerCase() === String(name ?? '').toLowerCase());
    const [openTable, setOpenTable] = useState<string | null>(null);
    const shownTable = openTable ?? tables[0]?.name ?? null;

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
            {/* ── Sân khấu ─────────────────────────────────────────────────── */}
            {scene && (
                <div className="cq-panel overflow-hidden">
                    <div className="cq-panel-head">
                        <span>
                            {scene.type === 'arena'
                                ? '⚔️ Đấu trường'
                                : scene.type === 'kingdom'
                                  ? '👑 Vương quốc'
                                  : scene.type === 'restaurant'
                                    ? '🍜 Nhà hàng'
                                    : '🕵️ Hồ sơ vụ án'}
                        </span>
                        <span className="normal-case tracking-normal text-cq-muted">
                            {frames.length > 0
                                ? `Khung ${Math.max(0, frameIndex + 1)}/${frames.length}`
                                : 'Chờ lệnh của bạn'}
                        </span>
                    </div>

                    {/* Câu lệnh đang diễn ra */}
                    {current && (
                        <div className="animate-cq-pop border-b border-cq-line bg-cq-screen/60 px-4 py-2">
                            <p className="truncate font-mono text-[12px] text-cq-neon">❯ {current.sql}</p>
                        </div>
                    )}

                    {/* Chưa chạy lệnh nào — mời người chơi ra tay */}
                    {frames.length === 0 && (
                        <div className="animate-cq-breathe border-b border-cq-neon/30 bg-cq-neon/5 px-4 py-2">
                            <p className="text-center text-[12px] text-cq-neon">
                                ▶ Viết câu lệnh rồi nhấn <b>Chạy thử</b> (Ctrl+Enter) — trận đánh sẽ diễn ra ngay tại đây
                            </p>
                        </div>
                    )}

                    <div className="relative p-4">
                        {(scene.type === 'kingdom' || scene.type === 'arena') && (
                            <BattleScene
                                allies={find(scene.allyTable ?? scene.playerTable)}
                                enemies={find(scene.enemyTable)}
                                scene={scene}
                                effectByRow={effectByRow}
                                removedRows={removedRows}
                                command={current?.command}
                            />
                        )}

                        {scene.type === 'restaurant' && (
                            <RestaurantScene
                                orders={find(scene.orderTable)}
                                foods={find(scene.foodTable)}
                                effectByRow={effectByRow}
                            />
                        )}

                        {scene.type === 'detective' && (
                            <DetectiveScene
                                suspects={find(scene.suspectTable)}
                                caseName={scene.caseName}
                                effectByRow={effectByRow}
                            />
                        )}
                    </div>

                    {/* Lời tường thuật của khung đang phát */}
                    {current && current.narration.length > 0 && (
                        <div className="border-t border-cq-line bg-cq-raised/40 px-4 py-2">
                            {current.narration.slice(0, 4).map((line, i) => (
                                <p key={i} className="animate-cq-pop text-xs text-cq-text/90">
                                    {line}
                                </p>
                            ))}
                        </div>
                    )}

                    {/* Điều khiển phát lại */}
                    {frames.length > 0 && (
                        <div className="flex items-center gap-3 border-t border-cq-line px-4 py-2.5">
                            <button
                                type="button"
                                onClick={() => {
                                    if (frameIndex >= frames.length - 1) setFrameIndex(-1);
                                    setPlaying((p) => !p);
                                }}
                                className="cq-btn-ghost !px-2.5 !py-1 text-xs"
                            >
                                {playing ? '⏸ Tạm dừng' : '▶ Xem lại'}
                            </button>

                            <input
                                type="range"
                                min={-1}
                                max={frames.length - 1}
                                value={frameIndex}
                                onChange={(e) => {
                                    setPlaying(false);
                                    setFrameIndex(Number(e.target.value));
                                }}
                                className="h-1 flex-1 accent-cq-neon"
                            />

                            <span className="w-20 shrink-0 text-right font-mono text-[11px] text-cq-muted">
                                {frameIndex < 0 ? 'ban đầu' : `${frameIndex + 1}/${frames.length}`}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Trình duyệt lược đồ ──────────────────────────────────────── */}
            <div className="cq-panel flex min-h-0 flex-1 flex-col">
                <div className="cq-panel-head">
                    <span>Lược đồ dữ liệu</span>
                    <span className="normal-case tracking-normal text-cq-muted">{tables.length} bảng</span>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
                    {tables.map((table) => {
                        const open = shownTable === table.name;
                        return (
                            <div key={table.name} className="overflow-hidden rounded-lg border border-cq-line">
                                <button
                                    type="button"
                                    onClick={() => setOpenTable(open ? '' : table.name)}
                                    className="flex w-full items-center gap-2 bg-cq-raised px-3 py-2 text-left"
                                >
                                    <span className="text-cq-muted">{open ? '▾' : '▸'}</span>
                                    <span className="font-mono text-sm font-semibold text-cq-neon">{table.name}</span>
                                    <span className="text-[11px] text-cq-muted">{table.rows.length} dòng</span>
                                    {onInsert && (
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onInsert(`SELECT * FROM ${table.name};`);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.stopPropagation();
                                                    onInsert(`SELECT * FROM ${table.name};`);
                                                }
                                            }}
                                            className="ml-auto cursor-pointer rounded border border-cq-line px-1.5 py-0.5 text-[10px] text-cq-muted hover:border-cq-neon hover:text-cq-neon"
                                        >
                                            chèn SELECT
                                        </span>
                                    )}
                                </button>

                                {open && (
                                    <div className="overflow-x-auto bg-cq-panel/60">
                                        <table className="w-full border-collapse text-[12px]">
                                            <thead>
                                                <tr>
                                                    {table.columns.map((c) => (
                                                        <th
                                                            key={c.name}
                                                            className="border-b border-cq-line px-2.5 py-1.5 text-left font-mono font-semibold text-cq-muted"
                                                        >
                                                            {c.name}
                                                            {c.type && (
                                                                <span className="ml-1 text-[9px] uppercase text-slate-600">
                                                                    {c.type}
                                                                </span>
                                                            )}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {table.rows.slice(0, 8).map((row, ri) => {
                                                    const fx = effectByRow.get(
                                                        `${table.name.toLowerCase()}::${rowKeyOf(row)}`,
                                                    );
                                                    return (
                                                        <tr
                                                            key={ri}
                                                            className={
                                                                fx
                                                                    ? fx.kind === 'target'
                                                                        ? 'bg-cq-neon/15'
                                                                        : fx.kind === 'damage'
                                                                          ? 'bg-cq-rose/15'
                                                                          : fx.kind === 'heal'
                                                                            ? 'bg-cq-lime/15'
                                                                            : 'bg-cq-gold/10'
                                                                    : 'odd:bg-cq-raised/30'
                                                            }
                                                        >
                                                            {table.columns.map((c) => (
                                                                <td
                                                                    key={c.name}
                                                                    className="px-2.5 py-1 font-mono text-cq-text/85"
                                                                >
                                                                    {row[c.name] === null || row[c.name] === undefined ? (
                                                                        <span className="text-slate-600">NULL</span>
                                                                    ) : (
                                                                        String(row[c.name])
                                                                    )}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })}
                                                {table.rows.length > 8 && (
                                                    <tr>
                                                        <td
                                                            colSpan={table.columns.length}
                                                            className="px-2.5 py-1 text-center text-[11px] text-cq-muted"
                                                        >
                                                            … còn {table.rows.length - 8} dòng nữa
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ─── Cảnh chiến đấu ──────────────────────────────────────────────────────────

interface SceneProps {
    effectByRow: Map<string, SqlEffect>;
    removedRows?: SqlEffect[];
    command?: string;
}

/** Ảnh đại diện suy ra từ dữ liệu: lớp nhân vật hoặc tên quái. */
function avatarFor(row: Record<string, any>, side: 'ally' | 'enemy'): string {
    const text = `${row.class ?? ''} ${row.name ?? ''} ${row.type ?? ''}`.toLowerCase();

    if (side === 'ally') {
        if (text.includes('kiem')) return '🗡️';
        if (text.includes('cung')) return '🏹';
        if (text.includes('phap')) return '🔮';
        return '🛡️';
    }
    if (text.includes('goblin')) return '👺';
    if (text.includes('orc')) return '👹';
    if (text.includes('rong') || text.includes('dragon')) return '🐲';
    if (text.includes('doi') || text.includes('bat')) return '🦇';
    if (text.includes('skeleton')) return '💀';
    if (text.includes('golem')) return '🗿';
    if (text.includes('boss')) return '👿';
    return '👾';
}

const BattleScene: React.FC<
    SceneProps & { allies?: TableData; enemies?: TableData; scene: any }
> = ({ allies, enemies, scene, effectByRow, removedRows = [], command }) => {
    const hpCol = scene.hpColumn ?? 'hp';
    const nameCol = scene.nameColumn ?? 'name';
    const manaCol = scene.manaColumn;

    // Dòng vừa bị xoá vẫn được vẽ (mờ dần) để người chơi thấy nó gục
    const ghosts = removedRows.filter(
        (e) => e.table.toLowerCase() === String(scene.enemyTable ?? '').toLowerCase(),
    );

    const maxOf = (rows: Record<string, any>[]) =>
        Math.max(100, ...rows.map((r) => Number(r[hpCol]) || 0));

    // Có đòn đánh vào phe địch ở khung này không → bắn quả cầu phép
    const hasAttack = [...effectByRow.values()].some(
        (e) => e.kind === 'damage' && e.table.toLowerCase() === String(scene.enemyTable ?? '').toLowerCase(),
    );

    return (
        <div className="relative grid gap-4 sm:grid-cols-2">
            {/* Quả cầu phép bay ngang sân khấu khi có đòn đánh */}
            {hasAttack && (
                <div className="pointer-events-none absolute inset-0 z-20">
                    <span className="animate-cq-beam absolute top-1/2 text-3xl drop-shadow-[0_0_10px_rgba(251,146,60,0.9)]">
                        🔥
                    </span>
                </div>
            )}

            <UnitColumn
                title="Phe ta"
                accent="text-cq-lime"
                rows={allies?.rows ?? []}
                tableName={allies?.name ?? ''}
                nameCol={nameCol}
                hpCol={hpCol}
                manaCol={manaCol}
                max={maxOf(allies?.rows ?? [])}
                barClass="bg-cq-lime"
                side="ally"
                effectByRow={effectByRow}
            />

            <UnitColumn
                title="Phe địch"
                accent="text-cq-rose"
                rows={enemies?.rows ?? []}
                tableName={enemies?.name ?? ''}
                nameCol={nameCol}
                hpCol={hpCol}
                max={maxOf(enemies?.rows ?? [])}
                barClass="bg-cq-rose"
                side="enemy"
                effectByRow={effectByRow}
                ghosts={ghosts}
            />
        </div>
    );
};

const UnitColumn: React.FC<{
    title: string;
    accent: string;
    rows: Record<string, any>[];
    tableName: string;
    nameCol: string;
    hpCol: string;
    manaCol?: string;
    max: number;
    barClass: string;
    /** Quyet dinh bo avatar: phe ta hay phe dich */
    side: 'ally' | 'enemy';
    effectByRow: Map<string, SqlEffect>;
    ghosts?: SqlEffect[];
}> = ({ title, accent, rows, tableName, nameCol, hpCol, manaCol, max, barClass, side, effectByRow, ghosts = [] }) => (
    <div>
        <p className={`mb-2 text-xs font-bold uppercase tracking-wider ${accent}`}>{title}</p>

        <div className="space-y-2">
            {rows.length === 0 && ghosts.length === 0 && (
                <p className="rounded-lg border border-dashed border-cq-line px-3 py-4 text-center text-xs text-cq-muted">
                    Không còn ai
                </p>
            )}

            {rows.map((row, i) => {
                const fx = effectByRow.get(`${tableName.toLowerCase()}::${rowKeyOf(row)}`);
                const hp = Number(row[hpCol]) || 0;
                const percent = Math.max(0, Math.min(100, (hp / max) * 100));

                const hit = fx?.kind === 'damage';
                const healed = fx?.kind === 'heal';
                const locked = fx?.kind === 'target';
                const spent = fx?.kind === 'change';

                // Máu càng thấp thanh càng đỏ — nhìn phát biết ai sắp gục
                const healthTone =
                    percent > 50 ? barClass : percent > 25 ? 'bg-amber-400' : 'bg-cq-rose';

                const avatar = avatarFor(row, side);

                return (
                    <div
                        key={i}
                        className={`relative overflow-hidden rounded-lg border px-3 py-2 transition-all duration-300 ${
                            hit
                                ? 'animate-cq-shake border-cq-rose bg-cq-rose/20'
                                : healed
                                  ? 'border-cq-lime bg-cq-lime/15'
                                  : locked
                                    ? 'animate-cq-glow border-cq-neon bg-cq-neon/10'
                                    : spent
                                      ? 'border-cq-neon/50 bg-cq-neon/5'
                                      : 'border-cq-line bg-cq-raised/60'
                        }`}
                    >
                        {/* Vòng xung kích tại điểm trúng đòn */}
                        {hit && (
                            <span className="animate-cq-impact pointer-events-none absolute right-6 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-2 border-cq-rose" />
                        )}

                        {/* Số sát thương / hồi máu bay lên */}
                        {(hit || healed) && (
                            <span
                                className={`animate-cq-float-up pointer-events-none absolute -top-1 right-3 z-10 font-mono text-lg font-black ${
                                    hit ? 'text-cq-rose' : 'text-cq-lime'
                                }`}
                            >
                                {hit ? '-' : '+'}
                                {fx?.amount}
                            </span>
                        )}

                        {locked && (
                            <span className="pointer-events-none absolute -left-1 -top-2 z-10 text-sm">🎯</span>
                        )}

                        <div className="flex items-center gap-2">
                            {/* Avatar thở nhẹ khi đứng chờ, nảy lên khi trúng đòn */}
                            <span
                                className={`shrink-0 text-xl ${hit ? 'animate-cq-pop' : 'animate-cq-bob'}`}
                                style={{ animationDelay: `${i * 0.25}s` }}
                            >
                                {avatar}
                            </span>

                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-cq-strong">
                                {String(row[nameCol] ?? '—')}
                            </span>

                            <span className="shrink-0 font-mono text-xs text-cq-muted">
                                {hp} HP
                                {manaCol && row[manaCol] !== undefined ? ` · ${row[manaCol]} MP` : ''}
                            </span>
                        </div>

                        <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-cq-screen">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${healthTone}`}
                                style={{ width: `${percent}%` }}
                            />
                            {/* Vệt sáng chạy dọc thanh máu cho đỡ chết cứng */}
                            <span className="animate-cq-shimmer pointer-events-none absolute inset-y-0 w-8 bg-white/20 blur-[2px]" />
                        </div>
                    </div>
                );
            })}

            {/* Nhân vật vừa bị loại — vẽ mờ để thấy khoảnh khắc gục ngã */}
            {ghosts.map((g) => (
                <div
                    key={g.rowKey}
                    className="animate-cq-fade-out rounded-lg border border-cq-rose/40 bg-cq-rose/5 px-3 py-2"
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-cq-rose/80 line-through">
                            ☠️ {g.label}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-cq-rose/70">bị loại</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// ─── Cảnh nhà hàng ───────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
    PAID: 'border-emerald-400/40 text-emerald-300',
    PENDING: 'border-amber-400/40 text-amber-300',
    CANCELLED: 'border-rose-400/40 text-rose-300',
};

const RestaurantScene: React.FC<SceneProps & { orders?: TableData; foods?: TableData }> = ({
    orders,
    foods,
    effectByRow,
}) => (
    <div className="grid gap-4 sm:grid-cols-2">
        <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-cq-neon">Đơn hàng</p>
            <div className="flex flex-wrap gap-2">
                {(orders?.rows ?? []).map((o, i) => {
                    const fx = effectByRow.get(`${(orders?.name ?? '').toLowerCase()}::${rowKeyOf(o)}`);
                    return (
                        <div
                            key={i}
                            className={`rounded-lg border bg-cq-raised/60 px-3 py-2 text-xs transition-all duration-300 ${
                                fx ? 'animate-cq-glow border-cq-neon text-cq-strong' : STATUS_STYLE[String(o.status)] ?? 'border-cq-line text-cq-muted'
                            }`}
                        >
                            <p className="font-semibold">
                                {fx?.kind === 'target' && '🎯 '}#{String(o.id)} · Bàn {String(o.table_no ?? '?')}
                            </p>
                            <p className="font-mono text-[11px]">{String(o.status)}</p>
                        </div>
                    );
                })}
            </div>
        </div>

        <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-cq-gold">Thực đơn</p>
            <ul className="space-y-1 text-xs">
                {(foods?.rows ?? []).slice(0, 8).map((f, i) => {
                    const fx = effectByRow.get(`${(foods?.name ?? '').toLowerCase()}::${rowKeyOf(f)}`);
                    return (
                        <li
                            key={i}
                            className={`flex justify-between gap-2 border-b border-cq-line/60 py-1 transition-colors ${
                                fx ? 'rounded bg-cq-neon/10 px-1 text-cq-strong' : 'text-cq-text/85'
                            }`}
                        >
                            <span className="truncate">
                                {fx?.kind === 'target' ? '🎯' : '🍽️'} {String(f.name)}
                            </span>
                            <span className="shrink-0 font-mono text-cq-muted">
                                {Number(f.price).toLocaleString('vi-VN')} đ
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    </div>
);

// ─── Cảnh phá án ─────────────────────────────────────────────────────────────

const DetectiveScene: React.FC<SceneProps & { suspects?: TableData; caseName?: string }> = ({
    suspects,
    caseName,
    effectByRow,
}) => {
    const rows = suspects?.rows ?? [];
    const anyTargeted = rows.some((s) =>
        effectByRow.has(`${(suspects?.name ?? '').toLowerCase()}::${rowKeyOf(s)}`),
    );

    return (
        <div>
            <p className="mb-3 text-xs text-cq-muted">
                🗂️ <span className="font-semibold text-cq-strong">{caseName ?? 'Hồ sơ vụ án'}</span>
                {anyTargeted && <span className="ml-2 text-cq-neon">— truy vấn đã thu hẹp diện nghi vấn</span>}
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {rows.map((s, i) => {
                    const fx = effectByRow.get(`${(suspects?.name ?? '').toLowerCase()}::${rowKeyOf(s)}`);
                    const targeted = fx?.kind === 'target';
                    return (
                        <div
                            key={i}
                            className={`rounded-lg border p-2.5 text-center transition-all duration-500 ${
                                targeted
                                    ? 'animate-cq-glow border-cq-rose bg-cq-rose/10'
                                    : anyTargeted
                                      ? 'border-cq-line bg-cq-raised/40 opacity-35 grayscale'
                                      : 'border-cq-line bg-cq-raised/60'
                            }`}
                        >
                            <p className="text-2xl">{targeted ? '🚨' : '🕴️'}</p>
                            <p className="mt-1 truncate text-xs font-semibold text-cq-strong">{String(s.name)}</p>
                            <p className="truncate text-[10px] text-cq-muted">{String(s.job ?? '')}</p>
                            {s.access_level !== undefined && (
                                <p className="mt-1 font-mono text-[10px] text-cq-gold">
                                    quyền {String(s.access_level)}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SqlStage;
