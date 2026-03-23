# Architectural Decisions — PlanDaily Frontend

_Thêm decisions vào đây khi chúng được đưa ra._

---

## Decision: React (CRA) thay vì Next.js

**Date:** (inferred từ existing code)
**Decision:** Dùng Create React App (react-scripts) làm build toolchain
**Reason:** SPA thuần — không cần SSR, SEO chỉ cần cho landing page. Đơn giản hơn cho personal tool.
**Alternatives considered:** Next.js — phức tạp hơn cần thiết ở thời điểm khởi đầu
**Note:** Khi nâng cấp SaaS có thể cần migrate sang Next.js hoặc Vite

---

## Decision: Không dùng TypeScript

**Date:** (inferred từ existing code)
**Decision:** Thuần JavaScript, không có TypeScript
**Reason:** Tốc độ phát triển nhanh hơn cho personal tool
**Note:** Khi scale lên SaaS nên xem xét migrate sang TypeScript

---

## Decision: Local state thay vì global state manager

**Date:** (inferred từ existing code)
**Decision:** useState/useEffect per-component, không có Redux/Zustand/Jotai
**Reason:** App đủ đơn giản, data không cần share nhiều giữa pages — router-based navigation reset state tự nhiên
**Note:** Khi thêm nhiều cross-page features có thể cần global store

---

## Decision: Centralized API service

**Date:** (inferred từ existing code)
**Decision:** Tất cả API calls qua `src/services/api.js` với `apiRequest()` wrapper
**Reason:** DRY — auth token, error handling, toast notification, 401 redirect chỉ viết một lần
**Alternatives considered:** Axios instance, React Query — thêm dependency không cần thiết ở thời điểm đó

---

## Decision: i18next với vi fallback

**Date:** (inferred từ existing code)
**Decision:** 2 locales vi + en, fallback là `vi`
**Reason:** App ban đầu nhắm cho người dùng Việt Nam — vi là primary language
**Note:** Cả hai file `vi.json` và `en.json` phải được cập nhật đồng bộ

---

## Decision: JWT lưu trong localStorage

**Date:** (inferred từ existing code)
**Decision:** JWT token lưu trong localStorage, không dùng httpOnly cookie
**Reason:** Đơn giản hơn — không cần CSRF handling, dễ implement hơn với SPA
**Trade-off:** Kém an toàn hơn httpOnly cookie (XSS risk) — cần sanitize inputs
**Note:** Khi launch SaaS nên xem xét chuyển sang httpOnly cookie

---

## Decision: Tailwind CSS class strategy cho dark mode

**Date:** (inferred từ existing code)
**Decision:** `darkMode: "class"` trong tailwind.config.js — toggle qua `document.documentElement.classList`
**Reason:** Cho phép control dark mode bằng JavaScript, sync với user settings từ API
**Implementation:** `localStorage('user_settings').darkMode` → `applyDarkModeFromStorage()` trong App.js

---

## Decision: CV hosting như một sub-platform

**Date:** 2026-03-23 (từ git log — AddCvHostingTables migration)
**Decision:** CV hosting feature dùng role riêng `platform_admin`, tách khỏi `Admin` role
**Reason:** Separation of concerns — planner admin và CV platform staff là 2 vai trò khác nhau
**Implementation:** `CvPlatformAdminRoute` guard, `cvPlatformAPI` trong api.js, `isCvPlatformStaffUser()` trong auth.js

---
