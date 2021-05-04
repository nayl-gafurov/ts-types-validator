type someType = string | boolean;

interface Foo {
  str?: string;
  num: number;
  bool: boolean;
  func: () => any; // doesn't validate arguments and output type
  union: string | number | boolean;
  obj: { objNumber: number; objFunc: () => any; int: Baz };
  text: "qwerty";
  type: someType;
  false: false;
  interface: Bar;
  // the program so far only supports a generic array type, Array<elemType>
  arr: Array<number | string | Bar>;
}
interface Bar {
  uni: 8 | "anyText";
  obj: { objUnion: string | number | boolean; objUndef: undefined };
  int: Foo;
  int2: Baz;
}
interface Baz {
  int1: Bar;
  int2: Foo;
}

export declare function isFoo(obj: { [k: string]: any }): obj is Foo;

const fooObj: any = {
  // string: "hello",
  num: 5,
  bool: true,
  func: () => 1,
  union: "a",
  obj: { objNumber: 8, objFunc: () => 2 },
  text: "qwerty",
  type: true,
  false: false,
};

const barObj: any = { uni: 8, obj: { objUnion: false, objUndef: undefined }, int: fooObj };
fooObj.interface = barObj;
fooObj.arr = [fooObj];
const bazObj = { int1: barObj, int2: fooObj };
barObj.int2 = bazObj;
fooObj.obj.int = bazObj;

console.log(isFoo(fooObj));
