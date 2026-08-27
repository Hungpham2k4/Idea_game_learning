/**
 * @file src/config/routes.ts
 * @description Danh sách route cần sinh sẵn khi build tĩnh (GitHub Pages).
 *
 * Vì GitHub Pages chỉ phục vụ file tĩnh, mọi đường dẫn động phải được liệt kê
 * lúc build. Nội dung thật vẫn lấy từ API lúc chạy — các trang này chỉ là khung.
 *
 * Thêm game mới → bổ sung slug vào `GAME_SLUGS` rồi build lại.
 */

/** 10 game của CodeQuest, trùng với slug trong prisma/seeds. */
export const GAME_SLUGS = [
    'code-dungeon',
    'sql-kingdom',
    'linux-hacker',
    'sql-restaurant',
    'git-time-machine',
    'java-robot',
    'database-detective',
    'sql-battle',
    'code-tower-defense',
    'devops-survival',
] as const;

/**
 * Số màn tối đa sinh sẵn cho mỗi game.
 * Hiện mỗi game có 5 màn; để dư tới 12 phòng khi giảng viên thêm màn mới
 * mà chưa kịp build lại (mỗi trang chỉ là khung rỗng, gần như không tốn dung lượng).
 */
export const MAX_LEVELS_PER_GAME = 12;

/** Các nhánh con của SPA quản trị cần có file HTML riêng để mở trực tiếp được. */
export const ADMIN_SUB_ROUTES = ['users', 'games', 'levels', 'submissions'] as const;

/** Đường dẫn cho `getStaticPaths` của /games/[slug]. */
export function gameParams() {
    return GAME_SLUGS.map((slug) => ({ params: { slug } }));
}

/** Đường dẫn cho `getStaticPaths` của /play/[gameSlug]/[levelIndex]. */
export function playParams() {
    return GAME_SLUGS.flatMap((gameSlug) =>
        Array.from({ length: MAX_LEVELS_PER_GAME }, (_, i) => ({
            params: { gameSlug, levelIndex: String(i + 1) },
        })),
    );
}

/** Đường dẫn cho `getStaticPaths` của /admin/[...all]. */
export function adminParams() {
    return [
        { params: { all: undefined } }, // /admin
        ...ADMIN_SUB_ROUTES.map((route) => ({ params: { all: route } })),
    ];
}
