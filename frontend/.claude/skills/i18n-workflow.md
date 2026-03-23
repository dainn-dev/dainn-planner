# i18n Workflow Skill — PlanDaily Frontend

Dùng mỗi khi thêm string UI mới hoặc tạo component/page mới.

## Quy tắc bắt buộc

- **Không bao giờ** hardcode string tiếng Anh hay tiếng Việt trong JSX/JS
- Tất cả string UI phải qua `t('section.key')`
- Thêm key vào **cả hai** `vi.json` và `en.json` cùng lúc

## File locations

```
src/locales/vi.json   ← tiếng Việt (fallback mặc định)
src/locales/en.json   ← tiếng Anh
```

## Cấu trúc key hiện tại

```
common.*          — shared: save, cancel, delete, loading, ...
notifications.*   — notification messages
auth.*            — login, register, forgot password, ...
sidebar.*         — navigation labels
daily.*           — DailyPage strings
goals.*           — GoalsPage + GoalDetailPage strings
calendar.*        — CalendarPage strings
settings.*        — SettingsPage strings
admin.*           — Admin pages strings
homepage.*        — Landing page strings
```

## Thêm key mới

1. Chọn section phù hợp (hoặc tạo section mới nếu page mới)
2. Thêm vào `vi.json`:
```json
{
  "mySection": {
    "myKey": "Chuỗi tiếng Việt",
    "withVar": "Xin chào {{name}}"
  }
}
```
3. Thêm vào `en.json` (cùng key, khác value):
```json
{
  "mySection": {
    "myKey": "English string",
    "withVar": "Hello {{name}}"
  }
}
```
4. Dùng trong component:
```jsx
const { t } = useTranslation();
t('mySection.myKey')
t('mySection.withVar', { name: user.fullName })
```

## Kiểm tra sau khi thêm

1. Switch sang EN: `localStorage.setItem('app_lang', 'en')` → reload
2. Kiểm tra text EN không bị vỡ layout (thường dài hơn VI)
3. Switch lại VI: `localStorage.setItem('app_lang', 'vi')` → reload

## Pattern hay dùng

```jsx
// Conditional text
t(isCompleted ? 'tasks.completed' : 'tasks.pending')

// Plural (không có built-in pluralization — dùng count thủ công)
t('goals.milestones', { count: milestones.length })
// vi.json: "milestones": "{{count}} giai đoạn"

// Nested interpolation
t('notifications.goalCompleted', { goal: goalTitle })
// vi.json: "goalCompleted": "Chúc mừng bạn đã hoàn thành mục tiêu {{goal}}."
```
