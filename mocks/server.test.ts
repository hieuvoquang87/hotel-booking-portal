import { server } from './server';

describe('MSW server bootstrap', () => {
  it('starts and stops without throwing', () => {
    expect(() => {
      server.listen();
      server.close();
    }).not.toThrow();
  });
});
