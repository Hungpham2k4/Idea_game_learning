/**
 * @file src/components/arena/ArenaRoom.tsx
 * @description Phòng đấu: sảnh chờ, ô soạn code, bàn đấu và bảng điểm.
 *
 * Mã phòng đọc từ query string (`/arena/room?code=ABC123`) chứ không phải từ
 * đường dẫn động. Lý do: frontend build ra HTML tĩnh cho GitHub Pages, mà mã
 * phòng thì sinh ra lúc chạy nên không thể tạo trước trang cho từng mã.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import ArenaBoard from './ArenaBoard';
import ArenaDocsPanel from './ArenaDocsPanel';
import {
    connectArena,
    MODE_HINT,
    MODE_LABEL,
    SLOT_COLORS,
    type RoomState,
    type RoundFeedback,
    type RoundResult,
} from '../../lib/arena';
import { getCachedUser, isLoggedIn } from '../../lib/codequest';

type LogLine = { id: number; text: string; tone: 'normal' | 'mine' | 'error' | 'system' };

let logSeq = 0;

const STARTER_CODE = `// Lượt này bạn muốn làm gì?
if (enemyNearby()) {
    attack(nearestEnemy());
} else {
    moveTo(nearestResource());
    collect();
}`;

const ArenaRoom: React.FC = () => {
    const [roomCode, setRoomCode] = useState('');
    const [state, setState] = useState<RoomState | null>(null);
    const [result, setResult] = useState<RoundResult | null>(null);
    const [feedback, setFeedback] = useState<RoundFeedback | null>(null);
    const [finalRanking, setFinalRanking] = useState<any[] | null>(null);
    const [code, setCode] = useState(STARTER_CODE);
    const [error, setError] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [log, setLog] = useState<LogLine[]>([]);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [showDocs, setShowDocs] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const logRef = useRef<HTMLDivElement>(null);
    const me = useMemo(() => getCachedUser(), []);

    const addLog = useCallback((text: string, tone: LogLine['tone'] = 'normal') => {
        setLog((prev) => [...prev.slice(-140), { id: ++logSeq, text, tone }]);
    }, []);

    // ── Kết nối ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get('code')?.toUpperCase() ?? '';
        setRoomCode(code);

        if (!code) {
            setError('Thiếu mã phòng trong địa chỉ. Hãy quay lại sảnh và chọn phòng.');
            return;
        }
        if (!isLoggedIn()) {
            window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            return;
        }

        const socket = connectArena();
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            setError(null);
            socket.emit('room:join', { roomCode: code });
        });

        socket.on('disconnect', () => {
            setConnected(false);
            addLog('Mất kết nối — đang thử nối lại…', 'system');
        });

        socket.on('room:joined', (payload: any) => {
            setState(payload.state);
            if (payload.state?.myCode) setCode(payload.state.myCode);
            addLog(`Bạn vào phòng ${code} ở vị trí ${payload.seat.slot + 1}.`, 'system');
        });

        socket.on('room:state', (s: RoomState) => {
            setState(s);
            setSubmitted(s.seats.find((x) => x.userId === me?.id)?.submitted ?? false);
        });

        socket.on('round:start', (s: RoomState) => {
            setState(s);
            setResult(null);
            setFeedback(null);
            setSubmitted(false);
            if (s.myCode) setCode(s.myCode);
            addLog(`── Lượt ${s.round}/${s.totalRounds} — ${s.secondsLeft}s để viết ──`, 'system');
        });

        socket.on('round:submitted', (p: { userId: string; submitted: string[] }) => {
            setState((prev) =>
                prev
                    ? {
                          ...prev,
                          seats: prev.seats.map((x) => ({ ...x, submitted: p.submitted.includes(x.userId) })),
                      }
                    : prev,
            );
        });

        socket.on('round:result', (r: RoundResult) => {
            setResult(r);
            setState((prev) => (prev ? { ...prev, world: r.world, standings: r.standings, phase: 'review' } : prev));
        });

        socket.on('round:feedback', (f: RoundFeedback) => {
            setFeedback(f);
            for (const line of f.output ?? []) addLog(line, 'mine');
            if (f.error) addLog(`Lỗi dòng ${f.errorLine ?? '?'}: ${f.error}`, 'error');
        });

        socket.on('match:finished', (p: any) => {
            setFinalRanking(p.ranking);
            addLog('── Trận đấu kết thúc ──', 'system');
        });

        socket.on('arena:error', (e: { message: string }) => setError(e.message));

        return () => {
            socket.close();
            socketRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Đồng hồ đếm lùi (client tự đếm, server không bơm từng giây) ─────────
    useEffect(() => {
        if (!state) return;
        setSecondsLeft(state.secondsLeft);
        if (state.secondsLeft <= 0) return;

        const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(id);
    }, [state?.phase, state?.round, state?.secondsLeft]);

    useEffect(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
    }, [log]);

    // ── Hành động ───────────────────────────────────────────────────────────
    const emit = (event: string, payload?: unknown) => socketRef.current?.emit(event, payload ?? {});

    const submit = () => {
        if (state?.phase !== 'writing' || submitted) return;
        emit('round:submit', { code, language: 'js' });
        setSubmitted(true);
        addLog('Đã nộp bài cho lượt này.', 'system');
    };

    // Ctrl+Enter để nộp — tay vẫn ở bàn phím, không phải với chuột
    const onEditorKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            submit();
        }
    };

    const mySeat = state?.seats.find((s) => s.userId === me?.id);
    const isHost = mySeat?.isHost ?? false;
    const phase = state?.phase ?? 'lobby';

    // ── Màn hình lỗi ────────────────────────────────────────────────────────
    if (error && !state) {
        return (
            <div className="mx-auto max-w-lg rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center">
                <p className="text-lg font-bold text-cq-strong">Không vào được phòng</p>
                <p className="mt-2 text-sm text-cq-dim">{error}</p>
                <a href="/arena" className="cq-btn-primary mt-5 inline-flex">
                    ← Về sảnh đấu trường
                </a>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[1500px]">
            {/* ── Thanh trạng thái ───────────────────────────────────────── */}
            <div className="mb-4 flex flex-wrap items-center gap-3 cq-glass p-3">
                <span className="rounded-lg bg-cq-neon/15 px-3 py-1.5 font-mono text-lg font-bold tracking-[0.25em] text-cq-neon">
                    {roomCode}
                </span>
                <button
                    onClick={() => {
                        void navigator.clipboard?.writeText(window.location.href);
                        addLog('Đã sao chép link mời vào phòng.', 'system');
                    }}
                    className="rounded-lg border border-cq-line px-3 py-1.5 text-xs font-semibold text-cq-dim hover:text-cq-strong"
                >
                    Sao chép link mời
                </button>

                {state && (
                    <span className="text-sm text-cq-dim">
                        <b className="text-cq-strong">{state.map.name}</b> · {MODE_LABEL[state.map.mode]}
                    </span>
                )}

                <span className="ml-auto flex items-center gap-3">
                    <span
                        className={`flex items-center gap-1.5 text-xs font-semibold ${connected ? 'text-emerald-400' : 'text-amber-400'}`}
                    >
                        <span
                            className={`h-2 w-2 rounded-full ${connected ? 'animate-[cqPulseDot_1.8s_ease-in-out_infinite] bg-emerald-400' : 'bg-amber-400'}`}
                        />
                        {connected ? 'Đã kết nối' : 'Đang nối lại…'}
                    </span>
                    <a href="/arena" className="text-xs font-semibold text-cq-dim hover:text-cq-strong">
                        Rời phòng
                    </a>
                </span>
            </div>

            {error && (
                <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
                    {error}
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
                {/* ══ Cột trái: bàn đấu ═══════════════════════════════════ */}
                <div className="space-y-4">
                    {phase === 'lobby' ? (
                        <LobbyPanel state={state} isHost={isHost} onStart={() => emit('room:start')} onReady={(r) => emit('room:ready', { ready: r })} meId={me?.id} />
                    ) : (
                        <>
                            <div className="flex items-center gap-3 cq-glass px-4 py-2.5">
                                <span className="text-sm font-bold text-cq-strong">
                                    Lượt {state?.round}/{state?.totalRounds}
                                </span>
                                <PhaseBadge phase={phase} />
                                <span className="ml-auto flex items-center gap-2">
                                    <span
                                        className={`font-mono text-2xl font-black tabular-nums ${
                                            secondsLeft <= 10 && phase === 'writing' ? 'animate-[cqPulseDot_1s_ease-in-out_infinite] text-red-400' : 'text-cq-strong'
                                        }`}
                                    >
                                        {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
                                        {String(secondsLeft % 60).padStart(2, '0')}
                                    </span>
                                </span>
                            </div>

                            <ArenaBoard
                                world={state?.world ?? null}
                                frames={result?.frames ?? []}
                                playbackKey={result ? `r${result.round}` : 'idle'}
                                meId={me?.id}
                                onFrame={(f) => addLog(f.text)}
                            />
                        </>
                    )}

                    <StandingsTable standings={state?.standings ?? []} meId={me?.id} mode={state?.map.mode} />
                </div>

                {/* ══ Cột phải: viết code ═════════════════════════════════ */}
                <div className="space-y-4">
                    <div className="cq-glass">
                        <div className="flex items-center gap-2 border-b border-cq-line px-4 py-2.5">
                            <span className="text-sm font-bold text-cq-strong">Chương trình lượt này</span>
                            <button
                                onClick={() => setShowDocs((v) => !v)}
                                className="ml-auto rounded-lg border border-cq-line px-2.5 py-1 text-[11px] font-semibold text-cq-dim hover:text-cq-strong"
                            >
                                {showDocs ? 'Ẩn' : 'Tra cứu hàm'}
                            </button>
                        </div>

                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onKeyDown={onEditorKey}
                            spellCheck={false}
                            disabled={phase !== 'writing'}
                            rows={14}
                            className="w-full resize-y bg-transparent p-4 font-mono text-[13px] leading-relaxed text-cq-strong outline-none disabled:opacity-50"
                            placeholder="Viết Java, JavaScript hay Python đều được…"
                        />

                        <div className="flex items-center gap-2 border-t border-cq-line px-4 py-3">
                            <button
                                onClick={submit}
                                disabled={phase !== 'writing' || submitted}
                                className="cq-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {submitted ? '✓ Đã nộp — chờ mọi người' : 'Nộp bài'}
                            </button>
                            <span className="text-[11px] text-cq-dim">Ctrl + Enter</span>
                        </div>

                        {feedback?.error && (
                            <div className="border-t border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
                                <b>Dòng {feedback.errorLine ?? '?'}:</b> {feedback.error}
                            </div>
                        )}
                    </div>

                    {showDocs && <ArenaDocsPanel onInsert={(s) => setCode((c) => `${c}\n${s}`)} />}

                    {state?.map.briefing && phase === 'lobby' && (
                        <div className="cq-glass p-4">
                            <p className="mb-2 text-sm font-bold text-cq-strong">Chiến thuật gợi ý</p>
                            <p className="whitespace-pre-line text-xs leading-relaxed text-cq-dim">{state.map.briefing}</p>
                        </div>
                    )}

                    {/* Nhật ký trận đấu */}
                    <div className="cq-glass">
                        <p className="border-b border-cq-line px-4 py-2.5 text-sm font-bold text-cq-strong">
                            Nhật ký trận đấu
                        </p>
                        <div ref={logRef} className="max-h-72 space-y-1 overflow-y-auto p-3 font-mono text-[11.5px] leading-relaxed">
                            {log.length === 0 && <p className="text-cq-dim">Chưa có gì xảy ra.</p>}
                            {log.map((l) => (
                                <p
                                    key={l.id}
                                    className={
                                        l.tone === 'error'
                                            ? 'text-red-400'
                                            : l.tone === 'system'
                                              ? 'font-semibold text-cq-neon'
                                              : l.tone === 'mine'
                                                ? 'text-amber-300'
                                                : 'text-cq-dim'
                                    }
                                >
                                    {l.text}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {finalRanking && <FinalOverlay ranking={finalRanking} meId={me?.id} matchId={state?.matchId} />}
        </div>
    );
};

// ─── Thành phần phụ ──────────────────────────────────────────────────────────

const PhaseBadge: React.FC<{ phase: string }> = ({ phase }) => {
    const map: Record<string, [string, string]> = {
        writing: ['Đang viết code', 'bg-cq-neon/15 text-cq-neon'],
        resolving: ['Đang chạy…', 'bg-amber-500/15 text-amber-400'],
        review: ['Xem lại kết quả', 'bg-emerald-500/15 text-emerald-400'],
        finished: ['Đã kết thúc', 'bg-cq-line text-cq-dim'],
    };
    const [label, cls] = map[phase] ?? ['—', 'bg-cq-line text-cq-dim'];
    return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>{label}</span>;
};

const LobbyPanel: React.FC<{
    state: RoomState | null;
    isHost: boolean;
    meId?: string;
    onStart: () => void;
    onReady: (ready: boolean) => void;
}> = ({ state, isHost, meId, onStart, onReady }) => {
    if (!state) {
        return (
            <div className="grid h-64 place-items-center cq-glass text-sm text-cq-dim">
                Đang vào phòng…
            </div>
        );
    }

    const mySeat = state.seats.find((s) => s.userId === meId);
    const enough = state.seats.length >= state.map.minPlayers;

    return (
        <div className="cq-glass p-5">
            <p className="text-lg font-extrabold text-cq-strong">Sảnh chờ</p>
            <p className="mt-1 text-sm text-cq-dim">
                {MODE_HINT[state.map.mode]} · {state.map.width}×{state.map.height} · {state.map.totalRounds} lượt ·{' '}
                {state.map.writeSeconds}s mỗi lượt
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {Array.from({ length: state.map.maxPlayers }, (_, i) => {
                    const seat = state.seats.find((s) => s.slot === i);
                    const color = SLOT_COLORS[i % SLOT_COLORS.length];
                    return (
                        <div
                            key={i}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                                seat ? 'border-cq-line bg-cq-bg' : 'border-dashed border-cq-line/60'
                            }`}
                        >
                            <span
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                                style={{ backgroundColor: seat ? color : 'transparent', border: seat ? 'none' : `1px dashed ${color}` }}
                            >
                                {i + 1}
                            </span>
                            {seat ? (
                                <>
                                    <span className="truncate text-sm font-semibold text-cq-strong">
                                        {seat.name}
                                        {seat.userId === meId && ' (bạn)'}
                                    </span>
                                    {seat.isHost && (
                                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                                            CHỦ PHÒNG
                                        </span>
                                    )}
                                    <span
                                        className={`ml-auto text-[11px] font-bold ${seat.ready ? 'text-emerald-400' : 'text-cq-dim'}`}
                                    >
                                        {seat.ready ? 'Sẵn sàng' : 'Đang chờ'}
                                    </span>
                                </>
                            ) : (
                                <span className="text-sm text-cq-dim">Còn trống</span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
                <button onClick={() => onReady(!mySeat?.ready)} className="cq-btn border border-cq-line">
                    {mySeat?.ready ? 'Bỏ sẵn sàng' : 'Tôi đã sẵn sàng'}
                </button>

                {isHost ? (
                    <button onClick={onStart} disabled={!enough} className="cq-btn-primary disabled:opacity-40">
                        Bắt đầu trận
                    </button>
                ) : (
                    <span className="text-sm text-cq-dim">Chờ chủ phòng bấm bắt đầu…</span>
                )}

                {!enough && (
                    <span className="text-xs text-amber-400">
                        Cần ít nhất {state.map.minPlayers} người (đang có {state.seats.length})
                    </span>
                )}
            </div>
        </div>
    );
};

const StandingsTable: React.FC<{ standings: any[]; meId?: string; mode?: string }> = ({ standings, meId, mode }) => {
    if (standings.length === 0) return null;
    const sorted = [...standings].sort((a, b) => b.score - a.score);

    return (
        <div className="overflow-hidden cq-glass">
            <p className="border-b border-cq-line px-4 py-2.5 text-sm font-bold text-cq-strong">Bảng điểm</p>
            <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-cq-dim">
                    <tr>
                        <th className="px-4 py-2 text-left font-semibold">Người chơi</th>
                        <th className="px-2 py-2 text-right font-semibold">Máu</th>
                        <th className="px-2 py-2 text-right font-semibold">⚡</th>
                        {mode === 'territory' && <th className="px-2 py-2 text-right font-semibold">Ô</th>}
                        {mode !== 'territory' && <th className="px-2 py-2 text-right font-semibold">Hạ</th>}
                        <th className="px-4 py-2 text-right font-semibold">Điểm</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((s, i) => (
                        <tr
                            key={s.userId}
                            className={`border-t border-cq-line/60 ${s.userId === meId ? 'bg-cq-neon/5' : ''}`}
                        >
                            <td className="px-4 py-2">
                                <span className="flex items-center gap-2">
                                    <span className="w-4 text-[11px] font-bold text-cq-dim">{i + 1}</span>
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: SLOT_COLORS[s.slot % SLOT_COLORS.length] }}
                                    />
                                    <span className={`truncate font-semibold ${s.alive ? 'text-cq-strong' : 'text-cq-dim line-through'}`}>
                                        {s.name}
                                    </span>
                                </span>
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-cq-dim">{s.hp}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-cq-dim">{s.energy}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-cq-dim">
                                {mode === 'territory' ? s.tiles : s.kills}
                            </td>
                            <td className="px-4 py-2 text-right font-bold tabular-nums text-cq-strong">
                                {s.score}
                                {s.delta > 0 && <span className="ml-1 text-[11px] font-semibold text-emerald-400">+{s.delta}</span>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const FinalOverlay: React.FC<{ ranking: any[]; meId?: string; matchId?: string }> = ({ ranking, meId, matchId }) => (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md cq-glass p-6">
            <p className="text-center text-2xl font-black text-cq-strong">Kết thúc trận</p>

            <div className="mt-5 space-y-2">
                {ranking.map((r) => (
                    <div
                        key={r.userId}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                            r.userId === meId ? 'bg-cq-neon/10 ring-1 ring-cq-neon/40' : 'bg-cq-bg'
                        }`}
                    >
                        <span className="w-7 text-center text-lg">
                            {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}
                        </span>
                        <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: SLOT_COLORS[(r.slot ?? 0) % SLOT_COLORS.length] }}
                        />
                        <span className="flex-1 truncate font-semibold text-cq-strong">{r.name}</span>
                        <span className="font-bold tabular-nums text-cq-strong">{r.score}</span>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex gap-2">
                <a href="/arena" className="cq-btn-primary flex-1 justify-center">
                    Về sảnh
                </a>
                {matchId && (
                    <a href={`/arena/replay?match=${matchId}`} className="cq-btn flex-1 justify-center border border-cq-line">
                        Xem lại trận
                    </a>
                )}
            </div>
        </div>
    </div>
);

export default ArenaRoom;
