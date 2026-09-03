/**
 * @file src/components/arena/ArenaLobby.tsx
 * @description Sảnh đấu trường: chọn bản đồ, mở phòng, vào phòng bằng mã, xem lịch sử.
 *
 * Mỗi bản đồ hiện bằng ảnh thu nhỏ **của chính bản đồ đó** đang tự chạy demo,
 * chứ không phải một icon chung. Người chơi nhìn là biết bản đồ chật hay rộng,
 * nhiều tường hay trống — thông tin thật, không phải trang trí.
 */
import React, { useEffect, useRef, useState } from 'react';
import MapThumb from './MapThumb';
import ModeEmblem from './ModeEmblem';
import { arenaApi, MODE_HINT, MODE_LABEL, type ArenaMap } from '../../lib/arena';
import { isLoggedIn } from '../../lib/codequest';

/** Gán vị trí con trỏ vào biến CSS để quầng sáng bám theo. */
function useSpotlight<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const onMouseMove = (e: React.MouseEvent<T>) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    return { ref, onMouseMove };
}

const ArenaLobby: React.FC = () => {
    const [maps, setMaps] = useState<ArenaMap[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [ongoing, setOngoing] = useState<any[]>([]);
    const [joinCode, setJoinCode] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const logged = isLoggedIn();

    useEffect(() => {
        arenaApi
            .maps()
            .then(setMaps)
            .catch(() => setError('Không tải được danh sách bản đồ. Máy chủ có đang chạy không?'));
        if (!logged) return;

        const load = () => {
            arenaApi.rooms().then(setRooms).catch(() => {});
            arenaApi.ongoing().then(setOngoing).catch(() => {});
        };
        load();
        // Danh sách phòng đổi liên tục, nhưng mở socket riêng cho sảnh là thừa —
        // hỏi lại mỗi 5 giây đủ mượt mà nhẹ hơn nhiều.
        const id = setInterval(load, 5000);
        arenaApi.history(10).then(setHistory).catch(() => {});
        return () => clearInterval(id);
    }, [logged]);

    async function createRoom(slug: string): Promise<void> {
        setBusy(slug);
        setError(null);
        try {
            const { roomCode } = await arenaApi.createRoom(slug);
            window.location.href = `/arena/room?code=${roomCode}`;
        } catch (e: any) {
            setError(e?.message ?? 'Không tạo được phòng.');
            setBusy(null);
        }
    }

    function joinByCode(e: React.FormEvent): void {
        e.preventDefault();
        const code = joinCode.trim().toUpperCase();
        if (code.length !== 6) {
            setError('Mã phòng gồm đúng 6 ký tự.');
            return;
        }
        window.location.href = `/arena/room?code=${code}`;
    }

    if (!logged) {
        return (
            <div className="cq-glass cq-ring mx-auto max-w-md p-8 text-center">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-cq-neon/10">
                    <ModeEmblem mode="battle" size={40} className="text-cq-neon" />
                </div>
                <p className="text-lg font-bold text-cq-strong">Cần đăng nhập để vào đấu trường</p>
                <p className="mt-2 text-sm leading-relaxed text-cq-muted">
                    Đấu trường ghép bạn với người chơi khác theo thời gian thực, nên cần biết bạn là ai.
                </p>
                <a href="/login?next=/arena" className="cq-btn-primary mt-6 inline-flex">
                    Đăng nhập
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {error && (
                <div className="animate-cq-rise rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
                    {error}
                </div>
            )}

            {/* Ván đang dở — đặt ngay đầu trang vì nếu vừa rớt mạng thì đây là
                thứ duy nhất người chơi cần, và họ chỉ có 2 phút để tìm thấy nó. */}
            {ongoing.map((o) => (
                <a
                    key={o.roomCode}
                    href={`/arena/room?code=${o.roomCode}`}
                    className="cq-glass cq-ring animate-cq-rise flex flex-wrap items-center gap-4 border-amber-500/50 p-5"
                >
                    <span className="text-3xl">⏳</span>
                    <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-cq-strong">Bạn đang có ván chơi dở</p>
                        <p className="mt-0.5 text-sm text-cq-muted">
                            {o.mapName} · phòng{' '}
                            <span className="font-mono font-bold text-cq-neon">{o.roomCode}</span> · {o.players} người
                        </p>
                        {o.graceSecondsLeft > 0 && (
                            <p className="mt-1 text-xs font-bold text-amber-400">
                                Còn {Math.floor(o.graceSecondsLeft / 60)}:
                                {String(o.graceSecondsLeft % 60).padStart(2, '0')} để quay lại, không thì tính bỏ cuộc
                            </p>
                        )}
                    </div>
                    <span className="cq-btn-primary shrink-0">Quay lại bàn →</span>
                </a>
            ))}

            {/* ── Vào phòng bằng mã ─────────────────────────────────────── */}
            <section className="cq-glass cq-ring animate-cq-rise relative p-6">
                <div className="relative z-10 flex flex-wrap items-end gap-5">
                    <div className="min-w-[240px] flex-1">
                        <p className="text-lg font-extrabold text-cq-strong">Bạn bè đã mở phòng?</p>
                        <p className="mt-1 text-sm text-cq-muted">
                            Nhập mã 6 ký tự họ gửi cho bạn — vào thẳng, không cần chờ ghép.
                        </p>
                    </div>

                    <form onSubmit={joinByCode} className="flex gap-2">
                        <div className="relative">
                            <input
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                                placeholder="ABC123"
                                maxLength={6}
                                aria-label="Mã phòng"
                                className="w-44 rounded-xl border border-cq-line bg-cq-sunken px-4 py-3 text-center font-mono text-xl font-black tracking-[0.3em] text-cq-neon outline-none transition focus:border-cq-neon focus:shadow-[0_0_0_4px_rgb(var(--cq-neon)/0.12)]"
                            />
                            {joinCode.length === 0 && (
                                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 animate-cq-caret text-cq-neon/60">
                                    ▌
                                </span>
                            )}
                        </div>
                        <button type="submit" className="cq-btn-primary px-6">
                            Vào phòng
                        </button>
                    </form>
                </div>
            </section>

            {/* ── Phòng đang mở ─────────────────────────────────────────── */}
            {rooms.length > 0 && (
                <section>
                    <SectionTitle
                        title="Phòng đang chờ người"
                        count={rooms.length}
                        note="Bấm vào là vào ngay"
                        live
                    />
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {rooms.map((r, i) => (
                            <RoomCard key={r.roomCode} room={r} index={i} />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Mở phòng mới ──────────────────────────────────────────── */}
            <section>
                <SectionTitle
                    title="Mở phòng mới"
                    note="Chọn bản đồ, hệ thống sinh mã phòng, gửi mã đó cho bạn bè là chơi được"
                />
                <div className="grid gap-5 lg:grid-cols-2">
                    {maps.map((m, i) => (
                        <MapCard
                            key={m.slug}
                            map={m}
                            index={i}
                            busy={busy === m.slug}
                            onOpen={() => createRoom(m.slug)}
                        />
                    ))}
                    {maps.length === 0 && !error && <SkeletonCards />}
                </div>
            </section>

            {/* ── Lịch sử ───────────────────────────────────────────────── */}
            {history.length > 0 && (
                <section>
                    <SectionTitle title="Trận gần đây của bạn" count={history.length} />
                    <div className="cq-glass overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="text-[11px] uppercase tracking-wider text-cq-muted">
                                <tr className="border-b border-cq-line">
                                    <th className="px-4 py-3 text-left font-bold">Bản đồ</th>
                                    <th className="px-2 py-3 text-center font-bold">Hạng</th>
                                    <th className="px-2 py-3 text-right font-bold">Điểm</th>
                                    <th className="px-2 py-3 text-right font-bold">XP</th>
                                    <th className="px-2 py-3 text-right font-bold">Rating</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((h, i) => (
                                    <tr
                                        key={h.matchId}
                                        className="animate-cq-rise border-b border-cq-line/40 transition-colors last:border-0 hover:bg-cq-neon/5"
                                        style={{ '--d': `${i * 45}ms` } as React.CSSProperties}
                                    >
                                        <td className="px-4 py-3">
                                            <span className="font-semibold text-cq-strong">{h.mapName}</span>
                                            <span className="ml-2 text-xs text-cq-muted">{h.players} người</span>
                                        </td>
                                        <td className="px-2 py-3 text-center text-base">
                                            <Medal rank={h.rank} />
                                        </td>
                                        <td className="px-2 py-3 text-right font-semibold tabular-nums text-cq-strong">
                                            {h.score}
                                        </td>
                                        <td className="px-2 py-3 text-right tabular-nums text-emerald-400">
                                            +{h.xpEarned}
                                        </td>
                                        <td
                                            className={`px-2 py-3 text-right tabular-nums ${h.ratingDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                                        >
                                            {h.ratingDelta >= 0 ? '+' : ''}
                                            {h.ratingDelta}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <a
                                                href={`/arena/replay?match=${h.matchId}`}
                                                className="text-xs font-bold text-cq-neon hover:underline"
                                            >
                                                Xem lại →
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
};

// ─── Thẻ bản đồ ──────────────────────────────────────────────────────────────

const MapCard: React.FC<{ map: ArenaMap; index: number; busy: boolean; onOpen: () => void }> = ({
    map,
    index,
    busy,
    onOpen,
}) => {
    const spot = useSpotlight<HTMLDivElement>();

    return (
        <div
            ref={spot.ref}
            onMouseMove={spot.onMouseMove}
            className="cq-glass cq-lift cq-spotlight animate-cq-rise flex flex-col p-5"
            style={{ '--d': `${index * 90}ms` } as React.CSSProperties}
        >
            <div className="relative z-10 flex gap-4">
                {/* Ảnh thu nhỏ của chính bản đồ này, đang tự chạy */}
                <div className="w-32 shrink-0 sm:w-40">
                    <MapThumb width={map.width} height={map.height} layout={map.layout} mode={map.mode} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2.5">
                        <ModeEmblem mode={map.mode} size={34} className="mt-0.5 shrink-0 text-cq-muted" />
                        <div className="min-w-0">
                            <p className="truncate text-base font-extrabold text-cq-strong">{map.name}</p>
                            <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-cq-neon">
                                {MODE_LABEL[map.mode]}
                            </p>
                        </div>
                    </div>

                    <p className="mt-2.5 text-sm leading-relaxed text-cq-muted">{map.description}</p>
                </div>
            </div>

            <div className="relative z-10 mt-4 flex flex-wrap gap-1.5">
                <Chip icon="👥">{map.minPlayers}–{map.maxPlayers} người</Chip>
                <Chip icon="↻">{map.totalRounds} lượt</Chip>
                <Chip icon="⏱">{map.writeSeconds}s mỗi lượt</Chip>
            </div>

            <p className="relative z-10 mt-3 flex-1 border-l-2 border-cq-neon/40 pl-3 text-[11.5px] leading-relaxed text-cq-muted">
                {MODE_HINT[map.mode]}
            </p>

            <button
                onClick={onOpen}
                disabled={busy}
                className="cq-btn-primary relative z-10 mt-4 justify-center disabled:opacity-50"
            >
                {busy ? (
                    <span className="flex items-center gap-2">
                        <Spinner /> Đang mở phòng…
                    </span>
                ) : (
                    'Mở phòng'
                )}
            </button>
        </div>
    );
};

const RoomCard: React.FC<{ room: any; index: number }> = ({ room, index }) => {
    const spot = useSpotlight<HTMLAnchorElement>();
    const full = room.players >= room.maxPlayers;

    return (
        <a
            ref={spot.ref}
            onMouseMove={spot.onMouseMove}
            href={`/arena/room?code=${room.roomCode}`}
            className="cq-glass cq-lift cq-spotlight animate-cq-rise block p-4"
            style={{ '--d': `${index * 70}ms` } as React.CSSProperties}
        >
            <div className="relative z-10 flex items-center gap-2.5">
                <ModeEmblem mode={room.mode} size={26} className="shrink-0 text-cq-neon" />
                <span className="font-mono text-sm font-black tracking-[0.2em] text-cq-neon">{room.roomCode}</span>
                <span className="ml-auto flex items-center gap-1.5">
                    {Array.from({ length: room.maxPlayers }, (_, i) => (
                        <span
                            key={i}
                            className={`h-1.5 w-1.5 rounded-full ${i < room.players ? 'bg-cq-neon' : 'bg-cq-line'}`}
                        />
                    ))}
                    <span className="ml-1 text-[11px] font-bold text-cq-muted">
                        {room.players}/{room.maxPlayers}
                    </span>
                </span>
            </div>

            <p className="relative z-10 mt-2.5 font-bold text-cq-strong">{room.mapName}</p>
            <p className="relative z-10 mt-0.5 text-xs text-cq-muted">
                Chủ phòng: <span className="text-cq-text">{room.hostName}</span>
            </p>

            {full && (
                <p className="relative z-10 mt-2 text-[11px] font-bold text-amber-400">Đã đủ người</p>
            )}
        </a>
    );
};

// ─── Vụn vặt ─────────────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ title: string; count?: number; note?: string; live?: boolean }> = ({
    title,
    count,
    note,
    live,
}) => (
    <div className="mb-4">
        <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-cq-strong">
            {live && (
                <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
            )}
            {title}
            {count !== undefined && (
                <span className="rounded-full bg-cq-neon/15 px-2 py-0.5 text-xs font-bold text-cq-neon">
                    {count}
                </span>
            )}
        </h2>
        {note && <p className="mt-1 text-sm text-cq-muted">{note}</p>}
    </div>
);

const Chip: React.FC<{ icon?: string; children: React.ReactNode }> = ({ icon, children }) => (
    <span className="inline-flex items-center gap-1 rounded-full border border-cq-line bg-cq-sunken/60 px-2.5 py-1 text-[11px] font-semibold text-cq-muted">
        {icon && <span className="opacity-70">{icon}</span>}
        {children}
    </span>
);

const Medal: React.FC<{ rank: number }> = ({ rank }) => {
    if (rank === 1) return <span title="Hạng nhất">🥇</span>;
    if (rank === 2) return <span title="Hạng nhì">🥈</span>;
    if (rank === 3) return <span title="Hạng ba">🥉</span>;
    return <span className="text-sm font-bold text-cq-muted">{rank}</span>;
};

const Spinner: React.FC = () => (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
);

const SkeletonCards: React.FC = () => (
    <>
        {[0, 1].map((i) => (
            <div key={i} className="cq-glass animate-pulse p-5">
                <div className="flex gap-4">
                    <div className="h-24 w-32 rounded-xl bg-cq-line/40 sm:w-40" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-2/3 rounded bg-cq-line/40" />
                        <div className="h-3 w-1/3 rounded bg-cq-line/30" />
                        <div className="h-3 w-full rounded bg-cq-line/20" />
                        <div className="h-3 w-4/5 rounded bg-cq-line/20" />
                    </div>
                </div>
                <div className="mt-4 h-9 rounded-lg bg-cq-line/30" />
            </div>
        ))}
    </>
);

export default ArenaLobby;
