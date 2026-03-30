# cv-next

Next.js app for public CV / portfolio (tenant subdomain).

## Prerequisites

- **Node.js** 20 LTS or newer (matches typical Next.js 15 support).
- [pnpm](https://pnpm.io/) (repo uses `pnpm` for this package).

## Scripts

| Command        | Description                    |
| -------------- | ------------------------------ |
| `pnpm dev`     | Development server             |
| `pnpm build`   | Production build               |
| `pnpm start`   | Run production build locally   |
| `pnpm lint`    | ESLint                         |
| `pnpm clean`   | Delete `.next` (see below)     |

## Build troubleshooting

If `pnpm build` fails with a vague webpack/Next error such as:

`TypeError: Cannot read properties of undefined (reading 'length')`

1. Stop the dev server if it is running.
2. Remove the build cache: `pnpm clean` (or manually delete the `.next` folder).
3. Run `pnpm build` again.

Stale or corrupted `.next` output after dependency or config changes is a common cause; a clean rebuild usually fixes it.
