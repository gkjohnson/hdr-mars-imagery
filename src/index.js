import { RGBAFormat, LinearSRGBColorSpace, FloatType, NearestFilter, Mesh, PlaneGeometry } from 'three';
import { PDSLoader } from './libs/loaders/pds-loader/PDSLoader.js';
import { VicarLoader } from './libs/loaders/vicar-loader/VicarLoader.js';
import { WebGLRenderer, MeshBasicMaterial } from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { encodeHDR } from './encodeHDR.js';
import { GithubLfsResolver } from './libs/GithubLfsResolver.js';

const searchParams = new URL( location.href ).searchParams;
const boost = parseFloat( searchParams.get( 'boost' ) ) || 1;
const imageId = parseInt( searchParams.get( 'image' ) ) || 0;
const images = [
    '../images/FLF_0016_0668369736_116RZS_N0030578FHAZ02003_0M0195J06.IMG',
    '../images/FLF_0036_0670143894_633RZS_N0031392FHAZ00201_0A0295J03.IMG',
    '../images/FLF_0396_0702101051_786ECM_N0180000FHAZ02220_01_195J01.IMG',
    '../images/FLF_0991_0754919119_440EDR_N0470094FHAZ02418_01_295J02.IMG',
    '../images/FLF_1004_0756083744_221TDR_N0480748FHAZ02418_01_295J01.IMG',
    '../images/NLF_0014_0668187059_196RZS_N0030038NCAM00111_0A00LLJ04.IMG',
    '../images/NLF_0029_0669530684_574RZS_N0030828NCAM03029_0A0295J02.IMG',
    '../images/NLM_0033_0669876745_349RZS_N0031374SAPP00601_0A02LLJ02.IMG',
    '../images/NRF_0009_0667755959_167RZS_N0030000NCAM05000_0A30LLJ03.IMG',
    '../images/RLF_0015_0668286987_788RZS_N0030386RHAZ02000_0A0295J05.IMG',
    '../images/RRF_0029_0669530400_036RZS_N0030828RHAZ02000_0A0295J02.IMG',
    '../images/ZLF_0011_0667929820_098RZS_N0030000ZCAM00015_034085J01.IMG',
    '../images/ZLF_0036_0670134061_081RAD_N0031392ZCAM03107_1100LUJ01.IMG',
    '../images/ZR6_0036_0670134141_081RAD_N0031392ZCAM03107_1100LUJ01.IMG',
    '../images/ZRF_0002_0667131500_647RZS_N0010052ZCAM00012_0630LUJ02.IMG',
    '../images/ZRF_0004_0667303029_000RZS_N0010052AUT_04096_110085J03.IMG',
];

const resolver = new GithubLfsResolver();
resolver.targetStem = 'https://media.githubusercontent.com/media';
resolver.branch = 'main';
resolver.repo = 'hdr-mars-imagery';
resolver.org = 'gkjohnson';
if ( /github.io/g.test( location.origin ) ) {

    resolver.pagesStem = location.origin + '/hdr-mars-imagery';

} else {

    resolver.pagesStem = location.origin;

}

const IMG_URL = resolver.resolve( images[ imageId % images.length ] );
const WIDTH = 750;

( async () => {
    
    const loader = new PDSLoader();
    loader.parsers[ 'VICAR2' ] = buffer => new VicarLoader().parse( buffer );

    const result = await loader.load( IMG_URL );
    const texture = result.product.texture;
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;

    window.PDS_IMAGE = result;
    console.log( 'PDS_IMAGE =', result );

    document.body.style.touchAction = 'none';

    // add centering container
    const container = document.querySelector( '#container' );

    // add renderer
    const aspect = result.product.height / result.product.width;
    const renderer = new WebGLRenderer( { alpha: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( WIDTH, WIDTH * aspect );
    container.appendChild( renderer.domElement );

    const quad = new FullScreenQuad( new MeshBasicMaterial( { map: texture } ) );
    quad._mesh = new Mesh( new PlaneGeometry( 2, 2 ), quad._mesh.material );

    // create image container
    const imageContainer = document.createElement( 'div' );
    imageContainer.style.width = `${ WIDTH }px`;
    imageContainer.style.height = `${ aspect * WIDTH }px`;
    imageContainer.style.overflow = 'hidden';
    container.appendChild( imageContainer );

    // boost the data based on query parameter
    const data = texture.image.data.slice();
    for ( let i = 0, l = data.length; i < l; i += 4 ) {

        data[ i + 0 ] *= boost;
        data[ i + 1 ] *= boost;
        data[ i + 2 ] *= boost;

    }

    const imageInformation = {
        header: {},
        width: texture.image.width,
        height: texture.image.height,
        data: data,
        format: RGBAFormat,
        colorSpace: LinearSRGBColorSpace,
        type: FloatType,
    };

    console.log( imageInformation )

    const image = document.createElement( 'img' );
    imageContainer.appendChild( image );
    image.style.transform = 'scaleY(-1)';
    image.style.width = `${ WIDTH }px`;
    image.style.pointerEvents = 'none';
    image.style.imageRendering = 'pixelated';

    const jpegData = await encodeHDR( imageInformation );
    const blob = new Blob( [ jpegData ], { type: 'octet/stream' } );
    const url = URL.createObjectURL( blob );
    image.src = url;

    let focusX = - 1;
    let focusY = - 1;
    let scale = 2;

    imageContainer.addEventListener( 'mousemove', onMouseMove );
    imageContainer.addEventListener( 'mouseleave', onMouseLeave );
    imageContainer.addEventListener( 'wheel', onWheel );

    renderer.domElement.addEventListener( 'mousemove', onMouseMove );
    renderer.domElement.addEventListener( 'mouseleave', onMouseLeave );
    renderer.domElement.addEventListener( 'wheel', onWheel );
    
    render();

    function onWheel( e ) {


        let delta;
        switch ( e.deltaMode ) {

            case 2: // Pages
                delta = e.deltaY * 100;
                break;
            case 1: // Lines
                delta = e.deltaY * 16;
                break;
            case 0: // Pixels
                delta = e.deltaY;
                break;

        }

        // use LOG to scale the scroll delta and hopefully normalize them across platforms
        const deltaSign = Math.sign( delta );
        const normalizedDelta = Math.log( Math.abs( delta ) + 1 );
        scale -= deltaSign * normalizedDelta * 1e-2;
        render();

    }

    function onMouseLeave( e ) {

        focusX = - 1;
        focusY = - 1;
        render();

    }

    function onMouseMove( e ) {

        const rect = e.target.getBoundingClientRect();
        focusX = e.clientX - rect.left;
        focusY = e.clientY - rect.top;
        render();

    }

    function render() {

        if ( focusX === - 1 ) {

            image.style.transform = 'scale( 1, -1 )';
            quad._mesh.scale.setScalar( 1 );
            quad._mesh.position.setScalar( 0 );

        } else {

            scale = Math.max( scale, 1 );

            const height = WIDTH * aspect;
            const offsetX = - focusX + WIDTH / 2;
            const offsetY = focusY - height / 2;

            image.style.transform = `scale( ${ scale }, -${ scale } ) translate( ${ offsetX }px, ${ offsetY }px )`;

            const mesh = quad._mesh;
            mesh.scale.setScalar( scale );
            mesh.position.set(
                offsetX * 2 * scale / WIDTH,
                offsetY * 2 * scale / height,
                0,
            );

        }

        quad.render( renderer );

    }

} )();
