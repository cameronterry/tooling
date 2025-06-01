# Tooling

Provides a number of common and reusable tools for working on projects that need to build and transpile CSS and
JavaScript.

## Installation

```
# Public
npm install --save-dev @cameronterry/tooling

# Co-Development with another project
npm install --save-dev git@github.com:cameronterry/tooling.git

# Co-Development with another project for a specific version
npm install --save-dev git@github.com:cameronterry/tooling.git#[tag]
```

**Please note:** this project has not be tested with yarn, mileage may vary.

## Tool: Webpack Build

Once added a dependency, then update your build scripts to use the Webpack tooling.

```
  "scripts": {
    "build": "NODE_ENV=production askyr-webpack",
    "build-dev": "NODE_ENV=development askyr-webpack"
  },
```

### How to Use

The Webpack tool adds specific support for PostCSS and common/standardise JavaScript transpiling and build
processes to your project. This is accomplished by making a number of basic assumptions:

* Specify individual build entry points in your `package.json` file.
* Output your build files in the `dist/` folder, at the same directory level as your `package.json` file.
* URLs in CSS are written relative to their location within `dist/`, and ***not*** mapped to the location your
  files.

To make use of the process, at `buildEntryPoints` structure to your `package.json` file using the following
naming convention.

```
{
  "name": "@cameronterry/tooling",
  "version": "1.0.0",
  // ...
  "dependencies": {
    // ...
  },
  "devDependencies": {
    // ...
  },
  "buildEntryPoints": {
    "[name-js]": "./location/of/js/file.js",
    "[name-css]": "./assets/css/site.css"
  }
}
```

Each of the `buildEntryPoints` will produce a separate file within `dist/` matching the key within the
substructure.

### WordPress

If you are working on a WordPress plugin and/or theme, then there are some additional functionality for
developing custom blocks as well as working with WordPress dependencies.

```shell
npm install --save-dev @wordpress/babel-preset-default @wordpress/dependency-extraction-webpack-plugin
```

By adding these dependencies, the JavaScript will become aware and handling appropriately,
`@wordpress/*` dependencies such as `@wordpress/components` and so on, as well as introduce a new entry
point called, `wp-blocks`. Your `package.json` file should resemble the following, and note that
`wp-blocks` is a folder rather than a file entry point.

```
{
  "name": "@cameronterry/tooling",
  "version": "1.0.0",
  // ...
  "dependencies": {
    // ...
  },
  "devDependencies": {
    // ...
    "@wordpress/babel-preset-default",
    "@wordpress/dependency-extraction-webpack-plugin"
  },
  "buildEntryPoints": {
    "wp-blocks": "./includes/blocks",
    "[name-js]": "./location/of/js/file.js",
    "[name-css]": "./assets/css/site.css"
  }
}
```

#### Changes to output

This setup will make the following changes to the output when running, `npm run build`.

* In addition to a CSS and JS file, a new `[name].asset.php` file will also be created.
* This PHP file will contain an array with two keys; `dependencies` and `version`.
* These are compatible and intended to be use in conjunction with `wp_enqueue_script` and
  `wp_enqueue_style()`, and will contain the relevant dependencies from WordPress core to function.

This is due to the inclusion of the `@wordpress/dependency-extraction-webpack-plugin` package which is
responsible for producing these extra files. More information is available here:
https://developer.wordpress.org/news/2023/04/how-webpack-and-wordpress-packages-interact/.

#### Custom blocks

The `wp-blocks` entry point is to point to a folder with the following structure. This can be in either
a plugin or a theme.
```
[root]
- package.json
- assets/
-- css/
--- site.css
-- js/
--- site.js
- includes/blocks/
-- custom-block-one/
--- block.json
--- edit.js
--- index.js
--- save.js
--- view.css
--- view.js
-- custom-block-two/
--- block.json
--- index.js
--- view.js
```

The main requirement is that `block.json` is present in every custom block. If this file is not created
or present, then the Webpack Tool will ignore the folder and contents.

Other files, such as `edit.[css|js]` and `view.[css|js]`, correspond to the `editorScript` /
`editorStyle` and `viewScript` / `viewStyle` properties used within the `block.json` file. These are
part of the standard established by WordPress core and are detailed in the Block Editor Handbook here:
https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/.

## Examples

The following projects are publicly available, open source, projects making use of the Tooling provided
by this project.

* Dark Matter Plugin - https://github.com/cameronterry/dark-matter/
