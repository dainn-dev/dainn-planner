# UI Review Skill

Skill này chủ yếu dùng cho `frontend/` (React) và `cv-next/` (Next.js).
Nếu đang làm việc ở backend, skill này ít liên quan trừ khi bạn đang test API response trực tiếp trên browser.

## Khi làm việc ở frontend/

Chạy sau khi implement bất kỳ UI changes nào.

### Step 1: Start Dev Server

```bash
cd ../frontend
npm run dev
```
Chờ "Compiled successfully" trong output.

### Step 2: Mở Browser

Dùng Playwright MCP tool để:
1. Navigate đến `http://localhost:3000` (hoặc port tương ứng)
2. Login nếu cần
3. Navigate đến page/feature đã thay đổi

### Step 3: Dừng lại và Chờ

Báo user:
- "Tôi đã mở [URL] trong browser"
- "Đang ở trang [page name / route]"
- "Bạn review UI và cho tôi biết cần điều chỉnh gì"

**DỪNG TẠI ĐÂY. Chờ user response.**

### Step 4: Iterate

Nếu user yêu cầu thay đổi: apply → reload → hỏi review lại.
Nếu user approve: tiếp tục tạo PR.

## Khi làm việc ở cv-next/

```bash
cd ../cv-next
pnpm dev
```
Test local multi-tenant: `http://{slug}.localhost:3000`
