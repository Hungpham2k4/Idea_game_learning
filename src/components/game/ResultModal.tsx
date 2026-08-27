/**
 * @file src/components/game/ResultModal.tsx
 * @description Hộp thoại kết quả sau khi nộp bài: sao, XP, huy hiệu, game vừa mở khoá.
 */
import React, { useEffect, useState } from 'react';
import type { CqSubmitResponse } from '@/lib/codequest';

interface Props {
    data: CqSubmitResponse;
    gameSlug: string;
    onReplay: () => void;
    onClose: () => void;
}

const ResultModal: React.FC<Props> = ({ data, gameSlug, onReplay, onClose }) => {
    const [shown, setShown] = useState(0);
    const passed = data.result.completed;

    // Hiệu ứng sao hiện dần
    useEffect(() => {
        if (!passed) return;
        setShown(0);
        const timers = Array.from({ length: data.scoring.stars }, (_, i) =>
            window.setTimeout(() => setShown(i + 1), 220 * (i + 1)),
        );
        return () => timers.forEach((t) => window.clearTimeout(t));
    }, [passed, data.scoring.stars]);

    const undone = data.result.objectives.filter((o) => !o.done && !o.optional);

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-cq-screen/80 p-4 backdrop-blur-sm">
            <div className="animate-cq-pop w-full max-w-lg overflow-hidden rounded-2xl border border-cq-line bg-cq-panel shadow-2xl">
                {/* ── Đầu hộp thoại ────────────────────────────────────────── */}
                <div
                    className={`px-6 py-5 text-center ${
                        passed ? 'bg-gradient-to-b from-cq-lime/15 to-transparent' : 'bg-gradient-to-b from-cq-rose/15 to-transparent'
                    }`}
                >
                    <p className="text-5xl">{passed ? '🎉' : '💪'}</p>
                    <h2 className="mt-2 text-2xl font-extrabold text-cq-strong">
                        {passed ? (data.scoring.alreadyCompleted ? 'Qua màn lần nữa!' : 'Hoàn thành màn chơi!') : 'Chưa qua màn'}
                    </h2>

                    {passed ? (
                        <p className="mt-4 text-4xl tracking-[0.2em]">
                            {[0, 1, 2].map((i) => (
                                <span key={i} className={i < shown ? 'text-cq-gold' : 'text-cq-line'}>
                                    ★
                                </span>
                            ))}
                        </p>
                    ) : (
                        <p className="mt-2 text-sm text-cq-muted">
                            {undone.length > 0
                                ? `Còn ${undone.length} mục tiêu chưa đạt — xem lại bảng nhiệm vụ bên trái.`
                                : 'Kiểm tra lại lỗi trong console rồi thử tiếp nhé.'}
                        </p>
                    )}
                </div>

                {/* ── Nội dung ─────────────────────────────────────────────── */}
                <div className="space-y-4 px-6 pb-6">
                    {passed && (
                        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-cq-line bg-cq-line">
                            <div className="bg-cq-raised px-3 py-2.5 text-center">
                                <p className="text-[11px] uppercase tracking-wider text-cq-muted">Điểm</p>
                                <p className="text-lg font-bold text-cq-strong">{data.scoring.score}</p>
                            </div>
                            <div className="bg-cq-raised px-3 py-2.5 text-center">
                                <p className="text-[11px] uppercase tracking-wider text-cq-muted">Kinh nghiệm</p>
                                <p className="text-lg font-bold text-cq-neon">+{data.scoring.xpEarned}</p>
                            </div>
                            <div className="bg-cq-raised px-3 py-2.5 text-center">
                                <p className="text-[11px] uppercase tracking-wider text-cq-muted">Số lệnh</p>
                                <p className="text-lg font-bold text-cq-strong">{data.result.metrics.commands ?? 0}</p>
                            </div>
                        </div>
                    )}

                    {undone.length > 0 && (
                        <ul className="space-y-1 rounded-lg border border-cq-rose/30 bg-cq-rose/5 p-3 text-sm">
                            {undone.map((o) => (
                                <li key={o.id} className="text-cq-muted">
                                    <span className="text-cq-rose">✗</span> {o.label}
                                    {o.detail && <span className="text-cq-muted/70"> — {o.detail}</span>}
                                </li>
                            ))}
                        </ul>
                    )}

                    {data.scoring.notes.length > 0 && (
                        <ul className="space-y-1 text-sm text-cq-muted">
                            {data.scoring.notes.map((n, i) => (
                                <li key={i}>💡 {n}</li>
                            ))}
                        </ul>
                    )}

                    {data.rewards.badges.length > 0 && (
                        <div className="rounded-xl border border-cq-gold/40 bg-cq-gold/5 p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-cq-gold">Huy hiệu mới</p>
                            <div className="space-y-1.5">
                                {data.rewards.badges.map((b) => (
                                    <p key={b.code} className="text-sm text-cq-strong">
                                        <span className="mr-1 text-lg">{b.icon}</span>
                                        <span className="font-semibold">{b.title}</span>
                                        <span className="text-cq-muted"> — {b.description}</span>
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {data.rewards.newlyUnlockedGames.length > 0 && (
                        <div className="rounded-xl border border-cq-neon/40 bg-cq-neon/5 p-3">
                            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-cq-neon">Game vừa mở khoá</p>
                            <p className="text-sm text-cq-strong">
                                🔓 {data.rewards.newlyUnlockedGames.join(', ')}
                            </p>
                            <a href="/hub" className="mt-2 inline-block text-sm font-semibold text-cq-neon hover:underline">
                                Xem trên bản đồ →
                            </a>
                        </div>
                    )}

                    {data.progress.gameCompleted && (
                        <p className="rounded-xl border border-cq-lime/40 bg-cq-lime/5 p-3 text-center text-sm font-semibold text-cq-lime">
                            🏆 Bạn vừa phá đảo toàn bộ game này!
                        </p>
                    )}

                    {/* ── Nút hành động ────────────────────────────────────── */}
                    <div className="flex flex-wrap gap-2 pt-1">
                        {passed && data.nextLevel ? (
                            <a href={`/play/${gameSlug}/${data.nextLevel.index}`} className="cq-btn-primary flex-1">
                                Màn tiếp theo: {data.nextLevel.title} →
                            </a>
                        ) : passed ? (
                            <a href={`/games/${gameSlug}`} className="cq-btn-primary flex-1">
                                Về danh sách màn
                            </a>
                        ) : (
                            <button type="button" onClick={onClose} className="cq-btn-primary flex-1">
                                Thử lại
                            </button>
                        )}

                        <button type="button" onClick={onReplay} className="cq-btn-ghost">
                            {passed ? 'Chơi lại màn này' : 'Xem lại code'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultModal;
