import { isNonUnionPrimitives } from './compiled/primitives.js';

describe('isNonUnionPrimitives', () => {
  it('works', () => {
    expect(isNonUnionPrimitives({
      str: "string",
      num: 5,
      bool: true,
      null: null,
      undefined: undefined,
    })).toBeTruthy();
  });
});

