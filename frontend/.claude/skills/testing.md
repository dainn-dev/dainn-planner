# Testing Skill — PlanDaily Frontend

## Framework

React Testing Library (bundled với react-scripts 5). Chạy qua:

```bash
pnpm test              # watch mode
pnpm test -- --watchAll=false  # run once (CI)
pnpm test -- --coverage        # with coverage report
```

## Test File Convention

- Location: `src/__tests__/` hoặc cạnh file được test (`ComponentName.test.js`)
- Naming: `ComponentName.test.js` hoặc `functionName.test.js`
- Test name: `"renders X correctly"`, `"calls API when button clicked"`, `"shows error on invalid input"`

## Test Requirements

**Utility functions** (`src/utils/`, `src/constants/`):
- Test tất cả happy path + edge cases
- Ví dụ: `formatDate`, `getPostLoginPath`, `goalProgress`

**Components:**
- Test behavior, không test implementation
- Test: render đúng không? user interaction có đúng không?
- Không test: CSS classes, internal state

**Pages:**
- Mock `src/services/api.js` — không gọi API thật
- Test: loading state, data hiển thị đúng, error state

## Mock Pattern

```js
// Mock api.js
jest.mock('../services/api', () => ({
  tasksAPI: {
    getTasks: jest.fn().mockResolvedValue([]),
  },
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/daily' }),
}));
```

## Sau khi test

Report: "Tests: X passing, Y failing."
Nếu có failure: fix trước khi tiếp tục.
