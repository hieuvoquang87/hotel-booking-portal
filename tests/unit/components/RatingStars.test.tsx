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

  it('applies muted class to unfilled stars when rating is below 5', () => {
    // value=3 rounds to 3 → icons 0,1,2 get text-star; icons 3,4 get text-muted
    const { container } = render(<RatingStars value={3} />);
    const icons = container.querySelectorAll('svg');
    const mutedIcons = Array.from(icons).filter((el) =>
      el.classList.value.includes('text-muted'),
    );
    expect(mutedIcons.length).toBeGreaterThan(0);
  });

  it('accepts a custom size prop', () => {
    const { container } = render(<RatingStars value={4} size={24} />);
    expect(container.querySelector('span[aria-label]')).toBeTruthy();
  });
});
