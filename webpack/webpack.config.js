const { rspack } = require('@rspack/core');
const { sync: glob } = require( 'fast-glob' );
const { readFileSync } = require( 'fs' );
const {
	dirname,
	extname,
	join,
	resolve
} = require( 'path' );
const RemoveEmptyScriptsPlugin = require( 'webpack-remove-empty-scripts' );

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

/**
 * Include the various Babel presets, if available, to be used.
 */
const babelPresets = [];
const babelPresetModules = [
	'@babel/preset-react',
	'@wordpress/babel-preset-default',
];
for ( const presetModule of babelPresetModules ) {
	try {
		const presetConfig = require.resolve( presetModule );
		babelPresets.push( presetConfig );
	} catch {
		// Just skip.
	}
}

const blockDirectory = resolve( process.cwd(), 'includes/blocks/' );

let globalStyles = [];
if ( packageJson?.globalStyles ) {
	packageJson.globalStyles.forEach( ( globalStyle ) => {
		const globalStylesDir = resolve( process.cwd(), globalStyle );
		const globalStylesDirFiles = glob( `${globalStylesDir}/**/*.css` );
		globalStyles = [
			...globalStyles,
			...globalStylesDirFiles,
		];
	} );
}

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
		new rspack.CopyRspackPlugin( {
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
		new rspack.CssExtractRspackPlugin( {
			filename: '[name].css',
			chunkFilename: '[id].css',
		} )
	],
	module: {
		rules: [
			{
				test: /\.svg$/,
				use: ['@svgr/webpack', 'url-loader'],
			},
			{
				test: /\.(js)$/,
				exclude: /node_modules/,
				use: [
					{
						loader: require.resolve( 'babel-loader' ),
						options: {
							presets: babelPresets,
						},
					}
				]
			},
			{
				test: /\.(css)$/,
				use: [
					rspack.CssExtractRspackPlugin.loader,
					{
						loader: require.resolve( 'css-loader' ),
						options: {
							importLoaders: 1,
							url: false,
						}
					},
					{
						loader: require.resolve( 'postcss-loader' ),
						options: {
							postcssOptions: {
								plugins: {
									'postcss-import': {},
									'@csstools/postcss-global-data': {
										files: globalStyles,
									},
									'postcss-mixins': {},
									'postcss-preset-env': {
										browsers: 'last 2 versions',
										features: {
											'nesting-rules': true,
										},
									}
								},
							}
						},
					},
				]
			}
		]
	},
	optimization: {
		minimize: true,
		minimizer: [
			new rspack.LightningCssMinimizerRspackPlugin(),
			new rspack.SwcJsMinimizerRspackPlugin(),
		]
	},
}
