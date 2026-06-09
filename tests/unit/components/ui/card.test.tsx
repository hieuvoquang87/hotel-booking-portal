import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';

describe('Card', () => {
  it('renders CardContent children', () => {
    render(
      <Card>
        <CardContent>Body</CardContent>
      </Card>
    );
    expect(screen.getByText('Body')).toBeTruthy();
  });

  it('renders Card with correct surface classes', () => {
    const { container } = render(<Card>Surface</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toMatch(/rounded-xl/);
    expect(card.className).toMatch(/border/);
    expect(card.className).toMatch(/bg-card/);
    expect(card.className).toMatch(/shadow-sm/);
  });

  it('renders CardHeader', () => {
    render(
      <Card>
        <CardHeader>Header content</CardHeader>
      </Card>
    );
    expect(screen.getByText('Header content')).toBeTruthy();
  });

  it('renders CardFooter', () => {
    render(
      <Card>
        <CardFooter>Footer content</CardFooter>
      </Card>
    );
    expect(screen.getByText('Footer content')).toBeTruthy();
  });

  it('renders CardTitle and CardDescription', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Description')).toBeTruthy();
  });
});
