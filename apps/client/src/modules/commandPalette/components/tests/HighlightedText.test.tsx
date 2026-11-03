import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HighlightedText } from '@/modules/commandPalette/components/HighlightedText';

describe('HighlightedText', () => {
  it('sets every case-insensitive match in bold and keeps the rest', () => {
    render(<p aria-label="line">{<HighlightedText text="Run the run job" query=" RUN " />}</p>);

    const marks = screen.getByLabelText('line').querySelectorAll('mark');
    expect([...marks].map((mark) => mark.textContent)).toEqual(['Run', 'run']);
    expect(screen.getByLabelText('line')).toHaveTextContent('Run the run job');
  });

  it('returns the text untouched without a query or a match', () => {
    render(
      <p aria-label="line">
        <HighlightedText text="Zone 2" query="" />
        <HighlightedText text=" plan" query="zzz" />
      </p>,
    );

    expect(screen.getByLabelText('line').querySelector('mark')).toBeNull();
    expect(screen.getByLabelText('line')).toHaveTextContent('Zone 2 plan');
  });
});
