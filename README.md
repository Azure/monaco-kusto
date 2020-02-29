# Monaco Kusto

Kusto language plugin for the Monaco Editor. It provides the following features when editing CSL, KQL files:

-   Code completion
-   Syntax highlighting
-   Validation: Syntax errors and linting
-   code folding / outlining
-   Hovers
-   Find definition
-   find all refernces
-   rename symbol

## Setting up a dev environment

1. Install Node.js (v6.10.3 or later) from [https://nodejs.org/](https://nodejs.org/)
2. (optional - you can probably use npm instead of yarn) Install Yarn from [https://yarnpkg.com/lang/en/docs/install/](https://yarnpkg.com/lang/en/docs/install/)
3. Open a new Kazzle environment, and then execute:
    - `yarn install` (or `npm install`)
4. You're set! Open `test/index.html` in your favorite browser and type some text.
5. You can also use `yarn run watch` (or `npm watch`) to automatically recompile on save.

## Usage

1. npm i @kusto/monaco-kusto
2. add the following to your `index.html` (or other entry point)

    ```xml
    <script src="%PUBLIC_URL%/monaco-editor/min/vs/language/kusto/bridge.min.js"></script>
    <script src="%PUBLIC_URL%/monaco-editor/min/vs/language/kusto/kusto.javascript.client.min.js"></script>
    <script src="%PUBLIC_URL%/monaco-editor/min/vs/language/kusto/newtonsoft.json.min.js"></script>
    <script src="%PUBLIC_URL%/monaco-editor/min/vs/language/kusto/Kusto.Language.Bridge.min.js"></script>
    ```

    This is done since this package has a dependency on `kusto-language-service` but for now, we couldn't get `Bridge.Net` to produce valid modules with valid typescript typings.

    Until we do, consumer of this package will have to add the aformentioned lines globally in order for the package to work.
    In the future we might load these programmatically ourselves (in fact - we already do this for the web monaco language service web worker).

3. Monaco is using AMD module (actually it now supports ES modules, but we've still not update this pacakge to leverage that). In order to load monaco and monaco-kusto in your application you will need to monaco and monaco-ksuto as static files on your web server, and do do the following (this is in a React app and is taken from an older version of [react-monaco-editor](https://github.com/superRaytin/react-monaco-editor)

```javascript
  // The MIT License (MIT)
  // Copyright (c) 2016-present Leon Shi
  // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
  // documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
  // rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
  // permit persons to whom the Software is furnished to do so, subject to the following conditions:
  // The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
  // Software.
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
  // WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
  // OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  const requireConfig = {
      url: 'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.5/require.min.js',
      paths: {
        'vs': `${process.env.PUBLIC_URL}/monaco-editor/min/vs`
      }
  };
  componentDidMount() {
    const context = this.props.context || window;
    if (context.monaco !== undefined) {
      this.initMonaco();
      return;
    }
    const { requireConfig } = this.props;
    const loaderUrl = requireConfig!.url || 'vs/loader.js';
    const onGotAmdLoader = () => {
      if (context.__REACT_MONACO_EDITOR_LOADER_ISPENDING__) {
        // Do not use webpack
        if (requireConfig!.paths && requireConfig!.paths!.vs) {
          context.require.config(requireConfig);
        }
      }

      // Load monaco
      context.require(['vs/editor/editor.main'], () => {
        context.require(['vs/language/kusto/monaco.contribution'], () => {
          this.initMonaco();
        });

      });

      // Call the delayed callbacks when AMD loader has been loaded
      if (context.__REACT_MONACO_EDITOR_LOADER_ISPENDING__) {
        context.__REACT_MONACO_EDITOR_LOADER_ISPENDING__ = false;
        const loaderCallbacks = context.__REACT_MONACO_EDITOR_LOADER_CALLBACKS__;
        if (loaderCallbacks && loaderCallbacks.length) {
          let currentCallback = loaderCallbacks.shift();
          while (currentCallback) {
            currentCallback.fn.call(currentCallback.context);
            currentCallback = loaderCallbacks.shift();
          }
        }
      }
    };
```

## Changelog

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

-   Added `getReferencedGlobalParams` that returns the global (ambient) parameters that are actually being referenced in the query.

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

-   Introduce a new function in language service called `getQueryParams`. it will return an array of all delcared query parameters for the query on cursor.

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

-   don't kill web worker after 2 minutes of inactivity by default. Reason: In exterme cases where schema is very large, trying to stringify the schema in web worker causes an OOM. This is configurable though.

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

-   fix quirks in interactions between non-semantic and semantic colorization by not using semantic coloring to color plain text.

### 0.1.11

#### Bug Fix

-   Fixed an issue where colorization is working on an older vesion of the document, which results in wrong colorization.

### 0.1.6

### Bug Fixes

-   Intellisense didn't work properly when editing in the middle of a block that is not the 1st block on the page.
-   Monarch colorization now colorizes sub-opeators the same as semantic colorization (which makes the changes less jarring when completing semantic colorization).
-   When switching context, colorization didn't recolorize.
-   (perf) Only colorize the currently edited block(s) - this supports multi-cursor editing
-   (perf) don't deeply parse the entire doc when doing completion. just get the list of commands and then parse the relevant command's all tokns.

### 0.1.1

### Added

-   removed semantic colorization from main thread. From now on basic colorization (schema-unaware) will happen on main thread, and semantic colorization will happen in background thread. This should improve typing performance
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

-   **[breaking]** Cache clutsser schema in memory. This breaks backward compatibility since it now requries schema to include minor and major version of databases.

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
2. add support for the cursor not ending in the end of the completion text (like in the 1st parmaeter7 of a function for example)
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

-   **[breaking]** - Update monaco-editor peer dependency to "^0.12.0" because of bug fixes performed there. Also making the
    dependency more permissive (allow later minor versions).

### 0.67

#### Bug Fixes

-   Add missing dependency bridge newtonsoft.json.js to npm package.

### 0.65

#### Functionality

-   updated @kusto/lagnuage-service to latest version. this contains the latest operators, documentation, and charting logic.

### 0.64

#### Bug Fixes

-   Added peer dependency for `monaco-editor@0.11` so that consumers of the package get a warning if their version of monaco is too old.

### 0.63

#### Functionality

-   **[breaking]** - The package now requires `monaco-editor@0.11.1` to function correctly. adds support for markdown in intellisense documentation.

### 0.62

#### Functionality

-   Added `setSchemaFromShowSchema`: a new method to set a schema from the result of .show schema as json exewcution

### 0.61

#### Functionality

-   **[breaking]**: make setSchema async so that big schemas do not block the ui thread (specifically - tokenization code is running in ui thread so it can block rendering).

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
