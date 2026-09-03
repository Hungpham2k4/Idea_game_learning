/**
 * @file src/components/arena/board/BoardCanvas.tsx
 * @description Bàn cờ hình vòng, quân đi và xúc xắc.
 *
 * Ô được xếp quanh chu vi một hình gần vuông. Với n ô thì chu vi phải thoả
 * `2 × (cols + rows) − 4 = n`, nên cols/rows suy ra từ n chứ không đặt cứng —
 * giảng viên đổi số ô trong trang quản trị là bàn cờ tự xếp lại.
 *
 * Quân di chuyển bằng `transition` của CSS trên toạ độ phần trăm, nên đi qua
 * bao nhiêu ô cũng chỉ là một lần chuyển động mượt, không phải nhảy từng bước.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BoardTile, BoardPlayerState } from '../../../lib/board';
import { SLOT_COLORS, TILE_STYLE } from '../../../lib/board';

interface Props {
    tiles: BoardTile[];
    players: BoardPlayerState[];
    /** Người đang tới lượt — ô của họ được làm nổi */
    currentPlayerId?: string | null;
    meId?: string;
    /** Ô vừa được đi tới, để nhấp nháy */
    highlightTile?: number | null;
}

/** Xếp n ô quanh chu vi một hình gần vuông. */
export function ringLayout(n: number): { cols: number; rows: number; cells: [number, number][] } {
    let cols = Math.ceil((n + 4) / 4);
    let rows = (n + 4) / 2 - cols;
    // n lẻ hoặc quá nhỏ thì nới cols cho tới khi rows thành số nguyên hợp lệ
    let guard = 0;
    while ((rows < 2 || !Number.isInteger(rows)) && guard++ < 50) {
        cols++;
        rows = (n + 4) / 2 - cols;
    }
    if (rows < 2) rows = 2;

    const cells: [number, number][] = [];
    for (let x = 0; x < cols; x++) cells.push([x, 0]);
    for (let y = 1; y < rows; y++) cells.push([cols - 1, y]);
    for (let x = cols - 2; x >= 0; x--) cells.push([x, rows - 1]);
    for (let y = rows - 2; y >= 1; y--) cells.push([0, y]);

    return { cols, rows, cells: cells.slice(0, n) };
}

const BoardCanvas: React.FC<Props> = ({ tiles, players, currentPlayerId, meId, highlightTile }) => {
    const { cols, rows, cells } = useMemo(() => ringLayout(tiles.length), [tiles.length]);

    if (tiles.length === 0) {
        return (
            <div className="grid aspect-square w-full place-items-center rounded-2xl border border-dashed border-cq-line text-sm text-cq-muted">
                Bàn cờ sẽ hiện khi ván bắt đầu
            </div>
        );
    }

    const cellW = 100 / cols;
    const cellH = 100 / rows;

    /**
     * Nhiều quân đứng cùng ô thì xếp theo lưới nhỏ trong ô, đồng thời thu nhỏ lại.
     *
     * Rải một hàng ngang thì bốn quân sẽ tràn khỏi ô và đè lên ô bên cạnh; xếp
     * lưới 2×2 vừa gọn trong ô vừa nhìn rõ ai đứng đâu.
     */
    const layoutFor = (tileIndex: number, playerId: string) => {
        const here = players.filter((p) => p.position === tileIndex).sort((a, b) => a.slot - b.slot);
        const i = here.findIndex((p) => p.id === playerId);
        const n = here.length;

        if (n <= 1) return { dx: 0, dy: 0, size: 40 };
        if (n === 2) return { dx: i === 0 ? -24 : 24, dy: 0, size: 34 };
        if (n === 3) {
            const spots = [
                { dx: -26, dy: -18 },
                { dx: 26, dy: -18 },
                { dx: 0, dy: 22 },
            ];
            return { ...spots[i], size: 30 };
        }
        // 4 quân trở lên: lưới 2×2, quân thứ 5–6 chồng nhẹ lên nhưng vẫn phân biệt được
        const spots = [
            { dx: -26, dy: -22 },
            { dx: 26, dy: -22 },
            { dx: -26, dy: 22 },
            { dx: 26, dy: 22 },
            { dx: 0, dy: 0 },
            { dx: 0, dy: -44 },
        ];
        return { ...(spots[i] ?? spots[4]), size: 28 };
    };

    return (
        <div
            className="relative mx-auto w-full overflow-hidden rounded-2xl border border-cq-line bg-cq-screen"
            style={{
                aspectRatio: `${cols} / ${rows}`,
                // Giới hạn theo chiều CAO chứ không chỉ chiều rộng: bàn 7×7 trên
                // khung rộng sẽ cao hơn cả màn hình, đẩy xúc xắc và bảng điểm
                // xuống dưới tầm nhìn — mà đó mới là hai thứ người chơi cần thấy.
                maxWidth: `min(100%, calc(66vh * ${cols / rows}))`,
            }}
        >
            {/* Vùng giữa bàn cờ */}
            <div
                className="absolute grid place-items-center rounded-xl border border-cq-line/40 bg-cq-panel/30"
                style={{
                    left: `${cellW}%`,
                    top: `${cellH}%`,
                    width: `${cellW * (cols - 2)}%`,
                    height: `${cellH * (rows - 2)}%`,
                }}
            >
                <div className="text-center">
                    <p className="cq-gradient-text text-xl font-black tracking-tight sm:text-3xl">CODE TYCOON</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-cq-muted sm:text-xs">
                        {tiles.length} ô · gõ code để đi
                    </p>
                </div>
            </div>

            {/* Các ô */}
            {cells.map(([cx, cy], i) => {
                const tile = tiles[i];
                if (!tile) return null;
                const style = TILE_STYLE[tile.kind] ?? TILE_STYLE.bonus;
                const hot = highlightTile === i;

                return (
                    <div
                        key={i}
                        className={`absolute p-[2px] transition-transform duration-300 ${hot ? 'z-10 scale-105' : ''}`}
                        style={{ left: `${cx * cellW}%`, top: `${cy * cellH}%`, width: `${cellW}%`, height: `${cellH}%` }}
                        title={`Ô ${i + 1} — ${tile.label}${tile.note ? `\n${tile.note}` : ''}`}
                    >
                        <div
                            className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg border text-center ${
                                hot ? 'border-cq-neon shadow-[0_0_18px_-2px_rgb(var(--cq-neon))]' : 'border-cq-line/70'
                            }`}
                            style={{ background: style.bg }}
                        >
                            <span className="text-[clamp(10px,2vw,18px)] leading-none">{style.icon}</span>
                            <span className="mt-0.5 line-clamp-2 px-0.5 text-[clamp(5px,0.85vw,9px)] font-semibold leading-tight text-cq-strong/90">
                                {tile.label}
                            </span>
                            <span className="absolute left-0.5 top-0.5 font-mono text-[clamp(5px,0.7vw,8px)] text-cq-muted">
                                {i + 1}
                            </span>

                            {tile.kind === 'problem' && tile.difficulty && (
                                <span
                                    className="absolute bottom-0 left-0 h-[3px] w-full"
                                    style={{
                                        background:
                                            tile.difficulty === 'HARD'
                                                ? '#f87171'
                                                : tile.difficulty === 'MEDIUM'
                                                  ? '#fbbf24'
                                                  : '#4ade80',
                                    }}
                                />
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Quân cờ */}
            {players.map((p) => {
                const cell = cells[p.position] ?? [0, 0];
                const off = layoutFor(p.position, p.id);
                const color = SLOT_COLORS[p.slot % SLOT_COLORS.length];
                const isTurn = p.id === currentPlayerId;

                return (
                    <div
                        key={p.id}
                        className="pointer-events-none absolute z-20 grid place-items-center transition-all duration-700 ease-out"
                        style={{
                            left: `${cell[0] * cellW}%`,
                            top: `${cell[1] * cellH}%`,
                            width: `${cellW}%`,
                            height: `${cellH}%`,
                            transform: `translate(${off.dx}%, ${off.dy}%)`,
                        }}
                        title={`${p.name} · ${p.score} điểm`}
                    >
                        <span
                            className="relative grid place-items-center"
                            style={{ width: `${off.size}%`, height: `${off.size}%` }}
                        >
                            {isTurn && (
                                <span
                                    className="absolute inset-[-28%] rounded-full border-2 animate-[cqGlowRing_1.4s_ease-out_infinite]"
                                    style={{ borderColor: color }}
                                />
                            )}
                            <span
                                className={`grid h-full w-full place-items-center rounded-full text-[clamp(6px,1vw,11px)] font-black text-white shadow-lg ${
                                    p.id === meId ? 'ring-2 ring-white' : ''
                                }`}
                                style={{ backgroundColor: color }}
                            >
                                {p.name.slice(0, 1).toUpperCase()}
                            </span>
                            {p.shields > 0 && (
                                <span className="absolute -right-1 -top-1 grid h-3 w-3 place-items-center rounded-full bg-cq-neon text-[7px] font-bold text-cq-onaccent">
                                    {p.shields}
                                </span>
                            )}
                            {p.skipTurns > 0 && (
                                <span className="absolute -bottom-1 -left-1 grid h-3 w-3 place-items-center rounded-full bg-amber-500 text-[7px] font-bold text-black">
                                    {p.skipTurns}
                                </span>
                            )}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Xúc xắc ─────────────────────────────────────────────────────────────────

/** Chấm của mặt xúc xắc, theo lưới 3×3. */
const PIPS: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

export const Die: React.FC<{ value: number; rolling?: boolean; size?: number }> = ({
    value,
    rolling = false,
    size = 56,
}) => {
    // Lắc qua các mặt trong lúc "đổ" để có cảm giác thật
    const [shown, setShown] = useState(value);

    useEffect(() => {
        if (!rolling) {
            setShown(value);
            return;
        }
        const id = setInterval(() => setShown(1 + Math.floor(Math.random() * 6)), 80);
        return () => clearInterval(id);
    }, [rolling, value]);

    const pips = PIPS[Math.min(6, Math.max(1, shown))] ?? PIPS[1];

    return (
        <div
            className={`grid rounded-xl border border-cq-line bg-cq-panel p-[12%] shadow-lg ${
                rolling ? 'animate-[cqShake_0.35s_ease-in-out_infinite]' : 'animate-cq-tick'
            }`}
            style={{ width: size, height: size, gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)' }}
            aria-label={`Xúc xắc ${shown}`}
        >
            {Array.from({ length: 9 }, (_, i) => {
                const c = i % 3;
                const r = Math.floor(i / 3);
                const on = pips.some(([px, py]) => px === c && py === r);
                return (
                    <span key={i} className="grid place-items-center">
                        {on && <span className="h-[70%] w-[70%] rounded-full bg-cq-strong" />}
                    </span>
                );
            })}
        </div>
    );
};

export default BoardCanvas;
