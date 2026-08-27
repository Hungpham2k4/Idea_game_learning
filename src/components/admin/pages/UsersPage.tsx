/**
 * @file src/components/admin/pages/UsersPage.tsx
 * @description Quản lý sinh viên / giảng viên: tìm kiếm, đổi vai trò, khoá, reset tiến trình.
 */
import React, { useEffect, useState } from 'react';
import { ApiError, cq } from '@/lib/codequest';

const ROLE_STYLE: Record<string, string> = {
    ADMIN: 'bg-violet-100 text-violet-700',
    TEACHER: 'bg-blue-100 text-blue-700',
    STUDENT: 'bg-slate-100 text-slate-600',
};

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState('');
    const [notice, setNotice] = useState('');

    async function load(term = search) {
        setLoading(true);
        try {
            const data = await cq.admin.users(term, 1, 50);
            setUsers(data);
            setError('');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Không tải được danh sách người dùng.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load('');
    }, []);

    async function update(id: string, body: any, message: string) {
        setBusyId(id);
        try {
            await cq.admin.updateUser(id, body);
            await load();
            setNotice(message);
            setTimeout(() => setNotice(''), 2500);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Cập nhật thất bại.');
        } finally {
            setBusyId('');
        }
    }

    async function resetProgress(id: string, name: string) {
        if (!window.confirm(`Xoá toàn bộ tiến trình của "${name}"? Hành động này không thể hoàn tác.`)) return;
        setBusyId(id);
        try {
            await cq.admin.resetUser(id);
            await load();
            setNotice(`Đã reset tiến trình của ${name}.`);
            setTimeout(() => setNotice(''), 2500);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Reset thất bại.');
        } finally {
            setBusyId('');
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Người dùng</h1>
                    <p className="mt-1 text-sm text-slate-500">{users.length} tài khoản</p>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        load();
                    }}
                    className="flex gap-2"
                >
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm theo tên, email, lớp…"
                        className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    />
                    <button type="submit" className="btn-primary !py-2">
                        Tìm
                    </button>
                </form>
            </div>

            {notice && <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}
            {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-5 py-2.5 font-semibold">Người dùng</th>
                            <th className="px-3 py-2.5 font-semibold">Lớp</th>
                            <th className="px-3 py-2.5 font-semibold">Vai trò</th>
                            <th className="px-3 py-2.5 text-right font-semibold">XP</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Sao</th>
                            <th className="px-3 py-2.5 text-center font-semibold">Trạng thái</th>
                            <th className="px-5 py-2.5 text-right font-semibold">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && (
                            <tr>
                                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                                    Đang tải…
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            users.map((u) => (
                                <tr key={u.id} className={busyId === u.id ? 'opacity-50' : 'hover:bg-slate-50'}>
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-slate-800">{u.displayName}</p>
                                        <p className="text-xs text-slate-400">{u.email}</p>
                                    </td>
                                    <td className="px-3 py-3 text-slate-600">{u.classCode ?? '—'}</td>
                                    <td className="px-3 py-3">
                                        <select
                                            value={u.role}
                                            onChange={(e) => update(u.id, { role: e.target.value }, 'Đã đổi vai trò.')}
                                            className={`rounded-md px-2 py-1 text-xs font-semibold ${ROLE_STYLE[u.role]}`}
                                        >
                                            <option value="STUDENT">STUDENT</option>
                                            <option value="TEACHER">TEACHER</option>
                                            <option value="ADMIN">ADMIN</option>
                                        </select>
                                    </td>
                                    <td className="px-3 py-3 text-right font-mono text-slate-700">{u.xp}</td>
                                    <td className="px-3 py-3 text-right font-mono text-amber-600">{u.totalStars}</td>
                                    <td className="px-3 py-3 text-center">
                                        <button
                                            onClick={() =>
                                                update(
                                                    u.id,
                                                    { isActive: !u.isActive },
                                                    u.isActive ? 'Đã khoá tài khoản.' : 'Đã mở khoá tài khoản.',
                                                )
                                            }
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                            }`}
                                        >
                                            {u.isActive ? 'Đang hoạt động' : 'Đã khoá'}
                                        </button>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <button
                                            onClick={() => resetProgress(u.id, u.displayName)}
                                            className="text-xs font-semibold text-red-600 hover:underline"
                                        >
                                            Reset tiến trình
                                        </button>
                                    </td>
                                </tr>
                            ))}

                        {!loading && users.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                                    Không tìm thấy người dùng nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UsersPage;
