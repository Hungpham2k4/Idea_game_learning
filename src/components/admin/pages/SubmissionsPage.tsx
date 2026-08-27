/**
 * @file src/components/admin/pages/SubmissionsPage.tsx
 * @description Xem bài nộp của sinh viên: lọc theo game, mở code và kết quả chấm.
 */
import React, { useEffect, useState } from 'react';
import { ApiError, cq } from '@/lib/codequest';

const SubmissionsPage: React.FC = () => {
    const [games, setGames] = useState<any[]>([]);
    const [gameSlug, setGameSlug] = useState('');
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<any[]>([]);
    const [open, setOpen] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        cq.admin.games().then(setGames).catch(() => setGames([]));
    }, []);

    useEffect(() => {
        setLoading(true);
        cq.admin
            .submissions({ gameSlug: gameSlug || undefined, page })
            .then((data) => {
                setItems(data);
                setError('');
            })
            .catch((err) => setError(err instanceof ApiError ? err.message : 'Không tải được bài nộp.'))
            .finally(() => setLoading(false));
    }, [gameSlug, page]);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Bài nộp</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Xem chính xác sinh viên đã gõ gì và hệ thống chấm ra sao.
                    </p>
                </div>

                <select
                    value={gameSlug}
                    onChange={(e) => {
                        setGameSlug(e.target.value);
                        setPage(1);
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                    <option value="">Tất cả game</option>
                    {games.map((g) => (
                        <option key={g.slug} value={g.slug}>
                            {g.icon} {g.title}
                        </option>
                    ))}
                </select>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-5 py-2.5 font-semibold">Sinh viên</th>
                            <th className="px-3 py-2.5 font-semibold">Game / Màn</th>
                            <th className="px-3 py-2.5 text-center font-semibold">Kết quả</th>
                            <th className="px-3 py-2.5 text-center font-semibold">Sao</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Thời gian làm</th>
                            <th className="px-5 py-2.5 text-right font-semibold"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && (
                            <tr>
                                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                                    Đang tải…
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            items.map((s) => (
                                <tr key={s.id} className="hover:bg-slate-50">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-slate-800">{s.user.displayName}</p>
                                        <p className="text-xs text-slate-400">
                                            {s.user.classCode ?? '—'} · {new Date(s.createdAt).toLocaleString('vi-VN')}
                                        </p>
                                    </td>
                                    <td className="px-3 py-3 text-slate-600">
                                        <p>{s.game}</p>
                                        <p className="text-xs text-slate-400">{s.level}</p>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                s.result?.completed
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : s.ok
                                                      ? 'bg-amber-100 text-amber-700'
                                                      : 'bg-red-100 text-red-700'
                                            }`}
                                        >
                                            {s.result?.completed ? 'Qua màn' : s.ok ? 'Chạy được' : 'Lỗi'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-center text-amber-500">{'★'.repeat(s.stars) || '—'}</td>
                                    <td className="px-3 py-3 text-right text-xs text-slate-500">
                                        {s.durationMs ? `${Math.round(s.durationMs / 1000)}s` : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <button
                                            onClick={() => setOpen(s)}
                                            className="text-xs font-semibold text-primary-600 hover:underline"
                                        >
                                            Xem code
                                        </button>
                                    </td>
                                </tr>
                            ))}

                        {!loading && items.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                                    Chưa có bài nộp nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-center gap-2">
                <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary !py-1.5 text-xs disabled:opacity-40"
                >
                    ← Trang trước
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-500">Trang {page}</span>
                <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={items.length < 20}
                    className="btn-secondary !py-1.5 text-xs disabled:opacity-40"
                >
                    Trang sau →
                </button>
            </div>

            {/* ── Hộp thoại xem code ──────────────────────────────────────── */}
            {open && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
                    onClick={() => setOpen(null)}
                >
                    <div
                        className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-slate-900">{open.user.displayName}</h3>
                                <p className="text-sm text-slate-500">
                                    {open.game} — {open.level}
                                </p>
                            </div>
                            <button onClick={() => setOpen(null)} className="text-slate-400 hover:text-slate-700">
                                ✕
                            </button>
                        </div>

                        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
                            {open.code}
                        </pre>

                        {open.errorMsg && (
                            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">⚠ {open.errorMsg}</p>
                        )}

                        {open.result?.objectives && (
                            <ul className="mt-3 space-y-1 text-sm">
                                {open.result.objectives.map((o: any) => (
                                    <li key={o.id} className={o.done ? 'text-emerald-700' : 'text-slate-500'}>
                                        {o.done ? '☑' : '☐'} {o.label}
                                        {o.detail ? ` — ${o.detail}` : ''}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubmissionsPage;
