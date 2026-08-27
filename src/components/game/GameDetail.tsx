/**
 * @file src/components/game/GameDetail.tsx
 * @description Trang chọn màn của một game: danh sách màn kèm sao và trạng thái khoá.
 */
import React, { useEffect, useState } from 'react';
import { ApiError, cq, DIFFICULTY_LABEL, SUBJECT_LABEL, isLoggedIn, type CqGameDetail } from '@/lib/codequest';

interface Props {
    slug: string;
}

const GameDetail: React.FC<Props> = ({ slug }) => {
    const [game, setGame] = useState<CqGameDetail | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoggedIn()) {
            window.location.href = '/login';
            return;
        }
        cq.game(slug)
            .then(setGame)
            .catch((err) => setError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu game.'))
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <div className="mx-auto max-w-5xl space-y-3 px-4 py-10">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-cq-panel" />
                ))}
            </div>
        );
    }

    if (error || !game) {
        return (
            <div className="mx-auto max-w-xl px-4 py-16 text-center">
                <p className="text-4xl">😵</p>
                <h2 className="mt-3 text-xl font-bold text-cq-strong">Không mở được game</h2>
                <p className="mt-2 text-sm text-cq-muted">{error}</p>
                <a href="/hub" className="cq-btn-ghost mt-5">
                    ← Về bản đồ
                </a>
            </div>
        );
    }

    if (game.locked) {
        return (
            <div className="mx-auto max-w-xl px-4 py-16 text-center">
                <p className="text-5xl">🔒</p>
                <h2 className="mt-4 text-2xl font-bold text-cq-strong">{game.title} chưa mở khoá</h2>
                <p className="mt-2 text-sm text-cq-muted">{game.requirement}</p>
                <a href="/hub" className="cq-btn-primary mt-6">
                    Quay lại bản đồ để cày tiếp
                </a>
            </div>
        );
    }

    const nextLevel = game.levels.find((l) => !l.locked && l.status !== 'COMPLETED') ?? game.levels[0];

    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            {/* ── Giới thiệu game ─────────────────────────────────────────── */}
            <div className="cq-panel mb-6 overflow-hidden">
                <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
                    <div
                        className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl text-5xl"
                        style={{ backgroundColor: `${game.color}22` }}
                    >
                        {game.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-extrabold text-cq-strong">{game.title}</h1>
                        <p className="mt-1 text-sm text-cq-muted">{game.subtitle}</p>
                        <p className="mt-3 text-sm leading-relaxed text-cq-text/80">{game.description}</p>

                        <div className="mt-4 flex flex-wrap gap-1.5">
                            <span className="cq-chip">{SUBJECT_LABEL[game.subject] ?? game.subject}</span>
                            <span className="cq-chip">{DIFFICULTY_LABEL[game.difficulty]}</span>
                            {game.skills.map((s) => (
                                <span key={s} className="cq-chip">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="shrink-0 text-center sm:text-right">
                        <p className="text-3xl font-extrabold text-cq-gold">
                            {game.stars}
                            <span className="text-lg text-cq-muted">/{game.maxStars}</span>
                        </p>
                        <p className="text-xs text-cq-muted">sao đã đạt</p>

                        {nextLevel && !nextLevel.locked && (
                            <a
                                href={`/play/${game.slug}/${nextLevel.index}`}
                                className="cq-btn-primary mt-4 w-full sm:w-auto"
                            >
                                {game.levelsCompleted > 0 ? 'Chơi tiếp' : 'Bắt đầu'} →
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Danh sách màn ───────────────────────────────────────────── */}
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cq-muted">
                Các màn chơi ({game.levels.length})
            </h2>

            <ol className="space-y-3">
                {game.levels.map((level) => {
                    const done = level.status === 'COMPLETED';
                    const card = (
                        <div
                            className={`cq-panel flex items-center gap-4 p-4 transition-all ${
                                level.locked ? 'opacity-60' : 'hover:border-cq-neon/50'
                            }`}
                        >
                            <div
                                className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg font-mono text-base font-bold ${
                                    done
                                        ? 'bg-cq-lime/15 text-cq-lime'
                                        : level.locked
                                          ? 'bg-cq-raised text-cq-muted'
                                          : 'bg-cq-neon/15 text-cq-neon'
                                }`}
                            >
                                {level.locked ? '🔒' : done ? '✓' : level.index}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-cq-strong">
                                    Màn {level.index}: {level.title}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cq-muted">
                                    <span>{level.xpReward} XP</span>
                                    <span>{level.objectiveCount} mục tiêu</span>
                                    {level.hintCount > 0 && <span>{level.hintCount} gợi ý</span>}
                                    {level.attempts > 0 && <span>{level.attempts} lần thử</span>}
                                    {level.tags.slice(0, 3).map((t) => (
                                        <span key={t} className="rounded bg-cq-raised px-1.5 py-0.5 font-mono text-[10px]">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="shrink-0 text-right">
                                <p className="font-mono text-sm text-cq-gold">
                                    {'★'.repeat(level.stars)}
                                    <span className="text-cq-line">{'★'.repeat(3 - level.stars)}</span>
                                </p>
                                {!level.locked && (
                                    <p className="mt-0.5 text-xs font-semibold text-cq-neon">
                                        {done ? 'Chơi lại' : 'Vào màn'} →
                                    </p>
                                )}
                            </div>
                        </div>
                    );

                    return (
                        <li key={level.id}>
                            {level.locked ? (
                                <div title="Hoàn thành màn trước để mở khoá">{card}</div>
                            ) : (
                                <a href={`/play/${game.slug}/${level.index}`} className="block">
                                    {card}
                                </a>
                            )}
                        </li>
                    );
                })}
            </ol>

            <div className="mt-8">
                <a href="/hub" className="cq-btn-ghost">
                    ← Về bản đồ game
                </a>
            </div>
        </div>
    );
};

export default GameDetail;
