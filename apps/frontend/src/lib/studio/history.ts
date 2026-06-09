export interface Op { label: string; undo(): void; redo(): void }

export class History {
  private past: Op[] = [];
  private future: Op[] = [];
  private limit: number;

  constructor(limit: number = 50) {
    this.limit = limit;
  }

  push(op: Op): void {
    this.past.push(op);
    if (this.past.length > this.limit) {
      this.past.shift();
    }
    this.future = [];
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): void {
    const op = this.past.pop();
    if (!op) return;
    op.undo();
    this.future.push(op);
  }

  redo(): void {
    const op = this.future.pop();
    if (!op) return;
    op.redo();
    this.past.push(op);
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
