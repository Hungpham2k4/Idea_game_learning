/**
 * @file src/components/game/Markdown.tsx
 * @description Bộ hiển thị markdown rút gọn cho phần mô tả nhiệm vụ.
 *              Chỉ hỗ trợ đúng những gì nội dung game dùng: tiêu đề, đậm, code,
 *              khối code, bảng, danh sách, trích dẫn — không nạp thư viện ngoài.
 */
import React from 'react';

interface Props {
    content: string;
    className?: string;
}

/** Xử lý định dạng trong một dòng: **đậm**, `code`, *nghiêng* */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let i = 0;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
        const token = match[0];
        const key = `${keyPrefix}-${i++}`;

        if (token.startsWith('**')) {
            nodes.push(
                <strong key={key} className="font-semibold text-cq-strong">
                    {token.slice(2, -2)}
                </strong>,
            );
        } else if (token.startsWith('`')) {
            nodes.push(
                <code key={key} className="rounded bg-cq-raised px-1.5 py-0.5 font-mono text-[12.5px] text-cq-neon">
                    {token.slice(1, -1)}
                </code>,
            );
        } else {
            nodes.push(
                <em key={key} className="italic text-cq-text/90">
                    {token.slice(1, -1)}
                </em>,
            );
        }
        lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
    return nodes;
}

const Markdown: React.FC<Props> = ({ content, className = '' }) => {
    const lines = (content ?? '').split('\n');
    const blocks: React.ReactNode[] = [];

    let i = 0;
    let key = 0;

    while (i < lines.length) {
        const line = lines[i];

        // ── Khối code ────────────────────────────────────────────────────────
        if (line.trimStart().startsWith('```')) {
            const lang = line.trim().slice(3).trim();
            const body: string[] = [];
            i++;
            while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
                body.push(lines[i]);
                i++;
            }
            i++; // bỏ qua ``` đóng
            blocks.push(
                <pre
                    key={key++}
                    className="my-3 overflow-x-auto rounded-lg border border-cq-line bg-cq-screen/70 p-3 font-mono text-[12.5px] leading-relaxed text-cq-text"
                >
                    {lang && <span className="mb-1 block text-[10px] uppercase tracking-wider text-cq-muted">{lang}</span>}
                    <code>{body.join('\n')}</code>
                </pre>,
            );
            continue;
        }

        // ── Bảng ─────────────────────────────────────────────────────────────
        if (line.trim().startsWith('|') && lines[i + 1]?.trim().startsWith('|')) {
            const rows: string[][] = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                const cells = lines[i]
                    .trim()
                    .replace(/^\||\|$/g, '')
                    .split('|')
                    .map((c) => c.trim());
                rows.push(cells);
                i++;
            }
            const [head, separator, ...body] = rows;
            const hasSeparator = separator?.every((c) => /^:?-{2,}:?$/.test(c));

            blocks.push(
                <div key={key++} className="my-3 overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr>
                                {head.map((h, hi) => (
                                    <th
                                        key={hi}
                                        className="border border-cq-line bg-cq-raised px-2.5 py-1.5 text-left font-semibold text-cq-muted"
                                    >
                                        {renderInline(h, `th-${hi}`)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(hasSeparator ? body : rows.slice(1)).map((r, ri) => (
                                <tr key={ri}>
                                    {r.map((c, ci) => (
                                        <td key={ci} className="border border-cq-line px-2.5 py-1.5 text-cq-text/85">
                                            {renderInline(c, `td-${ri}-${ci}`)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>,
            );
            continue;
        }

        // ── Trích dẫn ────────────────────────────────────────────────────────
        if (line.trim().startsWith('> ')) {
            const body: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('>')) {
                body.push(lines[i].trim().replace(/^>\s?/, ''));
                i++;
            }
            blocks.push(
                <blockquote
                    key={key++}
                    className="my-3 border-l-2 border-cq-gold/60 bg-cq-gold/5 py-2 pl-3 pr-2 text-sm italic text-cq-text/85"
                >
                    {renderInline(body.join(' '), `quote-${key}`)}
                </blockquote>,
            );
            continue;
        }

        // ── Danh sách ────────────────────────────────────────────────────────
        if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
            const ordered = /^\s*\d+\.\s+/.test(line);
            const items: string[] = [];
            while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
                i++;
            }
            const ListTag = ordered ? 'ol' : 'ul';
            blocks.push(
                React.createElement(
                    ListTag,
                    {
                        key: key++,
                        className: `my-2 space-y-1 pl-5 text-sm text-cq-text/85 ${ordered ? 'list-decimal' : 'list-disc'}`,
                    },
                    items.map((it, idx) => <li key={idx}>{renderInline(it, `li-${idx}`)}</li>),
                ),
            );
            continue;
        }

        // ── Tiêu đề ──────────────────────────────────────────────────────────
        const heading = /^(#{1,4})\s+(.*)$/.exec(line);
        if (heading) {
            const level = heading[1].length;
            const sizes = ['text-lg', 'text-base', 'text-sm', 'text-sm'];
            blocks.push(
                <p key={key++} className={`mb-1 mt-4 font-bold text-cq-strong ${sizes[level - 1]}`}>
                    {renderInline(heading[2], `h-${key}`)}
                </p>,
            );
            i++;
            continue;
        }

        // ── Dòng trống ───────────────────────────────────────────────────────
        if (line.trim() === '') {
            i++;
            continue;
        }

        // ── Đoạn văn ─────────────────────────────────────────────────────────
        const paragraph: string[] = [];
        while (
            i < lines.length &&
            lines[i].trim() !== '' &&
            !lines[i].trimStart().startsWith('```') &&
            !lines[i].trim().startsWith('|') &&
            !lines[i].trim().startsWith('>') &&
            !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) &&
            !/^#{1,4}\s+/.test(lines[i])
        ) {
            paragraph.push(lines[i]);
            i++;
        }
        blocks.push(
            <p key={key++} className="my-2 text-sm leading-relaxed text-cq-text/85">
                {renderInline(paragraph.join(' '), `p-${key}`)}
            </p>,
        );
    }

    return <div className={className}>{blocks}</div>;
};

export default Markdown;
