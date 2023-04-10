# Webpack/React Monaco Kusto AMD Example

Created by calling [webpack init](https://webpack.js.org/api/cli/#init) and then
modifying the output to support monaco-kusto's AMD module output. A more minimal
AMD example is available here: [../amd]()

## Running

Run the below commands

1. `yarn install`
2. `yarn copy-amd-files`
3. `yarn serve`

## Notable monaco-kusto AMD specific changes

Changes have longer comments alongside them.

-   Add `<script src="./vs/loader.js"></script>` to index.html
-   Set `resolve.fallback.fs` to `false` in webpack config
-   Added `copy-amd-files` to npm scripts
-   Call Monaco-editors AMD loader via `__non_webpack_require__()` instead of
    `require()`
