# @sincronia/sass-plugin

## Overview

This plugin allows you to run [Sass](https://sass-lang.com/) on scss/sass files. This enables you to modularize your CSS and also adds some useful features that CSS doesn't normally support such as variables.

## Installation

```bash
npm i -D @sincronia/sass-plugin
```

## Options

No options required.

## Example Usage

This example takes `.scss` files and compiles them with the Sass compiler.

```javascript
//sinc.config.js
module.exports={
  rules:{
    match:/\.scss$/,
    plugins:[
      {
        name:"@sincronia/sass-plugin",
        //No options necessary
        options:{}
      }
    ]
  }
};
```
