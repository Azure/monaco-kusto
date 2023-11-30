# Webpack/React Monaco Kusto AMD Example

Created by calling [webpack init](https://webpack.js.org/api/cli/#init) and then
modifying the output to support monaco-kusto's AMD module output. A more minimal
AMD example is available here: [../amd]()

## Running

1. Install Node.js 20 https://nodejs.org/
2. Run `corepack enable` to make the `yarn` package manager available (https://yarnpkg.com/getting-started/install)
3. In any folder: `yarn install`
4. In /package: `yarn build`
5. In this folder
    1. `yarn copy-amd-files`
    2. `yarn serve`

## Notable monaco-kusto AMD specific changes

Changes have longer comments alongside them.

-   Add `<script src="./vs/loader.js"></script>` to index.html
-   Added `copy-amd-files` to npm scripts
-   Call Monaco-editors AMD loader via `__non_webpack_require__()` instead of
    `require()`
-   Add "@kusto/monaco-kusto/globalApi" to compilerOptions.types in tsconfig.json
