/**
 * @file src/components/game/GameHub.tsx
 * @description Bản đồ game: hiển thị 10 game theo chuỗi mở khoá.
 *              Game bị khoá vẫn thấy được điều kiện cần đạt (để có động lực).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
    ApiError,
    cq,
    DIFFICULTY_LABEL,
    ENGINE_LABEL,
    SUBJECT_LABEL,
    isLoggedIn,
    type CqGame,
} from '@/lib/codequest';

const DIFFICULTY_STYLE: Record<string, string> = {
    EASY: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
    MEDIUM: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
    HARD: 'text-rose-300 border-rose-400/30 bg-rose-400/10',
};

const GameHub: React.FC = () => {
    const [games, setGames] = useState<CqGame[]>([]);
    const [progress, setProgress] = useState<any>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [subject, setSubject] = useState<string>('ALL');

    useEffect(() => {
        if (!isLoggedIn()) {
            window.location.href = '/login';
            return;
        }

        Promise.all([cq.games(), cq.progress()])
            .then(([g, p]) => {
                setGames(g);
                setProgress(p);
            })
            .catch((err) => {
                setError(
                    err instanceof ApiError
                        ? err.message
                        : 'Không kết nối được máy chủ CodeQuest. Backend đã chạy chưa?',
                );
            })
            .finally(() => setLoading(false));
    }, []);

    const subjects = useMemo(() => {
        const set = new Set(games.map((g) => g.subject));
        return ['ALL', ...Array.from(set)];
    }, [games]);

    const visible = subject === 'ALL' ? games : games.filter((g) => g.subject === subject);

    const totals = useMemo(() => {
        const unlocked = games.filter((g) => !g.locked).length;
        const stars = games.reduce((s, g) => s + g.stars, 0);
        const maxStars = games.reduce((s, g) => s + g.maxStars, 0);
        const done = games.filter((g) => g.status === 'COMPLETED').length;
        return { unlocked, stars, maxStars, done };
    }, [games]);

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-10">
                <div className="grid gap-4 md:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-40 animate-pulse rounded-xl bg-cq-panel" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-16 text-center">
                <p className="text-4xl">🔌</p>
                <h2 className="mt-3 text-xl font-bold text-cq-strong">Mất kết nối tới máy chủ</h2>
                <p className="mt-2 text-sm text-cq-muted">{error}</p>
                <pre className="cq-terminal mt-4 text-left text-cq-muted">cd server{'\n'}npm run dev</pre>
            </div>
        );
    }

    const player = progress?.player;

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            {/* ── Tóm tắt hành trình ─────────────────────────────────────── */}
            <section className="cq-panel mb-8 overflow-hidden">
                <div className="grid gap-px bg-cq-line sm:grid-cols-4">
                    {[
                        { label: 'Cấp độ', value: player ? `${player.level}` : '—', sub: player?.title ?? '', tone: 'text-cq-neon' },
                        { label: 'Kinh nghiệm', value: `${player?.xp ?? 0} XP`, sub: player?.xpForNextLevel ? `Cấp sau: ${player.xpForNextLevel} XP` : 'Tối đa', tone: 'text-cq-strong' },
                        { label: 'Sao thu thập', value: `${totals.stars}/${totals.maxStars}`, sub: `${totals.done} game hoàn thành`, tone: 'text-cq-gold' },
                        { label: 'Game đã mở', value: `${totals.unlocked}/${games.length}`, sub: player?.streakDays ? `🔥 ${player.streakDays} ngày liên tiếp` : 'Chơi mỗi ngày để giữ chuỗi', tone: 'text-cq-lime' },
                    ].map((card) => (
                        <div key={card.label} className="bg-cq-panel px-4 py-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-cq-muted">{card.label}</p>
                            <p className={`mt-1 text-2xl font-extrabold ${card.tone}`}>{card.value}</p>
                            <p className="mt-0.5 truncate text-xs text-cq-muted">{card.sub}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Bộ lọc theo môn ────────────────────────────────────────── */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-cq-muted">Môn học</span>
                {subjects.map((s) => (
                    <button
                        key={s}
                        onClick={() => setSubject(s)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            subject === s
                                ? 'border-cq-neon bg-cq-neon/15 text-cq-neon'
                                : 'border-cq-line bg-cq-raised text-cq-muted hover:text-cq-strong'
                        }`}
                    >
                        {s === 'ALL' ? 'Tất cả' : (SUBJECT_LABEL[s] ?? s)}
                    </button>
                ))}
            </div>

            {/* ── Danh sách game ─────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2">
                {visible.map((game, i) => (
                    <GameCard key={game.slug} game={game} order={i + 1} />
                ))}
            </div>
        </div>
    );
};

const GameCard: React.FC<{ game: CqGame; order: number }> = ({ game, order }) => {
    const percent = game.maxStars > 0 ? Math.round((game.stars / game.maxStars) * 100) : 0;
    const unlockPercent = game.unlockProgress
        ? Math.min(100, Math.round((game.unlockProgress.current / Math.max(1, game.unlockProgress.target)) * 100))
        : 0;

    const body = (
        <article
            className={`cq-panel group relative h-full overflow-hidden p-5 transition-all duration-200 ${
                game.locked ? 'opacity-70' : 'hover:-translate-y-0.5 hover:border-cq-neon/50'
            }`}
            style={!game.locked ? { boxShadow: `inset 3px 0 0 ${game.color}` } : undefined}
        >
            <div className="flex items-start gap-4">
                <div
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-3xl"
                    style={{ backgroundColor: `${game.color}22`, filter: game.locked ? 'grayscale(1)' : undefined }}
                >
                    {game.locked ? '🔒' : game.icon}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-cq-muted">#{String(order).padStart(2, '0')}</span>
                        <h3 className="truncate text-base font-bold text-cq-strong">{game.title}</h3>
                        {game.status === 'COMPLETED' && (
                            <span className="cq-chip !border-cq-lime/40 !text-cq-lime">Đã phá đảo</span>
                        )}
                    </div>

                    <p className="mt-0.5 line-clamp-2 text-sm text-cq-muted">{game.subtitle}</p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="cq-chip">{SUBJECT_LABEL[game.subject] ?? game.subject}</span>
                        <span className={`cq-chip !border ${DIFFICULTY_STYLE[game.difficulty] ?? ''}`}>
                            {DIFFICULTY_LABEL[game.difficulty] ?? game.difficulty}
                        </span>
                        <span className="cq-chip">{ENGINE_LABEL[game.engine] ?? game.engine}</span>
                        <span className="cq-chip">{game.totalLevels} màn</span>
                    </div>
                </div>
            </div>

            {game.locked ? (
                <div className="mt-4 rounded-lg border border-dashed border-cq-line bg-cq-raised/60 px-3 py-2.5">
                    <p className="text-xs font-semibold text-cq-muted">
                        🔒 Điều kiện mở khoá: <span className="text-cq-strong">{game.requirement}</span>
                    </p>
                    {game.unlockProgress && (
                        <>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cq-bg">
                                <div className="h-full rounded-full bg-cq-gold" style={{ width: `${unlockPercent}%` }} />
                            </div>
                            <p className="mt-1 text-[11px] text-cq-muted">
                                Tiến độ: {game.unlockProgress.current}/{game.unlockProgress.target}
                            </p>
                        </>
                    )}
                </div>
            ) : (
                <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-cq-muted">
                            {game.levelsCompleted}/{game.totalLevels} màn hoàn thành
                        </span>
                        <span className="font-semibold text-cq-gold">
                            ★ {game.stars}/{game.maxStars}
                        </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-cq-raised">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${percent}%`, backgroundColor: game.color }}
                        />
                    </div>

                    <p className="mt-3 text-sm font-semibold text-cq-neon opacity-0 transition-opacity group-hover:opacity-100">
                        {game.levelsCompleted > 0 ? 'Chơi tiếp →' : 'Bắt đầu →'}
                    </p>
                </div>
            )}
        </article>
    );

    if (game.locked) return body;

    return (
        <a href={`/games/${game.slug}`} className="block">
            {body}
        </a>
    );
};

export default GameHub;
