import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LatexRenderer } from '../../components/LatexRenderer';

const getObserverInstances = () => (globalThis as any).__ioInstances as { trigger: (entry?: Partial<IntersectionObserverEntry>) => void }[] | undefined;

describe('LatexRenderer', () => {
  it('renders lazily after intersection', async () => {
    const { container } = render(<LatexRenderer latex={'x + 1'} lazy={true} />);
    const root = container.firstElementChild as HTMLElement | null;

    expect(root).toBeTruthy();
    expect(root?.innerHTML).toBe('');

    const instances = getObserverInstances();
    expect(instances && instances.length > 0).toBe(true);

    instances?.[0]?.trigger({ target: root as Element, isIntersecting: true });

    await waitFor(() => {
      expect(root?.innerHTML).toContain('katex');
    });
  });
});
