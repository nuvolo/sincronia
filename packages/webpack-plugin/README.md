# @sincronia/webpack-plugin

## Overview

This plugin allows you to run [Webpack](https://webpack.js.org/) on your desired files. This allows you to build frontend bundles in a more modern way or even potentially bundle server side javascript files.

## Installation

```bash
npm i -D @sincronia/webpack-plugin
```

## Options

| Key               | Type                                                | Default  | Description                                                                                                                                                                                                               |
| ----------------- | --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configGenerator` | `(context:Sinc.FileContext)=>webpack.Configuration` | `()=>{}` | Function that can generate a webpack configuration object. A [Sinc.FileContext](https://github.com/nuvolo/sincronia/blob/bdb/packages/types/index.d.ts) is passed in so that you can substitute options using the context |
| `webpackConfig`   | `webpack.Configuration`                             | `{}`     | Same as [webpack.config.js](https://webpack.js.org/configuration/) object                                                                                                                                                 |

### Order of Configurations

1. Load from closest `webpack.config.js`.
2. Load from `webpackConfig` in `sinc.config.js` and override any overlapping values.
3. Run `configGenerator()` from `configGenerator` option in `sinc.config.js` and override any overlapping values.

## Example Usage

This example takes `.wp.js` files and bundles them with webpack by generating the options with a function

```javascript
//sinc.config.js
module.exports={
  rules:{
    match:/\.wp\.js$/,
    plugins:[
      name:"@sincronia/webpack-plugin",
      options:{
        configGenerator:(context)=>{
          mode:"production",
          //set name of record as the library name
          library:context.name
        }
      }
    ]
  }
};
```


