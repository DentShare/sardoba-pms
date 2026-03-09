import '@testing-library/jest-dom';

// ─── Mock next/navigation ───────────────────────────────────────────────────

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
};

const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => ({}),
  usePathname: () => '/',
  useSearchParams: () => mockSearchParams,
  useSelectedLayoutSegment: () => null,
  useSelectedLayoutSegments: () => [],
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

// ─── Mock next/image ────────────────────────────────────────────────────────

jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fill, priority, ...rest } = props;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const React = require('react');
    return React.createElement('img', rest);
  },
}));

// ─── Reset mocks between tests ─────────────────────────────────────────────

beforeEach(() => {
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.refresh.mockClear();
  mockRouter.back.mockClear();
  mockRouter.forward.mockClear();
  mockRouter.prefetch.mockClear();
});
