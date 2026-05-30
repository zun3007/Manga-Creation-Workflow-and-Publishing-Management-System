import { render, screen, fireEvent } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { ColorPanel } from './ColorPanel';

it('selects a palette swatch', () => {
  const onColor = vi.fn();
  render(
    <ColorPanel
      color={{ r: 0, g: 0, b: 0, a: 255 }}
      onColor={onColor}
      palette={['#ff0000']}
      recent={[]}
      onAddSwatch={() => {}}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /#ff0000/i }));
  expect(onColor).toHaveBeenCalledWith(expect.objectContaining({ r: 255, g: 0, b: 0 }));
});
