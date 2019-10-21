# @sincronia/typescript-plugin

## Overview

This plugin allows you to run the [ESLint](https://eslint.org/) checker on files.

## Installation

```bash
npm i -D @sincronia/eslint-plugin
```
                                                                                                |

### Order of Configurations

1. Load from `sinc.config.js` options.
2. Check for `.eslintrc.json` file or generate one.

## Example Usage

This example takes `.ts` files and runs eslint on them. The output with errors and warnings
is printed on the console. If there are any errors the code is not pushed.

```javascript
//sinc.config.js
module.exports={
  rules:{
    match:/\.ts$/,
    plugins:[
      name:"@sincronia/eslint-plugin",
    ]
  }
};
```
