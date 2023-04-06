const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
    mode: 'development',
    entry: {
        app: './src/index.tsx',
    },
    devServer: {
        hot: true,
    },
    resolve: {
        extensions: ['*', '.js', '.jsx', '.tsx', '.ts'],
    },
    output: {
        globalObject: 'self',
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx|tsx|ts)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: require.resolve('babel-loader'),
                        options: {
                            presets: ['@babel/preset-env', '@babel/preset-typescript', '@babel/preset-react'],
                            plugins: [isDevelopment && require.resolve('react-refresh/babel')].filter(Boolean),
                        },
                    },
                ],
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.ttf$/,
                use: ['file-loader'],
            },
        ],
    },
    plugins: [
        new HtmlWebPackPlugin({
            template: 'src/index.html',
        }),
        isDevelopment && new ReactRefreshWebpackPlugin(),
    ].filter(Boolean),
};
