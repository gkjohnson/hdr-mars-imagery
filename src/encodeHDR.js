import { compress, encode, findTextureMinMax } from '@monogrid/gainmap-js/dist/encode.js';
import { encodeJPEGMetadata } from './libs/libultrahdr.js';

export async function encodeHDR( image ) {

	// find RAW RGB Max value of a texture
	const textureMax = await findTextureMinMax( image );

	// Encode the gainmap
	const encodingResult = encode( {
		image,
		// this will encode the full HDR range
		maxContentBoost: Math.max.apply( this, textureMax ) || 1
	} );

	// obtain the RAW RGBA SDR buffer and create an ImageData
	const sdrImageData = new ImageData(
		encodingResult.sdr.toArray(),
		encodingResult.sdr.width,
		encodingResult.sdr.height
	);
	// obtain the RAW RGBA Gain map buffer and create an ImageData
	const gainMapImageData = new ImageData(
		encodingResult.gainMap.toArray(),
		encodingResult.gainMap.width,
		encodingResult.gainMap.height
	);

	// parallel compress the RAW buffers into the specified mimeType
	const mimeType = 'image/jpeg';
	const quality = 0.9;

	const [ sdr, gainMap ] = await Promise.all( [
		compress( {
			source: sdrImageData,
			mimeType,
			quality,
			flipY: true // output needs to be flipped
		} ),
		compress( {
			source: gainMapImageData,
			mimeType,
			quality,
			flipY: true // output needs to be flipped
		} )
	] );

	// obtain the metadata which will be embedded into
	// and XMP tag inside the final JPEG file
	const metadata = encodingResult.getMetadata();

	// embed the compressed images + metadata into a single
	// JPEG file
	const jpegBuffer = await encodeJPEGMetadata( {
		...encodingResult,
		...metadata,
		sdr,
		gainMap
	} );

	return jpegBuffer;

}
