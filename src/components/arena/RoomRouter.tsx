/**
 * @file src/components/arena/RoomRouter.tsx
 * @description Chọn đúng giao diện phòng theo chế độ chơi.
 *
 * Hai loại phòng khác nhau về bản chất:
 *   • ba chế độ đấu trường — mọi người viết cùng lúc, giải đồng thời
 *   • cờ tỷ phú          — chơi theo lượt, đổ xúc xắc, giải bài
 *
 * Hỏi REST trước để biết loại nào rồi mới nạp thành phần tương ứng. Cách này
 * tốn thêm một request nhưng đổi lại: mỗi giao diện chỉ mở đúng những sự kiện
 * socket của mình, không có một lớp khổng lồ đầy cờ điều kiện.
 */
import React, { useEffect, useState } from 'react';
import ArenaRoom from './ArenaRoom';
import BoardRoom from './board/BoardRoom';
import { arenaApi } from '../../lib/arena';
import { isLoggedIn } from '../../lib/codequest';

const RoomRouter: React.FC = () => {
    const [mode, setMode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get('code')?.toUpperCase() ?? '';
        if (!code) {
            setError('Thiếu mã phòng trong địa chỉ. Hãy quay lại sảnh và chọn phòng.');
            return;
        }
        if (!isLoggedIn()) {
            window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            return;
        }

        arenaApi
            .room(code)
            .then((r) => setMode(r?.mode ?? 'territory'))
            .catch((e) => setError(e?.message ?? 'Phòng không tồn tại hoặc đã kết thúc.'));
    }, []);

    if (error) {
        return (
            <div className="cq-glass mx-auto max-w-lg p-6 text-center">
                <p className="text-lg font-bold text-cq-strong">Không vào được phòng</p>
                <p className="mt-2 text-sm text-cq-muted">{error}</p>
                <a href="/arena" className="cq-btn-primary mt-5 inline-flex">← Về sảnh đấu trường</a>
            </div>
        );
    }

    if (!mode) {
        return (
            <div className="mx-auto grid h-64 max-w-lg place-items-center">
                <div className="text-center">
                    <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-cq-neon border-t-transparent" />
                    <p className="mt-3 text-sm text-cq-muted">Đang vào phòng…</p>
                </div>
            </div>
        );
    }

    return mode === 'board' ? <BoardRoom /> : <ArenaRoom />;
};

export default RoomRouter;
