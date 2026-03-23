# Parallel Agents Skill — PlanDaily Frontend

Dùng khi task có nhiều phần lớn, độc lập với nhau.

## Luôn Hỏi Trước

KHÔNG dispatch agents mà không có confirmation. Present:
- Agent nào làm gì
- File nào mỗi agent owns
- Tradeoffs của parallel vs sequential

Chờ explicit approval.

## Dispatching

Mỗi agent prompt phải include:
1. Mô tả task chính xác
2. File paths agent owns
3. File paths agent KHÔNG được touch
4. Cách verify (pnpm dev, kiểm tra browser)
5. Definition of done

## Ví dụ phân chia tốt

Parallel được khi:
- Agent A: tạo component mới trong `src/components/`
- Agent B: tạo page mới trong `src/pages/` (dùng component của A nhưng không edit A)
- Agent C: thêm i18n keys vào `src/locales/vi.json` + `src/locales/en.json`

KHÔNG parallel khi:
- Cả hai cùng edit `src/services/api.js`
- Cả hai cùng edit `src/App.js` (routing)
- Một agent cần kết quả từ agent kia trước

## Sau khi Hoàn Thành

1. Review tất cả changes cùng nhau
2. Chạy `pnpm dev` — không có compile error
3. Resolve conflicts
4. Commit cùng nhau
