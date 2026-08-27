/**
 * @file scripts/prepare-pages.mjs
 * @description Chuẩn bị thư mục dist/ cho GitHub Pages sau khi build.
 *
 * Làm hai việc:
 *   1. Ghi file CNAME theo PUBLIC_SITE_URL — để GitHub Pages phục vụ tên miền riêng.
 *   2. Bảo đảm có .nojekyll — nếu thiếu, GitHub bỏ qua mọi thư mục bắt đầu bằng
 *      dấu gạch dưới, tức là toàn bộ /_astro/*.js và trang sẽ trắng trơn.
 *
 * Chạy tự động sau `npm run build` (xem script "postbuild" trong package.json).
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');

if (!existsSync(DIST)) {
    console.error('[pages] Không thấy thư mục dist/ — hãy chạy `npm run build` trước.');
    process.exit(1);
}

// ── .nojekyll ───────────────────────────────────────────────────────────────
writeFileSync(join(DIST, '.nojekyll'), '');
console.log('[pages] ✓ .nojekyll');

// ── CNAME ───────────────────────────────────────────────────────────────────
const siteUrl = process.env.PUBLIC_SITE_URL ?? '';
let host = '';

try {
    if (siteUrl) host = new URL(siteUrl).hostname;
} catch {
    console.warn(`[pages] PUBLIC_SITE_URL không hợp lệ: ${siteUrl}`);
}

// Bỏ qua tên miền ví dụ và các trang *.github.io (không cần CNAME)
const isPlaceholder = !host || host.includes('example.com') || host.endsWith('github.io');

if (isPlaceholder) {
    console.log('[pages] ⊘ Bỏ qua CNAME (chưa đặt tên miền riêng trong PUBLIC_SITE_URL)');
} else {
    writeFileSync(join(DIST, 'CNAME'), `${host}\n`);
    console.log(`[pages] ✓ CNAME → ${host}`);
}

// ── Nhắc nhở cấu hình API ───────────────────────────────────────────────────
const apiUrl = process.env.PUBLIC_API_URL ?? '';
if (!apiUrl || apiUrl.includes('localhost')) {
    console.warn(
        '\n[pages] ⚠️  PUBLIC_API_URL đang là "' +
            (apiUrl || '(trống)') +
            '".\n' +
            '       Bản build này sẽ gọi API ở localhost — người dùng khác sẽ không\n' +
            '       kết nối được. Hãy build lại với URL công khai của tunnel, ví dụ:\n' +
            '       PUBLIC_API_URL=https://api.tenmien.com/api/v1 npm run build\n',
    );
} else {
    console.log(`[pages] ✓ API → ${apiUrl}`);
}
