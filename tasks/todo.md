# Task: Beta-Testing — E2E & Integration Tests (Phase 1)

## Plan

### Test Infrastructure
- [x] Create seed-test.ts with predictable test data
- [x] Create Playwright E2E test files for Phase 1

### E2E Tests (Playwright — apps/web/e2e/)
- [x] booking-lifecycle.spec.ts — booking CRUD + status transitions (10 scenarios)
- [x] public-booking-flow.spec.ts — guest self-booking flow (7 scenarios)
- [x] auth-flows.spec.ts — login, logout, register, forgot-password (5 scenarios)
- [x] api-proxy.spec.ts — frontend-backend proxy integration (5 scenarios)

### Backend Integration Tests (apps/api/test/)
- [x] bookings.e2e-spec.ts — full booking API lifecycle (12 scenarios)
- [x] public-booking.e2e-spec.ts — public booking endpoints (9 scenarios)

### Manual Testing Checklist
- [ ] Run seed-test.ts against dev database
- [ ] Run Playwright E2E tests: `cd apps/web && npx playwright test`
- [ ] Run backend integration tests: `cd apps/api && npx jest --config test/jest-e2e.json`
- [ ] Manual walkthrough: Receptionist morning scenario
- [ ] Manual walkthrough: Guest self-booking scenario
- [ ] Manual walkthrough: Manager end-of-day scenario
- [ ] Cross-browser check: Chrome, Firefox, Safari, Mobile Safari
- [ ] Security check: HttpOnly cookies, XSS, SQL injection, rate limiting

## Verification
- [ ] All Phase 1 E2E tests pass
- [ ] All backend integration tests pass
- [ ] Manual scenarios completed without issues
- [ ] No security vulnerabilities found

## Review
Phase 1 test files created:
- 7 new test files total (4 Playwright E2E + 2 backend integration + 1 seed script)
- ~48 automated test scenarios covering critical booking flows
- Full manual testing checklist in plan file
