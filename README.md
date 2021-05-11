# ts-types-validator

ts-types-validator is a TypeScript custom transformer that, based on the TypeScript Interface , generates a Javascript function that checks the passed object for compliance with this Interface.

## Environment

- Required `TypeScript v2.4.1` or more

## Install

```sh
npm i ts-types-validator --dev
```

## Supported types

- All primitives (string, number, boolean, null, undefined, symbol, bigint);
- Functions
- Arrays and tuples of primitives, functions, arrays and objects like a { [k: string]: T };
- Objects like a { [k: string]: T }, where T - all of the above types.

## Usage

You just need to declare the Type Guards function like this:
```ts
export declare function isFoo(obj: any, options:{onFalse:(msg: string[])=> any} ): obj is Foo;
```
and then after compiling the code a real function will be generated that can validate the types.

The second argument of this function is optional. If it is defined, a callback can be passed to the generated function. This callback will be called if the value passed to the function is not validated. When a callback is called, an array of error messages is passed to it.
### Standalone

See [examples/standalone](https://github.com/nayl-gafurov/ts-types-validator/tree/master/examples/standalone) for details.

```ts
//compile.js
const typesValidator = require("ts-types-validator").default;
typesValidator(["./index.ts"], compileOptions, transformerOptions);
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

...

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

### Rollup

See [examples/rollup](https://github.com/nayl-gafurov/ts-types-validator/tree/master/examples/rollup) for details.

```js
rollup.config.js
import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import {transformer} from 'ts-types-validator';

export default {
  // ...
  plugins: [
    resolve(),
    typescript({ transformers: [service => ({
      before: [ transformer(service.getProgram(), transformerOptions) ],
      after: []
    })] })
  ]
};
```

### Webpack

See [examples/webpack](https://github.com/nayl-gafurov/ts-types-validator/tree/master/examples/webpack) for details.

```js
const transformer = require('ts-types-validator').transformer;

module.exports =
{
  mode: 'development',
  entry: './index.ts',
  output: {
    filename: `bundle.js`,
    path: __dirname
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
        options: {
          getCustomTransformers: program => ({
            before: [
              transformer(program, transformerOptions)
            ]
          })
        }
      }
    ]
  }
};
```
