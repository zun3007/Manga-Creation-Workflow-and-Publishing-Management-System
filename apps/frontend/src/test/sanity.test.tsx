import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('web test infra', () => {
  it('renders', () => {
    render(<div>hi</div>);
    expect(screen.getByText('hi')).toBeInTheDocument();
  });
});
