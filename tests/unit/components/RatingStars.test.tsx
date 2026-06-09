import { render, screen } from '@testing-library/react';
import { RatingStars } from '@/components/RatingStars';
describe('RatingStars', () => {
  it('renders the numeric value and is labelled for screen readers', () => {
    render(<RatingStars value={4.8} />);
    expect(screen.getByText('4.8')).toBeTruthy();
    expect(screen.getByLabelText(/rated 4\.8 out of 5/i)).toBeTruthy();
  });
  it('marks the star glyphs decorative', () => {
    const { container } = render(<RatingStars value={4.8} />);
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});
