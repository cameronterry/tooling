module.exports = ( { env } ) => ( {
	plugins: {
		'postcss-import': {},
		'postcss-mixins': {},
		'postcss-preset-env': {
		browsers: 'last 2 versions',
			features: {
				'nesting-rules': true,
			},
		}
	},
} );
