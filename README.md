# ts-type-checker

Typescript type validator

# Requirement
TypeScript >= 2.4.1

# How to use this package

```ts
//compiler.js
const typesValidator = require("ts-types-validator");
typesValidator(["./index.ts"]);
```

```ts
//index.ts
type someType = string | boolean;

export interface Props {
  a: string;
  b: number;
  c: boolean;
  d: string | number | boolean;
  e: { f: number, g: () => any };
  h: "qwerty";
  i: someType;
  j: false;
  k: InsideProps;
  l: Array<number | string>  // the program so far only supports a generic array type, Array<elemType>
}

export interface InsideProps {
  m: 8 | "rrr"
  n: { o: string | number | boolean, p: undefined }
}

export declare function isProps(obj: { [k: string]: any }): obj is Props

const obj = {
  a: "hello",
  b: 5,
  c: true,
  d: "string",
  e: { f: 8, g: () => { return 2 } },
  h: "qwerty",
  i: true,
  j: false,
  l: { x: 8, z: { q: true, w: undefined } },
  m: [1, 2, "e3"]
}

console.log(isProps(obj))
```

compiled result

```ts
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProps = void 0;
function isProps(obj) {
    var data = {
        Props: function (arg) { return [
            function () {
                var result = "a" in arg && typeof arg.a === "string";
                if (!result) {
                    console.warn("a MUST be : string");
                }
                return result;
            },
            function () {
                var result = "b" in arg && typeof arg.b === "number";
                if (!result) {
                    console.warn("b MUST be : number");
                }
                return result;
            },
            function () {
                var result = "c" in arg && typeof arg.c === "boolean";
                if (!result) {
                    console.warn("c MUST be : boolean");
                }
                return result;
            },
            function () {
                var result = "d" in arg && (typeof arg.d === "string" || typeof arg.d === "number" || typeof arg.d === "boolean");
                if (!result) {
                    console.warn("d MUST be : string | number | boolean");
                }
                return result;
            },
            function () {
                var result = "e" in arg && [
                    function () {
                        var result = "f" in arg.e && typeof arg.e.f === "number";
                        if (!result) {
                            console.warn("e.f MUST be : number");
                        }
                        return result;
                    },
                    function () {
                        var result = "g" in arg.e && typeof arg.e.g === "function";
                        if (!result) {
                            console.warn("e.g MUST be : () => any");
                        }
                        return result;
                    }
                ].every(function (item) { return item(); });
                if (!result) {
                    console.warn("e MUST be : { f: number, g: () => any }");
                }
                return result;
            },
            function () {
                var result = "h" in arg && arg.h === "qwerty";
                if (!result) {
                    console.warn("h MUST be : \"qwerty\"");
                }
                return result;
            },
            function () {
                var result = "i" in arg && (typeof arg.i === "string" || typeof arg.i === "boolean");
                if (!result) {
                    console.warn("i MUST be : someType");
                }
                return result;
            },
            function () {
                var result = "j" in arg && arg.j === false;
                if (!result) {
                    console.warn("j MUST be : false");
                }
                return result;
            },
            function () {
                var result = "k" in arg && data.InsideProps(arg.k);
                if (!result) {
                    console.warn("k MUST be : InsideProps");
                }
                return result;
            },
            function () {
                var result = "l" in arg && (Array.isArray(arg.l) && arg.l.every(function (item) { return typeof item === "number" || typeof item === "string"; }));
                if (!result) {
                    console.warn("l MUST be : Array<number | string>");
                }
                return result;
            }
        ].every(function (item) { return item(); }); },
        InsideProps: function (arg) { return [
            function () {
                var result = "m" in arg && (arg.m === 8 || arg.m === "rrr");
                if (!result) {
                    console.warn("m MUST be : 8 | \"rrr\"");
                }
                return result;
            },
            function () {
                var result = "n" in arg && [
                    function () {
                        var result = "o" in arg.n && (typeof arg.n.o === "string" || typeof arg.n.o === "number" || typeof arg.n.o === "boolean");
                        if (!result) {
                            console.warn("n.o MUST be : string | number | boolean");
                        }
                        return result;
                    },
                    function () {
                        var result = "p" in arg.n && typeof arg.n.p === "undefined";
                        if (!result) {
                            console.warn("n.p MUST be : undefined");
                        }
                        return result;
                    }
                ].every(function (item) { return item(); });
                if (!result) {
                    console.warn("n MUST be : { o: string | number | boolean, p: undefined }");
                }
                return result;
            }
        ].every(function (item) { return item(); }); }
    };
    return data.Props(obj);
}
exports.isProps = isProps;
var obj = {
    a: "hello",
    b: 5,
    c: true,
    d: "string",
    e: { f: 8, g: function () { return 2; } },
    h: "qwerty",
    i: true,
    j: false,
    l: { x: 8, z: { q: true, w: undefined } },
    m: [1, 2, "e3"]
};
console.log(isProps(obj));

```