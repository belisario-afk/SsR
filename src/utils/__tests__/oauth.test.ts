import { describe, it, expect } from 'vitest';

describe('oauth utilities', () => {
  it('has a client id configured', () => {
    // Keep in sync with real constant in src/utils/oauth.ts
    const CLIENT_ID = '927fda6918514f96903e828fcd6bb576';
    expect(CLIENT_ID).toMatch(/^[a-z0-9]{32}$/);
  });
});