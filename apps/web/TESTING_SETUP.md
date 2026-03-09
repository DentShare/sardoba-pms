# Testing Setup

## Required Dependencies

The following testing dependencies need to be installed before running tests:

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

## Configuration

- **Jest config:** `apps/web/jest.config.json`
- **Test setup file:** `apps/web/src/test-setup.ts`
- **Test environment:** jsdom

## Running Tests

```bash
cd apps/web
npm test
```

## Test Files

- `src/components/ui/Button.spec.tsx` - Button component tests
- `src/components/ui/Modal.spec.tsx` - Modal component tests
- `src/components/ui/Table.spec.tsx` - Table component tests
- `src/components/ui/Input.spec.tsx` - Input component tests
- `src/components/ui/Badge.spec.tsx` - Badge component tests
- `src/app/(auth)/login/page.spec.tsx` - Login page tests
- `src/lib/utils/money.spec.ts` - Money utility tests
- `src/lib/utils/dates.spec.ts` - Date utility tests
