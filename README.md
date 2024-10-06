# Monaco Kusto

Kusto language plugin for the Monaco Editor. It provides the following features when editing CSL, KQL files:

-   Code completion
-   Syntax highlighting
-   Validation: Syntax errors and linting
-   code folding / outlining
-   Hovers
-   Find definition
-   find all references
-   rename symbol

## Usage

`npm install @kusto/monaco-kusto` or `yarn add @kusto/monaco-kusto`

### Package content

-   `/esm` Contains esm version of the library
-   `/dev` Contains an AMD version of the library
-   `/min` Contains a minified AMD version of the library

### AMD module system:

Example at [/samples/amd](https://github.com/Azure/monaco-kusto/tree/master/samples/amd)

1. Run `npm run copyMonacoFilesAMD <path>` or `yarn copyMonacoFilesAMD <path>`
   where <path> is where you want the monaco and kusto amd modules to be. These
   files will need to be served as-in.
2. Using a amd module loader, import `vs/language/kusto/monaco.contribution` 1. The monaco editors included loader can
   be made available via a global
   require `require` by adding the script tag: `<script src="<path>/vs/loader.js"></script>`
3. You should now be able to create monaco editors with `language: 'kusto'`. The
   kusto worker can be reached via the monaco global:
   `monaco.languages.kusto.getKustoWorker()`
4. If using typeScript, add "@kusto/monaco-kusto/globalApi" to compilerOptions.types in tsconfig.json`

### ESM

Parcel example at [/samples/parcel](https://github.com/Azure/monaco-kusto/tree/master/samples/parcel)

1. Configure your bundler so `@kusto/monaco-kusto/release/esm/kusto.worker` has it's own entry point
2. Configure the global `MonacoEnvironment` with either `getWorkerUrl` or `getWorker`
3. You should now be able to create monaco editors with `language: 'kusto'`. The
   kusto worker can be reached via the monaco global:
   `monaco.languages.kusto.getKustoWorker()`

### Setting a schema

There are 2 APIs to set a Kusto schema:

1. `setSchema` - the passed schema is of type `ClusterType` (defined in `schema.ts`).
   The database in ROOT.database will be the one in context.
2. `setSchemaFromShowSchema` - a method to set a schema from the result of the
   Kusto query `.show schema as json`. The result is a list of databases (see
   interface `Result` in `schema.ts`), so when this method is used, it also
   requires a cluster URI and the name of the database in context.

## Contributing

Every PR should come with a test that checks it.

### Setting up a dev environment

1. Install Node.js 20 https://nodejs.org/
2. Run `corepack enable` to make the `yarn` package manager available (https://yarnpkg.com/getting-started/install)
3. Clone repo and run `yarn` in repo root
4. Run `yarn watch` from /package and a http-server will automatically open the index.html

### Build for release

1. Set CI environment variable to "tru"
2. Run `yarn build`

## Running unit tests

-   Run `yarn test` from the package folder to run all unit tests

## Running integration tests

-   Run `yarn test:integration:install` from the root of the project
-   Run `yarn test:integration` from the package folder to run the tests in headless mode
-   Run `yarn test:integration:watch` from the package folder to run the tests in a browser and rebuild after each change

## Changelog

### 12.0.8

-   fix: dispose all monaco models when disposing the worker to prevent memory leaks.

### 12.0.7

-   revert: KQL color contrast for query operators change.

### 12.0.6

-   fix: KQL color contrast for query operators now complies with accessibility guidelines.

### 12.0.5

-   fix: Dark mode colors are now more readable.

### 12.0.4

-   fix: Explicitly export getRangeHtml from monaco.contribution to fix an issue with parcel build.

### 12.0.3

-   feat: Upgrade language-service to 0.0.279.

### 12.0.2

-   fix: Revert the refactor as it caused build issues

### 12.0.1

-   fix: Resolved a race condition to ensure the semantic tokens provider is registered after setting the language server schema.
-   fix: Fixed an issue where semantic highlighting didn't work on schema change by properly handling provider registration.
-   fix: Disposed of the existing provider whenever a new one is registered to prevent memory leaks.

### 12.0.0

### Breaking Changes

-   Replaced syntax highlighting in Monaco-Kusto. The old method injected CSS for each KQL classified block, causing copy-to-clipboard issues. The new implementation uses:
    -   **Monarch Tokens**: Efficient syntax highlighting leveraging Monaco Editor capabilities.
    -   **Semantic Syntax Highlighting**: Uses Kusto Language Service for context-aware highlighting.
-   Removed `useSemanticColorization` and `useTokenColorization` settings.
-   Renamed `kusto-dark2` theme to `kusto-dark`
-   To enable new highlighting, add the following flag when creating the Monaco editor:
    ```javascript
    monaco.editor.create(document.getElementById('editor'), {
        // current flags...
        'semanticHighlighting.enabled': true,
    });
    ```
-   `getRangeHtml` is a new public API for retrieving HTML content with syntax highlighting for clipboard data.

### 11.4.0

-   feat: IntelliSense completion items now maintain the original order from the language service, with the most relevant option automatically focused based on the user's input.

### 11.3.0

-   fix: Exclude punctuation-only syntax from completion items.

### 11.2.1

-   feat: Upgrade language-service-next to 11.6.1.

### 11.2.0

-   feat: Fix bugs related to last version upgrade.
-   feat: Upgrade language-service-next to 11.6.0.

### 11.1.0

-   feat: Modify the ordering of completion items so that columns always appear at the top.
-   feat: Upgrade language-service-next to 11.5.6.

### 11.0.0

-   BREAKING CHANGE: Removed the useIntellisenseV2 option; it now defaults to true.
-   feat: upgrade language-service-next to 11.5.5.

### 10.0.0

-   BREAKING CHANGE: addClusterToSchema know excepts databases as an object with name and alternative name instead of just
    a string name.

### 9.0.0

-   feat: support entity groups and database alternative name

### 7.8.0

-   feat: `plotly` is now supported in intellisense as a render command

### 7.7.2

-   fix: `KustoWorker#setParameters` will now apply changes immediately

### 7.3.0

-   feat: Kusto worker will now respect `MonacoEnvironment.baseUrl`
    configuration when running in a different origin. Checkout our [new
    example](https://github.com/Azure/monaco-kusto/tree/master/samples/amd-webpack-react-cross-origin)
    for details

### 7.2.1

-   fix: Added types back to global api

### 7.2.0

-   Added "themeNames" object to exports which contains the theme we register with monaco: kusto-light, kusto-dark, and
    kusto-dark2

### 7.0.1

-   fix: Exported types don't match types used in many cases

### 7.0.0

-   BREAKING CHANGE: Bumped monaco-editor peer dependency to ~0.37.0
    -   This version of monaco-editor no longer requires a patch to work with Parcel. Details
        here: https://github.com/microsoft/monaco-editor/issues/2966
-   fix: "monaco is not defined" errors when consuming esm files
-   Moved types from global interface (`monaco.languages.kusto.*`) to esm index
    file `import { SomeType } from '@kusto/monaco-kusto`. With this, esm
    consumer no longer need to include
    `@kusto/monaco-kusto/release/monaco.d.ts`.
-   ESM output no longer requires `MonacoEnvironment.globalApi` to be `true`
-   Moved `@kusto/monaco-kusto/release/monaco.d.ts` content to
    `@kusto/monaco-kusto/globalApi.d.ts`. Original file now references this new
    one, and will be removed in a future release.

### 6.2.0

-   Esm output not longer requires `self.MonacoEnvironment` to be true
-   `@kusto/monaco-kusto` no exports the same api as `monaco.languages.kusto`

### 6.0.0

-   Improved quality of AMD build artifacts
-   BREAKING CHANGE: AMD build artifacts now include a new "main" file that
    contains shared code
-   BREAKING CHANGE: ESM build artifacts no longer vender dependencies in a
    "deps" folder. node_modules imports are left as-is, and are now in
    package.json#dependencies

### 4.1.8

-   fix: trigger suggestion when previous suggestion selected.

### 4.1.6

-   fix: low color contrast for foreground/background in suggestWidget for dark theme

### 4.1.3

-   fix: low color contrast for foreground/background in suggestWidget

### 4.0.6

-   fix: `setSchemaFromShowSchema` now supports for external tables.

### 4.0.3

-   fix: update language service to latest version. fixes issues with scan operator being shown first in completion list.

### 4.0.2

-   fix: don't do kusto specific highlighting when other language is selected.

### 4.0.0

-   BREAKING CHANGE: update monaco-editor-core and monaco-editor version to 0.24.0
-   Usage for ESM modules: add `globalAPI: true` in window.MonacoEnvironment declaration to have `monaco` on the window

### 3.3.12

-   fix: external table erroneously shown for materialized views

### 3.2.11

-   feat: update language service

### 3.2.10

-   feat: expose custom syntax error message options

### 3.2.9

-   feat: update language service to support python code strings

### 3.2.8

-   fix: `RenderOptions` type missing `null` property union variants

### 3.2.7

-   fix: errors are shown twice on hover

### 3.2.6

-   update language service.

### 3.2.5

-   Expose formatting options

### 3.2.4

-   Bug fix: `union *` is auto-formatted into `union*`

### 3.2.3

-   Bug fix: Intellisense doesn't show columns when using this syntax `materialized_view("<table name>") | where `

### 3.2.2

-   Bug Fix: In `mv-expand kind=array` kind is shown with a squiggly error line
-   Update @kusto/language-service-next

### 3.2.1

-   Colorize public query options.
-   Bug Fix: Format query hangs in some use cases.

### 3.2.0

-   A function validation fails (shows squiggly red lines), if the function is defined with a parameter that has a default
    value, but it is used without passing a value for that parameter.
-   Fix bug: Scalars function parameters are always showing "Table expected" error with squiggly error red line when using
    setSchemaFromShowSchema.

### 3.1.0-beta.3

-   Missing tokens are no longer added when formatting queries.

### 3.0.1

-   Fix exception "Cannot read property 'getText' of null TypeError: Cannot read property 'getText' of null at
    e.parseDocumentV2"
-   Added a sample react project

### 3.0.0

-   Upgrade to latest monaco (which includes many changes amongst them accessibility improvements)

### 2.1.15

-   Fix typo in 2.1.14.

### 2.1.14

-   Add a theme with a darker background color.

### 2.1.13

-   Fix error "Database has no tables".

### 2.1.12

-   Allow formatting commands in cursor location.

### 2.1.11

-   Upgrade to latest bridge.net which fixes an exception from indexOf.

### 2.1.10

-   Schema with no functions was throwing "Cannot read property 'map' of undefined".

### 2.1.9

-   Add DocString to onHover tooltip

### 2.1.6

-   Update language service.

### 2.1.5

-   Updated render kind typing to include map.

### 2.1.4

#### Added

-   Added `enableHover` option to languages settingss.

### 2.1.3

#### Added

-   Added `onDidProvideCompletionItems` to languages settings as callback function for doComplete operations.

### 2.1.2

#### Bug fix

-   Fix `getCommandsInDocumentV2` not to take new lines as command.

### 2.1.1

#### Bug fix

-   Fix `doRangeFormat` to work with all kind of user text selection.

### 2.1.0

#### Added

-   Added esm release bundles.
-   Added package.json scripts to replace gulp completely.

### 2.0.9

#### Bug fix

-   Fix `getRenderInfo` in cases where there is not with clause.

### 2.0.8

#### Bug fix

-   Some more type fixes.

### 2.0.7

#### Bug fix

-   Fixed typings.

### 2.0.6

#### Added

-   Added `getRenderInfo` that returns the render command visualization options in a query.

### 2.0.5

#### Added

-   Added `setParameters` that set parameters to the schema without providing the entire schema.

### 2.0.4

#### Added

-   Added `getReferencedGlobalParams` that returns the global (ambient) parameters that are actually being referenced in
    the query.

### 2.0.3

#### Bug fix

-   Control command completion bug fix (updating intellisense library)

### 2.0.2

#### Bug fix

-   null pointer exception fix.

### 2.0.1

#### Bug fix

-   actually made the change described in 2.0.0

### 2.0.0 (11/20/2019)

#### Added

-   **[Breaking]** Change default to use intellisense V2

### 1.1.19 (11/18/2019)

#### Bug fix

-   fix exception in CM & DM clusters when intellisenseV2 is on

### 1.1.18 (11/18/2019)

#### Added

-   Abiltiy to get global parameters in scope (getGlobalParams)).

### 1.1.17 (11/14/2019)

#### Added

-   Ability to injet global parameters to intellisense (in setSchema)

### 1.1.16 (10/28/2019)

#### Added

-   Updated language service
-   Fix corrupt monaco.d.ts

### 1.1.15 (10/25/2019)

#### Added

-   Introduce a new function in language service called `getQueryParams`. it will return an array of all delcared query
    parameters for the query on cursor.

### 1.1.14 (9/16/2019)

#### Bug fix

-   Fix 1.1.13 to return ranges based on 1 (as monaco expects) rather than 0 (as kusto language server returns).

### 1.1.13 (9/14/2019)

#### Added

-   Introduce a new function in language service called `getCommandAndLocationInContext`.
    it will return both the text and the range of the command in context.

### 1.0.12 (9/4/2019)

#### Added

-   Update language service to latest version.

### 1.0.11 (8/22/2019)

#### Bug fix

-   Fix IE compatibility issue (remove new URL usage)

### 1.0.10 (7/1/2019)

#### Bug fix

-   Fix broken dependency on language service.

### 1.0.9 (7/1/2019)

#### Bug fix

-   don't suggest chart types that we do not support yet.

### 1.0.8 (7/1/2019)

#### Bug fix

-   don't kill web worker after 2 minutes of inactivity by default. Reason: In exterme cases where schema is very large,
    trying to stringify the schema in web worker causes an OOM. This is configurable though.

### 1.0.6 (6/6/2019)

#### Bug fix

-   Fix broken Diagnostics

### 1.0.5 (6/5/2019)

#### Bug fix

-   Fix vulnerability in dependency

### 1.0.4 (5/31/2019)

#### Added

-   Support for adding and removing line comments with keyboard shortcut.
-   Support hover

### 1.0.3 (5/31/2019)

#### Added

-   Support for go-to definition, find all refrences, rename symbol.

### 1.0.0 (1/31/2019)

#### Bug fix

-   **[Breaking]** put minified versions of language serivce in npm package.
-   **[How to migrate]**:
    include the .min (minified files) rather than the unminified files (which are no longer available)
    ```xml
    <script src="%PUBLIC_URL%/monaco-editor/min/vs/language/kusto/bridge.min.js"></script>
    <script src="%PUBLIC_URL%/monaco-editor/min/vs/language/kusto/kusto.javascript.client.min.js"></script>
    <script src="%PUBLIC_URL%/monaco-editor/min/vs/language/kusto/newtonsoft.json.min.js"></script>
    <script src="%PUBLIC_URL%/monaco-editor/min/vs/language/kusto/Kusto.Language.Bridge.min.js"></script>
    ```

### 0.2.2 (12/28/2018)

#### Bug fix

-   Increase contrast of operators in syntax highlighting.

### 0.2.2-alpha2 (12/21/2018)

#### Added

-   Updated dependency @kusto/language-service-next.

### 0.2.2-alpha (12/21/2018)

#### Added

-   Updated dependency on @kusto/language-service.

### 0.2.0 (12/14/2018)

#### Added

-   **[Breaking]** Support monaco-editor v15. This removes supprot for pre 15 versions.

### 0.1.27 (11/14/2018)

#### Added

-   Abiltiy to suppress completion items from intellisense.

### 0.1.26 (10/31/2018)

#### Added

-   Dark theme support (set by calling monaco.editor.setTheme('kusto.dark'))

### 0.1.25 (10/09/2018)

#### Bug fix

-   Don't try to run logic on disposed models.

### 0.1.22 (9/27/2018)

#### Bug fix

-   Format current command always formatted the 1st command.

### 0.1.21 (9/23/2018)

#### Added

-   Removed completion options that arent' curerntly supported.

### 0.1.19

#### Bug fix

-   Colorization didn't work when asked to colorize entire document

### 0.1.18

#### Added

-   Updated language server dependnecy to latest version.

### 0.1.16

#### Bug Fix

-   improve V2 intellisense colorization performance.

### 0.1.15

#### Bug Fix

-   V2 intellisense now correctly reverts to V1 for control commands.

### 0.1.14

#### Bug Fix

-   Add decimal support to V2 instllisense .

### 0.1.13

#### Bug Fix

-   Fix v2 intellisense.

### 0.1.12

#### Bug Fix

-   fix quirks in interactions between non-semantic and semantic colorization by not using semantic coloring to color
    plain text.

### 0.1.11

#### Bug Fix

-   Fixed an issue where colorization is working on an older vesion of the document, which results in wrong colorization.

### 0.1.6

### Bug Fixes

-   Intellisense didn't work properly when editing in the middle of a block that is not the 1st block on the page.
-   Monarch colorization now colorizes sub-opeators the same as semantic colorization (which makes the changes less
    jarring when completing semantic colorization).
-   When switching context, colorization didn't recolorize.
-   (perf) Only colorize the currently edited block(s) - this supports multi-cursor editing
-   (perf) don't deeply parse the entire doc when doing completion. just get the list of commands and then parse the
    relevant command's all tokns.

### 0.1.1

### Added

-   removed semantic colorization from main thread. From now on basic colorization (schema-unaware) will happen on main
    thread, and semantic colorization will happen in background thread. This should improve typing performance
    on long rows, or on large databases.

### 0.1.0

#### Added

-   Support for DM intellisense

### 0.96

#### Bug Fixes

-   fix incorrect column types

### 0.95

#### Bug Fixes

-   upgrade to latest kusto.javascript.client (based on a newer version of bridge.net and the code itself)

### 0.94

#### Bug Fixes

-   upgrade to latest Kusto.Language.Bridge (based on a newer version of bridge.net and the code itself)

### 0.93

#### Bug Fixes

-   improve performance for function parsing by levaraging new functionality in Kusto.Language.Bridge.

### 0.91

#### Bug Fixes

-   Update langauge service dependencies to versions with unified bridge.net version and bridge.json settings.

### 0.90

#### Bug Fixes

-   **[breaking]** Cache clutsser schema in memory. This breaks backward compatibility since it now requries schema to
    include minor and major version of databases.

### 0.89

#### Bug Fixes

-   Upgrade version of Kusto.Language.Bridge so solve some issues.

### 0.88

#### Functionality

-   enable get current command logic to V2.

### 0.86

#### Bug Fixes

-   Fix ability to set schema using .show schema as json.

### 0.85

#### Bug Fixes

-   fix bug that caused diagnostics and colorizaiton to be wrong until first text was typed.

### 0.76

#### Bug Fixes

-   fix bug that rendered validation unusable

### 0.74

#### Functionality

-   Add colorization support to intellisense API v2

### 0.73

#### Functionality

-   Add functions support to intellisense API V2

### 0.72

#### Functionality

-   update version of @kusto/language-service-next to 0.0.10, integrated following functionality:

1. library orders items on its own, so no need to order in monaco-kusto
2. add support for the cursor not ending in the end of the completion text (like in the 1st parmaeter7 of a function for
   example)
3. add '|' after table name

-   Make sure to never parse the same text more than once.

### 0.71

#### Functionality

-   add diagnostics (a.k.a error message) support (when v2 parser enabled).

### 0.70

#### Functionality

-   add folding (a.k.a outlining) support. one can now fold commands and hide them from screen.

### 0.69

#### Functionality

-   **[breaking]** - introduce new intellisense library (off by default).
    requires adding the following line to code

```html
<script src="../node_modules/kusto-language-service/kusto.javascript.client.js"></script>
```

### 0.68

#### Bug Fixes

-   **[breaking]** - Update monaco-editor peer dependency to "^0.12.0" because of bug fixes performed there. Also making
    the
    dependency more permissive (allow later minor versions).

### 0.67

#### Bug Fixes

-   Add missing dependency bridge newtonsoft.json.js to npm package.

### 0.65

#### Functionality

-   updated @kusto/lagnuage-service to latest version. this contains the latest operators, documentation, and charting
    logic.

### 0.64

#### Bug Fixes

-   Added peer dependency for `monaco-editor@0.11` so that consumers of the package get a warning if their version of
    monaco is too old.

### 0.63

#### Functionality

-   **[breaking]** - The package now requires `monaco-editor@0.11.1` to function correctly. adds support for markdown in
    intellisense documentation.

### 0.62

#### Functionality

-   Added `setSchemaFromShowSchema`: a new method to set a schema from the result of .show schema as json exewcution

### 0.61

#### Functionality

-   **[breaking]**: make setSchema async so that big schemas do not block the ui thread (specifically - tokenization code
    is running in ui thread so it can block rendering).

### 0.60

#### Bug fixes

-   fixed label casing of `editor.action.kusto.formatCurrentCommand` command.

### 0.59

#### Functionality

-   add `getAdminCommand` method to `KustoWorker`, which returns an object with a boolean property signifying whether
    the text is an admin command, and a string property that contains the command without leading comments.

### 0.58

#### Bug fixes

-   null pointer exception when creating and destroying multiple monaco models

### 0.57

#### Functionality

-   add `getClientDirective` method to `KustoWorker`, which returns an object with a boolean property signifying whether
    the text is a client directive, and a string property that contains the directive without leading comments.

### 0.54

#### Bug fixes

-   fix getCurrentCommand bug when there are multiple commands in document

### 0.53

#### Bug fixes

-   fix intellisense issue when trying to get suggestions for a new query (2 newlines after previous query)

### 0.52

#### Bug fixes

-   command formatting and document formatting now work (ctrl K + ctrl F and alt+shift+F respectively)

### 0.49

#### Bug fixes

-   setSchema does not update syntax highlighting

# Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
