import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('when loading=true, disables the button and sets aria-busy', () => {
    render(<Button loading={true}>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('when loading=true, renders a Spinner with role=status', () => {
    render(<Button loading={true}>Click me</Button>);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('when loading=false, does not set aria-busy', () => {
    render(<Button loading={false}>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('aria-busy');
  });

  it('when loading=true, click handler is NOT fired', () => {
    const handleClick = vi.fn();
    render(
      <Button loading={true} onClick={handleClick}>
        Click me
      </Button>
    );
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('when loading=false, click handler is fired', () => {
    const handleClick = vi.fn();
    render(
      <Button loading={false} onClick={handleClick}>
        Click me
      </Button>
    );
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('respects disabled prop independently', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled={true} onClick={handleClick}>
        Click me
      </Button>
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies variant styles', () => {
    const { rerender } = render(<Button variant="accent">Accent</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('bg-accent');

    rerender(<Button variant="soft">Soft</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-surface');

    rerender(<Button variant="ghost">Ghost</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-transparent');
  });
});
