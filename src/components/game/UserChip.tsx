/**
 * @file src/components/game/UserChip.tsx
 * @description Thẻ người chơi trên header: cấp độ, XP, sao, chuỗi ngày và nút đăng xuất.
 */
import React, { useEffect, useState } from 'react';
import { cq, getCachedUser, isLoggedIn, type CqUser } from '@/lib/codequest';

const UserChip: React.FC = () => {
    const [user, setUser] = useState<CqUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        let alive = true;

        // Hiện ngay dữ liệu đã cache để tránh nhấp nháy, rồi làm mới từ server
        const cached = getCachedUser();
        if (cached) setUser(cached);

        if (!isLoggedIn()) {
            setLoading(false);
            return;
        }

        cq.me()
            .then((fresh) => {
                if (alive) setUser(fresh);
            })
            .catch(() => {
                if (alive) setUser(null);
            })
            .finally(() => {
                if (alive) setLoading(false);
            });

        return () => {
            alive = false;
        };
    }, []);

    if (loading && !user) {
        return <div className="h-8 w-28 animate-pulse rounded-lg bg-cq-raised" />;
    }

    if (!user) {
        return (
            <div className="flex items-center gap-2">
                <a href="/login" className="cq-btn-ghost !px-3 !py-1.5 text-xs">
                    Đăng nhập
                </a>
                <a href="/register" className="cq-btn-primary !px-3 !py-1.5 text-xs">
                    Tạo tài khoản
                </a>
            </div>
        );
    }

    const nextXp = user.xpForNextLevel;
    const progress = nextXp
        ? Math.min(100, Math.round(((user.xp - user.xpForCurrentLevel) / (nextXp - user.xpForCurrentLevel)) * 100))
        : 100;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-3 rounded-lg border border-cq-line bg-cq-panel px-2.5 py-1.5 text-left transition-colors hover:border-cq-neon/60"
            >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-cq-neon/15 text-xs font-bold text-cq-neon">
                    {user.level}
                </span>

                <span className="hidden leading-tight sm:block">
                    <span className="block max-w-[9rem] truncate text-xs font-semibold text-cq-strong">
                        {user.displayName}
                    </span>
                    <span className="block text-[10px] text-cq-muted">{user.title}</span>
                </span>

                <span className="hidden items-center gap-2 border-l border-cq-line pl-3 text-[11px] md:flex">
                    <span className="text-cq-gold">★ {user.totalStars}</span>
                    <span className="text-cq-neon">{user.xp} XP</span>
                    {user.streakDays > 1 && <span className="text-orange-400">🔥 {user.streakDays}</span>}
                </span>
            </button>

            {open && (
                <div className="animate-cq-pop absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-cq-line bg-cq-panel shadow-xl">
                    <div className="border-b border-cq-line p-3">
                        <p className="truncate text-sm font-semibold text-cq-strong">{user.displayName}</p>
                        <p className="truncate text-xs text-cq-muted">
                            @{user.username}
                            {user.classCode ? ` · ${user.classCode}` : ''}
                        </p>

                        <div className="mt-3">
                            <div className="mb-1 flex justify-between text-[11px] text-cq-muted">
                                <span>Cấp {user.level}</span>
                                <span>{nextXp ? `${user.xp}/${nextXp} XP` : 'Cấp tối đa'}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-cq-raised">
                                <div className="h-full rounded-full bg-cq-neon" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    </div>

                    <nav className="p-1.5 text-sm">
                        <a href="/profile" className="block rounded-lg px-3 py-2 text-cq-muted hover:bg-cq-raised hover:text-cq-strong">
                            🎓 Hồ sơ & huy hiệu
                        </a>
                        <a href="/hub" className="block rounded-lg px-3 py-2 text-cq-muted hover:bg-cq-raised hover:text-cq-strong">
                            🗺️ Bản đồ game
                        </a>
                        {(user.role === 'ADMIN' || user.role === 'TEACHER') && (
                            <a href="/admin" className="block rounded-lg px-3 py-2 text-cq-muted hover:bg-cq-raised hover:text-cq-strong">
                                ⚙️ Khu vực quản trị
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={async () => {
                                await cq.logout();
                                window.location.href = '/';
                            }}
                            className="block w-full rounded-lg px-3 py-2 text-left text-cq-rose hover:bg-cq-raised"
                        >
                            ⏻ Đăng xuất
                        </button>
                    </nav>
                </div>
            )}
        </div>
    );
};

export default UserChip;
