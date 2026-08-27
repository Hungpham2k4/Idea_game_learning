/**
 * @file src/components/game/Leaderboard.tsx
 * @description Bảng xếp hạng: toàn trường / theo lớp / theo từng game.
 */
import React, { useEffect, useState } from 'react';
import { ApiError, cq, type CqGame } from '@/lib/codequest';

type Scope = 'global' | 'class' | 'game';

const MEDALS = ['🥇', '🥈', '🥉'];

const Leaderboard: React.FC = () => {
    const [scope, setScope] = useState<Scope>('global');
    const [value, setValue] = useState('');
    const [rows, setRows] = useState<any[]>([]);
    const [me, setMe] = useState<any>(null);
    const [classes, setClasses] = useState<string[]>([]);
    const [games, setGames] = useState<CqGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([cq.classes().catch(() => []), cq.games().catch(() => [])]).then(([c, g]) => {
            setClasses(c);
            setGames(g);
        });
    }, []);

    useEffect(() => {
        setLoading(true);
        cq.leaderboard(scope, value, 50)
            .then((data) => {
                setRows(data.rows ?? []);
                setMe(data.me ?? null);
                setError('');
            })
            .catch((err) => setError(err instanceof ApiError ? err.message : 'Không tải được bảng xếp hạng.'))
            .finally(() => setLoading(false));
    }, [scope, value]);

    function switchScope(next: Scope) {
        setScope(next);
        setValue(next === 'class' ? (classes[0] ?? '') : next === 'game' ? (games.find((g) => !g.locked)?.slug ?? games[0]?.slug ?? '') : '');
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            {/* ── Bộ lọc ──────────────────────────────────────────────────── */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
                {(
                    [
                        ['global', '🌐 Toàn trường'],
                        ['class', '🏫 Theo lớp'],
                        ['game', '🎮 Theo game'],
                    ] as [Scope, string][]
                ).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => switchScope(key)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                            scope === key ? 'bg-cq-neon text-cq-onaccent' : 'bg-cq-raised text-cq-muted hover:text-cq-strong'
                        }`}
                    >
                        {label}
                    </button>
                ))}

                {scope === 'class' && (
                    <select value={value} onChange={(e) => setValue(e.target.value)} className="cq-input !w-auto">
                        {classes.length === 0 && <option value="">(chưa có lớp nào)</option>}
                        {classes.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                )}

                {scope === 'game' && (
                    <select value={value} onChange={(e) => setValue(e.target.value)} className="cq-input !w-auto">
                        {games.map((g) => (
                            <option key={g.slug} value={g.slug}>
                                {g.icon} {g.title}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* ── Bảng ────────────────────────────────────────────────────── */}
            <div className="cq-panel overflow-hidden">
                <div className="cq-panel-head">
                    <span>
                        {scope === 'global' ? 'Xếp hạng toàn trường' : scope === 'class' ? `Lớp ${value || '—'}` : `Game: ${value}`}
                    </span>
                    <span className="normal-case tracking-normal text-cq-muted">{rows.length} người chơi</span>
                </div>

                {loading ? (
                    <div className="space-y-2 p-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-10 animate-pulse rounded bg-cq-raised" />
                        ))}
                    </div>
                ) : error ? (
                    <p className="p-6 text-center text-sm text-cq-rose">{error}</p>
                ) : rows.length === 0 ? (
                    <p className="p-8 text-center text-sm text-cq-muted">
                        Chưa có ai trong bảng này. Hãy là người đầu tiên!
                    </p>
                ) : (
                    <>
                        {/* Bục ba người dẫn đầu. Một bảng dài toàn chữ thì ai
                            cũng như ai — tách top 3 ra mới thấy được phần thưởng
                            của việc dẫn đầu, và đó là thứ giữ người chơi quay lại. */}
                        {rows.length >= 3 && <Podium rows={rows.slice(0, 3)} />}

                        <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-cq-line text-left text-[11px] uppercase tracking-wider text-cq-muted">
                                <th className="px-4 py-2 font-semibold">#</th>
                                <th className="px-2 py-2 font-semibold">Người chơi</th>
                                <th className="hidden px-2 py-2 font-semibold sm:table-cell">Lớp</th>
                                <th className="px-2 py-2 text-right font-semibold">Cấp</th>
                                <th className="px-2 py-2 text-right font-semibold">Sao</th>
                                <th className="px-4 py-2 text-right font-semibold">XP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr
                                    key={r.userId}
                                    className={`animate-cq-rise border-b border-cq-line/50 transition-colors last:border-0 ${
                                        r.isMe
                                            ? 'bg-cq-neon/10 shadow-[inset_3px_0_0_rgb(var(--cq-neon))]'
                                            : 'hover:bg-cq-neon/5'
                                    }`}
                                    style={{ '--d': `${Math.min(i, 14) * 35}ms` } as React.CSSProperties}
                                >
                                    <td className="px-4 py-2.5 font-mono text-cq-muted">
                                        {r.rank <= 3 ? <span className="text-lg">{MEDALS[r.rank - 1]}</span> : r.rank}
                                    </td>
                                    <td className="px-2 py-2.5">
                                        <p className="font-semibold text-cq-strong">
                                            {r.displayName}
                                            {r.isMe && <span className="ml-1.5 text-[10px] text-cq-neon">(bạn)</span>}
                                        </p>
                                        <p className="text-[11px] text-cq-muted">{r.title}</p>
                                    </td>
                                    <td className="hidden px-2 py-2.5 font-mono text-xs text-cq-muted sm:table-cell">
                                        {r.classCode ?? '—'}
                                    </td>
                                    <td className="px-2 py-2.5 text-right font-mono text-cq-neon">{r.level}</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-cq-gold">★ {r.stars}</td>
                                    <td className="px-4 py-2.5 text-right">
                                        <span className="font-mono font-semibold text-cq-strong">{r.xp}</span>
                                        {/* Thanh so sánh với người dẫn đầu — thấy ngay mình
                                            cách top bao xa, con số trần trụi không nói lên điều đó */}
                                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-cq-line/60">
                                            <span
                                                className="block h-full rounded-full bg-cq-neon transition-all duration-700"
                                                style={{ width: `${Math.max(4, Math.round((r.xp / Math.max(1, rows[0]?.xp ?? 1)) * 100))}%` }}
                                            />
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        </table>
                    </>
                )}
            </div>

            {/* ── Thứ hạng của mình nếu ngoài top ─────────────────────────── */}
            {me && !rows.some((r) => r.isMe) && (
                <div className="cq-panel mt-3 flex items-center gap-4 border-cq-neon/40 px-4 py-3">
                    <span className="font-mono text-cq-muted">#{me.rank}</span>
                    <span className="flex-1 font-semibold text-cq-strong">{me.displayName} (bạn)</span>
                    <span className="font-mono text-cq-gold">★ {me.stars}</span>
                    <span className="font-mono text-cq-strong">{me.xp} XP</span>
                </div>
            )}
        </div>
    );
};

/** Ba người dẫn đầu, xếp theo bục: nhì – nhất – ba. */
const Podium: React.FC<{ rows: any[] }> = ({ rows }) => {
    const order = [rows[1], rows[0], rows[2]];
    const heights = ['pt-6', 'pt-0', 'pt-9'];
    const glow = ['rgb(148 163 184)', 'rgb(251 191 36)', 'rgb(180 120 60)'];

    return (
        <div className="grid grid-cols-3 gap-2 border-b border-cq-line p-4 sm:gap-4 sm:p-6">
            {order.map((r, i) => {
                if (!r) return <div key={i} />;
                const isFirst = i === 1;
                return (
                    <div
                        key={r.userId}
                        className={`animate-cq-rise ${heights[i]}`}
                        style={{ '--d': `${i * 120}ms` } as React.CSSProperties}
                    >
                        <div
                            className={`cq-glass relative flex flex-col items-center p-3 text-center sm:p-4 ${
                                isFirst ? 'cq-ring' : ''
                            } ${r.isMe ? 'ring-1 ring-cq-neon/50' : ''}`}
                        >
                            <span
                                className="grid h-11 w-11 place-items-center rounded-full text-xl sm:h-14 sm:w-14 sm:text-2xl"
                                style={{ backgroundColor: `${glow[i]}22`, boxShadow: `0 0 22px -6px ${glow[i]}` }}
                            >
                                {MEDALS[i === 1 ? 0 : i === 0 ? 1 : 2]}
                            </span>

                            <p className="mt-2 line-clamp-1 text-sm font-extrabold text-cq-strong sm:text-base">
                                {r.displayName}
                            </p>
                            <p className="line-clamp-1 text-[11px] text-cq-muted">{r.title}</p>

                            <p
                                className="mt-2 font-mono text-lg font-black tabular-nums sm:text-xl"
                                style={{ color: glow[i] }}
                            >
                                {r.xp}
                                <span className="ml-1 text-[10px] font-semibold text-cq-muted">XP</span>
                            </p>

                            <p className="mt-0.5 text-[11px] text-cq-gold">★ {r.stars}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Leaderboard;
