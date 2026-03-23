# UI Review Skill — PlanDaily Frontend

Chạy sau khi implement bất kỳ UI changes nào.

## Step 1: Start Dev Server

```bash
pnpm dev
# Chờ "Compiled successfully" hoặc "webpack compiled"
# App chạy tại http://localhost:3005
```

## Step 2: Xác định credentials test

Check `.env`:
- `REACT_APP_API_URL` — backend URL (mặc định http://localhost:5113/api)
- Backend phải đang chạy (`dotnet run` hoặc `docker compose up`)

User test thường dùng: email/password account đã có trong DB. Hỏi developer nếu chưa biết.

## Step 3: Open Browser với Playwright

Dùng Playwright MCP tool để:
1. Navigate đến `http://localhost:3005`
2. Login nếu trang cần auth (POST `/api/auth/login`, lưu token)
3. Navigate đến page/feature đã thay đổi

## Step 4: Kiểm tra cả Dark mode

Nếu thay đổi có liên quan đến colors/backgrounds:
- Toggle dark mode: `localStorage.setItem('user_settings', JSON.stringify({darkMode: true}))` + dispatch event
- Kiểm tra `dark:` Tailwind classes có đúng không

## Step 5: Kiểm tra cả 2 locale

Nếu thay đổi có liên quan đến text/UI strings:
- Switch sang EN: `localStorage.setItem('app_lang', 'en')` + reload
- Kiểm tra text không bị vỡ layout khi dài hơn

## Step 6: Dừng lại và Chờ

Báo user:
- "Tôi đã mở [URL] trong browser"
- "Đang ở trang [page name / route]"
- "Bạn review UI và cho tôi biết cần điều chỉnh gì"

**DỪNG TẠI ĐÂY. Chờ user response.**

## Step 7: Iterate

Nếu user yêu cầu thay đổi: apply → reload → hỏi review lại.
Nếu user approve: tiếp tục tạo PR.
