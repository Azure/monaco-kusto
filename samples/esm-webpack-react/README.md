# Webpack/React Monaco Kusto ESM Example

Based on output of [webpack init](https://webpack.js.org/api/cli/#init)

## Running

Run the below commands

1. `yarn install`
2. `yarn serve`

## Notable changes

-   Set ./webpack.config resolve.fs to `false` to suppress webpack warning about
    `fs` import in @kusto/language-server code
-   Suppress "the request of a dependency is an expression" warning emitted from
    @kusto/language-service/bridge
