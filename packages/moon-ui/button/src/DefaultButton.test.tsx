import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Button from './DefaultButton';
import styles from './DefaultButton.module.scss';

it('renders its children', () => {
  render(<Button>Click me</Button>);

  expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
});

it('calls onClick when clicked', async () => {
  const user = userEvent.setup();
  const onClick = jest.fn();
  render(<Button onClick={onClick}>Click me</Button>);

  await user.click(screen.getByRole('button'));

  expect(onClick).toHaveBeenCalledTimes(1);
});

it('does not call onClick when disabled', async () => {
  const user = userEvent.setup();
  const onClick = jest.fn();
  render(
    <Button onClick={onClick} disabled>
      Click me
    </Button>,
  );

  await user.click(screen.getByRole('button'));

  expect(onClick).not.toHaveBeenCalled();
  expect(screen.getByRole('button')).toBeDisabled();
});

it('maps the `type` and `size` props onto their modifier classes', () => {
  render(
    <Button type="ghost" size="lg">
      Click me
    </Button>,
  );

  const button = screen.getByRole('button');
  expect(button).toHaveClass(styles.default, styles.ghost, styles.lg);
  expect(button).not.toHaveClass(styles.dash, styles.sm, styles.md);
});

it('merges a caller-supplied className rather than replacing the default ones', () => {
  render(<Button className="custom">Click me</Button>);

  const button = screen.getByRole('button');
  expect(button).toHaveClass(styles.default, 'custom');
});
