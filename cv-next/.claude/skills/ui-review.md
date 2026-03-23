# UI Review Skill

Chay sau khi implement bat ky UI changes nao.

## Step 1: Start Dev Server

```bash
pnpm dev
```

Cho den khi thay "Ready" hoac "started server on" trong output.
Dev server chay tai `http://localhost:3000`.

**Test multi-tenant locally:** truy cap `http://{slug}.localhost:3000` (middleware se parse slug tu host `.localhost`).

## Step 2: Mo Browser voi Playwright

Dung Playwright MCP tool de:
1. Navigate den app URL (`http://localhost:3000`)
2. Neu test subdomain: navigate den `http://{slug}.localhost:3000`
3. Navigate den page/feature da thay doi

## Step 3: Dung lai va Cho

Bao user:
- "Toi da mo [URL] trong browser"
- "Dang o trang [page name / section]"
- "Ban review UI va cho toi biet can dieu chinh gi"

**DUNG TAI DAY. Cho user response.**

## Step 4: Iterate

Neu user yeu cau thay doi: apply → reload → hoi review lai.
Neu user approve: tiep tuc tao PR.
