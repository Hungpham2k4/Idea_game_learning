/**
 * @file src/components/game/GamePlayer.tsx
 * @description Màn hình chơi game — nơi ghép đủ 4 mảnh:
 *              nhiệm vụ · khung soạn lệnh · sân khấu · console.
 *
 * Luồng: người chơi gõ lệnh → "Chạy thử" (không tính điểm) hoặc "Nộp bài"
 * (server chấm, cộng XP, mở khoá màn/game tiếp theo).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ApiError,
    cq,
    ENGINE_PLACEHOLDER,
    isLoggedIn,
    type CqPlayableLevel,
    type CqRunResult,
    type CqSubmitResponse,
} from '@/lib/codequest';
import CodeEditor from './CodeEditor';
import ConsoleOutput from './ConsoleOutput';
import Markdown from './Markdown';
import ResultModal from './ResultModal';
import GameStage from './stages/GameStage';

interface Props {
    gameSlug: string;
    levelIndex: number;
}

type Tab = 'mission' | 'hints';

const GamePlayer: React.FC<Props> = ({ gameSlug, levelIndex }) => {
    const [level, setLevel] = useState<CqPlayableLevel | null>(null);
    const [loadError, setLoadError] = useState('');
    const [loading, setLoading] = useState(true);

    const [code, setCode] = useState('');
    const [result, setResult] = useState<CqRunResult | null>(null);
    const [running, setRunning] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitData, setSubmitData] = useState<CqSubmitResponse | null>(null);
    const [showResult, setShowResult] = useState(false);

    const [tab, setTab] = useState<Tab>('mission');
    const [hints, setHints] = useState<string[]>([]);
    const [actionError, setActionError] = useState('');

    const startedAt = useRef<number>(Date.now());

    // ── Độ rộng cột trái: kéo giãn được và nhớ lại cho lần sau ──────────────
    const WIDTH_KEY = 'cq_left_width';
    const DEFAULT_WIDTH = 520;
    const MIN_WIDTH = 340;

    const [leftWidth, setLeftWidth] = useState(DEFAULT_WIDTH);
    const [isWide, setIsWide] = useState(false);
    const dragging = useRef(false);

    useEffect(() => {
        try {
            const saved = Number(localStorage.getItem(WIDTH_KEY));
            if (saved >= MIN_WIDTH) setLeftWidth(saved);
        } catch {
            /* bỏ qua */
        }

        const syncWide = () => setIsWide(window.innerWidth >= 1024);
        syncWide();
        window.addEventListener('resize', syncWide);
        return () => window.removeEventListener('resize', syncWide);
    }, []);

    const startResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragging.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMove = (ev: MouseEvent) => {
            if (!dragging.current) return;
            // Giới hạn để không cột nào bị bóp mất
            const max = Math.max(MIN_WIDTH, window.innerWidth - 480);
            const next = Math.min(max, Math.max(MIN_WIDTH, ev.clientX - 16));
            setLeftWidth(next);
        };

        const onUp = () => {
            dragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            setLeftWidth((w) => {
                try {
                    localStorage.setItem(WIDTH_KEY, String(w));
                } catch {
                    /* bỏ qua */
                }
                return w;
            });
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, []);

    const resetWidth = useCallback(() => {
        setLeftWidth(DEFAULT_WIDTH);
        try {
            localStorage.setItem(WIDTH_KEY, String(DEFAULT_WIDTH));
        } catch {
            /* bỏ qua */
        }
    }, []);

    // ── Nạp dữ liệu màn chơi ────────────────────────────────────────────────
    useEffect(() => {
        if (!isLoggedIn()) {
            window.location.href = '/login';
            return;
        }

        let alive = true;
        (async () => {
            try {
                const game = await cq.game(gameSlug);
                const summary = game.levels.find((l) => l.index === levelIndex);
                if (!summary) throw new ApiError('Không tìm thấy màn chơi này.', 404);

                const playable = await cq.level(summary.id);
                if (!alive) return;

                setLevel(playable);
                setCode(playable.starterCode ?? '');
                startedAt.current = Date.now();
            } catch (err) {
                if (!alive) return;
                setLoadError(
                    err instanceof ApiError ? err.message : 'Không tải được màn chơi. Kiểm tra kết nối tới máy chủ.',
                );
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [gameSlug, levelIndex]);

    // ── Chạy thử ────────────────────────────────────────────────────────────
    const handleRun = useCallback(async () => {
        if (!level || running || submitting) return;
        setActionError('');
        setRunning(true);
        try {
            const res = await cq.run(level.id, code);
            setResult(res.result);
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Không gửi được code tới máy chủ.');
        } finally {
            setRunning(false);
        }
    }, [level, code, running, submitting]);

    // ── Nộp bài ─────────────────────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!level || running || submitting) return;
        setActionError('');
        setSubmitting(true);
        try {
            const data = await cq.submit(level.id, code, Date.now() - startedAt.current);
            setResult(data.result);
            setSubmitData(data);
            setShowResult(true);
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Không nộp được bài.');
        } finally {
            setSubmitting(false);
        }
    }, [level, code, running, submitting]);

    // ── Lấy gợi ý ───────────────────────────────────────────────────────────
    async function revealHint() {
        if (!level || hints.length >= level.hintCount) return;
        try {
            const data = await cq.hint(level.id, hints.length);
            setHints((prev) => [...prev, data.hint]);
            setTab('hints');
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Không lấy được gợi ý.');
        }
    }

    // ── Trạng thái tải ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="grid min-h-[70vh] place-items-center">
                <p className="animate-cq-blink font-mono text-cq-neon">Đang nạp màn chơi…</p>
            </div>
        );
    }

    if (loadError || !level) {
        const locked = loadError.includes('mở khoá') || loadError.includes('hoàn thành màn');
        return (
            <div className="mx-auto max-w-lg px-4 py-20 text-center">
                <p className="text-5xl">{locked ? '🔒' : '😵'}</p>
                <h2 className="mt-4 text-xl font-bold text-cq-strong">
                    {locked ? 'Màn này chưa mở khoá' : 'Không mở được màn chơi'}
                </h2>
                <p className="mt-2 text-sm text-cq-muted">{loadError}</p>
                <a href={`/games/${gameSlug}`} className="cq-btn-primary mt-6">
                    ← Về danh sách màn
                </a>
            </div>
        );
    }

    const objectives = result?.objectives ?? level.objectives.map((o) => ({ ...o, done: false, detail: undefined }));
    const doneCount = objectives.filter((o) => o.done && !o.optional).length;
    const requiredCount = objectives.filter((o) => !o.optional).length;

    return (
        <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
            {/* ── Thanh tiêu đề màn ───────────────────────────────────────── */}
            <header className="flex flex-wrap items-center gap-3 border-b border-cq-line bg-cq-panel/60 px-4 py-2.5">
                <a href={`/games/${gameSlug}`} className="text-sm text-cq-muted hover:text-cq-strong">
                    ← {level.game.title}
                </a>

                <span className="text-cq-line">/</span>

                <h1 className="text-sm font-bold text-cq-strong">
                    <span className="text-cq-muted">Màn {level.index}:</span> {level.title}
                </h1>

                <span className="ml-auto flex items-center gap-3 text-xs">
                    <span className="text-cq-muted">
                        Mục tiêu: <span className="text-cq-strong">{doneCount}/{requiredCount}</span>
                    </span>
                    <span className="font-mono text-cq-gold">
                        {'★'.repeat(level.progress.stars)}
                        <span className="text-cq-line">{'★'.repeat(3 - level.progress.stars)}</span>
                    </span>
                    <span className="text-cq-neon">{level.xpReward} XP</span>
                </span>
            </header>

            {/* ── Ba khu vực làm việc ─────────────────────────────────────── */}
            <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:gap-0">
                {/* Cột trái: nhiệm vụ + soạn lệnh — kéo giãn được */}
                <div
                    className="flex min-h-0 flex-col gap-4 lg:shrink-0"
                    style={isWide ? { width: leftWidth } : undefined}
                >
                    {/* Nhiệm vụ / gợi ý */}
                    <section className="cq-panel flex max-h-[52vh] min-h-0 flex-col">
                        <div className="flex items-center gap-1 border-b border-cq-line px-2 pt-2">
                            {(
                                [
                                    ['mission', 'Nhiệm vụ'],
                                    ['hints', `Gợi ý (${hints.length}/${level.hintCount})`],
                                ] as [Tab, string][]
                            ).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setTab(key)}
                                    className={`rounded-t-lg px-3 py-1.5 text-xs font-semibold ${
                                        tab === key ? 'bg-cq-raised text-cq-strong' : 'text-cq-muted hover:text-cq-strong'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
                            {tab === 'mission' ? (
                                <>
                                    <Markdown content={level.brief} />

                                    <div className="mt-4 border-t border-cq-line pt-3">
                                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-cq-muted">
                                            Mục tiêu
                                        </p>
                                        <ul className="space-y-1.5">
                                            {objectives.map((o) => (
                                                <li key={o.id} className="flex gap-2 text-sm">
                                                    <span className={o.done ? 'text-cq-lime' : 'text-cq-line'}>
                                                        {o.done ? '☑' : '☐'}
                                                    </span>
                                                    <span className={o.done ? 'text-cq-text/70 line-through' : 'text-cq-text/90'}>
                                                        {o.label}
                                                        {o.optional && (
                                                            <span className="ml-1 text-[10px] text-cq-gold">(phụ)</span>
                                                        )}
                                                        {'detail' in o && o.detail && (
                                                            <span className="block text-[11px] text-cq-muted">{o.detail}</span>
                                                        )}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    {hints.length === 0 && (
                                        <p className="text-sm text-cq-muted">
                                            Chưa mở gợi ý nào. Mỗi gợi ý sẽ trừ một chút điểm — hãy thử tự nghĩ trước.
                                        </p>
                                    )}
                                    {hints.map((h, i) => (
                                        <p key={i} className="rounded-lg border border-cq-gold/30 bg-cq-gold/5 p-3 text-sm text-cq-text/90">
                                            <span className="mr-1 font-bold text-cq-gold">#{i + 1}</span> {h}
                                        </p>
                                    ))}
                                    {hints.length < level.hintCount && (
                                        <button type="button" onClick={revealHint} className="cq-btn-ghost w-full text-xs">
                                            💡 Mở gợi ý tiếp theo ({hints.length + 1}/{level.hintCount})
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Khung soạn lệnh */}
                    <section className="cq-panel flex min-h-0 flex-col">
                        <div className="cq-panel-head">
                            <span>Khung lệnh</span>
                            <span className="normal-case tracking-normal text-cq-muted">
                                Ctrl+Enter chạy thử · Ctrl+S nộp bài
                            </span>
                        </div>

                        <div className="p-3">
                            <CodeEditor
                                value={code}
                                onChange={setCode}
                                onRun={handleRun}
                                onSubmit={handleSubmit}
                                placeholder={ENGINE_PLACEHOLDER[level.game.engine] ?? ''}
                                disabled={running || submitting}
                            />

                            {actionError && (
                                <p className="mt-2 rounded-lg border border-cq-rose/40 bg-cq-rose/10 px-3 py-2 text-xs text-cq-rose">
                                    {actionError}
                                </p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                                <button type="button" onClick={handleRun} disabled={running || submitting} className="cq-btn-ghost flex-1">
                                    {running ? 'Đang chạy…' : '▶ Chạy thử'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={running || submitting}
                                    className="cq-btn-success flex-1"
                                >
                                    {submitting ? 'Đang chấm…' : '✓ Nộp bài'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCode(level.starterCode ?? '');
                                        setResult(null);
                                    }}
                                    className="cq-btn-ghost"
                                    title="Đặt lại code ban đầu"
                                >
                                    ↺
                                </button>
                            </div>

                            {level.parCommands > 0 && (
                                <p className="mt-2 text-[11px] text-cq-muted">
                                    Lời giải chuẩn dùng khoảng <span className="text-cq-gold">{level.parCommands}</span> lệnh —
                                    dùng ít hơn hoặc bằng để lấy sao thứ ba.
                                </p>
                            )}
                        </div>
                    </section>
                </div>

                {/* Tay nắm kéo giãn — chỉ hiện trên màn hình rộng */}
                <div
                    role="separator"
                    aria-orientation="vertical"
                    onMouseDown={startResize}
                    onDoubleClick={resetWidth}
                    title="Kéo để đổi độ rộng · nhấp đúp để về mặc định"
                    className="group hidden w-4 shrink-0 cursor-col-resize items-center justify-center lg:flex"
                >
                    <span className="h-16 w-1 rounded-full bg-cq-line transition-colors group-hover:bg-cq-neon" />
                </div>

                {/* Cột phải: sân khấu + console */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
                    <GameStage
                        engine={level.game.engine}
                        runtime={level.game.runtime}
                        state={result?.state}
                        frames={result?.frames ?? []}
                        config={level.config}
                        onInsert={(text) => setCode((prev) => (prev.trim() ? `${prev}\n${text}` : text))}
                    />

                    <ConsoleOutput result={result} running={running || submitting} engine={level.game.engine} />
                </div>
            </div>

            {showResult && submitData && (
                <ResultModal
                    data={submitData}
                    gameSlug={gameSlug}
                    onReplay={() => {
                        setShowResult(false);
                        startedAt.current = Date.now();
                    }}
                    onClose={() => setShowResult(false)}
                />
            )}
        </div>
    );
};

export default GamePlayer;
