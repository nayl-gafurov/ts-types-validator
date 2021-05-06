interface NonUnionPrimitives {
  str: string;
  num: number;
  bool: boolean;
  null: null;
  undefined: undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare function isNonUnionPrimitives(obj: { [k: string]: any }): obj is NonUnionPrimitives;
