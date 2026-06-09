import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const back = jest.fn();
const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ back, push }) }));
import { BackToResults } from '@/components/hotel/BackToResults';
describe('BackToResults', () => {
  beforeEach(() => { back.mockClear(); push.mockClear(); });
  it('navigates back through history when there is history', async () => {
    Object.defineProperty(window.history, 'length', { configurable: true, value: 3 });
    render(<BackToResults />);
    await userEvent.click(screen.getByRole('button', { name: /back to results/i }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
  it('falls back to the home route on a deep-link entry', async () => {
    Object.defineProperty(window.history, 'length', { configurable: true, value: 1 });
    render(<BackToResults />);
    await userEvent.click(screen.getByRole('button', { name: /back to results/i }));
    expect(push).toHaveBeenCalledWith('/');
  });
});
