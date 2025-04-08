const CopyWebpackPlugin = require('copy-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { sync: glob } = require( 'fast-glob' );
const { readFileSync } = require('fs');
const MiniCssExtractPlugin = require( 'mini-css-extract-plugin' );
const {
	dirname,
	extname,
	join,
	resolve
} = require( 'path' );
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');

let DependencyExtractionWebpackPlugin;
try {
	DependencyExtractionWebpackPlugin = require( '@wordpress/dependency-extraction-webpack-plugin' );
} catch (err) {
	DependencyExtractionWebpackPlugin = null;
}

const packageJson = require( resolve( process.cwd(), 'package.json' ) );
if ( ! packageJson.buildEntryPoints ) {
	console.error( 'Please specify build entry points.' );
	process.exit();
}

const blockDirectory = resolve( process.cwd(), 'includes/blocks/' );

const isProduction = process.env.NODE_ENV === 'production';
const mode = isProduction ? 'production' : 'development';

module.exports = {
	mode,
	entry: () => {
		const entryPoints = {};

		for ( const [ key, value ] of Object.entries( packageJson.buildEntryPoints ) ) {
			if ( 'wp-blocks' === key && null !== DependencyExtractionWebpackPlugin ) {
				/**
				 * Get the `block.json` definition files.
				 */
				const blockMetaFiles = glob(
					`${blockDirectory}/**/block.json`,
					{
						absolute: true,
					}
				);

				const additionalEntries = blockMetaFiles.reduce( ( acc, blockMetaFile) => {
					const {
						editorScript,
						script,
						viewScript,
						style,
						editorStyle,
						viewStyle,
					} = JSON.parse( readFileSync( blockMetaFile ) );

					const blockAssets = [];

					/**
					 * Retrieve the key/values which can reference the assets for the build.
					 */
					blockAssets.push(
						...[ editorScript, script, viewScript, style, editorStyle, viewStyle ].filter(
							Boolean,
						)
					);

					blockAssets
						.filter(
							/**
							 * Make sure to only grab properties with a `file:` value.
							 */
							( filePath ) => filePath && filePath.startsWith( 'file:' )
						)
						.forEach(
							( filePath ) => {
								/**
								 * Remove the
								 */
								const entryFilePath = join(
									dirname( blockMetaFile ),
									filePath.replace( 'file:', '' )
								);

								const entryName = 'blocks' + entryFilePath
									.replace( extname( filePath ), '' )
									.replace( blockDirectory, '' );

								acc[ entryName ] = entryFilePath;
							}
						);

					return acc;
				}, {} );

				Object.assign( entryPoints, additionalEntries );
			} else if ( 'wp-blocks' !== key ) {
				/**
				 * Other entry points are considered to be straightforward name/file path, and therefore, can be fed
				 * directory into the entry points as-is.
				 */
				entryPoints[ key ] = resolve( process.cwd(), value );
			}
		}

		return entryPoints;
	},
	output: {
		clean: true,
		filename: '[name].js',
		path: resolve( process.cwd(), 'dist' )
	},
	plugins: [
		new RemoveEmptyScriptsPlugin(),
		DependencyExtractionWebpackPlugin ? new DependencyExtractionWebpackPlugin() : null,
		new CopyWebpackPlugin( {
			patterns: [
				/**
				 * Move the `block.json` files to the `dist/` folder, which will be handled by PHP for enqueuing WP block assets.
				 */
				{
					from: join( blockDirectory, '**/block.json' ),
					context: blockDirectory,
					noErrorOnMissing: true,
					to: 'blocks/[path][name][ext]',
				},
				/**
				 * Move other static assets, such as images and fonts.
				 */
				{
					from: '**/*.{jpg,jpeg,png,gif,svg,ttf,woff,woff2,otf}',
					context: 'assets/',
					noErrorOnMissing: true,
					to: '[path][name][ext]',
				}
			],
		} ),
		/**
		 * Extract CSS to a separate file.
		 */
		new MiniCssExtractPlugin( {
			filename: '[name].css',
			chunkFilename: '[id].css',
		} )
	],
	module: {
		rules: [
			{
				test: /\.(js)$/,
				exclude: /node_modules/,
				use: [
					{
						loader: require.resolve( 'babel-loader' ),
						options: {
							presets: [
								require.resolve( '@babel/preset-react' ),
								require.resolve( '@wordpress/babel-preset-default' ),
							],
						},
					}
				]
			},
			{
				test: /\.(css)$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: require.resolve( 'css-loader' ),
						options: {
							importLoaders: 1,
						}
					},
					require.resolve( 'postcss-loader' ),
				]
			}
		]
	},
	optimization: {
		minimize: true,
		minimizer: [
			new CssMinimizerPlugin(),
		]
	},
}
