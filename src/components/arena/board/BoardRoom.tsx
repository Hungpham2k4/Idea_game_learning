/**
 * @file src/components/arena/board/BoardRoom.tsx
 * @description Phòng chơi cờ tỷ phú: sảnh chờ, bàn cờ, xúc xắc, bảng giải bài.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import BoardCanvas from './BoardCanvas';
import Dice3D from './Dice3D';
import GameBanner, { useBannerQueue, type BannerKind } from './GameBanner';
import ProblemPanel from './ProblemPanel';
import { connectArena } from '../../../lib/arena';
import {
    DIFFICULTY_COLOR,
    SLOT_COLORS,
    TILE_STYLE,
    type BoardEvent,
    type BoardRoomState,
    type MyGradeResult,
} from '../../../lib/board';
import { getCachedUser, isLoggedIn } from '../../../lib/codequest';
import {
    LeaveConfirm,
    NoticeStack,
    useLeaveWarning,
    useRoomNotices,
} from '../RoomNotices';

type LogLine = { id: number; text: string; tone: 'normal' | 'good' | 'bad' | 'system' };
let logSeq = 0;

/** Sự kiện nào tô màu gì trong nhật ký. */
const TONE: Record<string, LogLine['tone']> = {
    problemSolved: 'good',
    bonus: 'good',
    shield: 'good',
    lap: 'good',
    win: 'system',
    problemFailed: 'bad',
    trap: 'bad',
    jail: 'bad',
    skip: 'bad',
    roll: 'system',
};


/**
 * Dịch một sự kiện của server thành băng thông báo.
 *
 * Trả về `null` cho những sự kiện vụn (di chuyển, đổ xúc xắc) — hiện băng cho
 * mọi thứ thì băng mất hết ý nghĩa, chỉ những khoảnh khắc đáng dừng lại mới
 * xứng đáng chiếm giữa màn hình.
 */
function eventToBanner(
    e: BoardEvent,
    meId: string | undefined,
    nameOf: (id?: string) => string,
): { kind: BannerKind; title: string; subtitle?: string; amount?: number; duration?: number } | null {
    const mine = e.actorId === meId;
    const who = mine ? 'Bạn' : nameOf(e.actorId);

    switch (e.kind) {
        case 'problemStart':
            return {
                kind: 'problem',
                title: mine ? 'Thử thách của bạn!' : `${who} gặp thử thách`,
                subtitle: mine ? 'Viết một hàm giải bài — đúng thì được thưởng' : 'Cùng nghĩ thử xem giải thế nào',
                duration: 2000,
            };
        case 'problemSolved':
            return {
                kind: 'solved',
                title: mine ? 'Giải đúng!' : `${who} giải đúng`,
                subtitle: mine ? 'Chuẩn không cần chỉnh' : undefined,
                amount: e.amount,
                duration: 2400,
            };
        case 'problemFailed':
            return {
                kind: 'failed',
                title: mine ? 'Chưa đúng' : `${who} chưa giải được`,
                subtitle: mine ? 'Lượt sau gỡ lại' : undefined,
                amount: e.amount,
                duration: 2400,
            };
        case 'chance':
            return { kind: 'chance', title: 'Ô cơ hội', subtitle: e.text, duration: 2600 };
        case 'trap':
            return { kind: 'trap', title: `${who} dính chướng ngại`, subtitle: e.text, amount: e.amount, duration: 2300 };
        case 'bonus':
            return { kind: 'bonus', title: `${who} nhận thưởng`, amount: e.amount, duration: 1900 };
        case 'shield':
            return { kind: 'shield', title: `${who} nhận khiên`, subtitle: 'Đỡ trọn một lần phạt bất kỳ', duration: 1900 };
        case 'shieldUsed':
            return { kind: 'shield', title: 'Khiên đã đỡ đòn!', subtitle: e.text, duration: 2100 };
        case 'jail':
            return { kind: 'jail', title: `${who} phải nghỉ lượt`, subtitle: e.text, duration: 2100 };
        case 'warp':
            return { kind: 'warp', title: `${who} bị dịch chuyển`, subtitle: e.text, duration: 2000 };
        case 'lap':
            return { kind: 'lap', title: `${who} đi hết một vòng`, amount: e.amount, duration: 2000 };
        case 'win':
            return { kind: 'win', title: 'Kết thúc ván!', subtitle: e.text, duration: 3200 };
        default:
            return null;
    }
}

const BoardRoom: React.FC = () => {
    const [roomCode, setRoomCode] = useState('');
    const [state, setState] = useState<BoardRoomState | null>(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [log, setLog] = useState<LogLine[]>([]);
    const [secondsLeft, setSecondsLeft] = useState(0);

    const [rolling, setRolling] = useState(false);
    const [dice, setDice] = useState<number[]>([]);
    const [highlight, setHighlight] = useState<number | null>(null);

    const [myResult, setMyResult] = useState<MyGradeResult | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [finalRanking, setFinalRanking] = useState<any[] | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const logRef = useRef<HTMLDivElement>(null);
    const me = useMemo(() => getCachedUser(), []);
    // Handler socket chỉ đăng ký một lần nên phải đọc `me` qua ref,
    // không thì nó giữ mãi giá trị của lần render đầu.
    const meRef = useRef(me);
    meRef.current = me;

    const { notices, push: pushNotice } = useRoomNotices();
    const banner = useBannerQueue();
    const [confirmLeave, setConfirmLeave] = useState(false);
    // Còn ở sảnh thì rời tự do; đang chơi mới cần cảnh báo
    const inGame = !!state && state.phase !== 'lobby' && state.phase !== 'finished';
    useLeaveWarning(inGame);

    const addLog = useCallback((text: string, tone: LogLine['tone'] = 'normal') => {
        setLog((prev) => [...prev.slice(-160), { id: ++logSeq, text, tone }]);
    }, []);

    const pushEvents = useCallback(
        (events: BoardEvent[]) => {
            for (const e of events) addLog(e.text, TONE[e.kind] ?? 'normal');
        },
        [addLog],
    );

    // ── Kết nối ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get('code')?.toUpperCase() ?? '';
        setRoomCode(code);

        if (!code) {
            setError('Thiếu mã phòng trong địa chỉ.');
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

        socket.on('room:joined', (p: any) => {
            setState(p.state);
            addLog(`Bạn vào bàn ${code}, quân số ${p.seat.slot + 1}.`, 'system');
        });

        socket.on('room:state', (s: BoardRoomState) => {
            setState(s);
            if (s.phase !== 'solving') {
                setSubmitted(false);
                setMyResult(null);
            }
        });

        socket.on('board:events', (p: { events: BoardEvent[]; world: any; phase: string }) => {
            pushEvents(p.events);

            const nameOf = (id?: string) =>
                p.world?.players?.find((x: any) => x.id === id)?.name ?? 'Người chơi';
            for (const e of p.events) {
                const b = eventToBanner(e, meRef.current?.id, nameOf);
                if (b) banner.push(b);
            }

            const roll = p.events.find((e) => e.kind === 'roll');
            if (roll?.dice?.length) {
                setRolling(true);
                setDice(roll.dice);
                // Lắc 900ms rồi mới hiện kết quả — cảm giác "đổ" thật hơn là hiện ngay
                setTimeout(() => setRolling(false), 900);
            }

            const land = p.events.find((e) => e.kind === 'land');
            if (land?.to !== undefined) {
                setTimeout(() => setHighlight(land.to!), 950);
                setTimeout(() => setHighlight(null), 3200);
            }

            setState((prev) => (prev ? { ...prev, world: p.world, phase: p.phase as any } : prev));
        });

        socket.on('board:problem', (p: { solverId: string; problem: any; seconds: number }) => {
            setMyResult(null);
            setSubmitted(false);
            setState((prev) =>
                prev ? { ...prev, phase: 'solving', problem: p.problem, solverId: p.solverId, secondsLeft: p.seconds } : prev,
            );
        });

        socket.on('board:solveResult', (p: any) => {
            pushEvents(p.events ?? []);

            const nameOf = (id?: string) =>
                p.world?.players?.find((x: any) => x.id === id)?.name ?? 'Người chơi';
            for (const e of p.events ?? []) {
                const b = eventToBanner(e, meRef.current?.id, nameOf);
                if (b) banner.push(b);
            }
            setState((prev) => (prev ? { ...prev, world: p.world, phase: 'resolved', problem: null } : prev));
        });

        socket.on('board:myResult', (r: MyGradeResult) => {
            setMyResult(r);
            for (const line of r.output ?? []) addLog(line, 'normal');
        });

        socket.on('board:finished', (p: any) => {
            setFinalRanking(p.ranking);
            addLog('── Ván cờ kết thúc ──', 'system');
        });

        socket.on('room:notice', (n: { kind: any; text: string }) => {
            pushNotice({ kind: n.kind, text: n.text });
            addLog(n.text, 'system');
        });

        socket.on('arena:error', (e: { message: string }) => setError(e.message));

        return () => {
            socket.close();
            socketRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    // ── Báo khi đổi lượt ─────────────────────────────────────────────────────
    // Chỉ báo khi người tới lượt THỰC SỰ đổi, không báo lại mỗi lần state
    // được phát (state phát rất nhiều lần trong một lượt).
    const lastTurnRef = useRef<string | null>(null);
    useEffect(() => {
        const cur = state?.currentPlayerId ?? null;
        if (!cur || state?.phase !== 'awaitingRoll') return;
        if (lastTurnRef.current === cur) return;
        lastTurnRef.current = cur;

        const isMe = cur === me?.id;
        const name = world?.players.find((p) => p.id === cur)?.name ?? 'Người chơi';
        banner.push(
            isMe
                ? { kind: 'yourTurn', title: 'Đến lượt bạn!', subtitle: 'Bấm đổ xúc xắc để đi', duration: 2000 }
                : { kind: 'otherTurn', title: `Lượt của ${name}`, subtitle: 'Đang chờ họ đổ xúc xắc…', duration: 1600 },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state?.currentPlayerId, state?.phase]);

    // Đồng hồ đếm lùi ở client, server không bơm từng giây
    useEffect(() => {
        if (!state) return;
        setSecondsLeft(state.secondsLeft);
        if (state.secondsLeft <= 0) return;
        const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(id);
    }, [state?.phase, state?.secondsLeft]);

    useEffect(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
    }, [log]);

    const emit = (event: string, payload?: unknown) => socketRef.current?.emit(event, payload ?? {});

    const mySeat = state?.seats.find((s) => s.userId === me?.id);
    const isHost = mySeat?.isHost ?? false;
    const phase = state?.phase ?? 'lobby';
    const world = state?.world ?? null;
    const isMyTurn = state?.currentPlayerId === me?.id;
    const currentName = world?.players.find((p) => p.id === state?.currentPlayerId)?.name ?? '—';

    if (error && !state) {
        return (
            <div className="cq-glass mx-auto max-w-lg p-6 text-center">
                <p className="text-lg font-bold text-cq-strong">Không vào được bàn cờ</p>
                <p className="mt-2 text-sm text-cq-muted">{error}</p>
                <a href="/arena" className="cq-btn-primary mt-5 inline-flex">← Về sảnh</a>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[1500px]">
            {/* ── Thanh trạng thái ───────────────────────────────────────── */}
            <div className="cq-glass mb-4 flex flex-wrap items-center gap-3 p-3">
                <span className="rounded-lg bg-cq-neon/15 px-3 py-1.5 font-mono text-lg font-black tracking-[0.25em] text-cq-neon">
                    {roomCode}
                </span>
                <button
                    onClick={() => {
                        void navigator.clipboard?.writeText(window.location.href);
                        addLog('Đã sao chép link mời.', 'system');
                    }}
                    className="rounded-lg border border-cq-line px-3 py-1.5 text-xs font-semibold text-cq-muted hover:text-cq-strong"
                >
                    Sao chép link mời
                </button>

                {state && (
                    <span className="text-sm text-cq-muted">
                        <b className="text-cq-strong">{state.map.name}</b>
                        {world && ` · vòng ${world.round}/${world.maxRounds} · về đích ${world.targetScore} điểm`}
                    </span>
                )}

                <span className="ml-auto flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold ${connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                        <span className={`h-2 w-2 rounded-full ${connected ? 'animate-[cqPulseDot_1.8s_ease-in-out_infinite] bg-emerald-400' : 'bg-amber-400'}`} />
                        {connected ? 'Đã kết nối' : 'Đang nối lại…'}
                    </span>
                    <button
                        onClick={() => setConfirmLeave(true)}
                        className="text-xs font-semibold text-cq-muted transition hover:text-cq-strong"
                    >
                        Rời bàn
                    </button>
                </span>
            </div>

            {error && (
                <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
                    {error}
                </div>
            )}

            {/* ── Đang giải bài: chiếm trọn màn hình ─────────────────────── */}
            {phase === 'solving' && state?.problem ? (
                <ProblemPanel
                    problem={state.problem}
                    isMine={state.solverId === me?.id}
                    solverName={world?.players.find((p) => p.id === state.solverId)?.name ?? '—'}
                    secondsLeft={secondsLeft}
                    result={myResult}
                    submitted={submitted}
                    onSubmit={(code, language) => {
                        setSubmitted(true);
                        emit('board:submit', { code, language });
                    }}
                />
            ) : (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                    {/* ── Bàn cờ ─────────────────────────────────────── */}
                    <div className="space-y-4">
                        {phase === 'lobby' ? (
                            <LobbyPanel
                                state={state}
                                isHost={isHost}
                                meId={me?.id}
                                onStart={() => emit('room:start')}
                                onReady={(r) => emit('room:ready', { ready: r })}
                            />
                        ) : (
                            <>
                                <BoardCanvas
                                    tiles={world?.tiles ?? []}
                                    players={world?.players ?? []}
                                    currentPlayerId={state?.currentPlayerId}
                                    meId={me?.id}
                                    highlightTile={highlight}
                                />

                                {/* Khu vực đổ xúc xắc */}
                                <div className="cq-glass flex flex-wrap items-center gap-4 p-4">
                                    <div className="flex items-center gap-4 pb-2">
                                        {(dice.length ? dice : [1]).map((d, i) => (
                                            <Dice3D key={i} value={d} rolling={rolling} size={62} index={i} />
                                        ))}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        {phase === 'awaitingRoll' ? (
                                            isMyTurn ? (
                                                <p className="text-sm font-bold text-cq-neon">Tới lượt bạn!</p>
                                            ) : (
                                                <p className="text-sm text-cq-muted">
                                                    Đang chờ <b className="text-cq-strong">{currentName}</b> đổ xúc xắc…
                                                </p>
                                            )
                                        ) : (
                                            <p className="text-sm text-cq-muted">
                                                {phase === 'resolved' ? 'Đang tính kết quả…' : 'Đang di chuyển…'}
                                            </p>
                                        )}
                                        {secondsLeft > 0 && phase === 'resolved' && (
                                            <p className="text-xs text-cq-muted">Lượt kế sau {secondsLeft}s</p>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => emit('board:roll')}
                                        disabled={phase !== 'awaitingRoll' || !isMyTurn}
                                        className="cq-btn-primary px-8 disabled:opacity-30"
                                    >
                                        🎲 Đổ xúc xắc
                                    </button>
                                </div>
                            </>
                        )}

                        {world && <ScoreTable world={world} meId={me?.id} currentPlayerId={state?.currentPlayerId} />}
                    </div>

                    {/* ── Cột phải ───────────────────────────────────── */}
                    <div className="space-y-4">
                        {phase === 'lobby' && state?.map.briefing && (
                            <div className="cq-glass p-4">
                                <p className="mb-2 text-sm font-bold text-cq-strong">Luật chơi</p>
                                <p className="whitespace-pre-line text-xs leading-relaxed text-cq-muted">
                                    {state.map.briefing}
                                </p>
                            </div>
                        )}

                        {world && <TileLegend tiles={world.tiles} />}

                        <div className="cq-glass">
                            <p className="border-b border-cq-line px-4 py-2.5 text-sm font-bold text-cq-strong">
                                Diễn biến
                            </p>
                            <div ref={logRef} className="max-h-80 space-y-1 overflow-y-auto p-3 text-[12px] leading-relaxed">
                                {log.length === 0 && <p className="text-cq-muted">Chưa có gì xảy ra.</p>}
                                {log.map((l) => (
                                    <p
                                        key={l.id}
                                        className={
                                            l.tone === 'good'
                                                ? 'text-emerald-400'
                                                : l.tone === 'bad'
                                                  ? 'text-rose-400'
                                                  : l.tone === 'system'
                                                    ? 'font-semibold text-cq-neon'
                                                    : 'text-cq-muted'
                                        }
                                    >
                                        {l.text}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <GameBanner item={banner.current} onDone={banner.next} />

            <NoticeStack notices={notices} />

            <LeaveConfirm
                open={confirmLeave}
                inGame={inGame}
                onCancel={() => setConfirmLeave(false)}
                onConfirm={() => {
                    emit('room:leave');
                    window.location.href = '/arena';
                }}
            />

            {finalRanking && <FinalOverlay ranking={finalRanking} meId={me?.id} />}
        </div>
    );
};

// ─── Thành phần phụ ──────────────────────────────────────────────────────────

const LobbyPanel: React.FC<{
    state: BoardRoomState | null;
    isHost: boolean;
    meId?: string;
    onStart: () => void;
    onReady: (r: boolean) => void;
}> = ({ state, isHost, meId, onStart, onReady }) => {
    if (!state) {
        return <div className="cq-glass grid h-64 place-items-center text-sm text-cq-muted">Đang vào bàn…</div>;
    }
    const mySeat = state.seats.find((s) => s.userId === meId);
    const enough = state.seats.length >= state.map.minPlayers;

    return (
        <div className="cq-glass p-5">
            <p className="text-lg font-extrabold text-cq-strong">Sảnh chờ</p>
            <p className="mt-1 text-sm text-cq-muted">
                {state.map.minPlayers}–{state.map.maxPlayers} người · tối đa {state.map.maxRounds} vòng · về đích ở{' '}
                {state.map.targetScore} điểm
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {Array.from({ length: state.map.maxPlayers }, (_, i) => {
                    const seat = state.seats.find((s) => s.slot === i);
                    const color = SLOT_COLORS[i % SLOT_COLORS.length];
                    return (
                        <div
                            key={i}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                                seat ? 'border-cq-line bg-cq-sunken' : 'border-dashed border-cq-line/60'
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
                                            CHỦ BÀN
                                        </span>
                                    )}
                                    <span className={`ml-auto text-[11px] font-bold ${seat.ready ? 'text-emerald-400' : 'text-cq-muted'}`}>
                                        {seat.ready ? 'Sẵn sàng' : 'Đang chờ'}
                                    </span>
                                </>
                            ) : (
                                <span className="text-sm text-cq-muted">Còn trống</span>
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
                        Bắt đầu ván
                    </button>
                ) : (
                    <span className="text-sm text-cq-muted">Chờ chủ bàn bấm bắt đầu…</span>
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

const ScoreTable: React.FC<{ world: any; meId?: string; currentPlayerId?: string | null }> = ({
    world,
    meId,
    currentPlayerId,
}) => {
    const sorted = [...world.players].sort((a: any, b: any) => b.score - a.score);
    return (
        <div className="cq-glass overflow-hidden">
            <p className="border-b border-cq-line px-4 py-2.5 text-sm font-bold text-cq-strong">Bảng điểm</p>
            <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-cq-muted">
                    <tr>
                        <th className="px-4 py-2 text-left font-semibold">Người chơi</th>
                        <th className="px-2 py-2 text-center font-semibold">Ô</th>
                        <th className="px-2 py-2 text-center font-semibold" title="Bài giải đúng / sai">Bài</th>
                        <th className="px-2 py-2 text-center font-semibold" title="Khiên đang có">🛡</th>
                        <th className="px-4 py-2 text-right font-semibold">Điểm</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((p: any) => (
                        <tr
                            key={p.id}
                            className={`border-t border-cq-line/50 ${p.id === meId ? 'bg-cq-neon/5' : ''} ${
                                p.id === currentPlayerId ? 'shadow-[inset_3px_0_0_rgb(var(--cq-neon))]' : ''
                            }`}
                        >
                            <td className="px-4 py-2">
                                <span className="flex items-center gap-2">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: SLOT_COLORS[p.slot % SLOT_COLORS.length] }}
                                    />
                                    <span className="truncate font-semibold text-cq-strong">{p.name}</span>
                                    {p.streak >= 2 && (
                                        <span className="rounded bg-cq-gold/20 px-1.5 text-[10px] font-bold text-cq-gold">
                                            🔥{p.streak}
                                        </span>
                                    )}
                                    {p.skipTurns > 0 && (
                                        <span className="rounded bg-amber-500/20 px-1.5 text-[10px] font-bold text-amber-400">
                                            nghỉ {p.skipTurns}
                                        </span>
                                    )}
                                </span>
                            </td>
                            <td className="px-2 py-2 text-center tabular-nums text-cq-muted">{p.position + 1}</td>
                            <td className="px-2 py-2 text-center tabular-nums">
                                <span className="text-emerald-400">{p.solved}</span>
                                <span className="text-cq-muted">/</span>
                                <span className="text-rose-400">{p.failed}</span>
                            </td>
                            <td className="px-2 py-2 text-center tabular-nums text-cq-neon">{p.shields || '—'}</td>
                            <td className="px-4 py-2 text-right font-bold tabular-nums text-cq-strong">{p.score}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

/** Chú giải các loại ô — người mới nhìn bàn cờ không đoán được icon nghĩa gì. */
const TileLegend: React.FC<{ tiles: any[] }> = ({ tiles }) => {
    const counts = useMemo(() => {
        const m = new Map<string, number>();
        for (const t of tiles) m.set(t.kind, (m.get(t.kind) ?? 0) + 1);
        return [...m.entries()].sort((a, b) => b[1] - a[1]);
    }, [tiles]);

    return (
        <div className="cq-glass p-4">
            <p className="mb-2 text-sm font-bold text-cq-strong">Các loại ô</p>
            <div className="grid grid-cols-2 gap-1.5">
                {counts.map(([kind, n]) => {
                    const s = TILE_STYLE[kind as keyof typeof TILE_STYLE];
                    if (!s) return null;
                    return (
                        <span key={kind} className="flex items-center gap-1.5 text-[11px] text-cq-muted">
                            <span className="text-sm">{s.icon}</span>
                            {s.name}
                            <span className="ml-auto font-mono text-cq-strong">×{n}</span>
                        </span>
                    );
                })}
            </div>
            <div className="mt-3 flex gap-3 border-t border-cq-line pt-2 text-[10px]">
                {(['EASY', 'MEDIUM', 'HARD'] as const).map((d) => (
                    <span key={d} className="flex items-center gap-1 text-cq-muted">
                        <span className="h-2 w-4 rounded-full" style={{ backgroundColor: DIFFICULTY_COLOR[d] }} />
                        {d === 'EASY' ? 'Dễ' : d === 'MEDIUM' ? 'Vừa' : 'Khó'}
                    </span>
                ))}
            </div>
        </div>
    );
};

const FinalOverlay: React.FC<{ ranking: any[]; meId?: string }> = ({ ranking, meId }) => (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
        <div className="cq-glass cq-ring w-full max-w-md p-6">
            <p className="text-center text-2xl font-black text-cq-strong">Kết thúc ván cờ</p>
            <div className="mt-5 space-y-2">
                {ranking.map((r) => (
                    <div
                        key={r.userId}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                            r.userId === meId ? 'bg-cq-neon/10 ring-1 ring-cq-neon/40' : 'bg-cq-sunken'
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
                        <span className="text-xs text-cq-muted">{r.solved ?? 0} bài</span>
                        <span className="font-bold tabular-nums text-cq-strong">{r.score}</span>
                    </div>
                ))}
            </div>
            <a href="/arena" className="cq-btn-primary mt-6 w-full justify-center">Về sảnh</a>
        </div>
    </div>
);

export default BoardRoom;
