/**
 * @file src/components/game/ConsoleOutput.tsx
 * @description Cửa sổ console: in lại lệnh đã chạy, bảng kết quả SQL, bản đồ ASCII,
 *              thông báo lỗi kèm gợi ý học tập.
 */
import React, { useEffect, useRef } from 'react';
import type { CqOutputBlock, CqRunResult } from '@/lib/codequest';

interface Props {
    result: CqRunResult | null;
    running: boolean;
    engine: string;
}

const TONE_CLASS: Record<string, string> = {
    success: 'text-cq-lime',
    error: 'text-cq-rose',
    warn: 'text-amber-300',
    muted: 'text-cq-muted',
    info: 'text-cq-text',
};

const ConsoleOutput: React.FC<Props> = ({ result, running, engine }) => {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'end' });
    }, [result, running]);

    return (
        <div className="cq-panel flex min-h-0 flex-col">
            <div className="cq-panel-head">
                <span>Console</span>
                {result && (
                    <span className="flex items-center gap-3 normal-case tracking-normal">
                        <span>{result.metrics.commands ?? 0} lệnh</span>
                        {result.errors.length > 0 && <span className="text-cq-rose">{result.errors.length} lỗi</span>}
                        {result.completed && <span className="text-cq-lime">Đạt mục tiêu</span>}
                    </span>
                )}
            </div>

            <div className="cq-terminal min-h-[160px] flex-1 rounded-none border-0 bg-transparent">
                {running && (
                    <p className="text-cq-neon">
                        <span className="animate-cq-blink">▍</span> Đang chạy trên máy chủ…
                    </p>
                )}

                {!running && !result && (
                    <p className="text-slate-600">
                        {engine === 'sql'
                            ? '-- Kết quả truy vấn sẽ hiện ở đây. Nhấn "Chạy thử" (Ctrl+Enter).'
                            : '# Kết quả sẽ hiện ở đây. Nhấn "Chạy thử" (Ctrl+Enter).'}
                    </p>
                )}

                {!running &&
                    result?.output.map((block, i) => <OutputBlockView key={i} block={block} />)}

                {!running && result && result.errors.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {result.errors.map((err, i) => (
                            <div key={i} className="rounded-lg border border-cq-rose/40 bg-cq-rose/10 p-2.5">
                                <p className="text-cq-rose">
                                    {err.line ? `Dòng ${err.line}: ` : ''}
                                    {err.message}
                                </p>
                                {err.hint && (
                                    <p className="mt-1 text-cq-muted">
                                        <span className="text-cq-gold">💡 Gợi ý:</span> {err.hint}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {!running && result && result.feedback.length > 0 && (
                    <div className="mt-3 space-y-1">
                        {result.feedback.map((f, i) => (
                            <p key={i} className="text-cq-gold">
                                ✎ {f}
                            </p>
                        ))}
                    </div>
                )}

                <div ref={endRef} />
            </div>
        </div>
    );
};

const OutputBlockView: React.FC<{ block: CqOutputBlock }> = ({ block }) => {
    if (block.type === 'echo') {
        return (
            <p className="mt-2 text-cq-neon">
                <span className="text-slate-600">❯ </span>
                {block.text}
            </p>
        );
    }

    if (block.type === 'ascii') {
        return <pre className="my-1 whitespace-pre text-cq-text/90">{block.text}</pre>;
    }

    if (block.type === 'table') {
        if (block.columns.length === 0) return null;
        return (
            <div className="my-2 overflow-x-auto">
                {block.title && <p className="mb-1 text-cq-muted">{block.title}</p>}
                <table className="border-collapse text-[12.5px]">
                    <thead>
                        <tr>
                            {block.columns.map((c, i) => (
                                <th
                                    key={i}
                                    className="border border-cq-line bg-cq-raised px-2.5 py-1 text-left font-semibold text-cq-neon"
                                >
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {block.rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={block.columns.length}
                                    className="border border-cq-line px-2.5 py-2 text-center text-cq-muted"
                                >
                                    (không có dòng nào)
                                </td>
                            </tr>
                        ) : (
                            block.rows.map((row, ri) => (
                                <tr key={ri} className="odd:bg-cq-panel/40">
                                    {row.map((cell, ci) => (
                                        <td key={ci} className="border border-cq-line px-2.5 py-1 text-cq-text/90">
                                            {cell === null ? <span className="text-slate-600">NULL</span> : String(cell)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {block.note && <p className="mt-1 text-[11px] text-cq-muted">{block.note}</p>}
            </div>
        );
    }

    return <p className={TONE_CLASS[block.tone ?? 'info']}>{block.text}</p>;
};

export default ConsoleOutput;
