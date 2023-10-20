[![Build Status](https://dev.azure.com/nuvoengineering/sincronia/_apis/build/status/nuvolo.sincronia?branchName=dev)](https://dev.azure.com/nuvoengineering/sincronia/_build/latest?definitionId=15&branchName=dev)

# Sincronia

## Overview

Sincronia is a tool for managing ServiceNow code in a more modern way. It allows you to:

1. Store scoped app code in GitHub in an editable way.🐙 (Looking at you studio source control👀)
2. Run your code through build pipelines that enable you to write modern JavaScript and use modern development tools such as [TypeScript](https://www.typescriptlang.org/), [Babel](https://babeljs.io/), and [Webpack](https://webpack.js.org/). 🎉
3. Take control of your development process in ServiceNow! 💪

Check out the [tutorial videos](https://www.youtube.com/watch?v=CqdppnM-FvM&list=PL1myMMPgZzOrOeu03YsuNmsDI2k0vadTq)!

**Table of Contents**

- [Sincronia](#sincronia)
  - [Overview](#overview)
  - [Installation](#installation)
    - [Requirements](#requirements)
    - [Instructions](#instructions)
  - [How does it work?](#how-does-it-work)
    - [Commands](#commands)
      - [Using the diff option](#using-the-diff-option)
    - [Workflow](#workflow)
    - [File Structure](#file-structure)
      - [sinc.config.js](#sincconfigjs)
      - [sinc.manifest.json](#sincmanifestjson)
      - [sinc.diff.manifest.json](#sincdiffmanifestjson)
      - [.env](#env)
    - [Asymmetric Source Code](#asymmetric-source-code)
    - [Power of Extensions](#power-of-extensions)
  - [Configuration](#configuration)
    - [There are WAY too many files in here!](#there-are-way-too-many-files-in-here)
    - [I'm not seeing all my code files!](#im-not-seeing-all-my-code-files)
    - [Plugin Configuration](#plugin-configuration)
    - [Table Options](#table-options)
  - [FAQ](#faq)
    - [How do I Delete Something?](#how-do-i-delete-something)
    - [How do I Add New Scripts?](#how-do-i-add-new-scripts)
  - [Examples](#examples)
  - [Plugin List](#plugin-list)

## Installation

### Requirements

In order to use Sincronia, you will need:

- [Node.js](https://nodejs.org/en/) version 16.0 or later
- **If you are on Windows** you will also need :
  - Windows subsystem for Linux installed (Ubuntu should work fine)
  - Preferably updated to version 1903+ (Previous versions untested/not working)
  - (Optional) Preferably Windows Terminal installed for rendering the text from the tool

### Instructions

1. Create a folder to store the scoped app code.
2. In a terminal, run `npm init` inside the newly created folder and follow the instructions to set up your node module.
3. Import [the scoped app](https://github.com/nuvolo/sincronia-server-scoped-app) from source control into your instance.
4. Install `@sincronia/core`

```bash
npm i -D @sincronia/core
```

4. Initialize your Sincronia project

```bash
npx sinc init
```

5. [Configure your project!](#configuration)
6. **OPTIONAL BUT HIGHLY RECOMMENDED** Once your project is configured the way you like, you can commit and push it to a git repository for superior tracking and version control! Make sure to create a `.gitignore` file and ignore `node_modules` and `.env` because you **really** don't want those files in your repository.
7. Start dev mode and start working! Every time you save a file that is tracked by Sincronia, it will be built with your ruleset and the result will be placed in ServiceNow!

```bash
npx sinc dev
```

## How does it work?

Sincronia takes a two-pronged approach to managing your ServiceNow scoped app. Architecture, creation of records, deletion of records, metadata and other ServiceNow objects besides your actual source code will be managed normally. Your _source code itself_ will be managed inside of your Sincronia project.

### Commands

Sincronia has a few basic commands to help you get the job done

| Command            | Aliases  | Description                                                                                                                                                 | Usage                           |
| ------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `refresh`          | `r`      | Refreshes the `sinc.manifest.json` file and downloads all new files created in ServiceNow since the last refresh. Does not override existing file contents. | `npx sinc refresh`              |
| `dev`              | `d`      | Starts development mode. Watches files for changes, then builds and pushes them to the corresponding record. Only works on files in the manifest file.      | `npx sinc dev`                  |
| `init`             | **none** | Walks you through creating a basic Sincronia project. This is the recommended way to create a Sincronia project from scratch.                               | `npx sinc init`                 |
| `push`             | **none** | Builds and pushes all files in your local Sincronia project to the ServiceNow instance in your `.env` file                                                  | `npx sinc push`                 |
| `download <scope>` | **none** | Downloads the specified scoped app, overwriting all local files in the way. **Only use this if you know what you are doing!**                               | `npx sinc download my_test_app` |
| `build`            | **none** | Builds the local Sincronia project and stores the files locally                                                                                             | `npx sinc build`                |
| `deploy`           | **none** | Deploys the files in the build folder to the ServiceNow instance.                                                                                           | `npx sinc deploy`               |
| `status`           | **none** | Lists the connected ServiceNow instance, scope, and user                                                                                                    | `npx sinc status`               |

#### Using the diff option

When using the `push` and `build` commands you can specify a branch to compare changes against using the `--diff` option. When using diff with build, Sincronia will build all files from the source folder but will create a `sinc.diff.manifest.json` file that tracks changes for deploy.

```bash
npx sinc build --diff master
```

### Workflow

![Development Workflow](https://github.com/nuvolo/sincronia/raw/master/docs/images/sincronia-development.png)

![Deployment Workflow](https://github.com/nuvolo/sincronia/raw/master/docs/images/sincronia-deployment.png)

### File Structure

When you download your source code using Sincronia, it creates a folder structure that goes as follows:

```text
project_folder/
  src/
    table_name/
      record_name/
        field_name.extension
```

Records are shown as folders because there are times where there are multiple code files per record. This makes it very important that you **never have records with the exact same display value in the same table!** If you do, then you will notice issues building your files to the right record in ServiceNow.

#### sinc.config.js

This is the configuration file for Sincronia. [Learn More](#configuration)

#### sinc.manifest.json

Keeps track of all ServiceNow files that are watched by Sincronia. **Do not manually modify it**

#### sinc.diff.manifest.json

Tracks changed files for build and deploy commands when using diff option.

#### .env

Stores login credentials and and the instance URL. **Do not commit this to git**

### Asymmetric Source Code

When you download your source code using Sincronia, you are effectively 'taking control' of that code. **Once the code is in your project, you no longer want to edit it directly in ServiceNow!** This is why putting your code into source control is highly recommended. **Anything else besides code, such as tables, configuration of script records, metadata, etc. must still be tracked in ServiceNow and passed along with your preferred method of moving ServiceNow architecture**

Modern javascript development workflows are **asymmetric**, meaning that the source code you write is usually not the code that gets executed. It is built using various tools and compiled/transpiled into some more compatible or smaller javascript code that is run by browsers or node environments.

Sincronia takes advantage of this same principle by allowing you to leverage some of those same tools. This means that you will no longer be able to store your source code directly in ServiceNow, instead you will have a local version of your source code that gets built and the result of that build will be put into ServiceNow.

**EXAMPLE**

Let's say I want to develop using TypeScript. Once I have the right plugin configuration for my needs, this Typescript file:

```typescript
// Example/script.ts
class Example {
  constructor(message: string) {
    gs.info(message);
  }
  sayHello() {
    gs.info("Hello, Sincronia!");
  }
}
```

becomes

```javascript
// ServiceNow `Example` script include.
"use strict";

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

var Example =
  /*#__PURE__*/
  (function () {
    function Example(message) {
      _classCallCheck(this, Example);

      gs.info(message);
    }

    _createClass(Example, [
      {
        key: "sayHello",
        value: function sayHello() {
          gs.info("Hello, Sincronia!");
        },
      },
    ]);

    return Example;
  })();
```

### Power of Extensions

File extensions are typically only one short blurb (e.g. `.js`, `.css`, etc.). When you use Sincronia, you may find that you want to treat one `.js` file differently than another. That's where extensions can become more powerful! You could create an extension in your project such as `.server.js` and `.client.js` which you could combine with the [rules](#plugin-configuration) configuration of Sincronia to have _two different build pipelines_. You could use Webpack for client scripts and Babel for server scripts! Pretty cool huh?

As long as the main filename stays the same, you can add as many extensions as you want.

**EXAMPLE**

`script.js` becomes `script.servicenow.js` or `script.ts` or `script.what.ever.you.want.js`

## Configuration

Sincronia aims to be as configurable as possible. To do that, it creates a special javascript file in your project directory called `sinc.config.js`. It's contents will look something like this:

```javascript
module.exports = {
  // Directory where your source files will be kept and will be watched by Sincronia
  // during development.
  sourceDirectory: "src",
  //Directory where local builds will be stored
  buildDirectory: "build",
  // This is where you will configure your plugins. You match based on plugins.
  // Order your rules by MOST SPECIFIC extension first! The first match is the
  // only one that gets executed.
  rules: [],
  // === INCLUDES/EXCLUDES apply on top of the default config! See more below ===
  // Tables/fields to exclude (AKA not download or track) from Sincronia
  excludes: {},
  // Tables/fields to explicitly include in your Sincronia project.
  // Can override excludes if necessary.
  includes: {},
  //How often sincronia will refresh the manifest in development mode
  refreshInterval: 30,
};
```

If you find that your config is getting too large, you can use typical nodejs techniques for splitting it into smaller modules and loading them into the `sinc.config.js`.

### There are WAY too many files in here!

**OR**

### I'm not seeing all my code files!

When you first set up your project, you may notice you may have more files than you want to manage or some files are missing. This can be easily resolved by tweaking your `includes` and `excludes` section of your `sinc.config.js`. Sincronia attempts to establish sane defaults for these values [here](https://github.com/nuvolo/sincronia/blob/master/packages/core/src/defaultManifestConfig.ts).

If you think there is something wrong with the default setup, feel free to submit a pull request! 🐙👍

The `excludes` and `includes` sections in your `sinc.config.js` act as additions to that default setting. You can override parts of it or turn parts of it off.

Once you have updated your includes and excludes, run `npx sinc refresh` to load the new files and update the manifest. You will have to manually delete any newly excluded tables/fields.

```javascript
// sinc.config.js
module.exports = {
  excludes: {
    // Turns off the default exclusion of the `sys_scope_privilege` table
    sys_scope_privilege: false,
    // Excludes everything from the `my_cool_table` table
    my_cool_table: true,
    // Excludes the `cool_script` field specifically from the `new_cool_table` table.
    // Other valid fields will be included.
    new_cool_table: {
      cool_script: true,
    },
  },
  includes: {
    // Turns off the default inclusion of the `content_css` table
    content_css: false,
    // Explicitly includes the `sys_report` table. Overrides any excludes on the
    // same table.
    sys_report: true,
    // Explicitly pulls in the `neat_script_field` as a `js` file in spite of whatever
    // type of field it might be in ServiceNow. Useful for text fields that
    // represent code.
    special_code_table: {
      neat_script_field: {
        type: "js",
      },
    },
  },
};
```

### Plugin Configuration

Plugins are where the true 💪 **POWER** 💪 of Sincronia comes from! The `rules` section is used to configure plugins. When configuring plugins, **Make sure to always put your rules in the order you want them matched! The first rule that gets matched will be the only one that runs!**

```javascript
// sinc.config.js
module.exports = {
  rules: [
    {
      // The match argument is a regular expression that will match on your desired files
      // The order matters, so put your most specific rules first!
      // If there is a file that ends in `.secret.ts` it will match here and
      // NO PLUGINS WILL BE RUN
      match: /\.secret\.ts$/,
      plugins: [],
    },
    {
      // If there are just generic TypeScript files that have no other extension, they will
      // match on this rule instead.
      match: /\.ts$/,
      // List of plugins to run on the matched files. Each plugin will run in order.
      // THE RESULT OF THE PREVIOUS PLUGIN WILL BE PASSED TO THE NEXT PLUGIN so make
      // sure they are in the right order!
      plugins: [
        {
          // The name of the plugin, it is the same as the name of the NPM package of
          // the plugin.
          name: "@sincronia/typescript-plugin",
          // Options to pass to the plugin. This will be defined by the plugin itself.
          // In this case, we are telling the typescript plugin to only type check and
          // not transpile.
          options: {
            transpile: false,
          },
        },
      ],
    },
  ],
};
```

### Table Options

**This is a relatively new feature and potentially subject to change**

The `tableOptions` section allows for special setups on any table. Example:

```javascript
// sinc.config.js
module.exports = {
  // ...
  tableOptions: {
    some_table: {
      // sets the field used for the record folder name
      displayField: "some_field",
      // Allows to de-duplicate records based on certain fields
      differentiatorField: "sys_id",
      // can be an array, if there isn't a value in a field, it moves to the next one
      differentiatorField: ["some_field", "sys_id"],
      // an encoded query to filter records by
      query: "some_field=test",
    },
  },
};
```

**Note on differentiatorField**

This feature will currently put a colon in the filename. This will break the Windows filesystem. Use at your own risk.

## FAQ

### How do I Delete Something?

Deleting something in Sincronia is relatively simple. Just follow these steps:

1. Turn off dev mode if you are currently running Sincronia
2. Delete the record in ServiceNow
3. Run `npx sinc refresh`
4. Remove the files from your project

Why is this not automatic? Deleting files can be a dangerous game and it should be a deliberate action!

### How do I Add New Scripts?

1. Turn off dev mode if you are currently running Sincronia
2. Create the record in ServiceNow
3. Run `npx sinc refresh` and the files will get created automatically 👍

## Examples

For an example project, we uploaded the [server side code for Sincronia](https://github.com/nuvolo/sincronia-server)! Feel free to contribute to that code if you'd like 🐙

## Plugin List

| Name                                                                                                                 | Description                                 |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [@sincronia/babel-plugin](https://github.com/nuvolo/sincronia/blob/master/packages/babel-plugin/README.md)           | Runs Babel on .js/.ts files                 |
| [@sincronia/prettier-plugin](https://github.com/nuvolo/sincronia/blob/master/packages/prettier-plugin/README.md)     | Prettifies your output files using Prettier |
| [@sincronia/sass-plugin](https://github.com/nuvolo/sincronia/blob/master/packages/sass-plugin/README.md)             | Runs the Sass compiler on your files        |
| [@sincronia/typescript-plugin](https://github.com/nuvolo/sincronia/blob/master/packages/typescript-plugin/README.md) | Type checks and compiles TypeScript files   |
| [@sincronia/webpack-plugin](https://github.com/nuvolo/sincronia/blob/master/packages/webpack-plugin/README.md)       | Creates Webpack bundles with your files     |
| [@sincronia/eslint-plugin](https://github.com/nuvolo/sincronia/blob/master/packages/eslint-plugin/README.md)         | Runs ESLint on your files on build          |
