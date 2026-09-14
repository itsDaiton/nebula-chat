import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { describe, expect, it } from 'vitest';
import { countTokens } from './counter';
import { getMessageContentText, packHistory } from './window';

const human = (text: string) => new HumanMessage(text);

describe('packHistory', () => {
  it('returns every message when the whole history fits the budget', () => {
    const history = [human('one'), human('two'), human('three')];

    expect(packHistory(history, { maxInputTokens: 1000 })).toHaveLength(3);
  });

  it('returns an empty array when the fixed cost alone exhausts the budget', () => {
    const systemPrompt = 'a fairly long system prompt that eats the whole budget by itself';
    const history = [human('hello')];

    expect(
      packHistory(history, { maxInputTokens: countTokens(systemPrompt), systemPrompt }),
    ).toEqual([]);
  });

  it('reserves budget for the system prompt and the new user message', () => {
    const systemPrompt = 'system';
    const userMessage = 'user';
    const history = [human('some earlier turn')];

    const fixed = countTokens(systemPrompt) + countTokens(userMessage);
    const historyCost = countTokens('some earlier turn');

    // One token short of fitting the history alongside the fixed cost.
    const packed = packHistory(history, {
      maxInputTokens: fixed + historyCost - 1,
      systemPrompt,
      userMessage,
    });

    expect(packed).toEqual([]);
  });

  it('keeps the most recent messages and drops the oldest', () => {
    const history = [human('oldest'), human('middle'), human('newest')];
    const budget = countTokens('middle') + countTokens('newest');

    const packed = packHistory(history, { maxInputTokens: budget });

    expect(packed.map(getMessageContentText)).toEqual(['middle', 'newest']);
  });

  it('preserves chronological order in the returned suffix', () => {
    const history = [human('first'), new AIMessage('second'), human('third')];

    const packed = packHistory(history, { maxInputTokens: 1000 });

    expect(packed.map(getMessageContentText)).toEqual(['first', 'second', 'third']);
  });

  it('stops at the first message too large to fit rather than skipping it', () => {
    const history = [human('tiny'), human('an extremely long message '.repeat(50)), human('end')];
    const budget = countTokens('tiny') + countTokens('end') + 5;

    const packed = packHistory(history, { maxInputTokens: budget });

    // The oversized middle message halts the walk, so 'tiny' is never reached.
    expect(packed.map(getMessageContentText)).toEqual(['end']);
  });

  it('returns an empty array for an empty history', () => {
    expect(packHistory([], { maxInputTokens: 1000 })).toEqual([]);
  });

  it('returns an empty array when maxInputTokens is zero or negative', () => {
    expect(packHistory([human('hi')], { maxInputTokens: 0 })).toEqual([]);
    expect(packHistory([human('hi')], { maxInputTokens: -10 })).toEqual([]);
  });
});

describe('getMessageContentText', () => {
  it('returns a plain string body unchanged', () => {
    expect(getMessageContentText(human('plain text'))).toBe('plain text');
  });

  it('concatenates the text parts of a multi-block content array', () => {
    const message = new HumanMessage({
      content: [
        { type: 'text', text: 'first ' },
        { type: 'text', text: 'second' },
      ],
    });

    expect(getMessageContentText(message)).toBe('first second');
  });

  it('ignores non-text blocks such as images', () => {
    const message = new HumanMessage({
      content: [
        { type: 'text', text: 'describe this' },
        { type: 'image_url', image_url: { url: 'https://example.com/cat.png' } },
      ],
    });

    expect(getMessageContentText(message)).toBe('describe this');
  });

  it('handles bare strings inside the content array', () => {
    const message = new HumanMessage({
      content: ['loose ', 'strings'] as unknown as string,
    });

    expect(getMessageContentText(message)).toBe('loose strings');
  });

  it('returns an empty string for content it cannot interpret', () => {
    const message = new HumanMessage({ content: [{ type: 'image_url' }] as never });

    expect(getMessageContentText(message)).toBe('');
  });

  it('reads `text` off a single non-array content object', () => {
    const message = new HumanMessage({ content: 'placeholder' });
    (message as unknown as { content: unknown }).content = { text: 'from an object' };

    expect(getMessageContentText(message)).toBe('from an object');
  });

  it('returns an empty string when a content object carries a non-string `text`', () => {
    const message = new HumanMessage({ content: 'placeholder' });
    (message as unknown as { content: unknown }).content = { text: 42 };

    expect(getMessageContentText(message)).toBe('');
  });

  it('returns an empty string for a content object with no recognised shape', () => {
    const message = new HumanMessage({ content: 'placeholder' });
    (message as unknown as { content: unknown }).content = { unexpected: true };

    expect(getMessageContentText(message)).toBe('');
  });
});
