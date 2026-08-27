/**
 * @file src/components/admin/pages/GamesPage.tsx
 * @description Danh sách game: bật/tắt xuất bản, đổi thứ tự, sửa luật mở khoá.
 */
import React, { useEffect, useState } from 'react';
import { ApiError, cq } from '@/lib/codequest';

const GamesPage: React.FC = () => {
    const [games, setGames] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState<string | null>(null);
    const [ruleText, setRuleText] = useState('');
    const [notice, setNotice] = useState('');

    async function load() {
        setLoading(true);
        try {
            setGames(await cq.admin.games());
            setError('');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Không tải được danh sách game.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function togglePublish(game: any) {
        try {
            await cq.admin.updateGame(game.id, { isPublished: !game.isPublished });
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Cập nhật thất bại.');
        }
    }

    async function saveRule(game: any) {
        try {
            const parsed = JSON.parse(ruleText);
            await cq.admin.updateGame(game.id, { unlockRule: parsed });
            setEditing(null);
            await load();
            setNotice(`Đã cập nhật luật mở khoá cho ${game.title}.`);
            setTimeout(() => setNotice(''), 2500);
        } catch (err) {
            setError(
                err instanceof SyntaxError
                    ? 'JSON không hợp lệ — kiểm tra lại dấu ngoặc và dấu phẩy.'
                    : err instanceof ApiError
                      ? err.message
                      : 'Lưu thất bại.',
            );
        }
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Nội dung game</h1>
                <p className="mt-1 text-sm text-slate-500">
                    {games.length} game · thứ tự bên dưới cũng là chuỗi mở khoá cho sinh viên
                </p>
            </div>

            {notice && <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}
            {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {games.map((g) => (
                        <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-wrap items-start gap-4">
                                <span
                                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
                                    style={{ backgroundColor: `${g.color}22` }}
                                >
                                    {g.icon}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-xs text-slate-400">#{g.orderIndex}</span>
                                        <h3 className="font-bold text-slate-900">{g.title}</h3>
                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                                            {g.engine}/{g.runtime}
                                        </span>
                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                                            {g.subject}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-sm text-slate-500">{g.subtitle}</p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        {g.levelCount} màn · {g.playerCount} người chơi
                                    </p>

                                    <div className="mt-2 rounded-lg bg-slate-50 p-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                            Luật mở khoá
                                        </p>
                                        {editing === g.id ? (
                                            <div className="mt-1 space-y-2">
                                                <textarea
                                                    value={ruleText}
                                                    onChange={(e) => setRuleText(e.target.value)}
                                                    rows={4}
                                                    className="w-full rounded border border-slate-300 p-2 font-mono text-xs"
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={() => saveRule(g)} className="btn-primary !px-3 !py-1 text-xs">
                                                        Lưu
                                                    </button>
                                                    <button onClick={() => setEditing(null)} className="btn-secondary !px-3 !py-1 text-xs">
                                                        Huỷ
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-0.5 flex items-start gap-2">
                                                <code className="flex-1 break-all font-mono text-xs text-slate-600">
                                                    {JSON.stringify(g.unlockRule)}
                                                </code>
                                                <button
                                                    onClick={() => {
                                                        setEditing(g.id);
                                                        setRuleText(JSON.stringify(g.unlockRule, null, 2));
                                                    }}
                                                    className="shrink-0 text-xs font-semibold text-primary-600 hover:underline"
                                                >
                                                    Sửa
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex shrink-0 flex-col items-end gap-2">
                                    <button
                                        onClick={() => togglePublish(g)}
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                            g.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                                        }`}
                                    >
                                        {g.isPublished ? 'Đang mở' : 'Đang ẩn'}
                                    </button>
                                    <a
                                        href={`/admin/levels?game=${g.id}`}
                                        className="text-xs font-semibold text-primary-600 hover:underline"
                                    >
                                        Quản lý màn chơi →
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
                <p className="font-semibold text-slate-600">Mẫu luật mở khoá</p>
                <pre className="mt-1 font-mono">{`{ "type": "none" }
{ "type": "game", "gameSlug": "code-dungeon", "minStars": 6 }
{ "type": "game", "gameSlug": "linux-hacker", "requireCompleted": true }
{ "type": "xp", "minXp": 1200 }
{ "type": "all", "rules": [ ... ] }`}</pre>
            </div>
        </div>
    );
};

export default GamesPage;
