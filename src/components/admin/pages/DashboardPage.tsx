/**
 * @file src/components/admin/pages/DashboardPage.tsx
 * @description Tổng quan hệ thống cho giảng viên: số liệu chung + bài nộp mới nhất.
 */
import React, { useEffect, useState } from 'react';
import { ApiError, cq } from '@/lib/codequest';

const DashboardPage: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        cq.admin
            .stats()
            .then(setStats)
            .catch((err) =>
                setError(
                    err instanceof ApiError
                        ? err.message
                        : 'Không tải được số liệu. Kiểm tra backend và quyền truy cập.',
                ),
            );
    }, []);

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                {error}
                <p className="mt-2 text-red-600">
                    Chỉ tài khoản TEACHER hoặc ADMIN mới vào được khu vực này.
                </p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
                ))}
            </div>
        );
    }

    const cards = [
        { label: 'Người dùng', value: stats.totals.users, color: 'from-blue-500 to-blue-600' },
        { label: 'Game', value: stats.totals.games, color: 'from-violet-500 to-violet-600' },
        { label: 'Màn chơi', value: stats.totals.levels, color: 'from-emerald-500 to-emerald-600' },
        { label: 'Lượt nộp bài', value: stats.totals.submissions, color: 'from-amber-500 to-amber-600' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Bảng điều khiển</h1>
                <p className="mt-1 text-sm text-slate-500">
                    {stats.totals.completedLevels} lượt hoàn thành màn · tỉ lệ bài chạy không lỗi {stats.totals.okRate}%
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((c) => (
                    <div key={c.label} className={`rounded-xl bg-gradient-to-br p-5 text-white shadow-sm ${c.color}`}>
                        <p className="text-sm font-medium opacity-90">{c.label}</p>
                        <p className="mt-1 text-3xl font-bold">{c.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Mức độ tham gia theo game ───────────────────────────────── */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
                    Mức độ tham gia theo game
                </h2>
                <div className="space-y-2.5">
                    {stats.perGame
                        .slice()
                        .sort((a: any, b: any) => b.players - a.players)
                        .map((g: any) => {
                            const max = Math.max(1, ...stats.perGame.map((x: any) => x.players));
                            return (
                                <div key={g.gameId} className="flex items-center gap-3">
                                    <span className="w-44 shrink-0 truncate text-sm text-slate-700">{g.title}</span>
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-primary-500"
                                            style={{ width: `${(g.players / max) * 100}%` }}
                                        />
                                    </div>
                                    <span className="w-28 shrink-0 text-right text-xs text-slate-500">
                                        {g.players} người · ★{g.stars}
                                    </span>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* ── Bài nộp gần đây ─────────────────────────────────────────── */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-3">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Bài nộp gần đây</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-5 py-2 font-semibold">Sinh viên</th>
                                <th className="px-3 py-2 font-semibold">Lớp</th>
                                <th className="px-3 py-2 font-semibold">Game</th>
                                <th className="px-3 py-2 font-semibold">Màn</th>
                                <th className="px-3 py-2 text-center font-semibold">Sao</th>
                                <th className="px-5 py-2 text-right font-semibold">Thời điểm</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stats.recentSubmissions.map((s: any) => (
                                <tr key={s.id} className="hover:bg-slate-50">
                                    <td className="px-5 py-2.5">
                                        <span className="font-medium text-slate-800">{s.user}</span>
                                        <span className="ml-1 text-xs text-slate-400">@{s.username}</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-500">{s.classCode ?? '—'}</td>
                                    <td className="px-3 py-2.5 text-slate-600">{s.game}</td>
                                    <td className="px-3 py-2.5 text-slate-600">{s.level}</td>
                                    <td className="px-3 py-2.5 text-center">
                                        <span className={s.ok ? 'text-amber-500' : 'text-slate-300'}>
                                            {'★'.repeat(s.stars) || '—'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-2.5 text-right text-xs text-slate-400">
                                        {new Date(s.createdAt).toLocaleString('vi-VN')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
