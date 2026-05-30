import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrushControls } from './BrushControls';
import type { BrushSettings } from '../../lib/studio/types';

describe('BrushControls', () => {
  const base: BrushSettings = {
    tool: 'brush',
    size: 20,
    opacity: 1,
    flow: 1,
    hardness: 0.8,
    spacing: 0.1,
    stabilize: 0.3,
    pressureSize: true,
    pressureOpacity: false,
  };

  it('emits size changes', () => {
    const onChange = vi.fn();
    render(<BrushControls settings={base} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider', { name: /size/i }), { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ size: 50 }));
  });

  it('emits opacity changes', () => {
    const onChange = vi.fn();
    render(<BrushControls settings={base} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider', { name: /opacity/i }), { target: { value: '0.5' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ opacity: 0.5 }));
  });

  it('emits flow changes', () => {
    const onChange = vi.fn();
    render(<BrushControls settings={base} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider', { name: /flow/i }), { target: { value: '0.7' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ flow: 0.7 }));
  });

  it('emits hardness changes', () => {
    const onChange = vi.fn();
    render(<BrushControls settings={base} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider', { name: /hardness/i }), { target: { value: '0.5' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hardness: 0.5 }));
  });

  it('emits spacing changes', () => {
    const onChange = vi.fn();
    render(<BrushControls settings={base} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider', { name: /spacing/i }), { target: { value: '0.2' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ spacing: 0.2 }));
  });

  it('emits stabilize changes', () => {
    const onChange = vi.fn();
    render(<BrushControls settings={base} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider', { name: /stabilize/i }), { target: { value: '0.6' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ stabilize: 0.6 }));
  });

  it('emits pressureSize toggle', () => {
    const onChange = vi.fn();
    render(<BrushControls settings={base} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /pressure size/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ pressureSize: false }));
  });

  it('emits pressureOpacity toggle', () => {
    const onChange = vi.fn();
    render(<BrushControls settings={base} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /pressure opacity/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ pressureOpacity: true }));
  });

  it('renders all sliders with correct initial values', () => {
    const onChange = vi.fn();
    render(<BrushControls settings={base} onChange={onChange} />);

    // Use getByRole with name to be more specific (aria-label matches)
    expect((screen.getByRole('slider', { name: /size/i }) as HTMLInputElement).value).toBe('20');
    expect((screen.getByRole('slider', { name: /opacity/i }) as HTMLInputElement).value).toBe('1');
    expect((screen.getByRole('slider', { name: /flow/i }) as HTMLInputElement).value).toBe('1');
    expect((screen.getByRole('slider', { name: /hardness/i }) as HTMLInputElement).value).toBe('0.8');
    expect((screen.getByRole('slider', { name: /spacing/i }) as HTMLInputElement).value).toBe('0.1');
    expect((screen.getByRole('slider', { name: /stabilize/i }) as HTMLInputElement).value).toBe('0.3');
  });

  it('renders pressure checkboxes with correct initial state', () => {
    const onChange = vi.fn();
    render(<BrushControls settings={base} onChange={onChange} />);

    expect((screen.getByRole('checkbox', { name: /pressure size/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /pressure opacity/i }) as HTMLInputElement).checked).toBe(false);
  });
});
