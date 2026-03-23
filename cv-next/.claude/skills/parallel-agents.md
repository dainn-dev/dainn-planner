# Parallel Agents Skill

Dung khi task co nhieu phan lon, doc lap voi nhau.

## Luon Hoi Truoc

KHONG dispatch agents ma khong co confirmation. Present:
- Agent nao lam gi
- File nao moi agent owns
- Tradeoffs cua parallel vs sequential

Cho explicit approval.

## Dispatching

Moi agent prompt phai include:
1. Mo ta task chinh xac
2. File paths agent owns
3. File paths agent KHONG duoc touch
4. Cach chay `pnpm build` de verify
5. Definition of done

## Sau khi Hoan Thanh

1. Review tat ca changes cung nhau
2. Chay `pnpm build` + `pnpm lint`
3. Resolve conflicts
4. Commit cung nhau
