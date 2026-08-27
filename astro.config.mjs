// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

/**
 * CodeQuest — cấu hình build tĩnh.
 *
 * Toàn bộ trang được xuất ra HTML tĩnh để đẩy lên GitHub Pages / Cloudflare Pages.
 * Dữ liệu game lấy từ API lúc chạy (PUBLIC_API_URL), nên nội dung vẫn luôn mới
 * mà không cần máy chủ render.
 *
 * Biến môi trường khi build:
 *   PUBLIC_API_URL   URL công khai của backend, VD https://api.tenmien.com/api/v1
 *   PUBLIC_SITE_URL  URL của trang, dùng cho canonical + sitemap
 *   PUBLIC_BASE_PATH '/' nếu chạy ở tên miền riêng; '/ten-repo' nếu chạy ở
 *                    username.github.io/ten-repo
 */
const SITE = process.env.PUBLIC_SITE_URL || 'https://codequest.example.com';
const BASE = process.env.PUBLIC_BASE_PATH || '/';

export default defineConfig({
    // ─── Integrations ──────────────────────────────────────────────────────────
    integrations: [tailwind(), react()],

    // ─── Output: tĩnh hoàn toàn ────────────────────────────────────────────────
    // Mọi route động phải được liệt kê qua getStaticPaths (xem src/config/routes.ts)
    output: 'static',

    site: SITE,
    base: BASE,

    // Tạo thư mục riêng cho mỗi trang (/hub/index.html) để URL không cần đuôi .html
    build: {
        format: 'directory',
        // 'auto' = nhúng thẳng những tệp CSS nhỏ, còn tệp lớn thì tách ra file riêng.
        //
        // Trước đây để 'always' cho đỡ một vòng request. Nhưng dự án có 142 trang,
        // mà bảng màu + hiệu ứng chung đã lên hơn 100KB — nhúng thẳng nghĩa là
        // chép ngần ấy vào MỖI trang, và trình duyệt không cache lại được giữa
        // các trang. Tách ra một tệp dùng chung: tốn thêm đúng một request ở
        // lần vào đầu tiên, đổi lại mọi trang sau đó đều lấy từ cache.
        inlineStylesheets: 'auto',
    },

    // ─── Image Optimization ────────────────────────────────────────────────────
    image: {
        domains: ['images.unsplash.com', 'via.placeholder.com', 'picsum.photos'],
    },

    // ─── Vite ─────────────────────────────────────────────────────────────────
    vite: {
        resolve: {
            alias: {
                '@': '/src',
            },
        },
        build: {
            cssCodeSplit: true,
            rollupOptions: {
                output: {
                    // Tách vendor để trình duyệt cache lâu dài.
                    //
                    // Toàn bộ hệ sinh thái React phải nằm CHUNG một chunk.
                    // Tách react-router ra riêng sẽ tạo phụ thuộc vòng tròn
                    // (react-vendor ↔ react-router-vendor) vì Rollup nhét hàm
                    // helper CJS dùng chung vào một bên rồi bên kia import ngược
                    // lại. Lúc chạy, chunk nạp trước thấy biến của chunk kia là
                    // undefined → "Cannot read properties of undefined
                    // (reading 'createContext')" và mọi island chết hydrate.
                    //
                    // Lỗi này chỉ xuất hiện ở bản build, dev không chia chunk nên
                    // không lộ. test:pages có bước dò vòng tròn để chặn tái diễn.
                    manualChunks(id) {
                        if (!id.includes('node_modules')) return;
                        if (/node_modules[\/](react|react-dom|react-is|react-router|react-router-dom|scheduler)[\/]/.test(id)) {
                            return 'react-vendor';
                        }
                    },
                },
            },
        },
    },
});
