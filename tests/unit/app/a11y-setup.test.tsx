import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

const componentAxeOptions = {
  rules: {
    region: { enabled: false },
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
  },
};

test('jest-axe matcher is wired and passes on a labelled control', async () => {
  const { container } = render(
    <label>
      Email
      <input type="email" />
    </label>,
  );
  expect(await axe(container, componentAxeOptions)).toHaveNoViolations();
});
