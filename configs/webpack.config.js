const {
    createConfig,
    match,
    env,
    defineConstants,
    entryPoint,
    setOutput,
    sourceMaps,
    addPlugins,
    customConfig,
    resolve,
    setMode
} = require('@webpack-blocks/webpack');
const { css, file, url } = require('@webpack-blocks/assets');
const devServer = require('@webpack-blocks/dev-server');
const extractText = require('@webpack-blocks/extract-text');
const postcss = require('@webpack-blocks/postcss');
const uglify = require('@webpack-blocks/uglify');

const webpackMerge = require('webpack-merge').merge;
const autoprefixer = require('autoprefixer');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackHarddiskPlugin = require('html-webpack-harddisk-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const path = require('path');

const appPath = (...names) => path.join(process.cwd(), ...names);
const userConfig = require(appPath('webpack.config.js'));
const packageJson = require(appPath('package.json'));

const PORT = process.env.PORT || 8080;

module.exports = webpackMerge(
    createConfig([
        setMode(
            process.env.NODE_ENV === 'production' ? 'production' : 'development'
        ),
        customConfig({
            module: {
                rules: [
                    {
                        test: /\.tsx?$/,
                        loader: 'ts-loader',
                        options: { allowTsInNodeModules: true }
                    }
                ]
            }
        }),
        resolve({ extensions: ['.ts', '.tsx', '.js', '.jsx'] }),
        match(
            ['*.css'],
            [
                css(),
                postcss({
                    postcssOptions: {
                        plugins: [autoprefixer()]
                    }
                }),

                env('production', [extractText('[name].[hash].css')])
            ]
        ),
        match(['*.eot', '*.ttf', '*.woff', '*.woff2'], [file()]),
        match(
            ['*.gif', '*.jpg', '*.jpeg', '*.png', '*.svg', '*.webp'],
            [url({ limit: 10000 })]
        ),
        defineConstants({
            'process.env.NODE_ENV': process.env.NODE_ENV
        }),
        addPlugins([
            new HtmlWebpackPlugin({
                template: './index.ejs',
                alwaysWriteToDisk: true,
                inject: true,
                favicon: 'public/favicon.png',
                hash: true
            }),
            new HtmlWebpackHarddiskPlugin({
                outputPath: appPath('public')
            }),
            new webpack.ProvidePlugin({
                Snabbdom: 'snabbdom-pragma'
            })
        ]),
        env('development', [
            devServer({
                port: PORT,
                contentBase: appPath('public')
            }),

            customConfig({
                devtool: 'eval-cheap-module-source-map',
                optimization: { moduleIds: 'named' }
            })
        ]),
        env('production', [
            uglify({
                parallel: true,
                cache: true,
                uglifyOptions: {
                    compress: {
                        warnings: false
                    }
                }
            }),
            addPlugins([
                new CopyWebpackPlugin({
                    patterns: [{ from: 'public', to: '' }]
                })
            ]),
            customConfig({
                output: {
                    filename: 'utils.min.js',
                    path: appPath('build')
                }
            })
        ])
    ]),
    userConfig,
    createConfig([
        env('test', [
            customConfig({
                target: 'node',
                externals: [nodeExternals()],
                output: {
                    // use absolute paths in sourcemaps (important for debugging via IDE)
                    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
                    devtoolFallbackModuleFilenameTemplate:
                        '[absolute-resource-path]?[hash]'
                },
                module: {
                    rules: [
                        {
                            test: /\.(jsx?|tsx?)/,
                            include: packageJson.nyc.include.map(p =>
                                path.resolve(appPath(p))
                            ),
                            use: {
                                loader: 'istanbul-instrumenter-loader-fix',
                                options: {
                                    esModules: true,
                                    fixWebpackSourcePaths: true
                                }
                            },
                            enforce: 'post'
                        }
                    ]
                }
            }),
            sourceMaps('inline-cheap-module-source-map')
        ])
    ])
);
