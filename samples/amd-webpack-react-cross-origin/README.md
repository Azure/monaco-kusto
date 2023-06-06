# Webpack/React Monaco Kusto AMD Example (CDN)

This example demonstrates how to serve the Monaco Kusto package from a CDN (or a host that does not match the origin).

To run and demonstrate this succeeds cross origin follow the below steps:

1. Run `yarn`
2. Run `yarn build`
3. Run `yarn server`. This serves index.html on port 3000 and everything else on port 8080
4. Browse to `localhost:3000`. You will see there is auto-completion and if you open the developer tools you will see a log demonstrating that the `MonacoEnvironment` property is available on the worker

Key difference:

In `index.html` we must now set the origin URL for the loader as the CDN URL. In addition an additional script is required to update the loader config with the following:

```javascript
require.config({ paths: { vs: 'http://localhost:8080/vs' } });
```

This ensures that the loader will load scripts from the CDN origin rather than the site origin.
