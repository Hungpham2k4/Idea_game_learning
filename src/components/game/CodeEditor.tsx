/**
 * @file src/components/game/CodeEditor.tsx
 * @description Khung soạn thảo lệnh: số dòng, Tab thụt lề, Ctrl+Enter chạy thử,
 *              Ctrl+S nộp bài. Cố tình giữ đơn giản (textarea) để không kéo theo
 *              thư viện editor nặng — sinh viên gõ lệnh chứ không viết cả dự án.
 */
import React, { useEffect, useRef, useState } from 'react';

interface Props {
    value: string;
    onChange: (value: string) => void;
    onRun?: () => void;
    onSubmit?: () => void;
    placeholder?: string;
    disabled?: boolean;
    minRows?: number;
}

const CodeEditor: React.FC<Props> = ({
    value,
    onChange,
    onRun,
    onSubmit,
    placeholder = '',
    disabled = false,
    minRows = 10,
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const gutterRef = useRef<HTMLDivElement>(null);
    const [cursorLine, setCursorLine] = useState(1);

    const lines = value.split('\n');
    const lineCount = Math.max(lines.length, minRows);

    // Đồng bộ cuộn giữa cột số dòng và vùng soạn thảo
    function handleScroll() {
        if (gutterRef.current && textareaRef.current) {
            gutterRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    }

    function updateCursorLine() {
        const el = textareaRef.current;
        if (!el) return;
        const upto = el.value.slice(0, el.selectionStart);
        setCursorLine(upto.split('\n').length);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        const el = e.currentTarget;

        // Tab / Shift+Tab → thụt lề 4 khoảng trắng
        if (e.key === 'Tab') {
            e.preventDefault();
            const { selectionStart, selectionEnd } = el;

            if (e.shiftKey) {
                const before = value.slice(0, selectionStart);
                const lineStart = before.lastIndexOf('\n') + 1;
                const lineText = value.slice(lineStart, selectionEnd);
                const dedented = lineText.replace(/^ {1,4}/gm, '');
                const next = value.slice(0, lineStart) + dedented + value.slice(selectionEnd);
                onChange(next);
                return;
            }

            const next = `${value.slice(0, selectionStart)}    ${value.slice(selectionEnd)}`;
            onChange(next);
            requestAnimationFrame(() => {
                el.selectionStart = el.selectionEnd = selectionStart + 4;
            });
            return;
        }

        // Ctrl/Cmd + Enter → chạy thử
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            onRun?.();
            return;
        }

        // Ctrl/Cmd + S → nộp bài
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            onSubmit?.();
            return;
        }

        // Enter: giữ nguyên mức thụt lề của dòng hiện tại
        if (e.key === 'Enter') {
            const { selectionStart } = el;
            const before = value.slice(0, selectionStart);
            const currentLine = before.slice(before.lastIndexOf('\n') + 1);
            const indent = currentLine.match(/^\s*/)?.[0] ?? '';
            const extra = /[{:]\s*$/.test(currentLine) ? '    ' : '';
            if (indent || extra) {
                e.preventDefault();
                const insertion = `\n${indent}${extra}`;
                const next = value.slice(0, selectionStart) + insertion + value.slice(el.selectionEnd);
                onChange(next);
                requestAnimationFrame(() => {
                    el.selectionStart = el.selectionEnd = selectionStart + insertion.length;
                });
            }
        }
    }

    useEffect(() => {
        updateCursorLine();
    }, [value]);

    return (
        <div className="flex overflow-hidden rounded-lg border border-cq-line bg-cq-screen/70 focus-within:border-cq-neon/60">
            <div
                ref={gutterRef}
                className="max-h-[420px] shrink-0 select-none overflow-hidden border-r border-cq-line bg-cq-bg/60 py-2.5 text-right font-mono text-[13px] leading-[1.6] text-slate-600"
                style={{ width: `${String(lineCount).length + 2}ch` }}
            >
                {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i} className={`px-2 ${i + 1 === cursorLine ? 'text-cq-neon' : ''}`}>
                        {i + 1}
                    </div>
                ))}
            </div>

            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                onClick={updateCursorLine}
                onKeyUp={updateCursorLine}
                disabled={disabled}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                placeholder={placeholder}
                rows={minRows}
                className="max-h-[420px] min-h-[180px] w-full resize-y bg-transparent px-3 py-2.5 font-mono text-[13px] leading-[1.6] text-cq-text outline-none placeholder:text-slate-600"
            />
        </div>
    );
};

export default CodeEditor;
