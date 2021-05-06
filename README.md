# ts-types-validator

ts-types-validator is a TypeScript custom transformer that, based on the TypeScript Interface , generates a Javascript function that checks the passed object for compliance with this Interface.

## Environment

- Required `TypeScript v2.4.1` or more

## Install

```sh
npm i ts-types-validator --dev
```

## Usage

```ts
//compile.js
const typesValidator = require("ts-types-validator").default;
typesValidator(["./index.ts"]);
```

```ts
//index.ts

interface Foo {
  str: string;
  num: number;
  bool: boolean;
  union: number | boolean;
  optStr?: string;
}

export declare function isFoo(obj: { [k: string]: any }): obj is Foo

console.log(isFoo(someObj));
```

```sh
node compile.js
```

Compiled result :

```ts
//index.js
...

function isFoo(obj) {
    ...
    return data.Foo(obj); //boolean
}
exports.isFoo = isFoo;

```
