// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const isProduction = process.env.NODE_ENV == 'production';

const stylesHandler = 'style-loader';

const config = {
    entry: { main: './src/index.tsx' },
    output: {
        path: path.resolve(__dirname, 'dist'),
        globalObject: 'self',
        publicPath: 'http://localhost:8080/',
        filename: '[name]-[hash].js',
    },
    devServer: {
        open: true,
        host: 'localhost',
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html',
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    context: path.join(require.resolve('monaco-editor/package.json'), '../min/vs/'),
                    from: '**/*',
                    to: '../dist/vs/',
                    globOptions: {
                        ignore: ['**/*.map', '**/basic-languages/**/*', '**/language/**/*'],
                    },
                },
                {
                    context: path.join(require.resolve('@kusto/monaco-kusto/package.json'), '../release/min'),
                    from: '**/*',
                    to: '../dist/vs/language/kusto/',
                },
            ],
        }),
    ],
    module: {
        rules: [
            {
                test: /\.(js|jsx|ts|tsx)$/i,
                loader: 'babel-loader',
            },
            {
                test: /\.css$/i,
                use: [stylesHandler, 'css-loader'],
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                type: 'asset',
            },

            // Add your rules for custom modules here
            // Learn more about loaders from https://webpack.js.org/loaders/
        ],
    },
};

module.exports = () => {
    if (isProduction) {
        config.mode = 'production';
    } else {
        config.mode = 'development';
    }

    return config;
};
