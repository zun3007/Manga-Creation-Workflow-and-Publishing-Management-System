import { render, screen, fireEvent } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { ColorPanel } from './ColorPanel';

it('selects a palette swatch', () => {
  const onColors = vi.fn();
  const onActiveColorSlot = vi.fn();
  render(
    <ColorPanel
      colors={{ fg: { r: 0, g: 0, b: 0, a: 255 }, bg: { r: 255, g: 255, b: 255, a: 255 } }}
      onColors={onColors}
      activeColorSlot="fg"
      onActiveColorSlot={onActiveColorSlot}
      palette={['#ff0000']}
      recent={[]}
      onAddSwatch={() => {}}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /#ff0000/i }));
  expect(onColors).toHaveBeenCalledWith(expect.objectContaining({ fg: expect.objectContaining({ r: 255, g: 0, b: 0 }) }));
});
