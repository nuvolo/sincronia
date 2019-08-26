# @sincronia/babel-plugin

## Overview

This plugin allows you to run [Babel](https://babeljs.io/) on your javascript and TypeScript files. This enables you to do all kinds of interesting things with your code structure. It also lets you use more modern javascript features in your ServiceNow development.

Whatever Babel plugins and presets you use, you still need to `npm install` them like usual.

## Installation

```bash
npm i -D @sincronia/babel-plugin
```

## Options

This plugin takes the exact same options as [.babelrc](https://babeljs.io/docs/en/configuration#babelrc).

## Limitations

Although normal Babel transpilation enables nearly all modern javascript features in older javascript runtimes, ServiceNow's Rhino engine prevents certain modern features from working after transpilation.

Syntactic sugar such as ES6 classes, destructuring, let/const, template strings, default parameters, and arrow functions are supported. Features added to base classes like `Array` or for-of loops, Map, Set, and Weakmap are not supported because the `prototype` of base classes are locked in the Servicenow javascript engine.

A good rule of thumb is to not use the `useBuiltIns` option of the `babel-preset-env` preset. If your code works, then you are fine. If it throws errors when you run it, you most likely need an unsupported polyfill.

Feel free to riot so we can get more modern javascript features in ServiceNow 😉

## Example Usage

This example takes `.ts` files and transpiles it to valid ServiceNow javascript.

```javascript
//sinc.config.js
module.exports={
  rules:{
    match:/\.ts$/,
    plugins:[
      name:"@sincronia/babel-plugin",
      //Babel options. Numbering shows order of execution
      options:{
        presets: [
          //6. Sanitize output code for ServiceNow
          "@sincronia/servicenow",
          //5. Babel env preset, transforms syntactic sugar to valid older javascript
          "@babel/env",
          //4. Typescript preset. Removes type information and makes it valid javascript
          "@babel/typescript"
          ],
        plugins: [
          //1. Remove import/export statements used for type inference
          "@sincronia/remove-modules",
          //2 and 3. Required babel plugins for typescript
          "@babel/proposal-class-properties",
          "@babel/proposal-object-rest-spread"
        ]
      }
    ]
  }
};
```
