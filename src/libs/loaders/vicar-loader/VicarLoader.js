import { VicarLoaderBase } from './VicarLoaderBase.js';
import { DataTexture, RGBAFormat, DefaultLoadingManager, LinearFilter, LinearMipMapLinearFilter, LinearSRGBColorSpace, FloatType } from 'three';

/**
 * @typedef {Object} VicarTextureResult
 * @extends VicarTextureResult
 *
 * @param {DataTexture} texture
 */


/**
 * Three.js implementation of VicarLoaderBase.
 */
export class VicarLoader extends VicarLoaderBase {

	/**
	 * @param {LoadingManager} manager
	 */
	constructor( manager = DefaultLoadingManager ) {

		super();

		/**
		 * @member {LoadingManager}
		 * @default DefaultLoadingManager
		 */
		this.manager = manager;

	}

	/**
	 * Loads and parses the Vicar file and returns a DataTexture. If a DataTexture is passed into
	 * the function the data is applied to it.
	 * @param {String} url
	 * @param {DataTexture} texture
	 * @returns {Promise<VicarTextureResult>}
	 */
	load( url, texture = new DataTexture() ) {

		const manager = this.manager;
		manager.itemStart( url );
		return super.load( url ).then( result => {

			return this.parse( result, texture );

		} ).catch( err => {

			manager.itemError( url, err );
			throw err;

		} ).finally( result => {

			manager.itemEnd( url );

		} );

	}

	/**
	 * Parses the contents of the given Vicar file and returns a texture with the
	 * contents. The content of the arrays is mapped to a 255 bit color value
	 * based on the max values.
	 * @param {Uint8Array | ArrayBuffer} buffer
	 * @param {DataTexture} texture
	 * @returns {DataTexture}
	 */
	parse( buffer, texture = new DataTexture() ) {

		let result = buffer;
		if ( buffer instanceof ArrayBuffer || buffer instanceof Uint8Array ) {

			result = super.parse( buffer );

		}

		// // Assume BSQ organization
		// const ORG = result.labels.find( label => label.name === 'ORG' ).value;
		// if ( ORG !== 'BSQ' ) {

		// 	throw new Error( 'VicarLoader: File is not in BSQ order which is the only supported organization for the file at the moment.' );

		// }

		// texture.image.width = result.width;
		// texture.image.height = result.height;
		// texture.image.data = result.data;
		// texture.minFilter = LinearMipMapLinearFilter;
		// texture.magFilter = LinearFilter;
		// texture.format = RGBAFormat;
		// texture.flipY = true;
		// texture.generateMipmaps = true;
		// texture.needsUpdate = true;

		// switch ( result.labels.FORMAT ) {

		// 	case 'BYTE':
		// 		// byte
		// 		break;
		// 	case 'WORD':
		// 	case 'HALF':
		// 		// int16? half float?
		// 		break;
		// 	case 'LONG':
		// 	case 'FULL':
		// 		// int32
		// 		break;
		// 	case 'REAL':
		// 		// float32
		// 		break;
		// 	case 'DOUB':
		// 		// float64
		// 		texture.image.data = Float32Array.from( result.data );
		// 		break;
		// 	case 'COMPLEX':
		// 	case 'COMP':
		// 		result.texture = null;
		// 		return;
		// }






		// find the min and max value
		// TODO: figure this out?
		let max = - Infinity;
		const stride = result.width * result.height;
		for ( let i = 0; i < stride; i ++ ) {

			const r = result.data[ stride * 0 + i ];
			const g = result.data[ stride * 1 + i ];
			const b = result.data[ stride * 2 + i ];
			// max = Math.max( max, r, g, b );

			if ( r ) max = Math.max( max, r );
			if ( g ) max = Math.max( max, g );
			if ( b ) max = Math.max( max, b );

		}

		let maxValue = max;
		if ( ! ( result.data instanceof Float32Array ) && ! ( result.data instanceof Float64Array ) ) {

			const usefulBits = Math.ceil( Math.log( max ) / Math.LN2 );
			maxValue = 2 ** usefulBits;

		} else if ( result.data instanceof Uint8Array ) {

			maxValue = 255;

		}

		const data = new Float32Array( stride * 4 );
		for ( let i = 0; i < stride; i ++ ) {

			const r = result.data[ stride * 0 + i ] / maxValue;
			let g, b;
			if ( result.depth === 1 ) {

				g = r;
				b = r;

			} else if ( result.depth === 2 ) {

				g = result.data[ stride * 1 + i ] / maxValue;
				b = 0;

			} else {

				g = result.data[ stride * 1 + i ] / maxValue;
				b = result.data[ stride * 2 + i ] / maxValue;

			}

			data[ i * 4 + 0 ] = r * 1;
			data[ i * 4 + 1 ] = g * 1;
			data[ i * 4 + 2 ] = b * 1;
			data[ i * 4 + 3 ] = 1;

		}

		// Vicar files always have 3 dimensions
		texture.image.width = result.width;
		texture.image.height = result.height;
		texture.image.data = data;
		texture.minFilter = LinearMipMapLinearFilter;
		texture.magFilter = LinearFilter;
		texture.format = RGBAFormat;
		texture.type = FloatType;
		texture.flipY = true;
		texture.generateMipmaps = true;
		texture.colorSpace = LinearSRGBColorSpace;
		texture.needsUpdate = true;

		result.texture = texture;

		return result;

	}

}
