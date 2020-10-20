This project integrates monaco-kusto in a create-react-app application.

The following changes were made to a default create-react-app application:

1. Used script tags to import Kusto language service (this piece of code is C# code transpiled to javascript. it has several issues that prevent it from being imported as a regular import statement).

2. Added a prepare task to package.json that copies over monaco and monaco-kusto to the public folder (this is done because we're using UMD to require monaco and monaco-kusto in runtime. otherwise, we would have to eject create-react-app and play with webpack config as explained [here](https://github.com/microsoft/monaco-editor/blob/master/docs/integrate-esm.md) )

3. Added monaco-kusto.js which takes care of loading monaco (by using @monaco-editor/react package) and then loading monaco-kusto

4. Added KustoEditor.jsx which is a react component that uses monaco-kusto to initialize monaco + monaco-kusto and then creates an editor configure for the kusto language. It then pushes a static cluster schema (which it takes from schema.js).

In real production apps, at least the following changes will have to be made:

1. KustoEditor will have to contain some props to customize the initialization of monaco-editor
2. the app will use '.show schema as json' to fetch the schema from a real Kusto cluster.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here: https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment

### `yarn build` fails to minify

This section has moved here: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify
