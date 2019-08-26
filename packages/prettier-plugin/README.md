# @sincronia/prettier-plugin

## Overview

This plugin allows you to run [Prettier](https://prettier.io/) on all supported file types. Supports `.prettierrc` files.

## Options

This plugin takes the exact same options as [.prettierrc](https://prettier.io/docs/en/options.html).

### Order of Configurations

1. Check for `.prettierrc` file and load those options
2. Load from `sinc.config.js` options and override any overlapping values.

## Example Usage

This example takes `.js` files and prettifies them.

```javascript
//sinc.config.js
module.exports={
  rules:{
    match:/\.js$/,
    plugins:[
      name:"@sincronia/prettier-plugin",
      //Prettier options
      options:{
        //sets tabs to be 2 spaces
        tabWidth:2,
        //append semicolons to ends of lines
        semi:true
      }
    ]
  }
};
```

You could also create a `.prettierrc` file with those same options in your project and it would respect those values.
