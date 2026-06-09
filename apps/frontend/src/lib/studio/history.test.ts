import { describe, it, expect } from 'vitest';
import { History, type Op } from './history';

function counterOp(log: string[], n: number): Op {
  return { label: `op${n}`, undo: () => log.push(`u${n}`), redo: () => log.push(`r${n}`) };
}

describe('History', () => {
  it('undo then redo replays ops', () => {
    const log: string[] = []; const h = new History(10);
    h.push(counterOp(log, 1)); h.push(counterOp(log, 2));
    expect(h.canUndo()).toBe(true);
    h.undo(); expect(log).toEqual(['u2']);
    h.undo(); expect(log).toEqual(['u2','u1']);
    expect(h.canUndo()).toBe(false);
    h.redo(); expect(log).toEqual(['u2','u1','r1']);
  });
  it('push clears the redo future', () => {
    const log: string[] = []; const h = new History(10);
    h.push(counterOp(log,1)); h.undo(); h.push(counterOp(log,2));
    expect(h.canRedo()).toBe(false);
  });
  it('respects the depth limit', () => {
    const h = new History(2); const log: string[] = [];
    h.push(counterOp(log,1)); h.push(counterOp(log,2)); h.push(counterOp(log,3));
    h.undo(); h.undo(); expect(h.canUndo()).toBe(false); // only 2 kept
  });
});
