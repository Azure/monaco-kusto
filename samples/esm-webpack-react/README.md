# Webpack/React Monaco Kusto ESM Example

Based on output of [webpack init](https://webpack.js.org/api/cli/#init)

## Running

Run the below commands

1. Install Node.js 20 https://nodejs.org/
2. Run `corepack enable` to make the `yarn` package manager available (https://yarnpkg.com/getting-started/install)
3. In any folder: `yarn install`
4. In /package: `yarn build`
5. In this folder: `yarn serve`

## Notable changes to Webpack config

-   Set ./webpack.config resolve.fs to `false` to suppress webpack warning about
    `fs` import in @kusto/language-server code
-   Suppress "the request of a dependency is an expression" warning emitted from
    @kusto/language-service/bridge
