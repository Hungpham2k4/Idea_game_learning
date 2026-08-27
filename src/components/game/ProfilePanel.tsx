/**
 * @file src/components/game/ProfilePanel.tsx
 * @description Hồ sơ người chơi: chỉ số, tiến trình từng game, huy hiệu, lịch sử nộp bài.
 */
import React, { useEffect, useState } from 'react';
import { ApiError, cq, isLoggedIn, type CqUser } from '@/lib/codequest';

const ProfilePanel: React.FC = () => {
    const [user, setUser] = useState<CqUser | null>(null);
    const [progress, setProgress] = useState<any>(null);
    const [badges, setBadges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [editing, setEditing] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [classCode, setClassCode] = useState('');
    const [saveMsg, setSaveMsg] = useState('');

    useEffect(() => {
        if (!isLoggedIn()) {
            window.location.href = '/login';
            return;
        }
        Promise.all([cq.me(), cq.progress(), cq.badges()])
            .then(([u, p, b]) => {
                setUser(u);
                setProgress(p);
                setBadges(b);
                setDisplayName(u.displayName);
                setClassCode(u.classCode ?? '');
            })
            .catch((err) => setError(err instanceof ApiError ? err.message : 'Không tải được hồ sơ.'))
            .finally(() => setLoading(false));
    }, []);

    async function saveProfile() {
        try {
            const updated = await cq.updateProfile({ displayName, classCode });
            setUser((prev) => ({ ...(prev as CqUser), ...updated }));
            setEditing(false);
            setSaveMsg('Đã lưu thay đổi.');
            setTimeout(() => setSaveMsg(''), 2500);
        } catch (err) {
            setSaveMsg(err instanceof ApiError ? err.message : 'Lưu thất bại.');
        }
    }

    if (loading) {
        return (
            <div className="mx-auto max-w-4xl space-y-3 px-4 py-10">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-cq-panel" />
                ))}
            </div>
        );
    }

    if (error || !user) {
        return <p className="px-4 py-16 text-center text-sm text-cq-rose">{error}</p>;
    }

    const earned = badges.filter((b) => b.earned);
    const nextXp = user.xpForNextLevel;
    const percent = nextXp
        ? Math.min(100, Math.round(((user.xp - user.xpForCurrentLevel) / (nextXp - user.xpForCurrentLevel)) * 100))
        : 100;

    return (
        <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
            {/* ── Thẻ hồ sơ ───────────────────────────────────────────────── */}
            <section className="cq-panel p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-cq-neon/15 text-3xl font-extrabold text-cq-neon">
                        {user.level}
                    </div>

                    <div className="min-w-0 flex-1">
                        {editing ? (
                            <div className="space-y-2">
                                <input className="cq-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                                <input
                                    className="cq-input"
                                    value={classCode}
                                    onChange={(e) => setClassCode(e.target.value)}
                                    placeholder="Mã lớp (VD: SE1801)"
                                />
                                <div className="flex gap-2">
                                    <button onClick={saveProfile} className="cq-btn-primary !py-1.5 text-xs">
                                        Lưu
                                    </button>
                                    <button onClick={() => setEditing(false)} className="cq-btn-ghost !py-1.5 text-xs">
                                        Huỷ
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-xl font-extrabold text-cq-strong">{user.displayName}</h1>
                                <p className="text-sm text-cq-muted">
                                    @{user.username}
                                    {user.classCode ? ` · Lớp ${user.classCode}` : ''} · {user.title}
                                </p>

                                <div className="mt-3">
                                    <div className="mb-1 flex justify-between text-[11px] text-cq-muted">
                                        <span>Cấp {user.level}</span>
                                        <span>{nextXp ? `${user.xp}/${nextXp} XP` : `${user.xp} XP · cấp tối đa`}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-cq-raised">
                                        <div className="h-full rounded-full bg-cq-neon" style={{ width: `${percent}%` }} />
                                    </div>
                                </div>

                                <button onClick={() => setEditing(true)} className="mt-3 text-xs font-semibold text-cq-neon hover:underline">
                                    ✎ Sửa thông tin
                                </button>
                                {saveMsg && <span className="ml-3 text-xs text-cq-lime">{saveMsg}</span>}
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center sm:gap-5">
                        {[
                            { label: 'Sao', value: user.totalStars, tone: 'text-cq-gold' },
                            { label: 'Màn xong', value: user.stats?.completedLevels ?? 0, tone: 'text-cq-lime' },
                            { label: 'Chuỗi ngày', value: user.streakDays, tone: 'text-orange-400' },
                        ].map((s) => (
                            <div key={s.label}>
                                <p className={`text-2xl font-extrabold ${s.tone}`}>{s.value}</p>
                                <p className="text-[11px] text-cq-muted">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Tiến trình từng game ────────────────────────────────────── */}
            <section className="cq-panel">
                <div className="cq-panel-head">
                    <span>Tiến trình các game</span>
                </div>
                <div className="space-y-2 p-4">
                    {(progress?.games ?? []).map((g: any) => {
                        const pct = g.maxStars ? Math.round((g.stars / g.maxStars) * 100) : 0;
                        return (
                            <div key={g.slug} className="flex items-center gap-3">
                                <span className="w-6 text-center text-lg">{g.status === 'LOCKED' ? '🔒' : g.icon}</span>
                                <span className="w-40 shrink-0 truncate text-sm text-cq-text/90">{g.title}</span>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cq-raised">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                                </div>
                                <span className="w-24 shrink-0 text-right font-mono text-xs text-cq-muted">
                                    {g.levelsCompleted}/{g.totalLevels} · ★{g.stars}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── Huy hiệu ────────────────────────────────────────────────── */}
            <section className="cq-panel">
                <div className="cq-panel-head">
                    <span>Huy hiệu</span>
                    <span className="normal-case tracking-normal text-cq-muted">
                        {earned.length}/{badges.length}
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-5">
                    {badges.map((b) => (
                        <div
                            key={b.code}
                            title={b.description}
                            className={`rounded-lg border p-3 text-center ${
                                b.earned ? 'border-cq-gold/40 bg-cq-gold/5' : 'border-cq-line bg-cq-raised/40 opacity-50'
                            }`}
                        >
                            <p className={`text-2xl ${b.earned ? '' : 'grayscale'}`}>{b.icon}</p>
                            <p className="mt-1 text-[11px] font-semibold text-cq-strong">{b.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-[10px] text-cq-muted">{b.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Lịch sử gần đây ─────────────────────────────────────────── */}
            <section className="cq-panel">
                <div className="cq-panel-head">
                    <span>Bài nộp gần đây</span>
                </div>
                <div className="divide-y divide-cq-line">
                    {(progress?.recentSubmissions ?? []).map((s: any) => (
                        <a
                            key={s.id}
                            href={`/play/${s.gameSlug}/${s.levelIndex}`}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cq-raised/40"
                        >
                            <span className="text-lg">{s.gameIcon}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-cq-text/90">
                                    {s.game} — màn {s.levelIndex}: {s.levelTitle}
                                </span>
                                <span className="text-[11px] text-cq-muted">
                                    {new Date(s.createdAt).toLocaleString('vi-VN')}
                                </span>
                            </span>
                            <span className="font-mono text-xs text-cq-gold">{'★'.repeat(s.stars) || '—'}</span>
                            <span className={`text-xs ${s.ok ? 'text-cq-lime' : 'text-cq-rose'}`}>
                                {s.xpEarned > 0 ? `+${s.xpEarned} XP` : s.ok ? 'chạy được' : 'lỗi'}
                            </span>
                        </a>
                    ))}
                    {(progress?.recentSubmissions ?? []).length === 0 && (
                        <p className="p-6 text-center text-sm text-cq-muted">Chưa có bài nộp nào.</p>
                    )}
                </div>
            </section>
        </div>
    );
};

export default ProfilePanel;
