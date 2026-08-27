/**
 * @file src/components/game/stages/GitStage.tsx
 * @description Sân khấu Git Time Machine — có hoạt ảnh.
 *
 * Mỗi lệnh git là một khung hình: HEAD trượt dọc dòng thời gian, commit mới nảy
 * lên, dòng code bị gỡ bỏ được gạch đỏ. Người chơi nhìn thấy "cỗ máy thời gian"
 * hoạt động thay vì phải tự đối chiếu mã commit.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Commit {
    hash: string;
    message: string;
    author: string;
    date: string;
    parents: string[];
}

interface GitFrame {
    index: number;
    command: string;
    stdout: string;
    stderr: string;
    narration: string[];
    repo: any;
    newCommits: string[];
    headMoved: boolean;
}

interface Props {
    state: any;
    config: any;
    frames?: GitFrame[];
}

const PHASE_MS = 900;

const GitStage: React.FC<Props> = ({ state, config, frames = [] }) => {
    const [frameIndex, setFrameIndex] = useState(-1);
    const [playing, setPlaying] = useState(false);
    const timer = useRef<number | null>(null);

    useEffect(() => {
        if (frames.length === 0) {
            setFrameIndex(-1);
            setPlaying(false);
            return;
        }
        setFrameIndex(-1);
        setPlaying(true);
    }, [frames]);

    useEffect(() => {
        if (!playing) return;
        if (frameIndex >= frames.length - 1) {
            setPlaying(false);
            return;
        }
        timer.current = window.setTimeout(() => setFrameIndex((i) => i + 1), PHASE_MS);
        return () => {
            if (timer.current) window.clearTimeout(timer.current);
        };
    }, [playing, frameIndex, frames.length]);

    const current = frameIndex >= 0 ? frames[frameIndex] : null;

    // Repo hiển thị: theo khung đang phát, hoặc trạng thái đầu/cuối
    const repo = current?.repo ?? (frames.length > 0 ? config?.repo ?? {} : state?.repo ?? config?.repo ?? {});

    const commits: Commit[] = repo.commits ?? [];
    const branches: Record<string, string> = repo.branches ?? {};
    const head = repo.head ?? {};
    const headCommit: string | null = repo.headCommit ?? (head.ref ? branches[head.ref] : head.commit) ?? null;
    const workingTree: Record<string, string> = repo.workingTree ?? {};

    const [openFile, setOpenFile] = useState<string | null>(null);
    const shownFile = openFile ?? Object.keys(workingTree)[0] ?? null;

    const ordered = useMemo(() => [...commits].reverse(), [commits]);
    const newHashes = new Set(current?.newCommits ?? []);

    /** Dòng code vừa bị gỡ ở khung này — lấy từ lời tường thuật để tô đỏ. */
    const removedLines = useMemo(() => {
        const out = new Set<string>();
        for (const n of current?.narration ?? []) {
            const m = /^➖ .*?: gỡ bỏ (.+)$/.exec(n);
            if (m) {
                for (const part of m[1].split('", "')) out.add(part.replace(/^"|"$/g, '').trim());
            }
        }
        return out;
    }, [current]);

    const addedLines = useMemo(() => {
        const out = new Set<string>();
        for (const n of current?.narration ?? []) {
            const m = /^➕ .*?: thêm vào (.+)$/.exec(n);
            if (m) {
                for (const part of m[1].split('", "')) out.add(part.replace(/^"|"$/g, '').trim());
            }
        }
        return out;
    }, [current]);

    const branchesAt = (hash: string) =>
        Object.entries(branches)
            .filter(([, h]) => h === hash)
            .map(([b]) => b);

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
            {/* ── Dòng thời gian ───────────────────────────────────────────── */}
            <div className="cq-panel flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="cq-panel-head">
                    <span>⏳ Dòng thời gian</span>
                    <span className="normal-case tracking-normal text-cq-muted">
                        {head.ref ? `nhánh ${head.ref}` : 'detached HEAD'} · {commits.length} commit
                        {repo.bisect?.active ? ' · đang bisect' : ''}
                        {frames.length > 0 && ` · khung ${Math.max(0, frameIndex + 1)}/${frames.length}`}
                    </span>
                </div>

                {current && (
                    <div className="animate-cq-pop border-b border-cq-line bg-cq-screen/60 px-4 py-2">
                        <p className="truncate font-mono text-[12px] text-cq-neon">$ {current.command}</p>
                    </div>
                )}

                <div className="min-h-0 flex-1 overflow-auto p-3">
                    <ol className="relative space-y-1.5 pl-6">
                        <span className="absolute bottom-2 left-[9px] top-2 w-px bg-cq-line" aria-hidden />

                        {ordered.map((c) => {
                            const isHead = c.hash === headCommit;
                            const isNew = newHashes.has(c.hash);
                            const refs = branchesAt(c.hash);

                            return (
                                <li key={c.hash} className={isNew ? 'animate-cq-pop' : ''}>
                                    <span
                                        className={`absolute -left-[18px] grid h-[13px] w-[13px] place-items-center rounded-full border-2 transition-all duration-500 ${
                                            isHead
                                                ? 'border-cq-neon bg-cq-neon shadow-[0_0_10px_rgba(56,189,248,0.8)]'
                                                : 'border-cq-line bg-cq-bg'
                                        }`}
                                        style={{ top: '0.65rem' }}
                                    />
                                    <div
                                        className={`rounded-lg border px-3 py-1.5 transition-all duration-500 ${
                                            isHead
                                                ? 'border-cq-neon/60 bg-cq-neon/10'
                                                : isNew
                                                  ? 'border-cq-lime/50 bg-cq-lime/5'
                                                  : 'border-cq-line bg-cq-raised/40'
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <code className="font-mono text-[12px] text-cq-gold">{c.hash.slice(0, 7)}</code>
                                            <span className="truncate text-sm text-cq-text/90">{c.message}</span>
                                            {refs.map((b) => (
                                                <span key={b} className="cq-chip !border-cq-neon/40 !py-0 !text-cq-neon">
                                                    {b}
                                                </span>
                                            ))}
                                            {isHead && (
                                                <span className="cq-chip !border-cq-lime/40 !py-0 !text-cq-lime">HEAD</span>
                                            )}
                                            {isNew && (
                                                <span className="cq-chip !border-cq-gold/40 !py-0 !text-cq-gold">mới</span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-cq-muted">
                                            {c.author} · {c.date}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}

                        {ordered.length === 0 && <li className="text-sm text-cq-muted">Chưa có commit nào.</li>}
                    </ol>
                </div>

                {current && current.narration.length > 0 && (
                    <div className="border-t border-cq-line bg-cq-raised/40 px-4 py-2">
                        {current.narration.slice(0, 4).map((line, i) => (
                            <p key={i} className="animate-cq-pop truncate text-xs text-cq-text/90">
                                {line}
                            </p>
                        ))}
                    </div>
                )}

                {frames.length > 0 && (
                    <div className="flex items-center gap-3 border-t border-cq-line px-4 py-2.5">
                        <button
                            type="button"
                            onClick={() => {
                                if (frameIndex >= frames.length - 1) setFrameIndex(-1);
                                setPlaying((p) => !p);
                            }}
                            className="cq-btn-ghost !px-2.5 !py-1 text-xs"
                        >
                            {playing ? '⏸ Tạm dừng' : '▶ Tua lại'}
                        </button>
                        <input
                            type="range"
                            min={-1}
                            max={frames.length - 1}
                            value={frameIndex}
                            onChange={(e) => {
                                setPlaying(false);
                                setFrameIndex(Number(e.target.value));
                            }}
                            className="h-1 flex-1 accent-cq-neon"
                        />
                        <span className="w-20 shrink-0 text-right font-mono text-[11px] text-cq-muted">
                            {frameIndex < 0 ? 'ban đầu' : `${frameIndex + 1}/${frames.length}`}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Thư mục làm việc ─────────────────────────────────────────── */}
            <div className="cq-panel">
                <div className="cq-panel-head">
                    <span>Thư mục làm việc</span>
                    <span className="normal-case tracking-normal text-cq-muted">
                        {Object.keys(workingTree).length} tệp
                    </span>
                </div>

                <div className="flex flex-wrap gap-1.5 border-b border-cq-line px-3 py-2">
                    {Object.keys(workingTree).map((file) => (
                        <button
                            key={file}
                            type="button"
                            onClick={() => setOpenFile(file)}
                            className={`rounded px-2 py-1 font-mono text-[11px] ${
                                shownFile === file ? 'bg-cq-neon/15 text-cq-neon' : 'bg-cq-raised text-cq-muted hover:text-cq-strong'
                            }`}
                        >
                            📄 {file}
                        </button>
                    ))}
                    {Object.keys(workingTree).length === 0 && <span className="text-xs text-cq-muted">(trống)</span>}
                </div>

                <pre className="cq-terminal max-h-44 rounded-none border-0 bg-transparent text-[12.5px]">
                    {shownFile ? (
                        (workingTree[shownFile] ?? '').split('\n').map((line, i) => {
                            const trimmed = line.trim();
                            const isAdded = addedLines.has(trimmed);
                            const isBug = line.includes('BUG');
                            return (
                                <span
                                    key={i}
                                    className={
                                        isAdded
                                            ? 'animate-cq-flash text-cq-lime'
                                            : isBug
                                              ? 'text-cq-rose'
                                              : 'text-cq-text/85'
                                    }
                                >
                                    <span className="mr-3 select-none text-slate-600">
                                        {String(i + 1).padStart(2, ' ')}
                                    </span>
                                    {isAdded ? '+ ' : '  '}
                                    {line}
                                    {'\n'}
                                </span>
                            );
                        })
                    ) : (
                        <span className="text-slate-600"># chọn một tệp để xem nội dung</span>
                    )}

                    {/* Dòng vừa bị gỡ khỏi tệp — hiện gạch đỏ rồi biến mất */}
                    {[...removedLines].map((line) => (
                        <span key={line} className="animate-cq-fade-out block text-cq-rose/80 line-through">
                            <span className="mr-3 select-none text-slate-600"> −</span>
                            {'- '}
                            {line}
                        </span>
                    ))}
                </pre>
            </div>
        </div>
    );
};

export default GitStage;
