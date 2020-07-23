# ts-types-validator

Typescript types validator

# Requirement
TypeScript >= 2.4.1

# How to use this package

```ts
//compile.js
const typesValidator = require("ts-types-validator");
typesValidator(["./index.ts"]);
```

```ts
//index.ts
type someType = string | boolean;

interface Foo {
  str?: string;
  num: number;
  bool: boolean;
  func: () => any;  // doesn't validate arguments and output type
  union: string | number | boolean;
  obj: { objNumber: number, objFunc: () => any, int: Baz };
  text: "qwerty";
  type: someType;
  false: false;
  interface: Bar;
  // the program so far only supports a generic array type, Array<elemType>
  arr: Array<number | string | Bar>;  
}
interface Bar {
  uni: 8 | "anyText";
  obj: { objUnion: string | number | boolean, objUndef: undefined };
  int: Foo;
  int2: Baz;
}
interface Baz {
  int1: Bar;
  int2: Foo;
}

export declare function isFoo(obj: { [k: string]: any }): obj is Foo

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
}

const barObj: any = { uni: 8, obj: { objUnion: false, objUndef: undefined }, int: fooObj };
fooObj.interface = barObj;
fooObj.arr = [fooObj];
const bazObj = { int1: barObj, int2: fooObj };
barObj.int2 = bazObj;
fooObj.obj.int = bazObj;

console.log(isFoo(fooObj));
```

```sh
node compile.js
```

Compiled result :

```ts
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFoo = void 0;
function isFoo(obj) {
    var objectStore = new Map([
        ["Foo", new Set()],
        ["Bar", new Set()],
        ["Baz", new Set()]
    ]);
    var isIntersectObject = function (interfaceName, obj) {
        if (objectStore.has(interfaceName)) {
            var objects = objectStore.get(interfaceName);
            if (objects.has(obj)) {
                return true;
            }
            else {
                objects.add(obj);
                return false;
            }
        }
    };
    var data = {
        Foo: function (arg) { isIntersectObject("Foo", arg); return [
            function () {
                var result = typeof arg.str === "undefined" || "str" in arg && typeof arg.str === "string";
                if (!result) {
                    console.warn("str", " MUST be type of: ", "string");
                }
                return result;
            },
            function () {
                var result = "num" in arg && typeof arg.num === "number";
                if (!result) {
                    console.warn("num", " MUST be type of: ", "number");
                }
                return result;
            },
            function () {
                var result = "bool" in arg && typeof arg.bool === "boolean";
                if (!result) {
                    console.warn("bool", " MUST be type of: ", "boolean");
                }
                return result;
            },
            function () {
                var result = "func" in arg && typeof arg.func === "function";
                if (!result) {
                    console.warn("func", " MUST be type of: ", "() => any");
                }
                return result;
            },
            function () {
                var result = "union" in arg && (typeof arg.union === "string" || typeof arg.union === "number" || typeof arg.union === "boolean");
                if (!result) {
                    console.warn("union", " MUST be type of: ", "string | number | boolean");
                }
                return result;
            },
            function () {
                var result = "obj" in arg && [
                    function () {
                        var result = "objNumber" in arg.obj && typeof arg.obj.objNumber === "number";
                        if (!result) {
                            console.warn("obj.objNumber", " MUST be type of: ", "number");
                        }
                        return result;
                    },
                    function () {
                        var result = "objFunc" in arg.obj && typeof arg.obj.objFunc === "function";
                        if (!result) {
                            console.warn("obj.objFunc", " MUST be type of: ", "() => any");
                        }
                        return result;
                    },
                    function () {
                        var result = "int" in arg.obj && (isIntersectObject("Baz", arg.obj.int) || typeof arg.obj.int === "object" && data.Baz(arg.obj.int));
                        if (!result) {
                            console.warn("obj.int", " MUST be type of: ", "Baz");
                        }
                        return result;
                    }
                ].every(function (item) { return item(); });
                if (!result) {
                    console.warn("obj", " MUST be type of: ", "{ objNumber: number, objFunc: () => any, int: Baz }");
                }
                return result;
            },
            function () {
                var result = "text" in arg && arg.text === "qwerty";
                if (!result) {
                    console.warn("text", " MUST be type of: ", "\"qwerty\"");
                }
                return result;
            },
            function () {
                var result = "type" in arg && (typeof arg.type === "string" || typeof arg.type === "boolean");
                if (!result) {
                    console.warn("type", " MUST be type of: ", "someType");
                }
                return result;
            },
            function () {
                var result = "false" in arg && arg.false === false;
                if (!result) {
                    console.warn("false", " MUST be type of: ", "false");
                }
                return result;
            },
            function () {
                var result = "interface" in arg && (isIntersectObject("Bar", arg.interface) || typeof arg.interface === "object" && data.Bar(arg.interface));
                if (!result) {
                    console.warn("interface", " MUST be type of: ", "Bar");
                }
                return result;
            },
            function () {
                var result = "arr" in arg && (Array.isArray(arg.arr) && arg.arr.every(function (item) { return typeof item === "number" || typeof item === "string" || (isIntersectObject("Bar", item) || typeof item === "object" && data.Bar(item)); }));
                if (!result) {
                    console.warn("arr", " MUST be type of: ", "Array<number | string | Bar>");
                }
                return result;
            }
        ].every(function (item) { return item(); }); },
        Baz: function (arg) { isIntersectObject("Baz", arg); return [
            function () {
                var result = "int1" in arg && (isIntersectObject("Bar", arg.int1) || typeof arg.int1 === "object" && data.Bar(arg.int1));
                if (!result) {
                    console.warn("int1", " MUST be type of: ", "Bar");
                }
                return result;
            },
            function () {
                var result = "int2" in arg && (isIntersectObject("Foo", arg.int2) || typeof arg.int2 === "object" && data.Foo(arg.int2));
                if (!result) {
                    console.warn("int2", " MUST be type of: ", "Foo");
                }
                return result;
            }
        ].every(function (item) { return item(); }); },
        Bar: function (arg) { isIntersectObject("Bar", arg); return [
            function () {
                var result = "uni" in arg && (arg.uni === 8 || arg.uni === "anyText");
                if (!result) {
                    console.warn("uni", " MUST be type of: ", "8 | \"anyText\"");
                }
                return result;
            },
            function () {
                var result = "obj" in arg && [
                    function () {
                        var result = "objUnion" in arg.obj && (typeof arg.obj.objUnion === "string" || typeof arg.obj.objUnion === "number" || typeof arg.obj.objUnion === "boolean");
                        if (!result) {
                            console.warn("obj.objUnion", " MUST be type of: ", "string | number | boolean");
                        }
                        return result;
                    },
                    function () {
                        var result = "objUndef" in arg.obj && typeof arg.obj.objUndef === "undefined";
                        if (!result) {
                            console.warn("obj.objUndef", " MUST be type of: ", "undefined");
                        }
                        return result;
                    }
                ].every(function (item) { return item(); });
                if (!result) {
                    console.warn("obj", " MUST be type of: ", "{ objUnion: string | number | boolean, objUndef: undefined }");
                }
                return result;
            },
            function () {
                var result = "int" in arg && (isIntersectObject("Foo", arg.int) || typeof arg.int === "object" && data.Foo(arg.int));
                if (!result) {
                    console.warn("int", " MUST be type of: ", "Foo");
                }
                return result;
            },
            function () {
                var result = "int2" in arg && (isIntersectObject("Baz", arg.int2) || typeof arg.int2 === "object" && data.Baz(arg.int2));
                if (!result) {
                    console.warn("int2", " MUST be type of: ", "Baz");
                }
                return result;
            }
        ].every(function (item) { return item(); }); }
    };
    return data.Foo(obj);
}
exports.isFoo = isFoo;
var fooObj = {
    // string: "hello",
    num: 5,
    bool: true,
    func: function () { return 1; },
    union: "a",
    obj: { objNumber: 8, objFunc: function () { return 2; } },
    text: "qwerty",
    type: true,
    false: false,
};
var barObj = { uni: 8, obj: { objUnion: false, objUndef: undefined }, int: fooObj };
fooObj.interface = barObj;
fooObj.arr = [fooObj];
var bazObj = { int1: barObj, int2: fooObj };
barObj.int2 = bazObj;
fooObj.obj.int = bazObj;
console.log(isFoo(fooObj));
```