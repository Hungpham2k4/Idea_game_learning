/**
 * @file src/components/arena/board/JudgeOverlay.tsx
 * @description Màn chấm bài: "đang chấm" → lộ từng test → phán quyết.
 *
 * Server chấm xong trong vài mili giây, nên nếu hiện kết quả ngay thì người
 * chơi bấm "Nộp bài" và... đã xong. Không có khoảnh khắc nào để hồi hộp, cũng
 * không kịp hiểu vì sao mình sai.
 *
 * Nên kết quả được **lộ dần**: từng test một, mỗi test cách nhau một nhịp ngắn,
 * rồi mới tới phán quyết. Đây là cách mọi trang chấm bài đều làm, và nó phục vụ
 * hai việc chứ không chỉ để đẹp:
 *
 *   • Người chơi kịp NHÌN test nào đỏ — chứ không phải cả bảng hiện ra một lúc
 *   • Có một nhịp nghỉ rõ ràng giữa "nộp xong" và "lượt tiếp theo"
 *
 * Cần nói rõ: đây là **lộ dần kết quả có sẵn**, không phải chấm dần. Server đã
 * chấm xong hết trước khi màn này hiện. Không có gì bị bịa ra — chỉ là nhịp
 * trình bày.
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { MyGradeResult, ProblemTest } from '../../../lib/board';

export type JudgeStage = 'running' | 'reveal';

interface Props {
    stage: JudgeStage;
    /** Kết quả từ server; null khi còn đang chờ */
    result: MyGradeResult | null;
    sampleTests: ProblemTest[];
    /**
     * Tổng số test của đề — biết TRƯỚC khi chấm xong.
     *
     * Không có nó thì lúc "đang chấm" chỉ hiện được một dòng, người chơi không
     * biết bài này có bao nhiêu test và màn chấm trông như bị lỗi.
     */
    totalTests: number;
    functionName: string;
    /** Người xem có phải người vừa nộp bài không */
    isMine: boolean;
    solverName: string;
    onDone: () => void;
}

/** Nhịp giữa hai test khi lộ dần. Tổng thời gian được chặn ở MAX_REVEAL_MS. */
const STEP_MS = 130;
const MAX_REVEAL_MS = 1600;
/** Giữ phán quyết trên màn hình bao lâu trước khi trả lại bàn cờ. */
const VERDICT_MS = 2400;

const JudgeOverlay: React.FC<Props> = ({
    stage,
    result,
    sampleTests,
    totalTests,
    functionName,
    isMine,
    solverName,
    onDone,
}) => {
    const [revealed, setRevealed] = useState(0);
    const [showVerdict, setShowVerdict] = useState(false);

    // Khi chưa có kết quả thì dùng số test của đề, để hiện đủ dòng chờ
    const total = result?.totalTests ?? totalTests ?? 0;
    const step = useMemo(
        () => (total > 0 ? Math.min(STEP_MS, MAX_REVEAL_MS / total) : STEP_MS),
        [total],
    );

    // Lộ dần từng test
    useEffect(() => {
        if (stage !== 'reveal' || !result) return;
        setRevealed(0);
        setShowVerdict(false);

        const timers: ReturnType<typeof setTimeout>[] = [];
        for (let i = 1; i <= total; i++) {
            timers.push(setTimeout(() => setRevealed(i), i * step));
        }
        timers.push(setTimeout(() => setShowVerdict(true), total * step + 220));
        timers.push(setTimeout(onDone, total * step + 220 + VERDICT_MS));

        return () => timers.forEach(clearTimeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage, result]);

    // Lỗi cú pháp / thiếu hàm thì không có test nào để lộ — vào thẳng phán quyết
    useEffect(() => {
        if (stage !== 'reveal' || !result?.error) return;
        setShowVerdict(true);
        const t = setTimeout(onDone, VERDICT_MS + 600);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage, result?.error]);

    const passed = result?.passed ?? false;
    const passedSoFar = result
        ? result.details.slice(0, revealed).filter((d) => d.passed).length
        : 0;

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="cq-glass w-full max-w-lg overflow-hidden">
                {/* ── Đầu bảng ─────────────────────────────────────────── */}
                <div className="flex items-center gap-3 border-b border-cq-line px-5 py-4">
                    {stage === 'running' || !showVerdict ? (
                        <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-cq-neon border-t-transparent" />
                    ) : (
                        <span className="text-2xl">{passed ? '✅' : '❌'}</span>
                    )}

                    <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-cq-strong">
                            {stage === 'running'
                                ? 'Đang chấm bài…'
                                : showVerdict
                                  ? passed
                                      ? 'Chấp nhận!'
                                      : 'Chưa đúng'
                                  : 'Đang chạy test…'}
                        </p>
                        <p className="text-xs text-cq-muted">
                            {isMine ? `Bài của bạn · ${functionName}()` : `Bài của ${solverName}`}
                        </p>
                    </div>

                    {result && !result.error && (
                        <span className="shrink-0 font-mono text-lg font-black tabular-nums text-cq-strong">
                            {revealed >= total ? result.passedTests : passedSoFar}
                            <span className="text-cq-muted">/{total}</span>
                        </span>
                    )}
                </div>

                {/* ── Lỗi cú pháp: không có test nào để chạy ─────────────── */}
                {result?.error ? (
                    <div className="px-5 py-5">
                        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
                            <p className="text-sm font-bold text-rose-300">
                                {result.errorLine ? `Lỗi ở dòng ${result.errorLine}` : 'Không chạy được'}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-cq-muted">{result.error}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── Danh sách test lộ dần ──────────────────────── */}
                        <div className="max-h-[46vh] space-y-1.5 overflow-y-auto px-5 py-4">
                            {Array.from({ length: Math.max(total, 1) }, (_, i) => {
                                const d = result?.details[i];
                                const shown = i < revealed;
                                const sample = sampleTests[i];

                                return (
                                    <div
                                        key={i}
                                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-all duration-300 ${
                                            !shown
                                                ? 'border-cq-line/50 opacity-40'
                                                : d?.passed
                                                  ? 'animate-cq-rise border-emerald-500/40 bg-emerald-500/10'
                                                  : 'animate-cq-rise border-rose-500/40 bg-rose-500/10'
                                        }`}
                                    >
                                        <span className="w-5 shrink-0 text-center text-sm">
                                            {!shown ? (
                                                <span className="inline-block h-2 w-2 rounded-full bg-cq-line" />
                                            ) : d?.passed ? (
                                                <span className="text-emerald-400">✓</span>
                                            ) : (
                                                <span className="text-rose-400">✗</span>
                                            )}
                                        </span>

                                        <span className="min-w-0 flex-1 font-mono text-[11.5px] text-cq-muted">
                                            {d?.hidden ?? !sample ? (
                                                <span className="italic">Test ẩn #{i + 1}</span>
                                            ) : (
                                                <>
                                                    {functionName}(
                                                    {(sample.args ?? []).map((a) => JSON.stringify(a)).join(', ')}) →{' '}
                                                    <span className="text-cq-strong">
                                                        {JSON.stringify(sample.expected)}
                                                    </span>
                                                </>
                                            )}
                                        </span>

                                        {shown && d && !d.passed && !d.hidden && (
                                            <span className="shrink-0 font-mono text-[11px] text-rose-300">
                                                bạn: {JSON.stringify(d.got)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Phán quyết ─────────────────────────────────── */}
                        {showVerdict && (
                            <div
                                className={`animate-cq-rise border-t px-5 py-4 ${
                                    passed
                                        ? 'border-emerald-500/30 bg-emerald-500/10'
                                        : 'border-rose-500/30 bg-rose-500/10'
                                }`}
                            >
                                <p className={`font-bold ${passed ? 'text-emerald-300' : 'text-rose-300'}`}>
                                    {passed
                                        ? isMine
                                            ? 'Qua hết test — nhận thưởng!'
                                            : `${solverName} giải đúng`
                                        : isMine
                                          ? `Qua ${result?.passedTests}/${total} test — chưa đủ`
                                          : `${solverName} chưa giải được`}
                                </p>
                                {!passed && isMine && (
                                    <p className="mt-1 text-xs leading-relaxed text-cq-muted">
                                        Xem test nào đỏ ở trên để biết sai chỗ nào. Lượt sau gỡ lại được.
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* ── Thanh tiến trình ───────────────────────────────────── */}
                <div className="h-1 w-full bg-cq-line/40">
                    <div
                        className={`h-full transition-all duration-200 ${
                            showVerdict ? (passed ? 'bg-emerald-400' : 'bg-rose-400') : 'bg-cq-neon'
                        }`}
                        style={{
                            width:
                                stage === 'running'
                                    ? '15%'
                                    : total > 0
                                      ? `${Math.round((revealed / total) * 100)}%`
                                      : '100%',
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default JudgeOverlay;
