# Monaco Kusto Parcel example

See [../../README.md] for general esm setup instructions

## Parcel specific quirks

-   monaco-editor versions 0.34._ and 0.35._ throw after being bundled by Parcel. This repo contains a patch for 0.35.\* to fix this
-   MonacoEnvironment global is declared in index.html instead of index.ts because it would get parsed after monaco-kusto when it was included in index.ts. MonacoEnvironment must be declared before it's parsed.
-
