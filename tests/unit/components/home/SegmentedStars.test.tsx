import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentedStars } from '@/components/home/SegmentedStars';

describe('SegmentedStars', () => {
  it('marks the active option via aria-pressed', () => {
    render(<SegmentedStars value={4} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '4★ & up' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Any' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('emits the numeric value when a tier is chosen', async () => {
    const onChange = jest.fn();
    render(<SegmentedStars value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: '5★' }));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('emits null when Any is chosen', async () => {
    const onChange = jest.fn();
    render(<SegmentedStars value={5} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Any' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
