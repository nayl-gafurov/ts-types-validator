interface Foo {
  str: string;
  num: number;
  bool: boolean;
  union: number | boolean;
  optStr?: string;
}

export declare function isFoo(obj: { [k: string]: any }): obj is Foo;

const someObj = {
  str: "string",
  num: 5,
  bool: true,
  union: 5,
  optStr: "string",
}

console.log(isFoo(someObj));

