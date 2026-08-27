/**
 * @file src/components/arena/ArenaDocsPanel.tsx
 * @description Bảng tra cứu hàm, hiện ngay cạnh ô soạn code.
 *
 * Nội dung lấy từ server (`/arena/docs`) chứ không viết cứng ở đây: engine thêm
 * hàm mới thì bảng này tự có, không sợ tài liệu nói một đằng engine làm một nẻo.
 */
import React, { useEffect, useState } from 'react';
import { arenaApi, type ArenaDocs } from '../../lib/arena';

const ArenaDocsPanel: React.FC<{ onInsert?: (snippet: string) => void }> = ({ onInsert }) => {
    const [docs, setDocs] = useState<ArenaDocs | null>(null);
    const [open, setOpen] = useState<string | null>('Hành động');
    const [query, setQuery] = useState('');

    useEffect(() => {
        arenaApi.docs().then(setDocs).catch(() => setDocs(null));
    }, []);

    if (!docs) {
        return (
            <div className="rounded-2xl border border-cq-line bg-cq-panel p-4 text-sm text-cq-dim">
                Đang tải bảng tra cứu…
            </div>
        );
    }

    const q = query.trim().toLowerCase();
    const groups = docs.groups
        .map((g) => ({
            ...g,
            entries: q
                ? g.entries.filter(
                      (e) => e.signature.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q),
                  )
                : g.entries,
        }))
        .filter((g) => g.entries.length > 0);

    return (
        <div className="rounded-2xl border border-cq-line bg-cq-panel">
            <div className="border-b border-cq-line p-3">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm hàm… (vd: attack, tường, năng lượng)"
                    className="w-full rounded-lg border border-cq-line bg-cq-bg px-3 py-2 text-xs text-cq-strong outline-none focus:border-cq-neon"
                />
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
                {groups.map((g) => {
                    const expanded = q ? true : open === g.title;
                    return (
                        <div key={g.title} className="border-b border-cq-line/60 last:border-0">
                            <button
                                onClick={() => setOpen(expanded ? null : g.title)}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-bold text-cq-strong hover:bg-cq-bg"
                            >
                                <span className="flex-1">{g.title}</span>
                                <span className="text-cq-dim">{expanded ? '−' : '+'}</span>
                            </button>

                            {expanded && (
                                <div className="space-y-2 px-4 pb-3">
                                    {g.note && <p className="text-[11px] leading-relaxed text-cq-dim">{g.note}</p>}
                                    {g.entries.map((e) => (
                                        <div key={e.signature} className="rounded-lg bg-cq-bg p-2.5">
                                            <div className="flex items-start gap-2">
                                                <code className="flex-1 font-mono text-[11.5px] font-semibold text-cq-neon">
                                                    {e.signature}
                                                </code>
                                                {e.cost > 0 && (
                                                    <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                                                        {e.cost} ⚡
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-[11px] leading-relaxed text-cq-dim">{e.summary}</p>
                                            {e.example && (
                                                <button
                                                    onClick={() => onInsert?.(e.example!)}
                                                    title="Bấm để chèn vào ô soạn code"
                                                    className="mt-1.5 block w-full rounded bg-cq-panel px-2 py-1 text-left font-mono text-[10.5px] text-cq-dim hover:text-cq-strong"
                                                >
                                                    {e.example}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="border-t border-cq-line p-3">
                <p className="mb-1.5 text-[11px] font-bold text-cq-strong">Điều nên nhớ</p>
                <ul className="space-y-1">
                    {docs.tips.map((t) => (
                        <li key={t} className="flex gap-1.5 text-[11px] leading-relaxed text-cq-dim">
                            <span className="text-cq-neon">·</span>
                            <span>{t}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ArenaDocsPanel;
