# Monaco Kusto AMD Example

## Running

1. Install Node.js 20 https://nodejs.org/
2. Run `corepack enable` to make the `yarn` package manager available (https://yarnpkg.com/getting-started/install)
3. In any folder: Run `yarn` to install packages
4. In /package: Run `yarn build`
5. Run `yarn build` to copy monaco editor and monaco-kusto to /vs
    1. Kusto worker doesn't respect require config created on the window, so
       files much always have the same relative path to each other
    2. Run `yarn start` to start a server. Opening ./index.html directly will not
       work because the file:// protocol does not support service workers.
