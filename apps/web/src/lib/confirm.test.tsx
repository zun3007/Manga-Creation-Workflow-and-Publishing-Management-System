import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmProvider, useConfirm } from './confirm';

function TestComponent() {
  const { confirm } = useConfirm();

  return (
    <div>
      <button
        onClick={async () => {
          const result = await confirm({
            title: 'Delete item?',
            body: 'This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
          });
          if (result) {
            screen.getByTestId('result').textContent = 'Deleted';
          } else {
            screen.getByTestId('result').textContent = 'Cancelled';
          }
        }}
      >
        Open confirm
      </button>
      <div data-testid="result">Waiting...</div>
    </div>
  );
}

describe('ConfirmProvider and useConfirm', () => {
  it('useConfirm returns a noop function when outside provider', () => {
    function Component() {
      const { confirm } = useConfirm();
      return (
        <button
          onClick={async () => {
            const result = await confirm({ title: 'Test' });
            expect(result).toBe(true);
          }}
        >
          Test
        </button>
      );
    }

    render(<Component />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
  });

  it('renders dialog when confirm is triggered', async () => {
    render(
      <ConfirmProvider>
        <TestComponent />
      </ConfirmProvider>
    );

    const openButton = screen.getByText('Open confirm');
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByText('Delete item?')).toBeInTheDocument();
    });
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('resolves true when confirm button is clicked', async () => {
    render(
      <ConfirmProvider>
        <TestComponent />
      </ConfirmProvider>
    );

    const openButton = screen.getByText('Open confirm');
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Deleted');
    });
  });

  it('resolves false when cancel button is clicked', async () => {
    render(
      <ConfirmProvider>
        <TestComponent />
      </ConfirmProvider>
    );

    const openButton = screen.getByText('Open confirm');
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Cancelled');
    });
  });

  it('resolves false when Escape is pressed', async () => {
    render(
      <ConfirmProvider>
        <TestComponent />
      </ConfirmProvider>
    );

    const openButton = screen.getByText('Open confirm');
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Cancelled');
    });
  });

  it('resolves false when backdrop is clicked', async () => {
    render(
      <ConfirmProvider>
        <TestComponent />
      </ConfirmProvider>
    );

    const openButton = screen.getByText('Open confirm');
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const backdrop = screen.getByRole('dialog').parentElement;
    fireEvent.click(backdrop!);

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Cancelled');
    });
  });
});
