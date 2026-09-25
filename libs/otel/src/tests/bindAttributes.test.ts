import { describe, expect, it } from 'vitest';
import { bindAttributes } from '../bindAttributes';
import { createLogger } from '../logger';
import { captureDestination } from './capture';

const capture = () => {
  const { lines, destination } = captureDestination();
  return {
    logger: createLogger({ serviceName: 'test-service', level: 'trace', destination }),
    lines,
  };
};

describe('bindAttributes', () => {
  it('binds catalogue attributes onto every line the child writes', () => {
    const { logger, lines } = capture();
    const child = bindAttributes(logger, { 'user.id': 'u-1', 'nebula.user.kind': 'guest' });

    child.info('one');
    child.warn('two');

    for (const line of lines) {
      expect(line).toMatchObject({ 'user.id': 'u-1', 'nebula.user.kind': 'guest' });
    }
  });

  it('leaves the parent logger unbound', () => {
    const { logger, lines } = capture();

    bindAttributes(logger, { 'nebula.session.id': 's-1' });
    logger.info('parent');

    expect(lines[0]).not.toHaveProperty('nebula.session.id');
  });

  it('rejects a key outside the catalogue at compile time', () => {
    const { logger } = capture();

    // @ts-expect-error -- flat dotted catalogue keys only
    bindAttributes(logger, { userId: 'u-1' });
  });

  it('rejects a value outside the attribute type at compile time', () => {
    const { logger } = capture();

    // @ts-expect-error -- a User is a guest or registered
    bindAttributes(logger, { 'nebula.user.kind': 'admin' });
  });
});
