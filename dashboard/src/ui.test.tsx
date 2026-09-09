import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge, Button } from './ui';

describe('ui', () => {
  it('Button renders its label and variant styles', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toContain('bg-red-600');
  });

  it('Badge maps tone to colour classes', () => {
    render(<Badge tone="green">approved</Badge>);
    expect(screen.getByText('approved').className).toContain('text-green-700');
  });
});
