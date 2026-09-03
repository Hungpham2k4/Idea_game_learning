/**
 * @file src/components/arena/board/ProblemPanel.tsx
 * @description Bảng đề bài + ô soạn code khi người chơi dừng vào ô thử thách.
 *
 * Cả phòng đều thấy đề — người đang xem cũng có thể tự nghĩ trong đầu, đó là
 * phần học được của việc ngồi xem. Nhưng chỉ người tới lượt mới nộp được, và
 * điều đó do **server chặn**, không phải do giao diện ẩn nút đi.
 *
 * Gợi ý mở theo bậc thang: mỗi lần chỉ hiện thêm một gợi ý. Bày hết ngay từ
 * đầu thì sinh viên đọc luôn đáp án, còn giấu hết thì người bí sẽ bỏ cuộc.
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { MyGradeResult, PublicProblem } from '../../../lib/board';
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL } from '../../../lib/board';

interface Props {
    problem: PublicProblem;
    /** Người đang xem có phải người phải giải không */
    isMine: boolean;
    solverName: string;
    secondsLeft: number;
    result: MyGradeResult | null;
    submitted: boolean;
    onSubmit: (code: string, language: string) => void;
}

type Lang = 'js' | 'java' | 'python';

const LANG_LABEL: Record<Lang, string> = { js: 'JavaScript', java: 'Java', python: 'Python' };

const ProblemPanel: React.FC<Props> = ({
    problem,
    isMine,
    solverName,
    secondsLeft,
    result,
    submitted,
    onSubmit,
}) => {
    const [lang, setLang] = useState<Lang>('js');
    const [code, setCode] = useState('');
    const [hintsShown, setHintsShown] = useState(0);

    // Đổi bài thì nạp lại code khung, xoá gợi ý đã mở
    useEffect(() => {
        setCode(problem.starterCode?.[lang] ?? '');
        setHintsShown(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [problem.id]);

    // Đổi ngôn ngữ mà chưa viết gì thì thay code khung, viết rồi thì giữ nguyên
    function switchLang(next: Lang): void {
        const current = (problem.starterCode?.[lang] ?? '').trim();
        if (code.trim() === current || code.trim() === '') {
            setCode(problem.starterCode?.[next] ?? '');
        }
        setLang(next);
    }

    const hiddenCount = Math.max(0, problem.totalTests - problem.sampleTests.length);
    const urgent = secondsLeft <= 30;

    const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (isMine && !submitted) onSubmit(code, lang);
        }
        // Tab thụt lề thay vì nhảy khỏi ô soạn thảo
        if (e.key === 'Tab') {
            e.preventDefault();
            const el = e.currentTarget;
            const s = el.selectionStart;
            const next = code.slice(0, s) + '    ' + code.slice(el.selectionEnd);
            setCode(next);
            requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
        }
    };

    return (
        <div className="cq-glass cq-ring flex max-h-[86vh] flex-col overflow-hidden">
            {/* ── Đầu bảng ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 border-b border-cq-line px-4 py-3">
                <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{
                        backgroundColor: `${DIFFICULTY_COLOR[problem.difficulty]}22`,
                        color: DIFFICULTY_COLOR[problem.difficulty],
                    }}
                >
                    {DIFFICULTY_LABEL[problem.difficulty]}
                </span>
                <p className="text-base font-extrabold text-cq-strong">{problem.title}</p>

                <span className="ml-auto flex items-center gap-3">
                    {!isMine && (
                        <span className="text-xs text-cq-muted">
                            <b className="text-cq-strong">{solverName}</b> đang giải
                        </span>
                    )}
                    <span
                        className={`font-mono text-xl font-black tabular-nums ${
                            urgent ? 'animate-[cqPulseDot_1s_ease-in-out_infinite] text-red-400' : 'text-cq-strong'
                        }`}
                    >
                        {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
                        {String(secondsLeft % 60).padStart(2, '0')}
                    </span>
                </span>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                {/* ── Đề bài ───────────────────────────────────────────── */}
                <div className="min-h-0 overflow-y-auto border-b border-cq-line p-4 lg:border-b-0 lg:border-r">
                    <Markdown text={problem.statement} />

                    <div className="mt-4 rounded-lg border border-cq-line bg-cq-screen p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-cq-muted">Hàm cần viết</p>
                        <code className="mt-1 block font-mono text-sm text-cq-neon">{problem.signature}</code>
                    </div>

                    {/* Test mẫu */}
                    <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-cq-muted">
                        Ví dụ ({problem.sampleTests.length} test mẫu
                        {hiddenCount > 0 && `, còn ${hiddenCount} test ẩn khi chấm`})
                    </p>
                    <div className="mt-1.5 space-y-1.5">
                        {problem.sampleTests.map((t, i) => {
                            const outcome = result?.details.find((d) => d.index === i);
                            return (
                                <div
                                    key={i}
                                    className={`rounded-lg border px-3 py-2 font-mono text-[11.5px] ${
                                        outcome
                                            ? outcome.passed
                                                ? 'border-emerald-500/40 bg-emerald-500/10'
                                                : 'border-red-500/40 bg-red-500/10'
                                            : 'border-cq-line bg-cq-screen'
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="text-cq-muted">
                                            {problem.functionName}({t.args.map((a) => JSON.stringify(a)).join(', ')})
                                        </span>
                                        <span className="text-cq-muted">→</span>
                                        <span className="text-cq-strong">{JSON.stringify(t.expected)}</span>
                                        {outcome && (
                                            <span className={`ml-auto ${outcome.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {outcome.passed ? '✓' : '✗'}
                                            </span>
                                        )}
                                    </div>
                                    {outcome && !outcome.passed && (
                                        <p className="mt-1 text-red-300">
                                            {outcome.error ?? `bạn trả về ${JSON.stringify(outcome.got)}`}
                                        </p>
                                    )}
                                    {t.note && !outcome && <p className="mt-0.5 text-cq-muted">{t.note}</p>}
                                </div>
                            );
                        })}
                    </div>

                    {/* Gợi ý mở dần */}
                    {problem.hints.length > 0 && (
                        <div className="mt-4">
                            {problem.hints.slice(0, hintsShown).map((h, i) => (
                                <p
                                    key={i}
                                    className="animate-cq-rise mb-1.5 rounded-lg border-l-2 border-cq-gold/60 bg-cq-gold/5 px-3 py-2 text-xs leading-relaxed text-cq-muted"
                                >
                                    <b className="text-cq-gold">Gợi ý {i + 1}:</b> {h}
                                </p>
                            ))}
                            {hintsShown < problem.hints.length && (
                                <button
                                    onClick={() => setHintsShown((n) => n + 1)}
                                    className="rounded-lg border border-cq-line px-3 py-1.5 text-xs font-semibold text-cq-muted transition hover:border-cq-gold/50 hover:text-cq-gold"
                                >
                                    Mở gợi ý {hintsShown + 1}/{problem.hints.length}
                                    {hintsShown === 0 && ' — thử tự nghĩ trước nhé'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Ô soạn code ──────────────────────────────────────── */}
                <div className="flex min-h-0 flex-col">
                    <div className="flex items-center gap-1 border-b border-cq-line px-3 py-2">
                        {(['js', 'java', 'python'] as Lang[]).map((l) => (
                            <button
                                key={l}
                                onClick={() => switchLang(l)}
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                                    lang === l ? 'bg-cq-neon/15 text-cq-neon' : 'text-cq-muted hover:text-cq-strong'
                                }`}
                            >
                                {LANG_LABEL[l]}
                            </button>
                        ))}
                        <span className="ml-auto text-[10px] text-cq-muted">Cả ba cú pháp đều chạy</span>
                    </div>

                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onKeyDown={onKey}
                        spellCheck={false}
                        disabled={!isMine || submitted}
                        className="min-h-[220px] flex-1 resize-none bg-cq-screen p-4 font-mono text-[13px] leading-relaxed text-cq-strong outline-none disabled:opacity-60"
                        placeholder={isMine ? 'Viết lời giải ở đây…' : 'Bạn đang xem người khác giải'}
                    />

                    {/* Kết quả chấm */}
                    {result && (
                        <div
                            className={`border-t px-4 py-2.5 text-xs ${
                                result.passed
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                    : 'border-red-500/30 bg-red-500/10 text-red-300'
                            }`}
                        >
                            {result.error ? (
                                <p>
                                    <b>{result.errorLine ? `Dòng ${result.errorLine}: ` : ''}</b>
                                    {result.error}
                                </p>
                            ) : (
                                <p>
                                    <b>
                                        {result.passed ? '✓ Đúng hết! ' : '✗ Chưa qua. '}
                                        {result.passedTests}/{result.totalTests} test
                                    </b>
                                    {!result.passed && ' — xem test nào đỏ ở cột bên trái.'}
                                </p>
                            )}
                            {result.output.length > 0 && (
                                <pre className="mt-1.5 max-h-20 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-cq-muted">
                                    {result.output.join('\n')}
                                </pre>
                            )}
                        </div>
                    )}

                    {isMine ? (
                        <div className="flex items-center gap-2 border-t border-cq-line px-4 py-3">
                            <button
                                onClick={() => onSubmit(code, lang)}
                                disabled={submitted}
                                className="cq-btn-primary flex-1 justify-center disabled:opacity-40"
                            >
                                {submitted ? 'Đã nộp — đang chấm…' : 'Nộp bài'}
                            </button>
                            <span className="text-[11px] text-cq-muted">Ctrl + Enter</span>
                        </div>
                    ) : (
                        <div className="border-t border-cq-line px-4 py-3 text-center text-xs text-cq-muted">
                            Thử tự nghĩ trong đầu — lượt sau có thể tới bạn đấy.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Bộ hiện Markdown tối giản: **đậm**, `mã`, xuống dòng.
 *
 * Không kéo cả thư viện Markdown về chỉ để hiện đề bài — ba quy tắc này là tất
 * cả những gì đề bài dùng tới, và kéo thư viện sẽ thêm ~40KB vào bundle.
 */
const Markdown: React.FC<{ text: string }> = ({ text }) => {
    const html = useMemo(() => {
        const escape = (s: string) =>
            s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return escape(text)
            .replace(/\*\*(.+?)\*\*/g, '<b class="text-cq-strong">$1</b>')
            .replace(/`(.+?)`/g, '<code class="rounded bg-cq-screen px-1 py-0.5 font-mono text-cq-neon">$1</code>')
            .replace(/\n\n/g, '<br/><br/>')
            .replace(/\n/g, '<br/>');
    }, [text]);

    return (
        <div
            className="text-sm leading-relaxed text-cq-muted"
            // Nội dung đã được escape ở trên, chỉ 3 thẻ do chính hàm này sinh ra
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};

export default ProblemPanel;
