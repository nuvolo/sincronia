# @sincronia/babel-preset-servicenow

## Overview

This [Babel](https://babeljs.io) preset is meant to run **absolutely last** of all plugins and presets. Its purpose is to remove or refactor any code that might break ServiceNow's serverside Rhino engine.
Right now it is fairly simple, but it might be enhanced in the future if more issues are discovered.

## Installation

```bash
npm i -D @sincronia/babel-preset-servicenow
```

After the installation is completed, add it to the `presets` section of your Babel configuration.

## Sanitizer

The sanitizer performs various operations on code to make it safe for ServiceNow

### `__proto__` references

ServiceNow blocks references to `__proto__` on the serverside. This is sidestepped by changing all references to `__proto__` to `__proto-sn__`. So far all functionality has been preserved in transpiled output.

```javascript
test.__proto__ = {};
```

**becomes...**

```javascript
test.__proto-sn__ = {};
```

### Keyword Identifiers

ServiceNow does not allow properties of objects that have the same name as keywords to be accessed directly. This is sidestepped by using the index syntax instead.

```javascript
test.default;
```

**becomes...**

```javascript
test["default"]
```