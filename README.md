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

export interface Props {
  string: string;
  number: number;
  boolean: boolean;
  func: ()=>any;
  union: string | number | boolean;
  obj: { objNumber: number, objFunc: () => any };
  text: "qwerty";
  type: someType;
  false: false;
  interface: InsideProps;
  array: Array<number | string>  // the program so far only supports a generic array type, Array<elemType>
}

export interface InsideProps {
  union: 8 | "rrr"
  obj: { objUnion: string | number | boolean, objUndef: undefined }
}

export declare function isProps(obj: { [k: string]: any }): obj is Props

const obj = {
  string: "hello",
  number: 5,
  boolean: true,
  func: ()=>1,
  union: "a",
  obj: { objNumber: 8, objFunc: () => 2 },
  text: "qwerty",
  type: true,
  false: false,
  interface: { union: 8, obj: { objUnion: true, objUndef: undefined } },
  array: [1, 2, "e3"]
}

console.log(isProps(obj))
```
```sh
node compile.js
```
Compiled result :

```ts
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProps = void 0;
function isProps(obj) {
    var data = {
        Props: function (arg) { return [
            function () {
                var result = "string" in arg && typeof arg.string === "string";
                if (!result) {
                    console.warn("string MUST be : string");
                }
                return result;
            },
            function () {
                var result = "number" in arg && typeof arg.number === "number";
                if (!result) {
                    console.warn("number MUST be : number");
                }
                return result;
            },
            function () {
                var result = "boolean" in arg && typeof arg.boolean === "boolean";
                if (!result) {
                    console.warn("boolean MUST be : boolean");
                }
                return result;
            },
            function () {
                var result = "func" in arg && typeof arg.func === "function";
                if (!result) {
                    console.warn("func MUST be : ()=>any");
                }
                return result;
            },
            function () {
                var result = "union" in arg && (typeof arg.union === "string" || typeof arg.union === "number" || typeof arg.union === "boolean");
                if (!result) {
                    console.warn("union MUST be : string | number | boolean");
                }
                return result;
            },
            function () {
                var result = "obj" in arg && [
                    function () {
                        var result = "objNumber" in arg.obj && typeof arg.obj.objNumber === "number";
                        if (!result) {
                            console.warn("obj.objNumber MUST be : number");
                        }
                        return result;
                    },
                    function () {
                        var result = "objFunc" in arg.obj && typeof arg.obj.objFunc === "function";
                        if (!result) {
                            console.warn("obj.objFunc MUST be : () => any");
                        }
                        return result;
                    }
                ].every(function (item) { return item(); });
                if (!result) {
                    console.warn("obj MUST be : { objNumber: number, objFunc: () => any }");
                }
                return result;
            },
            function () {
                var result = "text" in arg && arg.text === "qwerty";
                if (!result) {
                    console.warn("text MUST be : \"qwerty\"");
                }
                return result;
            },
            function () {
                var result = "type" in arg && (typeof arg.type === "string" || typeof arg.type === "boolean");
                if (!result) {
                    console.warn("type MUST be : someType");
                }
                return result;
            },
            function () {
                var result = "false" in arg && arg.false === false;
                if (!result) {
                    console.warn("false MUST be : false");
                }
                return result;
            },
            function () {
                var result = "interface" in arg && (typeof arg.interface === "object" && data.InsideProps(arg.interface));
                if (!result) {
                    console.warn("interface MUST be : InsideProps");
                }
                return result;
            },
            function () {
                var result = "array" in arg && (Array.isArray(arg.array) && arg.array.every(function (item) { return typeof item === "number" || typeof item === "string"; }));
                if (!result) {
                    console.warn("array MUST be : Array<number | string>");
                }
                return result;
            }
        ].every(function (item) { return item(); }); },
        InsideProps: function (arg) { return [
            function () {
                var result = "union" in arg && (arg.union === 8 || arg.union === "rrr");
                if (!result) {
                    console.warn("union MUST be : 8 | \"rrr\"");
                }
                return result;
            },
            function () {
                var result = "obj" in arg && [
                    function () {
                        var result = "objUnion" in arg.obj && (typeof arg.obj.objUnion === "string" || typeof arg.obj.objUnion === "number" || typeof arg.obj.objUnion === "boolean");
                        if (!result) {
                            console.warn("obj.objUnion MUST be : string | number | boolean");
                        }
                        return result;
                    },
                    function () {
                        var result = "objUndef" in arg.obj && typeof arg.obj.objUndef === "undefined";
                        if (!result) {
                            console.warn("obj.objUndef MUST be : undefined");
                        }
                        return result;
                    }
                ].every(function (item) { return item(); });
                if (!result) {
                    console.warn("obj MUST be : { objUnion: string | number | boolean, objUndef: undefined }");
                }
                return result;
            }
        ].every(function (item) { return item(); }); }
    };
    return data.Props(obj);
}
exports.isProps = isProps;
var obj = {
    string: "hello",
    number: 5,
    boolean: true,
    func: function () { return 1; },
    union: "a",
    obj: { objNumber: 8, objFunc: function () { return 2; } },
    text: "qwerty",
    type: true,
    false: false,
    interface: { union: 8, obj: { objUnion: true, objUndef: undefined } },
    array: [1, 2, "e3"]
};
console.log(isProps(obj));  // true

```