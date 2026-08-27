/**
 * @file src/components/arena/ArenaLobby.tsx
 * @description Sảnh đấu trường: chọn bản đồ, mở phòng, vào phòng bằng mã, xem lịch sử.
 */
import React, { useEffect, useState } from 'react';
import { arenaApi, MODE_HINT, MODE_LABEL, type ArenaMap } from '../../lib/arena';
import { isLoggedIn } from '../../lib/codequest';

const MODE_ICON: Record<string, string> = {
    territory: '🗺️',
    battle: '⚔️',
    survival: '🛡️',
};

const ArenaLobby: React.FC = () => {
    const [maps, setMaps] = useState<ArenaMap[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [joinCode, setJoinCode] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const logged = isLoggedIn();

    useEffect(() => {
        arenaApi.maps().then(setMaps).catch(() => setError('Không tải được danh sách bản đồ. Máy chủ có đang chạy không?'));
        if (!logged) return;

        const load = () => {
            arenaApi.rooms().then(setRooms).catch(() => {});
        };
        load();
        // Danh sách phòng thay đổi liên tục, nhưng dùng socket ở đây thì thừa —
        // hỏi lại mỗi 5 giây là đủ mượt mà nhẹ hơn nhiều.
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
            <div className="mx-auto max-w-md rounded-2xl border border-cq-line bg-cq-panel p-6 text-center">
                <p className="text-lg font-bold text-cq-strong">Cần đăng nhập để vào đấu trường</p>
                <p className="mt-2 text-sm text-cq-dim">
                    Đấu trường ghép bạn với những người chơi khác theo thời gian thực, nên cần biết bạn là ai.
                </p>
                <a href="/login?next=/arena" className="cq-btn-primary mt-5 inline-flex">
                    Đăng nhập
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {error && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
                    {error}
                </div>
            )}

            {/* ── Vào phòng bằng mã ─────────────────────────────────────── */}
            <section className="rounded-2xl border border-cq-line bg-cq-panel p-5">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[240px]">
                        <p className="text-base font-bold text-cq-strong">Bạn bè đã mở phòng?</p>
                        <p className="mt-1 text-sm text-cq-dim">Nhập mã 6 ký tự họ gửi cho bạn.</p>
                    </div>
                    <form onSubmit={joinByCode} className="flex gap-2">
                        <input
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                            placeholder="ABC123"
                            maxLength={6}
                            className="w-36 rounded-xl border border-cq-line bg-cq-bg px-4 py-2.5 text-center font-mono text-lg font-bold tracking-[0.2em] text-cq-strong outline-none focus:border-cq-neon"
                        />
                        <button type="submit" className="cq-btn-primary">
                            Vào phòng
                        </button>
                    </form>
                </div>
            </section>

            {/* ── Phòng đang mở ─────────────────────────────────────────── */}
            {rooms.length > 0 && (
                <section>
                    <h2 className="mb-3 text-lg font-extrabold text-cq-strong">
                        Phòng đang chờ người ({rooms.length})
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {rooms.map((r) => (
                            <a
                                key={r.roomCode}
                                href={`/arena/room?code=${r.roomCode}`}
                                className="group rounded-2xl border border-cq-line bg-cq-panel p-4 transition hover:border-cq-neon"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{MODE_ICON[r.mode] ?? '🎮'}</span>
                                    <span className="font-mono text-sm font-bold tracking-widest text-cq-neon">
                                        {r.roomCode}
                                    </span>
                                    <span className="ml-auto rounded-full bg-cq-bg px-2 py-0.5 text-[11px] font-bold text-cq-dim">
                                        {r.players}/{r.maxPlayers}
                                    </span>
                                </div>
                                <p className="mt-2 font-semibold text-cq-strong group-hover:text-cq-neon">{r.mapName}</p>
                                <p className="mt-0.5 text-xs text-cq-dim">Chủ phòng: {r.hostName}</p>
                            </a>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Mở phòng mới ──────────────────────────────────────────── */}
            <section>
                <h2 className="mb-1 text-lg font-extrabold text-cq-strong">Mở phòng mới</h2>
                <p className="mb-4 text-sm text-cq-dim">
                    Chọn bản đồ, hệ thống sinh mã phòng, gửi mã đó cho bạn bè là chơi được.
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                    {maps.map((m) => (
                        <div key={m.slug} className="flex flex-col rounded-2xl border border-cq-line bg-cq-panel p-5">
                            <div className="flex items-start gap-3">
                                <span className="text-3xl">{MODE_ICON[m.mode] ?? '🎮'}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-extrabold text-cq-strong">{m.name}</p>
                                    <p className="mt-0.5 text-xs font-semibold text-cq-neon">
                                        {MODE_LABEL[m.mode]}
                                    </p>
                                </div>
                            </div>

                            <p className="mt-3 flex-1 text-sm leading-relaxed text-cq-dim">{m.description}</p>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                                <Chip>{m.minPlayers}–{m.maxPlayers} người</Chip>
                                <Chip>{m.width}×{m.height} ô</Chip>
                                <Chip>{m.totalRounds} lượt</Chip>
                                <Chip>{m.writeSeconds}s/lượt</Chip>
                            </div>

                            <p className="mt-3 text-[11px] leading-relaxed text-cq-dim">{MODE_HINT[m.mode]}</p>

                            <button
                                onClick={() => createRoom(m.slug)}
                                disabled={busy === m.slug}
                                className="cq-btn-primary mt-4 justify-center disabled:opacity-50"
                            >
                                {busy === m.slug ? 'Đang mở phòng…' : 'Mở phòng'}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Lịch sử ───────────────────────────────────────────────── */}
            {history.length > 0 && (
                <section>
                    <h2 className="mb-3 text-lg font-extrabold text-cq-strong">Trận gần đây của bạn</h2>
                    <div className="overflow-hidden rounded-2xl border border-cq-line bg-cq-panel">
                        <table className="w-full text-sm">
                            <thead className="text-[11px] uppercase tracking-wide text-cq-dim">
                                <tr>
                                    <th className="px-4 py-2.5 text-left font-semibold">Bản đồ</th>
                                    <th className="px-2 py-2.5 text-center font-semibold">Hạng</th>
                                    <th className="px-2 py-2.5 text-right font-semibold">Điểm</th>
                                    <th className="px-2 py-2.5 text-right font-semibold">XP</th>
                                    <th className="px-2 py-2.5 text-right font-semibold">Rating</th>
                                    <th className="px-4 py-2.5 text-right font-semibold"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((h) => (
                                    <tr key={h.matchId} className="border-t border-cq-line/60">
                                        <td className="px-4 py-2.5">
                                            <span className="font-semibold text-cq-strong">{h.mapName}</span>
                                            <span className="ml-2 text-xs text-cq-dim">{h.players} người</span>
                                        </td>
                                        <td className="px-2 py-2.5 text-center">
                                            <span className="text-base">
                                                {h.rank === 1 ? '🥇' : h.rank === 2 ? '🥈' : h.rank === 3 ? '🥉' : h.rank}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2.5 text-right tabular-nums text-cq-strong">{h.score}</td>
                                        <td className="px-2 py-2.5 text-right tabular-nums text-emerald-400">
                                            +{h.xpEarned}
                                        </td>
                                        <td
                                            className={`px-2 py-2.5 text-right tabular-nums ${h.ratingDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                                        >
                                            {h.ratingDelta >= 0 ? '+' : ''}
                                            {h.ratingDelta}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <a
                                                href={`/arena/replay?match=${h.matchId}`}
                                                className="text-xs font-semibold text-cq-neon hover:underline"
                                            >
                                                Xem lại
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

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="rounded-full bg-cq-bg px-2 py-0.5 text-[11px] font-semibold text-cq-dim">{children}</span>
);

export default ArenaLobby;
