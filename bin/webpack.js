#!/usr/bin/env node

/**
 * External dependencies
 */
const webpack = require( '@rspack' );

const config = require( '../webpack/webpack.config' );

const compiler = webpack( config );

compiler.run( ( error, stats ) => {
	process.stdout.write(`${ stats.toString( { colors: true } ) }\n` );

	if ( error || stats.hasErrors() ) {
		process.exit( 1 );
	}
} );
