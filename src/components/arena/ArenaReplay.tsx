/**
 * @file src/components/arena/ArenaReplay.tsx
 * @description Xem lại một trận đã đấu, từng lượt một.
 *
 * Bản lưu không chứa trạng thái thế giới của từng lượt (sẽ rất nặng), chỉ chứa
 * khung hoạt ảnh và bảng điểm. Nên vị trí quân được dựng lại từ chính các khung
 * "move" — cùng nguồn dữ liệu mà bàn đấu trực tiếp đang dùng, không có đường
 * nào để hai bên kể hai câu chuyện khác nhau.
 */
import React, { useEffect, useMemo, useState } from 'react';
import ArenaBoard from './ArenaBoard';
import { arenaApi, SLOT_COLORS, type ArenaFrame, type ArenaWorld } from '../../lib/arena';

interface ReplayRound {
    index: number;
    frames: ArenaFrame[];
    standings: any[];
    submissions: { userId: string; error: string | null; actions: number }[];
}

const ArenaReplay: React.FC = () => {
    const [data, setData] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        const matchId = new URLSearchParams(window.location.search).get('match');
        if (!matchId) {
            setError('Thiếu mã trận đấu trong địa chỉ.');
            return;
        }
        arenaApi
            .replay(matchId)
            .then(setData)
            .catch((e) => setError(e?.message ?? 'Không tải được bản lưu trận đấu.'));
    }, []);

    const rounds: ReplayRound[] = data?.rounds ?? [];
    const round = rounds[current];

    /**
     * Dựng lại thế giới ở CUỐI lượt đang xem.
     *
     * Vị trí cuối của một quân = `to` của khung di chuyển cuối cùng của họ trong
     * lượt đó; nếu lượt đó họ không đi thì giữ nguyên vị trí lượt trước.
     */
    const world: ArenaWorld | null = useMemo(() => {
        if (!data || !round) return null;

        const map = data.map;
        const positions: Record<string, { x: number; y: number }> = {};
        const owners: Record<string, string> = {};

        // Chạy lại toàn bộ các lượt từ đầu tới lượt đang xem
        const spawns: [number, number][] = map.layout?.spawns ?? [];
        for (const p of data.players) {
            const s = spawns[p.slot] ?? [0, 0];
            positions[p.userId] = { x: s[0], y: s[1] };
            if (map.mode === 'territory') owners[`${s[0]},${s[1]}`] = p.userId;
        }

        for (let i = 0; i <= current; i++) {
            for (const f of rounds[i]?.frames ?? []) {
                if (f.kind === 'move' && f.actorId && f.to) positions[f.actorId] = { x: f.to.x, y: f.to.y };
                if (f.kind === 'respawn' && f.actorId && f.at) positions[f.actorId] = { x: f.at.x, y: f.at.y };
                if (f.kind === 'capture' && f.actorId && f.at) owners[`${f.at.x},${f.at.y}`] = f.actorId;
            }
        }

        const standings = round.standings ?? [];
        return {
            mode: map.mode,
            width: map.width,
            height: map.height,
            round: round.index,
            totalRounds: map.totalRounds,
            walls: (map.layout?.walls ?? []).map(([x, y]: number[]) => `${x},${y}`),
            owners,
            resources: [],
            creeps: [],
            goals: [],
            players: data.players.map((p: any) => {
                const st = standings.find((s: any) => s.userId === p.userId);
                const pos = positions[p.userId] ?? { x: 0, y: 0 };
                return {
                    id: p.userId,
                    name: p.name,
                    slot: p.slot,
                    x: pos.x,
                    y: pos.y,
                    hp: st?.hp ?? 100,
                    maxHp: 100,
                    energy: st?.energy ?? 0,
                    maxEnergy: 14,
                    score: st?.score ?? 0,
                    kills: st?.kills ?? 0,
                    deaths: 0,
                    alive: st?.alive ?? true,
                    respawnIn: 0,
                    shielded: false,
                };
            }),
        };
    }, [data, current, round, rounds]);

    if (error) {
        return (
            <div className="mx-auto max-w-lg rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center">
                <p className="text-lg font-bold text-cq-strong">Không xem lại được</p>
                <p className="mt-2 text-sm text-cq-dim">{error}</p>
                <a href="/arena" className="cq-btn-primary mt-5 inline-flex">← Về sảnh</a>
            </div>
        );
    }

    if (!data) {
        return <div className="grid h-64 place-items-center text-sm text-cq-dim">Đang tải bản lưu…</div>;
    }

    return (
        <div className="mx-auto w-full max-w-[1300px]">
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-cq-line bg-cq-panel p-4">
                <div>
                    <p className="text-lg font-extrabold text-cq-strong">{data.map.name}</p>
                    <p className="text-xs text-cq-dim">
                        Phòng {data.roomCode} · {data.players.length} người · {rounds.length} lượt
                    </p>
                </div>
                <a href="/arena" className="ml-auto text-sm font-semibold text-cq-dim hover:text-cq-strong">
                    ← Về sảnh
                </a>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-4">
                    <ArenaBoard world={world} frames={round?.frames ?? []} playbackKey={`replay-${current}`} />

                    {/* Thanh tua lượt */}
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-cq-line bg-cq-panel p-3">
                        <button
                            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                            disabled={current === 0}
                            className="rounded-lg border border-cq-line px-3 py-1.5 text-sm font-semibold text-cq-dim disabled:opacity-30 hover:text-cq-strong"
                        >
                            ← Lượt trước
                        </button>
                        <span className="text-sm font-bold text-cq-strong">
                            Lượt {round?.index ?? 0}/{rounds.length}
                        </span>
                        <button
                            onClick={() => setCurrent((c) => Math.min(rounds.length - 1, c + 1))}
                            disabled={current >= rounds.length - 1}
                            className="rounded-lg border border-cq-line px-3 py-1.5 text-sm font-semibold text-cq-dim disabled:opacity-30 hover:text-cq-strong"
                        >
                            Lượt sau →
                        </button>
                        <button
                            onClick={() => setCurrent((c) => c)}
                            className="ml-auto rounded-lg border border-cq-line px-3 py-1.5 text-sm font-semibold text-cq-dim hover:text-cq-strong"
                            title="Phát lại lượt này"
                        >
                            ▶ Phát lại
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                        {rounds.map((r, i) => (
                            <button
                                key={r.index}
                                onClick={() => setCurrent(i)}
                                className={`h-8 w-8 rounded-lg text-xs font-bold transition ${
                                    i === current
                                        ? 'bg-cq-neon text-cq-onaccent'
                                        : 'border border-cq-line text-cq-dim hover:text-cq-strong'
                                }`}
                            >
                                {r.index}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-cq-line bg-cq-panel">
                        <p className="border-b border-cq-line px-4 py-2.5 text-sm font-bold text-cq-strong">
                            Bảng điểm sau lượt {round?.index}
                        </p>
                        <div className="divide-y divide-cq-line/60">
                            {[...(round?.standings ?? [])]
                                .sort((a, b) => b.score - a.score)
                                .map((s, i) => (
                                    <div key={s.userId} className="flex items-center gap-2.5 px-4 py-2.5">
                                        <span className="w-4 text-xs font-bold text-cq-dim">{i + 1}</span>
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: SLOT_COLORS[s.slot % SLOT_COLORS.length] }}
                                        />
                                        <span className="flex-1 truncate text-sm font-semibold text-cq-strong">
                                            {s.name}
                                        </span>
                                        <span className="text-sm font-bold tabular-nums text-cq-strong">{s.score}</span>
                                    </div>
                                ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-cq-line bg-cq-panel">
                        <p className="border-b border-cq-line px-4 py-2.5 text-sm font-bold text-cq-strong">
                            Diễn biến lượt {round?.index}
                        </p>
                        <div className="max-h-[26rem] space-y-1 overflow-y-auto p-3 font-mono text-[11.5px] leading-relaxed text-cq-dim">
                            {(round?.frames ?? []).map((f, i) => (
                                <p key={i}>{f.text}</p>
                            ))}
                            {(round?.frames ?? []).length === 0 && <p>Lượt này không ai làm gì.</p>}
                        </div>
                    </div>

                    {(round?.submissions ?? []).some((s) => s.error) && (
                        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
                            <p className="mb-2 text-sm font-bold text-cq-strong">Ai gặp lỗi ở lượt này</p>
                            {round!.submissions
                                .filter((s) => s.error)
                                .map((s) => (
                                    <p key={s.userId} className="text-xs text-red-300">
                                        {data.players.find((p: any) => p.userId === s.userId)?.name ?? s.userId}: {s.error}
                                    </p>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArenaReplay;
