# @sincronia/babel-plugin-remove-modules

## Overview

This [Babel](https://babeljs.io) plugin is for stripping import/export statements from code. It is useful for allowing your source code to reference other files without actually importing them.

## Installation

```bash
npm i -D @sincronia/babel-plugin-remove-modules
```

## Usage

Add this plugin to your `plugins` section of your Babel configuration

### `import`'s

Imports get removed if there is no override in place.

```javascript
import mod1 from "mod1";
import { test } from "mod2";

mod1.hello();
test.asdf();
```

**becomes...**

```javascript
mod1.hello();
mod2.test.asdf();
```

### `export`'s

Exports always get removed as of now, but if there is need an override can be added.

```javascript
export default function() {}
const test = "asdf";
export { test };
```

**becomes...**

```javascript
function _temp() {}
const test = "asdf";
```

## Tags

### @keepModule

Putting a comment that contains `@keepModule` before an import statement will keep it from being removed

```javascript
import module from "myModule";
//@keepModule
import moduleDos from "myModuleDos";
```

**becomes...**

```javascript
//@keepModule
import moduleDos from "myModuleDos";
```

### @expandModule

Putting a comment that contains `@expandModule` causes the variable names to be expanded out. Useful for in house modules contained in scopes.

```javascript
//@expandModule
import { part1 } from "myModule";

part1.init();
```

**becomes...**

```javascript
myModule.part1.init();
```

### @moduleAlias

Putting a comment that contains `@moduleAlias=__aliasName__` causes the variable names to be expanded out **and** renames the source module to be whatever you like. Needs to be used with the `@expandModule` tag.

```javascript
//@expandModule @moduleAlias=notMyModule
import { part1 } from "myModule";

part1.init();
```

**becomes...**

```javascript
notMyModule.part1.init();
```
