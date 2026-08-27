/**
 * @file test/pages-check.mjs
 * @description Kiểm tra bản build tĩnh: đủ trang, đủ file, nhúng đúng API URL,
 *              và không lộ thông tin nhạy cảm.
 *
 * Chạy trên thư mục dist/ nên KHÔNG cần backend hay dev server:
 *   npm run build && npm run test:pages
 *
 * Nếu muốn kiểm tra thêm kết nối tới backend đang chạy:
 *   API_BASE=https://api.tenmien.com/api/v1 npm run test:pages
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const API_BASE = process.env.API_BASE ?? '';

let pass = 0;
let fail = 0;

function check(name, ok, extra) {
    if (ok) {
        pass++;
        console.log(`  ✓ ${name}`);
    } else {
        fail++;
        console.log(`  ✗ ${name}`);
        if (extra !== undefined) console.log('     →', String(extra).slice(0, 300));
    }
}

function walk(dir, out = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
}

if (!existsSync(DIST)) {
    console.error('Chưa có thư mục dist/. Chạy `npm run build` trước.');
    process.exit(1);
}

const files = walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const read = (rel) => readFileSync(join(DIST, rel), 'utf8');
const has = (rel) => existsSync(join(DIST, rel));

console.log('\n── Cấu trúc bản build ────────────────────────');
check('Có trang chủ', has('index.html'));
check('Có trang 404', has('404.html'));
check('Có .nojekyll (nếu thiếu, GitHub bỏ qua _astro/)', has('.nojekyll'));
check(`Sinh đủ trang (${htmlFiles.length} trang)`, htmlFiles.length >= 100, htmlFiles.length);

console.log('\n── Các trang chính ───────────────────────────');
for (const page of [
    'hub/index.html',
    'login/index.html',
    'register/index.html',
    'leaderboard/index.html',
    'profile/index.html',
]) {
    check(`Có /${page.replace('/index.html', '')}`, has(page));
}

console.log('\n── Route động đã sinh sẵn ────────────────────');
check('Trang chi tiết game', has('games/sql-kingdom/index.html'));
check('Trang chơi màn 1', has('play/code-dungeon/1/index.html'));
check('Trang chơi màn 5', has('play/sql-kingdom/5/index.html'));
check('Trang quản trị gốc', has('admin/index.html'));
check('Nhánh con quản trị mở trực tiếp được', has('admin/users/index.html'));

console.log('\n── Nội dung ──────────────────────────────────');
const home = read('index.html');
check('Trang chủ hiện tên CodeQuest', home.includes('CodeQuest'));
check('Có logo ngôn ngữ bay quanh', home.includes('cq-float'), '');
check('Có script áp theme sớm (chống chớp màu)', home.includes('cq_theme'));

const login = read('login/index.html');
check('Trang đăng nhập KHÔNG lộ tài khoản mẫu', !login.includes('codequest.dev'), '');

console.log('\n── Cấu hình API ──────────────────────────────');
const jsFiles = files.filter((f) => f.endsWith('.js'));
const bundle = jsFiles.map((f) => readFileSync(f, 'utf8')).join('');
const apiMatch = /https?:\/\/[^"'` ]+\/api\/v1/.exec(bundle);
check('Đã nhúng URL API vào bundle', !!apiMatch, apiMatch?.[0]);
check(
    'API không trỏ về localhost (sẽ hỏng khi deploy)',
    !!apiMatch && !apiMatch[0].includes('localhost'),
    apiMatch?.[0],
);

console.log('\n── Không lộ thông tin nhạy cảm ───────────────');
const allText = [...htmlFiles, ...jsFiles].map((f) => readFileSync(f, 'utf8')).join('');
for (const [label, needle] of [
    ['mật khẩu seed', 'Admin@12345'],
    ['mật khẩu sinh viên', 'Sv@12345'],
    ['JWT secret', 'JWT_ACCESS_SECRET'],
]) {
    check(`Không chứa ${label}`, !allText.includes(needle));
}

// ── Tuỳ chọn: kiểm tra backend thật ─────────────────────────────────────────
if (API_BASE) {
    console.log('\n── Kết nối backend ───────────────────────────');
    try {
        const health = await fetch(`${API_BASE}/health`).then((r) => r.json());
        check('Backend trả về ok', health?.data?.status === 'ok', JSON.stringify(health));

        const origin = process.env.SITE_ORIGIN ?? 'https://game.example.com';
        const cors = await fetch(`${API_BASE}/games`, { headers: { Origin: origin } });
        check(
            `CORS cho phép ${origin}`,
            cors.headers.get('access-control-allow-origin') === origin,
            `nhận được: ${cors.headers.get('access-control-allow-origin')}`,
        );
        check('CORS cho phép gửi cookie', cors.headers.get('access-control-allow-credentials') === 'true');
    } catch (e) {
        check('Gọi được backend', false, e.message);
    }
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`Kết quả: ${pass} pass / ${fail} fail`);
console.log('═'.repeat(60));
if (fail > 0) process.exit(1);
