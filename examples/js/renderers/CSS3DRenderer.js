/**
 * Based on http://www.emagix.net/academic/mscs-project/item/camera-sync-with-css3-and-webgl-threejs
 * @author mrdoob / http://mrdoob.com/
 * @author WestLangley / http://github.com/WestLangley

 * This is a hacked version of the CSS3DRenderer r.65 by WestLangley (circa 2014) and supports mesh faces, shading, and scene lights.
 * It is compatable with three.js r.65 only.
 */

THREE.CSS3DObject = function ( element ) {

	THREE.Object3D.call( this );

	this.element = ( element !== undefined ) ? element : document.createElement( 'div' );

	this.element.style.position = 'absolute';

	this.hash = undefined; // for performance

	this.addEventListener( 'removed', function ( event ) {

		if ( this.element.parentNode !== null ) {

			this.element.parentNode.removeChild( this.element );

			for ( var i = 0, l = this.children.length; i < l; i ++ ) {

				this.children[ i ].dispatchEvent( event );

			}

		}

	} );

};

THREE.CSS3DObject.prototype = Object.create( THREE.Object3D.prototype );


THREE.CSS3DSprite = function ( element ) {

	THREE.CSS3DObject.call( this, element );

};

THREE.CSS3DSprite.prototype = Object.create( THREE.CSS3DObject.prototype );


// CSS3D Face
// -----------------------------------------------------------------------------

// Notes on solving for the CSS3DFace transform

// Solve for M: M * [ U, zee ] = [ V, normal]
// Step 1 - invert [ U, zee ]
// S2 = SIZE / 2
// SI = 1 / S2
// 	-S2,  S2, -S2, 0,
//	-S2, -S2,  S2, 0, 
//	  0,   0,   0, 1,
//	  1,   1,   1, 1

//m1inv.set(
//	-SI, -SI,   0,  0,
//	 SI,   0, -.5, .5, 
//	  0,  SI, -.5, .5,
//	  0,   0,   1,  0
//);

// Step 2 - set [ V, normal ]

//m2.set(
//	v1.x, v2.x, v3.x, n.x,
//	v1.y, v2.y, v3.y, n.y, 
//	v1.z, v2.z, v3.z, n.z,
//	   1,    1,    1,   1
//);

THREE.CSS3DSize = 64; // bigger has less-visible seams, and has little performance effect...

THREE.CSS3DFace = function ( face, geometry, material ) {

	THREE.CSS3DObject.call( this );

	var vertices = geometry.vertices;

	this.face = face;
	this.geometry = geometry;
	this.material = material;

	this.v1 = vertices[ face.a ];
	this.v2 = vertices[ face.b ];
	this.v3 = vertices[ face.c ];
	this.normal = face.normal;

	this.shade = new THREE.Color( 0, 0, - 1 ); // for performance reasons...

	this.element.style.width = THREE.CSS3DSize + 'px';
	this.element.style.height = THREE.CSS3DSize + 'px';

	// experiment... does not work well because faces are larger than they appear...
	/*
	this.element.owner = this;
	this.element.onclick = function() { this.owner.callback( this ); };
	this.callback = function( element ) {
		console.log( this.userData );
		//this.face.color.setRGB( 0, 0, 0 );
		//console.log( element );
	};
	*/
	this.element.style.opacity = ( material.transparent === true ) ? material.opacity : 1;

	this.setColor();

	this.updateMatrix(); // required. updateMatrixWorld() must be called after face is added to the scene...

	this.matrixAutoUpdate = false; // important!

};

THREE.CSS3DFace.prototype = Object.create( THREE.CSS3DObject.prototype );

THREE.CSS3DFace.prototype.updateMatrix = function ( v1, v2, v3, n ) {

	var SIZE = THREE.CSS3DSize;

	if ( n === undefined ) {

		var v1 = this.v1;
		var v2 = this.v2;
		var v3 = this.v3;
		var n = this.normal;

	}

	this.matrix.set(

		( v2.x - v1.x ) / SIZE, ( v3.x - v1.x ) / SIZE,  - ( v2.x + v3.x ) / 2 + n.x, ( v2.x + v3.x ) / 2,
		( v2.y - v1.y ) / SIZE, ( v3.y - v1.y ) / SIZE,  - ( v2.y + v3.y ) / 2 + n.y, ( v2.y + v3.y ) / 2,
		( v2.z - v1.z ) / SIZE, ( v3.z - v1.z ) / SIZE,  - ( v2.z + v3.z ) / 2 + n.z, ( v2.z + v3.z ) / 2,
		                     0,                      0,                            0,                   1

	);

	this.matrixWorldNeedsUpdate = true;

};

THREE.CSS3DFace.prototype.updateMatrixWorld = function ( force ) {

		if ( this.matrixWorldNeedsUpdate === true || force === true ) { // I really don't want this force option... but it appears to be needed

		this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );

		this.matrixWorldNeedsUpdate = false;

	}

};

THREE.CSS3DFace.prototype.setColor = function () { // why is this so time-consuming? it's the use of a gradient...

	var c1 = new THREE.Color();
	var s1 = "linear-gradient( 45deg, ";
	var s2 = " 50%, transparent 0 )";

	return function setColor( color ) {

		if ( this.material.color === undefined ) {

			c1.setRGB( 1, 1, 1 );

		} else {

			c1.copy( this.material.color );

		}

		if ( this.material.vertexColors === THREE.FaceColors ) {

			c1.multiply( this.face.color );

		}

		if ( color !== undefined ) c1.multiply( color );

		if ( this.material.emissive !== undefined ) {

			c1.add( this.material.emissive );

		}

		if ( ! this.shade.equals( c1 ) ) {

			if ( this.material.wireframe === true ) {

				this.element.style.background = "transparent";
				this.element.style.borderStyle = "hidden hidden solid solid";
				this.element.style.borderColor = c1.getStyle();

			} else {

				//this.element.style.background = vendorPrefix + "linear-gradient( 45deg, " + c1.getStyle() + " 50%, transparent 0 )";

				var style = s1 + c1.getStyle() + s2;

				this.element.style.background = "-webkit-" + style;
				this.element.style.background = "-moz-" + style;
				this.element.style.background = "-o-" + style;
				this.element.style.background = style;

			}

			this.shade.copy( c1 );

		}

	}

}();

THREE.CSS3DFace.prototype.updateMorphs = function () {

	var vA = new THREE.Vector3();
	var vB = new THREE.Vector3();
	var vC = new THREE.Vector3();
	var v = new THREE.Vector3();

	return function updateMorphs( normal, centroid ) {

		var morphTargets = this.geometry.morphTargets;
		var morphInfluences = this.parent.morphTargetInfluences;

		var face = this.face;
		var v1 = this.v1;
		var v2 = this.v2;
		var v3 = this.v3;

		vA.set( 0, 0, 0 );
		vB.set( 0, 0, 0 );
		vC.set( 0, 0, 0 );

		for ( var t = 0, tl = morphTargets.length; t < tl; t ++ ) {

			var influence = morphInfluences[ t ];

			if ( influence === 0 ) continue;

			var targets = morphTargets[ t ].vertices;

			vA.x += ( targets[ face.a ].x - v1.x ) * influence;
			vA.y += ( targets[ face.a ].y - v1.y ) * influence;
			vA.z += ( targets[ face.a ].z - v1.z ) * influence;

			vB.x += ( targets[ face.b ].x - v2.x ) * influence;
			vB.y += ( targets[ face.b ].y - v2.y ) * influence;
			vB.z += ( targets[ face.b ].z - v2.z ) * influence;

			vC.x += ( targets[ face.c ].x - v3.x ) * influence;
			vC.y += ( targets[ face.c ].y - v3.y ) * influence;
			vC.z += ( targets[ face.c ].z - v3.z ) * influence;

		}

		vA.add( v1 );
		vB.add( v2 );
		vC.add( v3 );

		centroid.copy( vA ).add( vB ).add( vC ).divideScalar( 3 );

		// rather than using morph normals, just recalculate a new face normal for now...

		normal.subVectors( vC, vB ).cross( v.subVectors( vA, vB ) ).normalize();

		this.updateMatrix( vA, vB, vC, normal );

		this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix ); // required

	}

}();

//

THREE.CSS3DRenderer = function () {

	console.log( 'THREE.CSS3DRenderer', THREE.REVISION );

	var _this = this;

	var _width, _height;
	var _widthHalf, _heightHalf;

	var _matrix = new THREE.Matrix4();
	var _normalMatrix = new THREE.Matrix3();

	var _normal = new THREE.Vector3();
	var _centroid = new THREE.Vector3();
	var _vector = new THREE.Vector3();

	var _lights;

	var _color = new THREE.Color();
	var _lightColor = new THREE.Color();
	var _ambientLight = new THREE.Color();

	var domElement = document.createElement( 'div' );
	domElement.style.overflow = 'hidden';

	domElement.style.WebkitTransformStyle = 'preserve-3d';
	domElement.style.MozTransformStyle = 'preserve-3d';
	domElement.style.oTransformStyle = 'preserve-3d';
	domElement.style.transformStyle = 'preserve-3d';

	this.domElement = domElement;

	var cameraElement = document.createElement( 'div' );

	cameraElement.style.WebkitTransformStyle = 'preserve-3d';
	cameraElement.style.MozTransformStyle = 'preserve-3d';
	cameraElement.style.oTransformStyle = 'preserve-3d';
	cameraElement.style.transformStyle = 'preserve-3d';

	domElement.appendChild( cameraElement );

	this.info = { render: { elements: 0, visible: 0 } };

	this.setClearColor = function () {

	};

	this.setSize = function ( width, height ) {

		_width = width;
		_height = height;

		_widthHalf = _width / 2;
		_heightHalf = _height / 2;

		domElement.style.width = width + 'px';
		domElement.style.height = height + 'px';

		cameraElement.style.width = width + 'px';
		cameraElement.style.height = height + 'px';

	};

	function css3DInit( mesh ) {

		mesh.__css3dInit = true;

		var faces = mesh.geometry.faces;

		for ( var i = 0, il = faces.length; i < il; i ++ ) {

			var face = new THREE.CSS3DFace( faces[ i ], mesh.geometry, mesh.material );

			face.userData.index = i;

			mesh.add( face );

			face.updateMatrixWorld( true ); // required after adding to scene

		}

	}

	function calculateLights() {

		_lights = scene.__lights;

		_ambientLight.setRGB( 0, 0, 0 );

		for ( var l = 0, ll = _lights.length; l < ll; l ++ ) {

			var light = _lights[ l ];
			var lightColor = light.color;

			if ( light instanceof THREE.AmbientLight ) {

				_ambientLight.add( lightColor );

			}

		}

	}

	function calculateLight( position, normal, color ) {

		for ( var l = 0, ll = _lights.length; l < ll; l ++ ) {

			var light = _lights[ l ];

			_lightColor.copy( light.color );

			if ( light instanceof THREE.DirectionalLight ) {

				var lightPosition = _vector.setFromMatrixPosition( light.matrixWorld ).normalize();

				var amount = normal.dot( lightPosition );

				if ( amount <= 0 ) continue;

				amount *= light.intensity;

				color.add( _lightColor.multiplyScalar( amount ) );

			} else if ( light instanceof THREE.PointLight ) {

				var lightPosition = _vector.setFromMatrixPosition( light.matrixWorld );

				var amount = normal.dot( _vector.subVectors( lightPosition, position ).normalize() );

				if ( amount <= 0 ) continue;

				amount *= light.distance == 0 ? 1 : 1 - Math.min( position.distanceTo( lightPosition ) / light.distance, 1 );

				if ( amount == 0 ) continue;

				amount *= light.intensity;

				color.add( _lightColor.multiplyScalar( amount ) );

			}

		}

	}

	var epsilon = function ( value ) {

		return Math.abs( value ) < 0.000001 ? 0 : value;

	};

	var getCameraCSSMatrix = function ( matrix ) {

		var elements = matrix.elements;

		return 'matrix3d(' +
			epsilon( elements[ 0 ] ) + ',' +
			epsilon( - elements[ 1 ] ) + ',' +
			epsilon( elements[ 2 ] ) + ',' +
			epsilon( elements[ 3 ] ) + ',' +
			epsilon( elements[ 4 ] ) + ',' +
			epsilon( - elements[ 5 ] ) + ',' +
			epsilon( elements[ 6 ] ) + ',' +
			epsilon( elements[ 7 ] ) + ',' +
			epsilon( elements[ 8 ] ) + ',' +
			epsilon( - elements[ 9 ] ) + ',' +
			epsilon( elements[ 10 ] ) + ',' +
			epsilon( elements[ 11 ] ) + ',' +
			epsilon( elements[ 12 ] ) + ',' +
			epsilon( - elements[ 13 ] ) + ',' +
			epsilon( elements[ 14 ] ) + ',' +
			epsilon( elements[ 15 ] ) +
		')';

	};

	var getObjectCSSMatrix = function ( matrix ) {

		var elements = matrix.elements;

		return 'translate3d(-50%,-50%,0) matrix3d(' +
			epsilon( elements[ 0 ] ) + ',' +
			epsilon( elements[ 1 ] ) + ',' +
			epsilon( elements[ 2 ] ) + ',' +
			epsilon( elements[ 3 ] ) + ',' +
			epsilon( - elements[ 4 ] ) + ',' +
			epsilon( - elements[ 5 ] ) + ',' +
			epsilon( - elements[ 6 ] ) + ',' +
			epsilon( - elements[ 7 ] ) + ',' +
			epsilon( elements[ 8 ] ) + ',' +
			epsilon( elements[ 9 ] ) + ',' +
			epsilon( elements[ 10 ] ) + ',' +
			epsilon( elements[ 11 ] ) + ',' +
			epsilon( elements[ 12 ] ) + ',' +
			epsilon( elements[ 13 ] ) + ',' +
			epsilon( elements[ 14 ] ) + ',' +
			epsilon( elements[ 15 ] ) +
		')';

	};

	var hashArray = function ( array ) {

		var hash = 0;

		for ( var i = 0, il = array.length; i < il; i ++ ) {

			hash += 3 * hash + Math.abs( array[ i ] ); // can we do better?...

		}

		return hash;

	};

	var renderObject = function ( object, camera ) {

		if ( object instanceof THREE.Mesh ) {

			if ( object.__css3dInit === undefined ) {

				css3DInit( object );

			}

			if ( object.material.needsUpdate === true ) {

				object.traverse( function( node ) {

					if ( node instanceof THREE.CSS3DObject ) {

						node.material = object.material;

						node.visible = true;

						node.element.style.opacity = ( object.material.transparent === true ) ? object.material.opacity : 1;
						node.element.style.visibility = "visible";
						node.element.style.borderStyle = "none";

					}

				} );

				object.material.needsUpdate = false; // oops. this does not work when objects share a material...

			}

		}

		if ( object instanceof THREE.CSS3DObject ) {

			var style;

			if ( object instanceof THREE.CSS3DSprite ) {

				// http://swiftcoder.wordpress.com/2008/11/25/constructing-a-billboard-matrix/

				//_matrix.copy( camera.matrixWorldInverse );
				//_matrix.transpose();
				//_matrix.copy( camera.matrixWorld );
				//_matrix.copyPosition( object.matrixWorld );
				//_matrix.scale( object.scale );

				//_matrix.elements[ 3 ] = 0;
				//_matrix.elements[ 7 ] = 0;
				//_matrix.elements[ 11 ] = 0;
				//_matrix.elements[ 15 ] = 1;

				// consider setting sprite.quaternion = camera.quaternion, instead.

				_matrix.copy( camera.matrixWorld );
				_matrix.copyPosition( object.matrixWorld );
				_matrix.scale( object.scale );

				style = getObjectCSSMatrix( _matrix );

			} else if ( object instanceof THREE.CSS3DFace ) {

				if ( object.parent.material.morphTargets === true ) {

					object.updateMorphs( _normal, _centroid );

				}  else {

					_normal.copy( object.face.normal );
					_centroid.copy( object.face.centroid );

				}

				_centroid.applyMatrix4( object.parent.matrixWorld ); // this is tricky... must use parent's world matrix

				_normalMatrix.getNormalMatrix( object.parent.matrixWorld ); // this, too.

				_normal.applyMatrix3( _normalMatrix ).normalize();

				//

				var material = object.material;

				if ( material && material.side !== THREE.DoubleSide ) { // improve frame rate by hiding divs

						_vector.subVectors( camera.position, _centroid ).normalize(); // should use camera world cordinates

						var flip = material.side === THREE.FrontSide ? 1 : - 1;

						if ( _normal.dot( _vector ) * flip > 0 ) {

							if ( object.visible === false ) {

								object.element.style.visibility = "visible";
								object.visible = true;

							}

						} else {

							if ( object.visible === true ) {

								object.element.style.visibility = "hidden";
								object.visible = false;

							}

					}

				}

				//

				if ( ( material instanceof THREE.MeshLambertMaterial || material instanceof THREE.MeshPhongMaterial ) ) {

					_color.copy( _ambientLight );

					calculateLight( _centroid, _normal, _color );

					object.setColor( _color );

				} else if ( material instanceof THREE.MeshNormalMaterial ) {

					_color.setRGB( _normal.x, _normal.y, _normal.z ).multiplyScalar( 0.5 ).addScalar( 0.5 );

					object.setColor( _color );

				} else if ( material instanceof THREE.MeshBasicMaterial ) {

					object.setColor();

				}

				//

				var hash = hashArray( object.matrixWorld.elements ); // it is less expensive to compute the hash

				if ( object.hash !== hash ) {

					style = getObjectCSSMatrix( object.matrixWorld ); // this is an expensive function call. trying to avoid it.

					object.hash = hash;

				}

			} else {

				style = getObjectCSSMatrix( object.matrixWorld );

			}

			var element = object.element;

			if ( style !== undefined ) {

				element.style.WebkitTransform = style;
				element.style.MozTransform = style;
				element.style.oTransform = style;
				element.style.transform = style;

			}

			_this.info.render.elements ++;
			if ( object.visible === true ) _this.info.render.visible ++;

			if ( element.parentNode !== cameraElement ) {

				cameraElement.appendChild( element ); // could this be done elsewhere?

			}

		}

		for ( var i = 0, l = object.children.length; i < l; i ++ ) {

			renderObject( object.children[ i ], camera );

		}

	};

	this.render = function ( scene, camera ) {

		var distance = 0.5 / Math.tan( THREE.Math.degToRad( camera.fov * 0.5 ) ) * _height;

		domElement.style.WebkitPerspective = distance + "px";
		domElement.style.MozPerspective = distance + "px";
		domElement.style.oPerspective = distance + "px";
		domElement.style.perspective = distance + "px";

		scene.updateMatrixWorld();

		if ( camera.parent === undefined ) camera.updateMatrixWorld();

		camera.matrixWorldInverse.getInverse( camera.matrixWorld );

		var style = "translate3d(0,0," + distance + "px)" + getCameraCSSMatrix( camera.matrixWorldInverse ) +
			" translate3d(" + _widthHalf + "px," + _heightHalf + "px, 0)";

		cameraElement.style.WebkitTransform = style;
		cameraElement.style.MozTransform = style;
		cameraElement.style.oTransform = style;
		cameraElement.style.transform = style;

		calculateLights();

		this.info.render.elements = 0;
		this.info.render.visible = 0;

		renderObject( scene, camera );

	};

};
