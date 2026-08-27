/**
 * @file src/components/admin/pages/LevelsPage.tsx
 * @description Soạn màn chơi: sửa đề bài, mục tiêu, cấu hình thế giới, đáp án mẫu
 *              và **chạy thử ngay** để chắc chắn màn mới giải được.
 */
import React, { useEffect, useState } from 'react';
import { ApiError, cq } from '@/lib/codequest';

type Tab = 'brief' | 'objectives' | 'config' | 'solution' | 'hints';

// ─── Diễn giải luật chấm ra tiếng người ──────────────────────────────────────

type CheckMode = 'outcome' | 'skill' | 'unknown';

interface CheckInfo {
    mode: CheckMode;
    text: string;
}

/**
 * Mỗi mục tiêu được chấm theo một trong hai kiểu:
 *  - outcome: nhìn KẾT QUẢ (thế giới game đạt trạng thái nào) → mọi cách giải đúng đều qua
 *  - skill:   nhìn CODE (đề bài yêu cầu phải dùng kỹ thuật cụ thể)
 */
function describeCheck(check: any): CheckInfo {
    const c = check ?? {};
    const list = (v: any) => (Array.isArray(v) ? v.join(', ') : v);

    const map: Record<string, CheckInfo> = {
        // ── Chấm theo kết quả — SQL ─────────────────────────────────────────
        resultMatches: { mode: 'outcome', text: 'Kết quả truy vấn phải khớp dữ liệu đáp án (viết câu SQL kiểu gì cũng được)' },
        rowCount: { mode: 'outcome', text: `Số dòng trả về ${c.op ?? '='} ${c.value}` },
        rowsInclude: { mode: 'outcome', text: 'Kết quả phải chứa các dòng đã chỉ định' },
        valuePresent: { mode: 'outcome', text: `Kết quả phải xuất hiện giá trị "${c.value}"` },
        columnsInclude: { mode: 'outcome', text: `Phải có các cột: ${list(c.columns)}` },
        affectedRows: { mode: 'outcome', text: `Số dòng bị thay đổi ${c.op ?? '='} ${c.value}` },
        tableState: { mode: 'outcome', text: `Dữ liệu sau khi chạy phải thoả: ${c.checkSql}` },
        noError: { mode: 'outcome', text: 'Không có lỗi cú pháp' },

        // ── Chấm theo kết quả — thế giới lưới ───────────────────────────────
        reachExit: { mode: 'outcome', text: 'Nhân vật tới được ô thoát' },
        atTile: { mode: 'outcome', text: `Nhân vật dừng ở ô (${c.x}, ${c.y})` },
        collectAll: { mode: 'outcome', text: 'Nhặt hết vật phẩm trên bản đồ' },
        collectCount: { mode: 'outcome', text: `Nhặt ít nhất ${c.value} vật phẩm` },
        killAll: { mode: 'outcome', text: 'Tiêu diệt toàn bộ quái' },
        killCount: { mode: 'outcome', text: `Tiêu diệt ít nhất ${c.value} quái` },
        hpAtLeast: { mode: 'outcome', text: `Máu còn lại tối thiểu ${c.value}` },
        keysAtLeast: { mode: 'outcome', text: `Có ít nhất ${c.value} chìa khoá` },
        doorsOpen: { mode: 'outcome', text: 'Mọi cánh cửa đã mở' },

        // ── Chấm theo kết quả — tower defense ───────────────────────────────
        wavesCleared: { mode: 'outcome', text: `Chặn được ${c.value ?? 'hết'} đợt quái` },
        baseSurvived: { mode: 'outcome', text: 'Căn cứ còn đứng vững' },
        baseHpAtLeast: { mode: 'outcome', text: `Căn cứ còn tối thiểu ${c.value} HP` },
        towersAtMost: { mode: 'outcome', text: `Xây tối đa ${c.value} tháp` },
        towersAtLeast: { mode: 'outcome', text: `Xây tối thiểu ${c.value} tháp` },
        towerLevelAtLeast: { mode: 'outcome', text: `Mọi tháp đạt cấp ${c.value} trở lên` },
        goldAtLeast: { mode: 'outcome', text: `Còn tối thiểu ${c.value} vàng` },
        killedAtLeast: { mode: 'outcome', text: `Hạ tối thiểu ${c.value} quái` },
        noLeak: { mode: 'outcome', text: 'Không con nào lọt vào căn cứ' },

        // ── Chấm theo kết quả — terminal ────────────────────────────────────
        fileRead: { mode: 'outcome', text: `Đã đọc file ${c.path}` },
        cwdIs: { mode: 'outcome', text: `Đang đứng tại thư mục ${c.path}` },
        fileExists: { mode: 'outcome', text: `File ${c.path} tồn tại` },
        fileContains: { mode: 'outcome', text: `File ${c.path ?? c.file} chứa "${c.text}"` },
        fileNotContains: { mode: 'outcome', text: `File ${c.file} KHÔNG còn "${c.text}"` },
        fileMissing: { mode: 'outcome', text: `File ${c.file} đã bị xoá` },
        outputContains: { mode: 'outcome', text: `Màn hình có hiện: ${list(c.texts ?? c.text)}` },
        serviceStatus: { mode: 'outcome', text: `Dịch vụ ${list(c.services ?? c.service)} ở trạng thái ${c.status ?? 'active'}` },
        containerStatus: { mode: 'outcome', text: `Container ${list(c.containers ?? c.name)} ở trạng thái ${c.status ?? 'running'}` },
        metricBelow: { mode: 'outcome', text: `${String(c.key ?? 'cpu').toUpperCase()} dưới ${c.value}%` },
        loggedInAs: { mode: 'outcome', text: `Đang đăng nhập bằng tài khoản ${c.user}` },
        connectedTo: { mode: 'outcome', text: `Đã kết nối tới ${c.target}` },
        processKilled: { mode: 'outcome', text: `Tiến trình ${c.pid ?? c.cmd} đã bị tắt` },

        // ── Chấm theo kết quả — git ─────────────────────────────────────────
        headAt: { mode: 'outcome', text: `HEAD đang ở ${c.ref}` },
        branchExists: { mode: 'outcome', text: `Tồn tại nhánh ${c.name}` },
        workingTreeMatches: { mode: 'outcome', text: `Thư mục làm việc giống commit ${c.ref}` },
        commitCount: { mode: 'outcome', text: `Repo có đúng ${c.value} commit` },
        blamedCommit: { mode: 'outcome', text: `Chỉ đúng commit gây lỗi (${c.ref})` },
        lastCommitMessageContains: { mode: 'outcome', text: `Commit cuối có chữ "${c.text}"` },
        variableEquals: { mode: 'outcome', text: `Biến ${c.name} bằng ${c.value}` },

        // ── Chấm theo kỹ năng (nhìn code) ───────────────────────────────────
        usesClause: { mode: 'skill', text: `Bắt buộc dùng cú pháp: ${list(c.clauses ?? c.clause)}` },
        notUsesClause: { mode: 'skill', text: `Không được dùng: ${list(c.clauses ?? c.clause)}` },
        commandUsed: { mode: 'skill', text: `Bắt buộc dùng lệnh: ${list(c.names ?? c.name)}${c.sub ? ` ${c.sub}` : ''}` },
        commandRun: { mode: 'skill', text: `Câu lệnh phải khớp mẫu: ${c.pattern}` },
        usesConstruct: { mode: 'skill', text: `Bắt buộc dùng: ${list(c.constructs ?? c.construct)}` },
        commandsAtMost: { mode: 'skill', text: `Dùng tối đa ${c.value} lệnh hành động` },
        statementsAtMost: { mode: 'skill', text: `Code tối đa ${c.value} câu lệnh` },
    };

    if (c.kind === 'anyOf') {
        const parts = (c.checks ?? []).map((x: any) => describeCheck(x).text);
        return { mode: 'outcome', text: `Đạt MỘT trong các cách: ${parts.join('  —  HOẶC  —  ')}` };
    }
    if (c.kind === 'allOf') {
        const parts = (c.checks ?? []).map((x: any) => describeCheck(x).text);
        return { mode: 'outcome', text: `Đạt TẤT CẢ: ${parts.join(' + ')}` };
    }
    if (c.kind === 'not') {
        return { mode: 'outcome', text: `KHÔNG được: ${describeCheck(c.check).text}` };
    }

    return map[c.kind] ?? { mode: 'unknown', text: `Kiểu kiểm tra: ${c.kind ?? '(chưa đặt)'}` };
}

const ObjectiveSummary: React.FC<{ objectives: any[] }> = ({ objectives }) => {
    const outcomeCount = objectives.filter((o) => describeCheck(o.check).mode === 'outcome').length;

    return (
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Màn này được chấm như thế nào
            </p>

            <ul className="space-y-1.5">
                {objectives.map((o, i) => {
                    const info = describeCheck(o.check);
                    return (
                        <li key={o.id ?? i} className="flex flex-wrap items-start gap-2 text-sm">
                            <span
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    info.mode === 'outcome'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : info.mode === 'skill'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-slate-200 text-slate-600'
                                }`}
                            >
                                {info.mode === 'outcome' ? 'KẾT QUẢ' : info.mode === 'skill' ? 'KỸ NĂNG' : '?'}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="font-medium text-slate-800">{o.label}</span>
                                {o.optional && <span className="ml-1 text-[10px] text-amber-600">(phụ)</span>}
                                <span className="block text-xs text-slate-500">{info.text}</span>
                            </span>
                        </li>
                    );
                })}
            </ul>

            <p className="mt-2.5 border-t border-slate-200 pt-2 text-xs text-slate-500">
                <b>{outcomeCount}/{objectives.length}</b> mục tiêu chấm theo kết quả — sinh viên giải kiểu gì cũng được
                miễn đạt trạng thái yêu cầu. Mục tiêu <b>KỸ NĂNG</b> chỉ dùng khi đề bài đã nói rõ bắt buộc dùng kỹ thuật đó.
            </p>
        </div>
    );
};

const LevelsPage: React.FC = () => {
    const [games, setGames] = useState<any[]>([]);
    const [gameId, setGameId] = useState('');
    const [levels, setLevels] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);

    const [tab, setTab] = useState<Tab>('brief');
    const [draft, setDraft] = useState('');
    const [testCode, setTestCode] = useState('');
    const [testResult, setTestResult] = useState<any>(null);

    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);

    // Nạp danh sách game (ưu tiên game trên URL: /admin/levels?game=xxx)
    useEffect(() => {
        cq.admin
            .games()
            .then((list) => {
                setGames(list);
                const fromUrl = new URLSearchParams(window.location.search).get('game');
                setGameId(fromUrl && list.some((g: any) => g.id === fromUrl) ? fromUrl : (list[0]?.id ?? ''));
            })
            .catch((err) => setError(err instanceof ApiError ? err.message : 'Không tải được danh sách game.'));
    }, []);

    useEffect(() => {
        if (!gameId) return;
        setSelected(null);
        setTestResult(null);
        cq.admin
            .levels(gameId)
            .then(setLevels)
            .catch((err) => setError(err instanceof ApiError ? err.message : 'Không tải được màn chơi.'));
    }, [gameId]);

    function openLevel(level: any) {
        setSelected(level);
        setTab('brief');
        setDraft(level.brief);
        setTestCode(level.solution?.sampleCode ?? level.solution?.referenceSql ?? '');
        setTestResult(null);
    }

    function currentValue(t: Tab, level: any): string {
        if (t === 'brief') return level.brief;
        if (t === 'objectives') return JSON.stringify(level.objectives, null, 2);
        if (t === 'config') return JSON.stringify(level.config, null, 2);
        if (t === 'solution') return JSON.stringify(level.solution, null, 2);
        return JSON.stringify(level.hints, null, 2);
    }

    function switchTab(next: Tab) {
        if (!selected) return;
        setTab(next);
        setDraft(currentValue(next, selected));
    }

    async function save() {
        if (!selected) return;
        setBusy(true);
        setError('');
        try {
            const body: any = {};
            if (tab === 'brief') body.brief = draft;
            else if (tab === 'objectives') body.objectives = JSON.parse(draft);
            else if (tab === 'config') body.config = JSON.parse(draft);
            else if (tab === 'solution') body.solution = JSON.parse(draft);
            else body.hints = JSON.parse(draft);

            const updated = await cq.admin.updateLevel(selected.id, body);
            const fresh = await cq.admin.level(selected.id);
            setSelected(fresh);
            setLevels((prev) => prev.map((l) => (l.id === fresh.id ? fresh : l)));
            setNotice('Đã lưu thay đổi.');
            setTimeout(() => setNotice(''), 2500);
        } catch (err) {
            setError(
                err instanceof SyntaxError
                    ? 'JSON không hợp lệ — kiểm tra lại dấu ngoặc/dấu phẩy.'
                    : err instanceof ApiError
                      ? err.message
                      : 'Lưu thất bại.',
            );
        } finally {
            setBusy(false);
        }
    }

    async function runTest() {
        if (!selected) return;
        setBusy(true);
        setError('');
        try {
            const res = await cq.admin.testLevel(selected.id, testCode || undefined);
            setTestResult(res);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Chạy thử thất bại.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Màn chơi</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Sửa đề bài, dữ liệu và luật chấm. Luôn bấm “Chạy thử đáp án” trước khi giao cho sinh viên.
                    </p>
                </div>

                <select
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                    {games.map((g) => (
                        <option key={g.id} value={g.id}>
                            {g.icon} {g.title}
                        </option>
                    ))}
                </select>
            </div>

            {notice && <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}
            {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

            <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
                {/* ── Danh sách màn ───────────────────────────────────────── */}
                <div className="space-y-2">
                    {levels.map((l) => (
                        <button
                            key={l.id}
                            onClick={() => openLevel(l)}
                            className={`w-full rounded-lg border p-3 text-left transition-colors ${
                                selected?.id === l.id
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-slate-200 bg-white hover:border-primary-300'
                            }`}
                        >
                            <p className="text-sm font-semibold text-slate-800">
                                {l.index}. {l.title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                                {l.objectives.length} mục tiêu · {l.xpReward} XP · par {l.parCommands}
                                {!l.isPublished && <span className="ml-1 text-red-500">(ẩn)</span>}
                            </p>
                        </button>
                    ))}
                    {levels.length === 0 && (
                        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                            Game này chưa có màn nào.
                        </p>
                    )}
                </div>

                {/* ── Trình soạn ──────────────────────────────────────────── */}
                {selected ? (
                    <div className="space-y-4">
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-3 pt-2">
                                {(
                                    [
                                        ['brief', 'Đề bài'],
                                        ['objectives', 'Luật chấm'],
                                        ['config', 'Cấu hình thế giới'],
                                        ['solution', 'Đáp án tham khảo'],
                                        ['hints', 'Gợi ý'],
                                    ] as [Tab, string][]
                                ).map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={() => switchTab(key)}
                                        className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${
                                            tab === key ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-3">
                                {tab === 'objectives' && <ObjectiveSummary objectives={selected.objectives ?? []} />}

                                {tab === 'solution' && (
                                    <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                                        <p className="font-bold">Đây KHÔNG phải đáp án duy nhất.</p>
                                        <p className="mt-1 leading-relaxed">
                                            <code className="rounded bg-white px-1">sampleCode</code> chỉ dùng cho việc
                                            kiểm thử: nút “Chạy thử” bên dưới và script <code className="rounded bg-white px-1">npm run test:levels</code>{' '}
                                            dùng nó để xác nhận màn chơi giải được. Sinh viên nộp bài kiểu gì cũng được —
                                            hệ thống chấm theo các mục tiêu ở tab <b>Luật chấm</b>.
                                        </p>
                                        <p className="mt-1.5 leading-relaxed">
                                            Muốn ghi nhận thêm những cách giải hợp lệ khác, thêm mảng{' '}
                                            <code className="rounded bg-white px-1">altSolutions</code>: bộ kiểm thử sẽ chạy
                                            tất cả và báo đỏ nếu có cách đúng nào bị đánh trượt.
                                        </p>
                                    </div>
                                )}

                                <textarea
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    rows={18}
                                    spellCheck={false}
                                    className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs leading-relaxed focus:border-primary-500 focus:outline-none"
                                />
                                <div className="mt-3 flex gap-2">
                                    <button onClick={save} disabled={busy} className="btn-primary !py-2">
                                        {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
                                    </button>
                                    <button onClick={() => switchTab(tab)} className="btn-secondary !py-2">
                                        Hoàn tác
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── Chạy thử ────────────────────────────────────── */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <div className="border-b border-slate-200 px-4 py-2.5">
                                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                                    Chạy thử một cách giải
                                </h3>
                            </div>
                            <div className="space-y-3 p-4">
                                <p className="text-xs text-slate-500">
                                    Dán bất kỳ cách giải nào vào đây để xem bộ chấm có công nhận không — đây là cách
                                    nhanh nhất để kiểm tra luật chấm có quá khắt khe hay không.
                                </p>

                                {/* Nạp nhanh các cách giải đã ghi nhận */}
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        onClick={() => setTestCode(selected.solution?.sampleCode ?? '')}
                                        className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:border-primary-400 hover:text-primary-600"
                                    >
                                        Đáp án mẫu
                                    </button>
                                    {(selected.solution?.altSolutions ?? []).map((alt: string, i: number) => (
                                        <button
                                            key={i}
                                            onClick={() => setTestCode(alt)}
                                            className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:border-primary-400 hover:text-primary-600"
                                        >
                                            Cách giải khác #{i + 1}
                                        </button>
                                    ))}
                                </div>

                                <textarea
                                    value={testCode}
                                    onChange={(e) => setTestCode(e.target.value)}
                                    rows={6}
                                    spellCheck={false}
                                    placeholder="Để trống sẽ dùng solution.sampleCode"
                                    className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs"
                                />
                                <button onClick={runTest} disabled={busy} className="btn-primary !py-2">
                                    ▶ Chạy thử trên engine
                                </button>

                                {testResult && (
                                    <div
                                        className={`rounded-lg border p-3 text-sm ${
                                            testResult.passed
                                                ? 'border-emerald-200 bg-emerald-50'
                                                : 'border-red-200 bg-red-50'
                                        }`}
                                    >
                                        <p className={testResult.passed ? 'font-bold text-emerald-700' : 'font-bold text-red-700'}>
                                            {testResult.passed ? '✓ Màn này giải được' : '✗ Đáp án chưa qua màn'}
                                        </p>

                                        <ul className="mt-2 space-y-1 text-xs">
                                            {testResult.objectives.map((o: any) => (
                                                <li key={o.id} className={o.done ? 'text-emerald-700' : 'text-red-700'}>
                                                    {o.done ? '☑' : '☐'} {o.label}
                                                    {o.detail ? ` — ${o.detail}` : ''}
                                                </li>
                                            ))}
                                        </ul>

                                        {testResult.errors.length > 0 && (
                                            <ul className="mt-2 space-y-1 text-xs text-red-700">
                                                {testResult.errors.map((e: any, i: number) => (
                                                    <li key={i}>⚠ {e.message}</li>
                                                ))}
                                            </ul>
                                        )}

                                        <p className="mt-2 text-xs text-slate-500">
                                            Số lệnh: {testResult.metrics?.commands ?? 0}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 p-12 text-sm text-slate-400">
                        Chọn một màn chơi ở cột bên trái để bắt đầu chỉnh sửa.
                    </div>
                )}
            </div>
        </div>
    );
};

export default LevelsPage;
