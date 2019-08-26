# @sincronia/typescript-plugin

## Overview

This plugin allows you to run the [TypeScript](https://www.typescriptlang.org/) compiler on `.ts` files. Supports `tsconfig.json` files.

## Installation

```bash
npm i -D @sincronia/typescript-plugin
```

## Options

| Key               | Type                         | Default | Description                                                                                                                                                |
| ----------------- | ---------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transpile`       | `boolean`                    | `true`  | Whether or not the contents of the typescript file should be transpiled. Useful if you want to use Babel to transpile instead but still want type checking |
| `compilerOptions` | `typescript.CompilerOptions` | `null`  | Same as `compilerOptions` in a `tsconfig.json` file                                                                                                        |

### Order of Configurations

1. Load from `sinc.config.js` options.
2. Check for `tsconfig.json` file and and override any overlapping values.

## Example Usage

This example takes `.ts` files and only type checks them.

```javascript
//sinc.config.js
module.exports={
  rules:{
    match:/\.ts$/,
    plugins:[
      name:"@sincronia/typescript-plugin",
      options:{
        transpile:false
      }
    ]
  }
};
```
