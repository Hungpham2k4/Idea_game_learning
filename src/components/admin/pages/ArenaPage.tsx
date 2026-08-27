/**
 * @file src/components/admin/pages/ArenaPage.tsx
 * @description Quản trị Code Arena: bản đồ và lịch sử các trận.
 *
 * Trình sửa bản đồ có ô xem trước vẽ đúng lưới thật. Sửa bản đồ mà không nhìn
 * thấy nó thì rất dễ đặt ô xuất phát vào giữa cụm tường — server sẽ chặn, nhưng
 * thấy ngay bằng mắt vẫn tốt hơn là đọc thông báo lỗi.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { arenaApi, MODE_LABEL, SLOT_COLORS, type ArenaMap } from '../../../lib/arena';

type Tab = 'maps' | 'matches';

const EMPTY_MAP = {
    slug: '',
    name: '',
    description: '',
    mode: 'territory' as const,
    width: 12,
    height: 9,
    minPlayers: 2,
    maxPlayers: 4,
    totalRounds: 12,
    writeSeconds: 40,
    briefing: '',
    isActive: true,
    sortOrder: 10,
    layout: { walls: [], spawns: [], resources: [] },
    rules: {},
};

const ArenaPage: React.FC = () => {
    const [tab, setTab] = useState<Tab>('maps');
    const [maps, setMaps] = useState<ArenaMap[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

    const loadMaps = () => arenaApi.admin.maps().then(setMaps).catch(() => {});
    const loadMatches = () => arenaApi.admin.matches().then(setMatches).catch(() => {});

    useEffect(() => {
        loadMaps();
        loadMatches();
    }, []);

    async function save(): Promise<void> {
        if (!selected) return;
        setBusy(true);
        setMessage(null);
        try {
            const body = {
                ...selected,
                layout: typeof selected.layout === 'string' ? JSON.parse(selected.layout) : selected.layout,
                rules: typeof selected.rules === 'string' ? JSON.parse(selected.rules) : selected.rules,
            };
            if (selected.id) await arenaApi.admin.updateMap(selected.id, body);
            else await arenaApi.admin.createMap(body);
            setMessage({ tone: 'ok', text: 'Đã lưu bản đồ.' });
            setSelected(null);
            await loadMaps();
        } catch (e: any) {
            setMessage({ tone: 'err', text: e?.message ?? 'Không lưu được.' });
        } finally {
            setBusy(false);
        }
    }

    async function remove(m: ArenaMap): Promise<void> {
        if (!window.confirm(`Xoá bản đồ "${m.name}"?`)) return;
        try {
            await arenaApi.admin.deleteMap(m.id);
            setMessage({ tone: 'ok', text: 'Đã xoá.' });
            await loadMaps();
        } catch (e: any) {
            setMessage({ tone: 'err', text: e?.message ?? 'Không xoá được.' });
        }
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Code Arena</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Khu vực chơi chung realtime. Sinh viên vào cùng một phòng, mỗi lượt tự viết một chương trình ngắn,
                    hết giờ thì code của tất cả chạy cùng lúc.
                </p>
            </div>

            {message && (
                <div
                    className={`rounded-lg px-4 py-2.5 text-sm ${
                        message.tone === 'ok'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                    }`}
                >
                    {message.text}
                </div>
            )}

            <div className="flex gap-1 border-b border-slate-200">
                {([['maps', `Bản đồ (${maps.length})`], ['matches', `Lịch sử trận (${matches.length})`]] as [Tab, string][]).map(
                    ([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
                                tab === key
                                    ? 'border-sky-500 text-sky-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {label}
                        </button>
                    ),
                )}
            </div>

            {tab === 'maps' && (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
                    <div className="space-y-3">
                        <button
                            onClick={() => setSelected({ ...EMPTY_MAP })}
                            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
                        >
                            + Bản đồ mới
                        </button>

                        {maps.map((m) => (
                            <div
                                key={m.id}
                                className={`rounded-xl border bg-white p-4 transition ${
                                    selected?.id === m.id ? 'border-sky-400 ring-1 ring-sky-200' : 'border-slate-200'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-900">{m.name}</p>
                                        <p className="mt-0.5 font-mono text-xs text-slate-400">{m.slug}</p>
                                        <p className="mt-1.5 text-sm text-slate-600">{m.description}</p>
                                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                                            <Tag>{MODE_LABEL[m.mode]}</Tag>
                                            <Tag>{m.width}×{m.height}</Tag>
                                            <Tag>{m.minPlayers}–{m.maxPlayers} người</Tag>
                                            <Tag>{m.totalRounds} lượt</Tag>
                                            <Tag>{m.writeSeconds}s</Tag>
                                            {!m.isActive && (
                                                <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">
                                                    Đang ẩn
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <MapPreview map={m} size={96} />
                                </div>

                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={() => setSelected({ ...m })}
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                        Sửa
                                    </button>
                                    <button
                                        onClick={() => remove(m)}
                                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                    >
                                        Xoá
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {selected && (
                        <MapEditor
                            value={selected}
                            busy={busy}
                            onChange={setSelected}
                            onSave={save}
                            onCancel={() => setSelected(null)}
                        />
                    )}
                </div>
            )}

            {tab === 'matches' && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-semibold">Phòng</th>
                                <th className="px-4 py-2.5 text-left font-semibold">Bản đồ</th>
                                <th className="px-4 py-2.5 text-left font-semibold">Trạng thái</th>
                                <th className="px-4 py-2.5 text-left font-semibold">Người chơi</th>
                                <th className="px-4 py-2.5 text-right font-semibold">Lượt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matches.map((m) => (
                                <tr key={m.id} className="border-t border-slate-100">
                                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-700">
                                        {m.roomCode}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-700">{m.mapName}</td>
                                    <td className="px-4 py-2.5">
                                        <StatusBadge status={m.status} live={m.live} />
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="flex flex-wrap gap-1">
                                            {m.players.map((p: any) => (
                                                <span
                                                    key={p.name + p.slot}
                                                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
                                                    title={p.rank ? `Hạng ${p.rank} · ${p.score} điểm` : undefined}
                                                >
                                                    {p.rank === 1 && '🥇 '}
                                                    {p.name}
                                                </span>
                                            ))}
                                            {m.players.length === 0 && <span className="text-xs text-slate-400">—</span>}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                                        {m.round}/{m.totalRounds}
                                    </td>
                                </tr>
                            ))}
                            {matches.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                                        Chưa có trận nào được ghi lại.
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

// ─── Trình sửa bản đồ ────────────────────────────────────────────────────────

const MapEditor: React.FC<{
    value: any;
    busy: boolean;
    onChange: (v: any) => void;
    onSave: () => void;
    onCancel: () => void;
}> = ({ value, busy, onChange, onSave, onCancel }) => {
    const set = (patch: Record<string, any>) => onChange({ ...value, ...patch });

    const layoutText = useMemo(
        () => (typeof value.layout === 'string' ? value.layout : JSON.stringify(value.layout, null, 2)),
        [value.layout],
    );
    const [layoutDraft, setLayoutDraft] = useState(layoutText);
    const [layoutError, setLayoutError] = useState<string | null>(null);

    useEffect(() => setLayoutDraft(layoutText), [value.id]);

    function applyLayout(text: string): void {
        setLayoutDraft(text);
        try {
            const parsed = JSON.parse(text);
            setLayoutError(null);
            set({ layout: parsed });
        } catch (e: any) {
            setLayoutError(e.message);
        }
    }

    return (
        <div className="sticky top-4 max-h-[calc(100vh-3rem)] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-lg font-bold text-slate-900">{value.id ? 'Sửa bản đồ' : 'Bản đồ mới'}</p>

            <MapPreview map={{ ...value, layout: typeof value.layout === 'string' ? {} : value.layout }} size={260} />

            <Field label="Tên">
                <input className={inputCls} value={value.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Slug (không dấu, dùng trong địa chỉ)">
                <input className={inputCls} value={value.slug} onChange={(e) => set({ slug: e.target.value })} />
            </Field>
            <Field label="Mô tả">
                <textarea
                    className={inputCls}
                    rows={2}
                    value={value.description}
                    onChange={(e) => set({ description: e.target.value })}
                />
            </Field>

            <Field label="Chế độ">
                <select className={inputCls} value={value.mode} onChange={(e) => set({ mode: e.target.value })}>
                    <option value="territory">Chiếm lãnh thổ (Code Wars)</option>
                    <option value="battle">Đấu sinh tồn (Battle Royale)</option>
                    <option value="survival">Hợp tác chống quái</option>
                </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Rộng"><NumInput v={value.width} on={(n) => set({ width: n })} /></Field>
                <Field label="Cao"><NumInput v={value.height} on={(n) => set({ height: n })} /></Field>
                <Field label="Ít nhất"><NumInput v={value.minPlayers} on={(n) => set({ minPlayers: n })} /></Field>
                <Field label="Tối đa"><NumInput v={value.maxPlayers} on={(n) => set({ maxPlayers: n })} /></Field>
                <Field label="Số lượt"><NumInput v={value.totalRounds} on={(n) => set({ totalRounds: n })} /></Field>
                <Field label="Giây/lượt"><NumInput v={value.writeSeconds} on={(n) => set({ writeSeconds: n })} /></Field>
            </div>

            <Field label="Chiến thuật gợi ý (hiện trong phòng chờ)">
                <textarea
                    className={inputCls}
                    rows={4}
                    value={value.briefing}
                    onChange={(e) => set({ briefing: e.target.value })}
                />
            </Field>

            <Field label="Bố cục — walls / spawns / resources / waves (JSON)">
                <textarea
                    className={`${inputCls} font-mono text-xs ${layoutError ? 'border-red-300' : ''}`}
                    rows={8}
                    value={layoutDraft}
                    onChange={(e) => applyLayout(e.target.value)}
                />
                {layoutError && <p className="mt-1 text-xs text-red-600">JSON chưa hợp lệ: {layoutError}</p>}
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    <code>walls</code>/<code>spawns</code>: mảng <code>[x, y]</code>.
                    <code className="ml-1">resources</code>: <code>[x, y, số lượng]</code>.
                    <code className="ml-1">waves</code>: số quái từng lượt (chế độ hợp tác).
                    Để <code>spawns</code> rỗng thì hệ thống tự rải đều quanh mép.
                </p>
            </Field>

            <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                    type="checkbox"
                    checked={value.isActive !== false}
                    onChange={(e) => set({ isActive: e.target.checked })}
                />
                Đang mở cho sinh viên
            </label>

            <div className="flex gap-2 pt-2">
                <button
                    onClick={onSave}
                    disabled={busy || !!layoutError}
                    className="flex-1 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
                >
                    {busy ? 'Đang lưu…' : 'Lưu bản đồ'}
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

/** Vẽ thu nhỏ bản đồ để nhìn thấy ngay tường và ô xuất phát nằm ở đâu. */
const MapPreview: React.FC<{ map: any; size: number }> = ({ map, size }) => {
    const w = Math.max(1, Number(map.width) || 1);
    const h = Math.max(1, Number(map.height) || 1);
    const layout = map.layout ?? {};
    const walls = new Set((layout.walls ?? []).map(([x, y]: number[]) => `${x},${y}`));
    const spawns = new Map<string, number>(
        (layout.spawns ?? []).map(([x, y]: number[], i: number) => [`${x},${y}`, i] as [string, number]),
    );
    const resources = new Set((layout.resources ?? []).map(([x, y]: number[]) => `${x},${y}`));

    return (
        <div
            className="shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
            style={{ width: size, aspectRatio: `${w} / ${h}` }}
        >
            <div className="grid h-full w-full" style={{ gridTemplateColumns: `repeat(${w}, 1fr)` }}>
                {Array.from({ length: w * h }, (_, i) => {
                    const x = i % w;
                    const y = Math.floor(i / w);
                    const k = `${x},${y}`;
                    const spawnIdx = spawns.get(k);
                    return (
                        <div
                            key={k}
                            className="border-[0.5px] border-slate-200/60"
                            style={{
                                backgroundColor: walls.has(k)
                                    ? '#94a3b8'
                                    : spawnIdx !== undefined
                                      ? SLOT_COLORS[spawnIdx % SLOT_COLORS.length]
                                      : resources.has(k)
                                        ? '#fbbf24'
                                        : undefined,
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};

// ─── Vụn vặt ─────────────────────────────────────────────────────────────────

const inputCls =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
        {children}
    </label>
);

const NumInput: React.FC<{ v: number; on: (n: number) => void }> = ({ v, on }) => (
    <input type="number" className={inputCls} value={v} onChange={(e) => on(Number(e.target.value))} />
);

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{children}</span>
);

const StatusBadge: React.FC<{ status: string; live: boolean }> = ({ status, live }) => {
    if (live && status === 'RUNNING') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Đang đấu
            </span>
        );
    }
    const map: Record<string, [string, string]> = {
        LOBBY: ['Sảnh chờ', 'bg-slate-100 text-slate-600'],
        RUNNING: ['Dở dang', 'bg-amber-50 text-amber-700'],
        FINISHED: ['Đã xong', 'bg-sky-50 text-sky-700'],
        ABANDONED: ['Bỏ dở', 'bg-slate-100 text-slate-500'],
    };
    const [label, cls] = map[status] ?? [status, 'bg-slate-100 text-slate-600'];
    return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>;
};

export default ArenaPage;
