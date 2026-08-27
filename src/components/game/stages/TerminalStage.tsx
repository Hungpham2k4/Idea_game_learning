/**
 * @file src/components/game/stages/TerminalStage.tsx
 * @description Sân khấu cho Linux Hacker / DevOps Survival — có hoạt ảnh.
 *
 * Engine gửi về từng khung hình (mỗi lệnh một khung) kèm ảnh chụp hệ thống.
 * Component phát lại: đèn tủ rack đổi màu, đồng hồ CPU/RAM chạy về, tiến trình
 * lạ biến mất — để người chơi THẤY ca cứu server chứ không phải đọc bảng số.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface SystemSnapshot {
    cwd: string;
    user: string;
    connectedTo: string | null;
    services: Record<string, { status: string; port?: number }>;
    containers: Record<string, { name: string; status: string; image?: string; port?: string }>;
    processes: { pid: number; user: string; cpu: number; mem: number; cmd: string; rogue?: boolean }[];
    metrics: { cpu: number; ram: number; disk: number };
    readFiles: string[];
}

interface ShellFrame {
    index: number;
    command: string;
    stdout: string;
    stderr: string;
    narration: string[];
    system: SystemSnapshot;
}

interface Props {
    state: any;
    config: any;
    frames?: ShellFrame[];
}

interface FsNode {
    type: 'dir' | 'file';
    content?: string;
    children?: Record<string, FsNode>;
    rootOnly?: boolean;
}

const PHASE_MS = 850;

/** Dựng cây thư mục dạng dòng để hiển thị. */
function buildTree(node: FsNode | undefined, prefix = ''): { text: string; isDir: boolean; locked: boolean }[] {
    if (!node) return [];
    const out: { text: string; isDir: boolean; locked: boolean }[] = [];
    const entries = Object.entries(node.children ?? {}).sort(([a], [b]) => a.localeCompare(b));

    entries.forEach(([childName, child], i) => {
        const last = i === entries.length - 1;
        out.push({
            text: `${prefix}${last ? '└── ' : '├── '}${childName}${child.type === 'dir' ? '/' : ''}`,
            isDir: child.type === 'dir',
            locked: !!child.rootOnly,
        });
        if (child.type === 'dir') {
            out.push(...buildTree(child, `${prefix}${last ? '    ' : '│   '}`));
        }
    });
    return out;
}

/** Đồng hồ đo có kim chạy mượt về giá trị mới. */
const Gauge: React.FC<{ label: string; value: number; danger?: number; changed?: boolean }> = ({
    label,
    value,
    danger = 70,
    changed = false,
}) => {
    const tone = value >= danger ? 'bg-cq-rose' : value >= danger * 0.7 ? 'bg-amber-400' : 'bg-cq-lime';
    return (
        <div>
            <div className="mb-1 flex justify-between text-[11px]">
                <span className="text-cq-muted">{label}</span>
                <span
                    className={`font-mono ${value >= danger ? 'font-bold text-cq-rose' : 'text-cq-text'} ${
                        changed ? 'animate-cq-pop' : ''
                    }`}
                >
                    {value}%
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-cq-screen">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${tone}`}
                    style={{ width: `${Math.min(100, value)}%` }}
                />
            </div>
        </div>
    );
};

/** Một khe cắm trong tủ rack: đèn LED + tên dịch vụ. */
const RackUnit: React.FC<{
    name: string;
    kind: 'service' | 'container';
    status: string;
    detail?: string;
    justChanged?: boolean;
}> = ({ name, kind, status, detail, justChanged }) => {
    const healthy = status === 'active' || status === 'running';
    const broken = status === 'failed' || status === 'exited';

    return (
        <div
            className={`flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 transition-all duration-300 ${
                justChanged
                    ? healthy
                        ? 'animate-cq-pop border-cq-lime bg-cq-lime/10'
                        : 'animate-cq-shake border-cq-rose bg-cq-rose/10'
                    : 'border-cq-line bg-cq-screen/50'
            }`}
        >
            <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                    healthy
                        ? 'bg-cq-lime shadow-[0_0_6px_rgba(74,222,128,0.9)]'
                        : broken
                          ? 'animate-cq-pulse-dot bg-cq-rose shadow-[0_0_6px_rgba(251,113,133,0.9)]'
                          : 'bg-slate-600'
                }`}
            />
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-cq-text/85">
                {kind === 'container' ? '🐳 ' : ''}
                {name}
            </span>
            <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    healthy ? 'bg-cq-lime/15 text-cq-lime' : broken ? 'bg-cq-rose/15 text-cq-rose' : 'bg-slate-700/40 text-cq-muted'
                }`}
            >
                {status}
            </span>
            {detail && <span className="shrink-0 font-mono text-[9px] text-slate-500">{detail}</span>}
        </div>
    );
};

const TerminalStage: React.FC<Props> = ({ state, config, frames = [] }) => {
    // ── Bộ phát khung hình ──────────────────────────────────────────────────
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
    const previous = frameIndex > 0 ? frames[frameIndex - 1] : null;

    // ── Dữ liệu hiển thị ────────────────────────────────────────────────────
    const services: Record<string, any> = current?.system.services ?? (frames.length ? config?.services ?? {} : state?.services ?? config?.services ?? {});
    const containersRaw = current?.system.containers ?? (frames.length ? config?.containers ?? {} : state?.containers ?? config?.containers ?? {});
    const containers: any[] = Array.isArray(containersRaw) ? containersRaw : Object.values(containersRaw);
    const processes: any[] = current?.system.processes ?? (frames.length ? config?.processes ?? [] : state?.processes ?? config?.processes ?? []);
    const metrics = current?.system.metrics ?? (frames.length ? null : state?.metrics);
    const cwd = current?.system.cwd ?? state?.cwd;
    const user = current?.system.user ?? state?.user ?? config?.user ?? 'guest';

    const fs: FsNode | undefined = state?.fs ?? config?.fs;
    const treeLines = useMemo(() => buildTree(fs).slice(0, 60), [fs]);

    /** Dịch vụ/container nào vừa đổi trạng thái ở khung này. */
    const changed = useMemo(() => {
        const set = new Set<string>();
        if (!current) return set;
        const before = previous?.system ?? { services: config?.services ?? {}, containers: {} };

        for (const [name, svc] of Object.entries<any>(current.system.services)) {
            const old = (before.services as any)?.[name];
            if (old && old.status !== svc.status) set.add(`svc:${name}`);
        }
        const beforeContainers: any = previous?.system.containers ?? {};
        for (const [name, c] of Object.entries<any>(current.system.containers)) {
            const old = beforeContainers?.[name];
            if (old && old.status !== c.status) set.add(`ctn:${name}`);
        }
        return set;
    }, [current, previous, config]);

    const hasOps = Object.keys(services).length > 0 || containers.length > 0;
    const allHealthy =
        Object.values(services).every((s: any) => s.status === 'active') &&
        containers.every((c: any) => c.status === 'running');

    const rogue = processes.filter((p) => p.rogue);

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
            {/* ── Tủ rack máy chủ ──────────────────────────────────────────── */}
            {hasOps && (
                <div className="cq-panel overflow-hidden">
                    <div className="cq-panel-head">
                        <span>
                            {allHealthy ? '🟢 Hệ thống ổn định' : '🔴 Đang có sự cố'}
                        </span>
                        <span className="normal-case tracking-normal text-cq-muted">
                            {user}@{state?.hostname ?? config?.hostname ?? 'server'}
                            {current?.system.connectedTo ? ` → ${current.system.connectedTo}` : ''}
                            {frames.length > 0 && ` · khung ${Math.max(0, frameIndex + 1)}/${frames.length}`}
                        </span>
                    </div>

                    {/* Lệnh đang chạy */}
                    {current && (
                        <div className="animate-cq-pop border-b border-cq-line bg-cq-screen/60 px-4 py-2">
                            <p className="truncate font-mono text-[12px] text-cq-neon">❯ {current.command}</p>
                        </div>
                    )}

                    <div className="grid gap-4 p-4 sm:grid-cols-[13rem_1fr]">
                        {/* Đồng hồ tài nguyên */}
                        <div className="space-y-2.5">
                            {metrics ? (
                                <>
                                    <Gauge
                                        label="CPU"
                                        value={metrics.cpu}
                                        changed={previous ? previous.system.metrics.cpu !== metrics.cpu : false}
                                    />
                                    <Gauge
                                        label="RAM"
                                        value={metrics.ram}
                                        changed={previous ? previous.system.metrics.ram !== metrics.ram : false}
                                    />
                                    <Gauge label="DISK" value={metrics.disk} danger={90} />
                                </>
                            ) : (
                                <p className="rounded-lg border border-dashed border-cq-line px-3 py-4 text-center text-xs text-cq-muted">
                                    Chạy <code className="text-cq-neon">top</code> để đo tải hệ thống
                                </p>
                            )}

                            {rogue.length > 0 && (
                                <div className="rounded-md border border-cq-rose/40 bg-cq-rose/10 px-2.5 py-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-cq-rose">
                                        Tiến trình bất thường
                                    </p>
                                    {rogue.map((p) => (
                                        <p key={p.pid} className="mt-0.5 truncate font-mono text-[10px] text-cq-rose/90">
                                            {p.pid} · {p.cpu}% · {String(p.cmd).slice(0, 20)}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Khe cắm rack */}
                        <div className="space-y-1.5 rounded-lg border border-cq-line bg-cq-screen/30 p-2">
                            {Object.entries(services).map(([name, svc]: [string, any]) => (
                                <RackUnit
                                    key={name}
                                    name={name}
                                    kind="service"
                                    status={svc.status}
                                    detail={svc.port ? `:${svc.port}` : undefined}
                                    justChanged={changed.has(`svc:${name}`)}
                                />
                            ))}
                            {containers.map((c: any) => (
                                <RackUnit
                                    key={c.name}
                                    name={c.name}
                                    kind="container"
                                    status={c.status}
                                    detail={c.port}
                                    justChanged={changed.has(`ctn:${c.name}`)}
                                />
                            ))}
                            {!hasOps && <p className="p-2 text-xs text-cq-muted">(máy này không chạy dịch vụ nào)</p>}
                        </div>
                    </div>

                    {/* Tường thuật */}
                    {current && current.narration.length > 0 && (
                        <div className="border-t border-cq-line bg-cq-raised/40 px-4 py-2">
                            {current.narration.slice(0, 4).map((line, i) => (
                                <p key={i} className="animate-cq-pop text-xs text-cq-text/90">
                                    {line}
                                </p>
                            ))}
                        </div>
                    )}

                    {/* Điều khiển phát lại */}
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
                                {playing ? '⏸ Tạm dừng' : '▶ Xem lại ca trực'}
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
            )}

            {/* ── Cây thư mục ──────────────────────────────────────────────── */}
            <div className="cq-panel flex min-h-0 flex-1 flex-col">
                <div className="cq-panel-head">
                    <span>Hệ thống tệp</span>
                    <span className="normal-case tracking-normal text-cq-muted">
                        {cwd ? `đang ở: ${cwd}` : 'chưa chạy lệnh nào'}
                    </span>
                </div>

                <pre className="cq-terminal min-h-[140px] flex-1 rounded-none border-0 bg-transparent text-[12.5px]">
                    <span className="text-cq-neon">/</span>
                    {'\n'}
                    {treeLines.map((line, i) => (
                        <span
                            key={i}
                            className={line.locked ? 'text-cq-rose' : line.isDir ? 'text-cq-neon/80' : 'text-cq-text/75'}
                        >
                            {line.text}
                            {line.locked ? '  🔒' : ''}
                            {'\n'}
                        </span>
                    ))}
                </pre>
            </div>
        </div>
    );
};

export default TerminalStage;
