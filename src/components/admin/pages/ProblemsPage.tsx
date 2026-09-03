/**
 * @file src/components/admin/pages/ProblemsPage.tsx
 * @description Quản trị ngân hàng bài tập cho bàn cờ Code Tycoon.
 *
 * Điểm quan trọng nhất của trang này là ô **lời giải mẫu**: khi lưu, server chạy
 * lời giải đó qua toàn bộ test và từ chối nếu không qua hết.
 *
 * Vì sao bắt buộc phải có cơ chế đó: ra đề sai đáp án là lỗi tốn thời gian nhất
 * của cả lớp — sinh viên ngồi mấy phút với một bài không thể qua được, rồi mất
 * điểm và nghỉ lượt vì lỗi của người soạn đề.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { arenaApi } from '../../../lib/arena';

type Tab = 'list' | 'stats';

const EMPTY = {
    slug: '',
    title: '',
    statement: '',
    difficulty: 'EASY' as const,
    functionName: 'solve',
    signature: 'solve(n) — mô tả tham số',
    starterCode: {
        js: 'function solve(n) {\n    \n}',
        java: 'int solve(int n) {\n    \n}',
        python: 'def solve(n):\n    ',
    },
    sampleTests: [{ args: [1], expected: 1 }],
    hiddenTests: [
        { args: [2], expected: 2 },
        { args: [3], expected: 3 },
    ],
    hints: [''],
    tags: [] as string[],
    timeLimitSec: 180,
    isActive: true,
    reference: '',
};

const DIFF_STYLE: Record<string, string> = {
    EASY: 'bg-emerald-50 text-emerald-700',
    MEDIUM: 'bg-amber-50 text-amber-700',
    HARD: 'bg-red-50 text-red-700',
};

const ProblemsPage: React.FC = () => {
    const [tab, setTab] = useState<Tab>('list');
    const [items, setItems] = useState<any[]>([]);
    const [stats, setStats] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
    const [filter, setFilter] = useState('');

    const load = () => arenaApi.admin.problems().then(setItems).catch(() => {});
    const loadStats = () => arenaApi.admin.problemStats().then(setStats).catch(() => {});

    useEffect(() => {
        load();
        loadStats();
    }, []);

    const shown = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (p) => p.title.toLowerCase().includes(q) || p.slug.includes(q) || p.difficulty.toLowerCase() === q,
        );
    }, [items, filter]);

    async function save(): Promise<void> {
        if (!selected) return;
        setBusy(true);
        setMsg(null);
        try {
            const body = { ...selected, hints: (selected.hints ?? []).filter((h: string) => h.trim()) };
            if (selected.id) await arenaApi.admin.updateProblem(selected.id, body);
            else await arenaApi.admin.createProblem(body);
            setMsg({ tone: 'ok', text: 'Đã lưu bài.' });
            setSelected(null);
            await load();
        } catch (e: any) {
            setMsg({ tone: 'err', text: e?.message ?? 'Không lưu được.' });
        } finally {
            setBusy(false);
        }
    }

    async function remove(p: any): Promise<void> {
        if (!window.confirm(`Xoá bài "${p.title}"?`)) return;
        try {
            await arenaApi.admin.deleteProblem(p.id);
            setMsg({ tone: 'ok', text: 'Đã xoá.' });
            await load();
        } catch (e: any) {
            setMsg({ tone: 'err', text: e?.message ?? 'Không xoá được.' });
        }
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Ngân hàng bài tập</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Bài dùng cho ô "Thử thách" trên bàn cờ Code Tycoon. Sinh viên viết một hàm, server chạy hàm đó
                    với bộ test rồi đối chiếu kết quả.
                </p>
            </div>

            {msg && (
                <div
                    className={`rounded-lg px-4 py-2.5 text-sm ${
                        msg.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                >
                    {msg.text}
                </div>
            )}

            <div className="flex gap-1 border-b border-slate-200">
                {(
                    [
                        ['list', `Danh sách (${items.length})`],
                        ['stats', `Lớp hay sai bài nào (${stats.length})`],
                    ] as [Tab, string][]
                ).map(([k, label]) => (
                    <button
                        key={k}
                        onClick={() => setTab(k)}
                        className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
                            tab === k ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'list' && (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_460px]">
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelected({ ...EMPTY })}
                                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
                            >
                                + Bài mới
                            </button>
                            <input
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                placeholder="Tìm theo tên, slug, độ khó…"
                                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                            />
                        </div>

                        {shown.map((p) => (
                            <div
                                key={p.id}
                                className={`rounded-xl border bg-white p-4 ${
                                    selected?.id === p.id ? 'border-sky-400 ring-1 ring-sky-200' : 'border-slate-200'
                                }`}
                            >
                                <div className="flex items-start gap-2">
                                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${DIFF_STYLE[p.difficulty]}`}>
                                        {p.difficulty}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-900">{p.title}</p>
                                        <p className="font-mono text-xs text-slate-400">{p.slug}</p>
                                    </div>
                                    {!p.isActive && (
                                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                                            Đang ẩn
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                                    <Tag>{p.sampleTests.length} test mẫu</Tag>
                                    <Tag>{p.hiddenTests.length} test ẩn</Tag>
                                    <Tag>{p.timeLimitSec}s</Tag>
                                    <Tag>hàm {p.functionName}()</Tag>
                                    {(p.tags ?? []).map((t: string) => (
                                        <Tag key={t}>{t}</Tag>
                                    ))}
                                </div>

                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={() => setSelected({ ...p, reference: '' })}
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                        Sửa
                                    </button>
                                    <button
                                        onClick={() => remove(p)}
                                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                    >
                                        Xoá
                                    </button>
                                </div>
                            </div>
                        ))}

                        {shown.length === 0 && (
                            <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                                Không có bài nào khớp.
                            </p>
                        )}
                    </div>

                    {selected && (
                        <ProblemEditor
                            value={selected}
                            busy={busy}
                            onChange={setSelected}
                            onSave={save}
                            onCancel={() => setSelected(null)}
                        />
                    )}
                </div>
            )}

            {tab === 'stats' && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <p className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
                        Xếp theo tỷ lệ qua bài từ thấp lên cao — những dòng đầu là chỗ lớp đang yếu nhất.
                    </p>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-semibold">Bài</th>
                                <th className="px-2 py-2.5 text-center font-semibold">Độ khó</th>
                                <th className="px-2 py-2.5 text-right font-semibold">Lượt giải</th>
                                <th className="px-2 py-2.5 text-right font-semibold">Qua</th>
                                <th className="px-4 py-2.5 text-right font-semibold">Thời gian TB</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s) => (
                                <tr key={s.problemId} className="border-t border-slate-100">
                                    <td className="px-4 py-2.5">
                                        <span className="font-semibold text-slate-800">{s.title}</span>
                                        <span className="ml-2 font-mono text-xs text-slate-400">{s.slug}</span>
                                    </td>
                                    <td className="px-2 py-2.5 text-center">
                                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${DIFF_STYLE[s.difficulty]}`}>
                                            {s.difficulty}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-600">{s.attempts}</td>
                                    <td className="px-2 py-2.5 text-right">
                                        <span className="flex items-center justify-end gap-2">
                                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                                <span
                                                    className={`block h-full rounded-full ${
                                                        s.passRate < 40 ? 'bg-red-400' : s.passRate < 70 ? 'bg-amber-400' : 'bg-emerald-400'
                                                    }`}
                                                    style={{ width: `${s.passRate}%` }}
                                                />
                                            </span>
                                            <span className="w-10 text-right tabular-nums font-semibold text-slate-700">
                                                {s.passRate}%
                                            </span>
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{s.avgSeconds}s</td>
                                </tr>
                            ))}
                            {stats.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                                        Chưa có ai giải bài nào trên bàn cờ.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ─── Trình soạn bài ──────────────────────────────────────────────────────────

const ProblemEditor: React.FC<{
    value: any;
    busy: boolean;
    onChange: (v: any) => void;
    onSave: () => void;
    onCancel: () => void;
}> = ({ value, busy, onChange, onSave, onCancel }) => {
    const set = (patch: Record<string, any>) => onChange({ ...value, ...patch });

    const [sampleText, setSampleText] = useState(JSON.stringify(value.sampleTests ?? [], null, 2));
    const [hiddenText, setHiddenText] = useState(JSON.stringify(value.hiddenTests ?? [], null, 2));
    const [jsonError, setJsonError] = useState<{ sample?: string; hidden?: string }>({});

    useEffect(() => {
        setSampleText(JSON.stringify(value.sampleTests ?? [], null, 2));
        setHiddenText(JSON.stringify(value.hiddenTests ?? [], null, 2));
        setJsonError({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value.id]);

    function applyTests(which: 'sample' | 'hidden', text: string): void {
        which === 'sample' ? setSampleText(text) : setHiddenText(text);
        try {
            const parsed = JSON.parse(text);
            if (!Array.isArray(parsed)) throw new Error('Phải là một mảng');
            setJsonError((e) => ({ ...e, [which]: undefined }));
            set(which === 'sample' ? { sampleTests: parsed } : { hiddenTests: parsed });
        } catch (e: any) {
            setJsonError((prev) => ({ ...prev, [which]: e.message }));
        }
    }

    const blocked = !!jsonError.sample || !!jsonError.hidden;

    return (
        <div className="sticky top-4 max-h-[calc(100vh-3rem)] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-lg font-bold text-slate-900">{value.id ? 'Sửa bài' : 'Bài mới'}</p>

            <Field label="Tiêu đề">
                <input className={inputCls} value={value.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field label="Slug (không dấu)">
                <input className={inputCls} value={value.slug} onChange={(e) => set({ slug: e.target.value })} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Độ khó">
                    <select className={inputCls} value={value.difficulty} onChange={(e) => set({ difficulty: e.target.value })}>
                        <option value="EASY">Dễ</option>
                        <option value="MEDIUM">Trung bình</option>
                        <option value="HARD">Khó</option>
                    </select>
                </Field>
                <Field label="Giây tối đa">
                    <input
                        type="number"
                        className={inputCls}
                        value={value.timeLimitSec}
                        onChange={(e) => set({ timeLimitSec: Number(e.target.value) })}
                    />
                </Field>
            </div>

            <Field label="Đề bài (dùng **đậm** và `mã`)">
                <textarea
                    className={inputCls}
                    rows={5}
                    value={value.statement}
                    onChange={(e) => set({ statement: e.target.value })}
                />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Tên hàm">
                    <input
                        className={inputCls}
                        value={value.functionName}
                        onChange={(e) => set({ functionName: e.target.value })}
                    />
                </Field>
                <Field label="Chữ ký hiện cho người chơi">
                    <input className={inputCls} value={value.signature} onChange={(e) => set({ signature: e.target.value })} />
                </Field>
            </div>

            <Field label={`Test mẫu — hiện cho người chơi${jsonError.sample ? ` · ${jsonError.sample}` : ''}`}>
                <textarea
                    className={`${inputCls} font-mono text-xs ${jsonError.sample ? 'border-red-300' : ''}`}
                    rows={5}
                    value={sampleText}
                    onChange={(e) => applyTests('sample', e.target.value)}
                />
            </Field>

            <Field label={`Test ẩn — chỉ dùng để chấm${jsonError.hidden ? ` · ${jsonError.hidden}` : ''}`}>
                <textarea
                    className={`${inputCls} font-mono text-xs ${jsonError.hidden ? 'border-red-300' : ''}`}
                    rows={5}
                    value={hiddenText}
                    onChange={(e) => applyTests('hidden', e.target.value)}
                />
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    Dạng <code>{'[{ "args": [5], "expected": 15 }]'}</code>. Cần ít nhất 2 test ẩn — thiếu thì người
                    chơi chỉ cần viết if/else trả đúng đáp án test mẫu là qua.
                </p>
            </Field>

            <Field label="Gợi ý bậc thang (mỗi dòng một gợi ý)">
                <textarea
                    className={inputCls}
                    rows={3}
                    value={(value.hints ?? []).join('\n')}
                    onChange={(e) => set({ hints: e.target.value.split('\n') })}
                />
            </Field>

            {/* Ô quan trọng nhất của trang này */}
            <div className="rounded-lg border-2 border-dashed border-sky-200 bg-sky-50/50 p-3">
                <Field label="Lời giải mẫu — server sẽ chạy thử trước khi lưu">
                    <textarea
                        className={`${inputCls} bg-white font-mono text-xs`}
                        rows={4}
                        placeholder={`function ${value.functionName}(n) {\n    return n;\n}`}
                        value={value.reference ?? ''}
                        onChange={(e) => set({ reference: e.target.value })}
                    />
                </Field>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                    Điền vào đây thì khi lưu, server chạy lời giải qua <b>toàn bộ</b> test và từ chối nếu không qua hết.
                    Đây là cách duy nhất chắc chắn đề không sai đáp án — bỏ trống cũng lưu được, nhưng rủi ro là của bạn.
                </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                    type="checkbox"
                    checked={value.isActive !== false}
                    onChange={(e) => set({ isActive: e.target.checked })}
                />
                Đang dùng trên bàn cờ
            </label>

            <div className="flex gap-2 pt-1">
                <button
                    onClick={onSave}
                    disabled={busy || blocked}
                    className="flex-1 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
                >
                    {busy ? 'Đang kiểm tra và lưu…' : 'Lưu bài'}
                </button>
                <button
                    onClick={onCancel}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                    Huỷ
                </button>
            </div>
        </div>
    );
};

const inputCls =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
        {children}
    </label>
);

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{children}</span>
);

export default ProblemsPage;
