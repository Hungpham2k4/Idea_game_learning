# CodeQuest Web (Astro static + React)

Frontend của CodeQuest: khu vực chơi game cho sinh viên và SPA quản trị cho giảng viên.

> Đây là repo **chỉ chứa frontend**. Backend (NestJS + Prisma) nằm ở kho riêng và không
> được công khai, vì thư mục seed của nó chứa đáp án của cả 50 màn chơi.
Dựng trên boilerplate **Astro (web) + React SPA (admin)**, build ra HTML tĩnh
(`output: 'static'`) để chạy được trên GitHub Pages. Mọi dữ liệu lấy từ API
ở `PUBLIC_API_URL` bằng `fetch` phía trình duyệt.

```bash
npm install
cp .env.example .env    # PUBLIC_API_URL=http://localhost:8080/api/v1
npm run dev             # http://localhost:4321
```

> Backend phải chạy trước (`npm run dev` trong thư mục `server` của kho backend), nếu không trang chủ sẽ hiển thị
> danh sách game mẫu và các trang cần đăng nhập sẽ báo mất kết nối.

## Cấu trúc

```
src/
├── components/
│   ├── game/                    Khu vực chơi game (React islands)
│   │   ├── GameHub.tsx          Bản đồ 10 game + trạng thái khoá
│   │   ├── GameDetail.tsx       Chọn màn trong một game
│   │   ├── GamePlayer.tsx       Màn hình chơi: nhiệm vụ · lệnh · sân khấu · console
│   │   ├── CodeEditor.tsx       Textarea có số dòng, Tab, Ctrl+Enter, Ctrl+S
│   │   ├── ConsoleOutput.tsx    In lệnh, bảng SQL, bản đồ ASCII, lỗi kèm gợi ý
│   │   ├── Markdown.tsx         Bộ hiển thị markdown rút gọn (không thư viện ngoài)
│   │   ├── ResultModal.tsx      Sao, XP, huy hiệu, game vừa mở khoá
│   │   ├── Leaderboard.tsx      Xếp hạng toàn trường / lớp / game
│   │   ├── ProfilePanel.tsx     Hồ sơ, tiến trình, huy hiệu, lịch sử
│   │   ├── UserChip.tsx         Thẻ người chơi trên header
│   │   └── stages/              Sân khấu theo engine — tất cả đều có hoạt ảnh
│   │       ├── GameStage.tsx    Bộ chọn sân khấu
│   │       ├── GridStage.tsx    Lưới ô, nhân vật đi từng bước, số sát thương bay lên
│   │       ├── TowerStage.tsx   Tower defense mô phỏng theo từng tick
│   │       ├── SqlStage.tsx     Thanh máu tụt, quái gục, mục tiêu bị khoá 🎯
│   │       ├── TerminalStage.tsx Tủ rack máy chủ, đèn LED, đồng hồ CPU/RAM
│   │       └── GitStage.tsx     HEAD trượt dọc dòng thời gian, commit mới nảy lên
│   │
│   └── admin/                   SPA quản trị (React Router)
│       ├── AdminApp.tsx         Gate quyền TEACHER/ADMIN + router
│       ├── AdminLayout.tsx      Sidebar + header
│       └── pages/               Dashboard · Users · Games · Levels · Submissions
│
├── layouts/
│   ├── BaseLayout.astro         Trang công khai (SEO đầy đủ)
│   └── GameLayout.astro         Khu vực chơi game (nền tối, header người chơi)
│
├── lib/codequest.ts             Client API + phiên đăng nhập + kiểu dữ liệu
│
└── pages/
    ├── index.astro              Trang giới thiệu (lấy danh sách game từ API)
    ├── login.astro · register.astro
    ├── hub.astro                Bản đồ game
    ├── games/[slug].astro       Chọn màn
    ├── play/[gameSlug]/[levelIndex].astro   Màn hình chơi
    ├── leaderboard.astro · profile.astro
    └── admin/[...all].astro     Cổng vào SPA quản trị
```

## Cơ chế đăng nhập

| Thứ | Lưu ở đâu | Dùng để |
|-----|-----------|---------|
| Access token (30 phút) | `localStorage.cq_access` | Gắn header `Authorization` |
| Refresh token (30 ngày) | Cookie `httpOnly` do backend set | Tự làm mới access token khi gặp 401 |
| `cq_session` = `username:role` | Cookie thường | Hiển thị tên người dùng trên thanh điều hướng |

`apiFetch` trong `src/lib/codequest.ts` tự gọi `/auth/refresh` một lần khi gặp 401 rồi thử lại request.
Quyền thật luôn do backend quyết định — cookie `cq_session` chỉ để đỡ chớp giao diện.

## Thêm một trang mới

```astro
---
import GameLayout from '@/layouts/GameLayout.astro';
import MyPanel from '@/components/game/MyPanel';
---
<GameLayout title="Trang của tôi" active="hub">
    <MyPanel client:load />
</GameLayout>
```

Thêm mục vào `src/config/menu.ts` (`webMenu` cho web, `adminMenu` cho SPA quản trị).
Với admin, nhớ khai báo icon trong `ICON_MAP` của `AdminLayout.tsx` và thêm `<Route>` trong `AdminApp.tsx`.

## Kiểm thử

```bash
npm run check       # typecheck Astro + React (0 lỗi)
npm run test:pages  # 18 test: render trang, chặn /admin, CORS FE ↔ BE
npm run build       # build production (output: server, adapter node)
```

## Hoạt ảnh

Sân khấu không tự bịa hiệu ứng. Backend trả về `result.frames` — kịch bản sinh ra từ
việc so sánh dữ liệu trước/sau mỗi lệnh — và mỗi stage chỉ việc phát lại:

```
frames[0] → SELECT ... WHERE hp < 30   → 🎯 khoá 2 mục tiêu (viền phát sáng)
frames[1] → UPDATE enemy SET hp = ...  → 💥 rung + số "-50" bay lên + thanh máu tụt
frames[2] → DELETE FROM enemy ...      → ☠️ thẻ nhân vật mờ dần và gạch ngang
```

Mọi stage đều có thanh tua: **▶ Xem lại / ⏸ Tạm dừng** và thanh trượt để xem lại từng bước.
Các lớp hiệu ứng dùng chung nằm ở cuối `src/styles/global.css`:
`animate-cq-shake` · `animate-cq-float-up` · `animate-cq-glow` · `animate-cq-fade-out` ·
`animate-cq-pulse-dot` · `animate-cq-flash`.

## Giao diện

- Khu vực chơi game dùng nền tối kiểu terminal, khai báo trong `src/styles/global.css`
  (`.cq-page`, `.cq-panel`, `.cq-btn-*`, `.cq-input`, `.cq-terminal`) và bảng màu `cq.*` trong `tailwind.config.mjs`.
- Màu của từng game (`game.color`) đến từ backend và được gắn inline, nên đổi màu game không cần sửa FE.

---

## Đưa lên GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` tự chạy mỗi lần đẩy lên nhánh `main`.

**1. Bật Pages** — Settings → Pages → Build and deployment → Source: **GitHub Actions**

**2. Khai báo hai biến** — Settings → Secrets and variables → Actions → tab **Variables**

| Tên | Giá trị |
|-----|---------|
| `PUBLIC_API_URL` | `https://api.tenmien.com/api/v1` |
| `PUBLIC_SITE_URL` | `https://tenmien.com` |

Thiếu hai biến này thì bản build sẽ trỏ API về `localhost:8080` và workflow báo lỗi ngay.

**3. Trỏ tên miền** — Settings → Pages → Custom domain, rồi bật **Enforce HTTPS**.

Ở Cloudflare DNS, bản ghi của tên miền phải để **DNS only (mây xám)** — bật proxy sẽ
xung đột với chứng chỉ HTTPS mà GitHub Pages tự cấp.

| Dùng tên miền gốc `tenmien.com` | Dùng tên miền con `game.tenmien.com` |
|---|---|
| 4 bản ghi `A` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` | 1 bản ghi `CNAME` `game` → `<tài-khoản>.github.io` |

**4. Backend phải cho phép tên miền này gọi vào** — trong `.env` của backend:

```bash
CORS_ORIGINS=https://tenmien.com
COOKIE_SAMESITE=none      # bắt buộc khi API khác tên miền gốc với frontend
COOKIE_SECURE=true
```

Kiểm tra bản build trước khi đẩy: `npm run build && npm run test:pages`
