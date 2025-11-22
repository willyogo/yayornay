// Mock Supabase client for testing
import { vi } from 'vitest';

export const mockSupabaseClient = {
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  update: vi.fn(() => mockSupabaseClient),
  delete: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn(() => ({ data: null, error: null })),
  functions: {
    invoke: vi.fn(),
  },
};

export const createMockSupabaseClient = () => {
  return mockSupabaseClient as any;
};

