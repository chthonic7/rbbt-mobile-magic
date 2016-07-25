require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var GeodeticCoord = require('./geodetic.js');

module.exports = CartesianCoord;

function CartesianCoord(options){
	this.x = options.x;
	this.y = options.y;
	this.z = options.z; 
}

CartesianCoord.prototype.toGeodetic = function(ellipsoid){
	var modified_b = this.z < 0 ? -ellipsoid.b : ellipsoid.b;
	var x = this.x; 
	var y = this.y;
	var z = this.z;
	var r = Math.sqr(x*x + y*y);
	var e = (modified_b*z - (ellipsoid.a*ellipsoid.a - modified_b*modified_b)) / (ellipsoid.a*r);
	var f = (modified_b*z + (ellipsoid.a*ellipsoid.a - modified_b*modified_b)) / (ellipsoid.a*r);
	var p = (4/3) * (e*f+1);
	var q = 2 * (e*e + f*f);
	var d = p*p*p + q*q;
	var v; 
	if(d > 0) {
		v = Math.pow(Math.sqrt(d) - q, 1/3) - Math.pow(Math.sqrt(d) + q, 1/3);		
	} else {
		v = 2 * Math.sqrt(-p) * Math.cos(Math.acos(q / (p * Math.sqrt(-p)) ) / 3);
	}
	if(v*v < Math.abs(p)) {
		v = -(v*v*v + 2*q) / 3*p;
	}
	var g = (Math.sqrt(e*e + v) + e) / 2;
	var t = Math.sqrt(g*g + (f - v*g)/(2*g - e)) - g;
	var rlat = Math.atan( (ellipsoid.a*(1 - t*t)) / (2*modified_b*t) );
	var zlong = Math.atan2(y, x);
	if(zlong < 0) zlong += 2*Math.PI;
	var height_above_ellipsoid = (r - ellipsoid.a*t) * Math.cos(rlat) + (z - modified_b) * Math.sin(rlat);
	var lambda = zlong * Math.PI/180;
	if(lambda > 180) lambda -= 360;

	return new GeodeticCoord({
		lambda: lambda,
		phi: rlat * Math.PI/180,
		height_above_ellipsoid: height_above_ellipsoid,
		ellipsoid: ellipsoid
	});
};
},{"./geodetic.js":2}],2:[function(require,module,exports){
var SphericalCoord = require('./spherical.js');
var Ellipsoid = require('../ellipsoid.js');

module.exports = GeodeticCoord;

function GeodeticCoord(options){
	this.options = options;
	this.lambda = options.lambda || options.lon; // longitude
	this.phi = options.phi || options.lat; // geodetic latitude
	this.height_above_ellipsoid = options.height_above_ellipsoid || 0;
	this.ellipsoid = options.ellipsoid || new Ellipsoid();
}

GeodeticCoord.prototype.toSpherical = function() {
	var ellipsoid = this.ellipsoid;
	var coslat = Math.cos(this.phi*Math.PI/180);
	var sinlat = Math.sin(this.phi*Math.PI/180);
	var rc = ellipsoid.a / Math.sqrt(1 - ellipsoid.epssq * sinlat * sinlat);
	var xp = (rc + this.height_above_ellipsoid) * coslat;
	var zp = (rc * (1 - ellipsoid.epssq) + this.height_above_ellipsoid) * sinlat;
	var r = Math.sqrt(xp*xp + zp*zp);
	return new SphericalCoord({
		r: r,
		phig: 180/Math.PI*Math.asin(zp / r),
		lambda: this.lambda
	});
};

GeodeticCoord.prototype.clone = function(){
	return new GeodeticCoord(this.options);
};
},{"../ellipsoid.js":4,"./spherical.js":3}],3:[function(require,module,exports){
var CartesianCoord = require('./cartesian.js');
var LegendreFunction = require('../legendre.js');

module.exports = SphericalCoord;

function SphericalCoord(options){
	this.lambda = options.lambda; // longitude
	this.phig = options.phig; // geocentric latitude
	this.r = options.r; // distance from center of ellipsoid
}

SphericalCoord.prototype.toCartesian = function(){
	var radphi = this.phig * Math.PI/180;
	var radlambda = this.lambda * Math.PI/180;
	return new CartesianCoord({
		x: this.r * cos(radphi) * cos(radlambda),
		y: this.r * cos(radphi) * sin(radlambda),
		z: this.r * sin(radphi)
	});
};

SphericalCoord.prototype.toGeodetic = function(ellipsoid){
	return this.toCartesian().toGeodetic(ellipsoid);
};

SphericalCoord.prototype.getHarmonicVariables = function(ellipsoid, n_max){
	var m, n;
	var cos_lambda = Math.cos(Math.PI/180 * this.lambda);
	var sin_lambda = Math.sin(Math.PI/180 * this.lambda);

	var cos_mlambda = [1.0, cos_lambda];
	var sin_mlambda = [0.0, sin_lambda];
	var relative_radius_power = [
		(ellipsoid.re/this.r) * (ellipsoid.re/this.r)
	];

	for(n = 1; n <= n_max; n++){
		relative_radius_power[n] = relative_radius_power[n-1] * (ellipsoid.re/this.r);
	}
	for(m = 2; m <= n_max; m++){
		cos_mlambda[m] = cos_mlambda[m-1]*cos_lambda - sin_mlambda[m-1]*sin_lambda;
		sin_mlambda[m] = cos_mlambda[m-1]*sin_lambda + sin_mlambda[m-1]*cos_lambda;
	}

	return {
		relative_radius_power: relative_radius_power,
		cos_mlambda: cos_mlambda,
		sin_mlambda: sin_mlambda
	};
};

SphericalCoord.prototype.getLegendreFunction = function(n_max) {
	return new LegendreFunction(this, n_max);
};
},{"../legendre.js":5,"./cartesian.js":1}],4:[function(require,module,exports){
module.exports = Ellipsoid;

function Ellipsoid(options) {
    options = options || {
        a: 6378.137,
        b: 6356.7523142,
        fla: 1 / 298.257223563,
        re: 6371.2
    };

    this.a = options.a; // semi-major axis
    this.b = options.b; // semi-minor axis
    this.fla = options.fla; // flattening
    this.re = options.re; // mean radius
    this.eps = Math.sqrt(1-(this.b*this.b)/(this.a*this.a)); // first eccentricity
    this.epssq = this.eps*this.eps; // first eccentricity squared
}
},{}],5:[function(require,module,exports){
module.exports = LegendreFunction;

function LegendreFunction(coord_spherical, n_max){
	var sin_phi = Math.sin(Math.PI/180 * coord_spherical.phig);
	var result;
	if(n_max <= 16 || (1 - Math.abs(sin_phi)) < 1e-10){
		result = PcupLow(sin_phi, n_max);
	} else {
		result = PcupHigh(sin_phi, n_max);
	}
	this.pcup = result.pcup;
	this.dpcup = result.dpcup;
}

function PcupLow(x, n_max){
	var k, z, n, m, i, i1, i2, num_terms;
	var schmidt_quasi_norm = [1.0];
	var pcup = [1.0];
	var dpcup = [0.0];

	z = Math.sqrt((1-x)*(1+x));
	num_terms = (n_max+1) * (n_max+2) / 2;


	for(n = 1; n <= n_max; n++) {
		for(m = 0; m <= n; m++) {
			i = n*(n+1)/2 + m;
			if(n == m){
				i1 = (n-1)*n/2 + m - 1;
				pcup[i] = z*pcup[i1];
				dpcup[i] = z*dpcup[i1] + x*pcup[i1];
			} else if (n == 1 && m == 0) {
				i1 = (n-1)*n/2 + m;
				pcup[i] = x*pcup[i1];
				dpcup[i] = x*dpcup[i1] - z*pcup[i1];
			} else if (n > 1 && n != m) {
				i1 = (n-2)*(n-1)/2 + m;
				i2 = (n-1)*n/2 + m;
				if(m > n - 2){
					pcup[i] = x*pcup[i2];
					dpcup[i] = x*dpcup[i2] - z*pcup[i2];
				} else {
					k = ((n-1)*(n-1) - m*m) / ((2*n-1)*(2*n-3));
					pcup[i] = x*pcup[i2] - k*pcup[i1];
					dpcup[i] = x*dpcup[i2] - z*pcup[i2] - k*dpcup[i1];
				}
			}
		}
	}
	
	for(n = 1; n <= n_max; n++) {
		i = n*(n+1)/2;
		i1 = (n-1)*n/2;
		schmidt_quasi_norm[i] = schmidt_quasi_norm[i1] * (2*n-1) / n;
		for(m = 1; m <= n; m++){
			i = n*(n+1)/2 + m;
			i1 = n*(n+1)/2 + m - 1;
			schmidt_quasi_norm[i] = schmidt_quasi_norm[i1] * Math.sqrt(((n - m + 1) * (m == 1 ? 2 : 1)) / (n + m));
		}	
	}

	for(n = 1; n <= n_max; n++) {
		for(m = 0; m <= n; m++) {
			i = n*(n+1)/2+m;
			pcup[i] *= schmidt_quasi_norm[i];
			dpcup[i] *= -schmidt_quasi_norm[i];
		}
	}

	return {
		pcup: pcup,
		dpcup: dpcup
	};
}

function PcupHigh(x, n_max){
	if(Math.abs(x) == 1.0){
		throw new Error("Error in PcupHigh: derivative cannot be calculated at poles");
	}

	var n, m, k;
	var num_terms = (n_max + 1) * (n_max + 2)/2;
	var f1 = [];
	var f2 = [];
	var pre_sqr = [];
	var scalef = 1.0e-280;

	for(n = 0; n <= 2*n_max + 1; ++n){
		pre_sqr[n] = Math.sqrt(n);
	}

	k = 2;
	for(n = 0; n <= n_max; n++){
		k++;
		f1[k] = (2*n - 1) / n;
		f2[k] = (n - 1) / n;
		for(m = 1; m <= n - 2; m++){
			k++;
			f1[k] = (2*n - 1) / pre_sqr[n+m] / pre_sqr[n-m];
			f2[k] = pre_sqr[n-m-1] * pre_sqr[n+m-1] / pre_sqr[n+m] / pre_sqr[n-m];
		}
		k += 2;
	}

	var z = Math.sqrt((1-x)*(1+x));
	var plm;
	var pm1 = x;
	var pm2 = 1;
	var pcup = [1.0, pm1];
	var dpcup = [0.0, z];
	if(n_max == 0){
		throw new Error("Error in PcupHigh: n_max must be greater than 0");
	}
	
	k = 1;
	for(n = 2; n <= n_max; n++)
	{
		k = k + n;
		plm = f1[k] * x * pm1 - f2[k] * pm2;
		pcup[k] = plm;
		dpcup[k] = n * (pm1 - x * plm) / z;
		pm2 = pm1;
		pm1 = plm;
	}

	var pmm = pre_sqr[2] * scalef;
	var rescalem = 1/scalef;
	var kstart = 0;

	for(var m = 1; m <= n_max - 1; ++m){
		rescalem *= z;

		//calculate pcup(m,m)
		kstart = kstart + m + 1;
		pmm = pmm * pre_sqr[2*m+1] / pre_sqr[2*m];
		pcup[kstart] = pmm * rescalem / pre_sqr[2*m+1];
		dpcup[kstart] = -( m*x*pcup[kstart] /z );
		pm2 = pmm / pre_sqr[2*m + 1];

		//calculate pcup(m+1,m)
		k = kstart + m + 1;
		pm1 = x * pre_sqr[2*m+1] * pm2;
		pcup[k] = pm1*rescalem;
		dpcup[k] = (pm2*rescalem *pre_sqr[2*m+1] - x*(m+1)*pcup[k]) / z;

		//calculate pcup(n,m)
		for(n = m + 2; n <= n_max; ++n){
			k = k + n;
			plm = x*f1[k]*pm1 - f2[k]*pm2;
			pcup[k] = plm*rescalem;
			dpcup[k] = (pre_sqr[n+m]*pre_sqr[n-m]*pm1*rescalem - n*x*pcup[k]) / z;
			pm2 = pm1;
			pm1 = plm;
		}
	}

	//calculate pcup(n_max,n_max)
	rescalem = rescalem*z;
	kstart = kstart + m + 1;
	pmm = pmm / pre_sqr[2*n_max];
	pcup[kstart] = pmm * rescalem;
	dpcup[kstart] = -n_max * x * pcup[kstart] / z;

	return {
		pcup: pcup,
		dpcup: dpcup
	};
}

},{}],6:[function(require,module,exports){
module.exports = MagneticElements;

function MagneticElements(options){
	this.x = options.x;
	this.y = options.y;
	this.z = options.z;
	this.h = options.h;
	this.f = options.f;
	this.incl = options.incl;
	this.decl = options.decl;
	this.gv = options.gv;
	this.xdot = options.xdot;
	this.ydot = options.ydot;
	this.zdot = options.zdot;
	this.hdot = options.hdot;
	this.fdot = options.fdot;
	this.incldot = options.incldot;
	this.decldot = options.decldot;
	this.gvdot = options.gvdot;
}

MagneticElements.prototype.clone = function(){
	return new MagneticElements(this);
};

MagneticElements.prototype.scale = function(factor){
	return new MagneticElements({
		x : this.x * factor,
		y : this.y * factor,
		z : this.z * factor,
		h : this.h * factor,
		f : this.f * factor,
		incl : this.incl * factor,
		decl : this.decl * factor,
		gv : this.gv * factor,
		xdot : this.xdot * factor,
		ydot : this.ydot * factor,
		zdot : this.zdot * factor,
		hdot : this.hdot * factor,
		fdot : this.fdot * factor,
		incldot : this.incldot * factor,
		decldot : this.decldot * factor,
		gvdot : this.gvdot * factor
	});
};

MagneticElements.prototype.subtract = function(subtrahend){
	return new MagneticElements({
		x : this.x - subtrahend.x,
		y : this.y - subtrahend.y,
		z : this.z - subtrahend.z,
		h : this.h - subtrahend.h,
		f : this.f - subtrahend.f,
		incl : this.incl - subtrahend.incl,
		decl : this.decl - subtrahend.decl,
		gv : this.gv - subtrahend.gv,
		xdot : this.xdot - subtrahend.xdot,
		ydot : this.ydot - subtrahend.ydot,
		zdot : this.zdot - subtrahend.zdot,
		hdot : this.hdot - subtrahend.hdot,
		fdot : this.fdot - subtrahend.fdot,
		incldot : this.incldot - subtrahend.incldot,
		decldot : this.decldot - subtrahend.decldot,
		gvdot : this.gvdot - subtrahend.gvdot
	});
};

MagneticElements.fromGeoMagneticVector = function(magnetic_vector){
	var bx = magnetic_vector.bx;
	var by = magnetic_vector.by;
	var bz = magnetic_vector.bz;
	var h = Math.sqrt(bx*bx + by*by);
	return new MagneticElements({
		x: bx,
		y: by,
		z: bz,
		h: h,
		f: Math.sqrt(h*h + bz*bz),
		decl: 180/Math.PI * Math.atan2(by, bx),
		incl: 180/Math.PI * Math.atan2(bz, h)
	});
};

MagneticElements.fromSecularVariationVector = function(magnetic_variation){
	var bx = magnetic_variation.bx;
	var by = magnetic_variation.by;
	var bz = magnetic_variation.bz;
	return new MagneticElements({
		xdot: bx,
		ydot: by,
		zdot: bz,
		hdot: (this.x*bx + this.y*by) / this.h,
		fdot: (this.x*bx + this.y*by + this.z*bz) / this.f,
		decldot: 180/Math.PI * (this.x*this.ydot - this.y*this.xdot) / (this.h*this.h),
		incldot: 180/Math.PI * (this.h*this.zdot - this.z*this.hdot) / (this.f*this.f),
		gvdot: this.decldot
	});
};
},{}],7:[function(require,module,exports){
module.exports = MagneticVector;

function MagneticVector(options){
	this.bx = options.bx;
	this.by = options.by;
	this.bz = options.bz;
}

MagneticVector.prototype.rotate = function(coord_spherical, coord_geodetic) {
	var psi = Math.PI/180 * (coord_spherical.phig - coord_geodetic.phi);
	return new MagneticVector({
		bz: this.bx*Math.sin(psi) + this.bz*Math.cos(psi),
		bx: this.bx*Math.cos(psi) - this.bz*Math.sin(psi),
		by: this.by
	});
};
},{}],8:[function(require,module,exports){
var path = require('path');

var GeodeticCoord = require('./coords/geodetic.js');
var Ellipsoid = require('./ellipsoid.js');
var MagneticElements = require('./magnetic_elements.js');
var MagneticVector = require('./magnetic_vector.js');

module.exports = Model;

function Model(options){
	options = options || require('../wmm.json');
	this.epoch = options.epoch;
	this.start_date = new Date(options.start_date);
	this.end_date = new Date(options.end_date);
	this.name = options.name || "";
	this.main_field_coeff_g = options.main_field_coeff_g || [0];
	this.main_field_coeff_h = options.main_field_coeff_h || [0];
	this.secular_var_coeff_g = options.secular_var_coeff_g || [0];
	this.secular_var_coeff_h = options.secular_var_coeff_h || [0];
	this.n_max = options.n_max || 0;
	this.n_max_sec_var = options.n_max_sec_var || 0;
	this.num_terms = this.n_max*(this.n_max+1)/2 + this.n_max;
}

Model.prototype.getTimedModel = function(date){
	var year_int = date.getFullYear();
	var year_start = new Date(year_int, 0, 1);
	var fractional_year = (date.valueOf() - year_start.valueOf()) / (1000*3600*24*365);
	var year = year_int + fractional_year;
	var dyear = year - this.epoch;

	if(date < this.start_date || date > this.end_date){
		throw new RangeError("Model is only valid from "+this.start_date.toDateString()+" to "+this.end_date.toDateString());
	}

	var model = new Model({
		epoch: this.epoch,
		n_max: this.n_max,
		n_max_sec_var: this.n_max_sec_var,
		name: this.name
	});
	var a = model.n_max_sec_var;
	var b = a*(a + 1)/2 + a;
	for(var n = 1; n <= this.n_max; n++){
		for(var m = 0; m <= n; m++){
			var i = n * (n + 1)/2 + m;
			var hnm = this.main_field_coeff_h[i];
			var gnm = this.main_field_coeff_g[i];
			var dhnm = this.secular_var_coeff_h[i];
			var dgnm = this.secular_var_coeff_g[i];
			if(i <= b){
				model.main_field_coeff_h[i] = hnm + dyear*dhnm;
				model.main_field_coeff_g[i] = gnm + dyear*dgnm;
				model.secular_var_coeff_h[i] = dhnm;
				model.secular_var_coeff_g[i] = dgnm;
			} else {
				model.main_field_coeff_h[i] = hnm;
				model.main_field_coeff_g[i] = gnm;
			}
		}
	}
	return model;
};

Model.prototype.getSummation = function(legendre, sph_variables, coord_spherical){
	var bx = 0;
	var by = 0;
	var bz = 0;
	var n, m, i, k;
	var relative_radius_power = sph_variables.relative_radius_power;
	var cos_mlambda = sph_variables.cos_mlambda;
	var sin_mlambda = sph_variables.sin_mlambda;
	var g = this.main_field_coeff_g;
	var h = this.main_field_coeff_h;

	for(n = 1; n <= this.n_max; n++){
		for(m = 0; m <= n; m++){
			i = n*(n+1)/2 + m;
			bz -= relative_radius_power[n] *
				(g[i]*cos_mlambda[m] + h[i]*sin_mlambda[m]) *
				(n+1) * legendre.pcup[i];
			by += relative_radius_power[n] *
				(g[i]*sin_mlambda[m] - h[i]*cos_mlambda[m]) *
				(m) * legendre.pcup[i];
			bx -= relative_radius_power[n] *
				(g[i]*cos_mlambda[m] + h[i]*sin_mlambda[m]) *
				legendre.dpcup[i];
		}
	}
	var cos_phi = Math.cos(Math.PI/180 * coord_spherical.phig);
	if(Math.abs(cos_phi) > 1e-10){
		by = by / cos_phi;
	} else {
		//special calculation around poles
		by = 0;
		var schmidt_quasi_norm1 = 1.0, schmidt_quasi_norm2, schmidt_quasi_norm3;
		var pcup_s = [1];
		var sin_phi = Math.sin(Math.PI/180 * coord_spherical.phig);

		for(n = 1; n <= this.n_max; n++){
			i = n*(n+1)/2 + 1;
			schmidt_quasi_norm2 = schmidt_quasi_norm1 * (2*n-1) / n;
			schmidt_quasi_norm3 = schmidt_quasi_norm2 * Math.sqrt(2*n/(n+1));
			schmidt_quasi_norm1 = schmidt_quasi_norm2;
			if(n == 1){
				pcup_s[n] = pcup_s[n-1];
			} else {
				k = ((n-1)*(n-1) - 1) / ((2*n-1)*(2*n-3));
				pcup_s[n] = sin_phi * pcup_s[n-1] - k*pcup_s[n-2];
			}
			by += relative_radius_power[n] *
				(g[i]*sin_mlambda[1] - h[i]*cos_mlambda[1]) *
				pcup_s[n] * schmidt_quasi_norm3;
		}
	}
	return new MagneticVector({
		bx: bx, by: by, bz: bz
	});
};

/*
Model.prototype.getSecVarSummation = function(sph_variables, coord_spherical){
	//TODO
}
*/

Model.prototype.point = function(coords) {
	var coord_geodetic = new GeodeticCoord({
		lat: coords[0],
		lon: coords[1]
	});
	var coord_spherical = coord_geodetic.toSpherical();

	var legendre = coord_spherical.getLegendreFunction(this.n_max);
	var harmonic_variables = coord_spherical.getHarmonicVariables(coord_geodetic.ellipsoid, this.n_max);

	var magnetic_vector_sph = this.getSummation(legendre, harmonic_variables, coord_spherical);
	var magnetic_vector_geo = magnetic_vector_sph.rotate(coord_spherical, coord_geodetic);

	return MagneticElements.fromGeoMagneticVector(magnetic_vector_geo);
};

},{"../wmm.json":9,"./coords/geodetic.js":2,"./ellipsoid.js":4,"./magnetic_elements.js":6,"./magnetic_vector.js":7,"path":10}],9:[function(require,module,exports){
module.exports={
  "main_field_coeff_g": [
    0,
    -29438.5,
    -1501.1,
    -2445.3,
    3012.5,
    1676.6,
    1351.1,
    -2352.3,
    1225.6,
    581.9,
    907.2,
    813.7,
    120.3,
    -335,
    70.3,
    -232.6,
    360.1,
    192.4,
    -141,
    -157.4,
    4.3,
    69.5,
    67.4,
    72.8,
    -129.8,
    -29,
    13.2,
    -70.9,
    81.6,
    -76.1,
    -6.8,
    51.9,
    15,
    9.3,
    -2.8,
    6.7,
    24,
    8.6,
    -16.9,
    -3.2,
    -20.6,
    13.3,
    11.7,
    -16,
    -2,
    5.4,
    8.8,
    3.1,
    -3.1,
    0.6,
    -13.3,
    -0.1,
    8.7,
    -9.1,
    -10.5,
    -1.9,
    -6.5,
    0.2,
    0.6,
    -0.6,
    1.7,
    -0.7,
    2.1,
    2.3,
    -1.8,
    -3.6,
    3.1,
    -1.5,
    -2.3,
    2.1,
    -0.9,
    0.6,
    -0.7,
    0.2,
    1.7,
    -0.2,
    0.4,
    3.5,
    -2,
    -0.3,
    0.4,
    1.3,
    -0.9,
    0.9,
    0.1,
    0.5,
    -0.4,
    -0.4,
    0.2,
    -0.9,
    0
  ],
  "main_field_coeff_h": [
    0,
    0,
    4796.2,
    0,
    -2845.6,
    -642,
    0,
    -115.3,
    245,
    -538.3,
    0,
    283.4,
    -188.6,
    180.9,
    -329.5,
    0,
    47.4,
    196.9,
    -119.4,
    16.1,
    100.1,
    0,
    -20.7,
    33.2,
    58.8,
    -66.5,
    7.3,
    62.5,
    0,
    -54.1,
    -19.4,
    5.6,
    24.4,
    3.3,
    -27.5,
    -2.3,
    0,
    10.2,
    -18.1,
    13.2,
    -14.6,
    16.2,
    5.7,
    -9.1,
    2.2,
    0,
    -21.6,
    10.8,
    11.7,
    -6.8,
    -6.9,
    7.8,
    1,
    -3.9,
    8.5,
    0,
    3.3,
    -0.3,
    4.6,
    4.4,
    -7.9,
    -0.6,
    -4.1,
    -2.8,
    -1.1,
    -8.7,
    0,
    -0.1,
    2.1,
    -0.7,
    -1.1,
    0.7,
    -0.2,
    -2.1,
    -1.5,
    -2.5,
    -2,
    -2.3,
    0,
    -1,
    0.5,
    1.8,
    -2.2,
    0.3,
    0.7,
    -0.1,
    0.3,
    0.2,
    -0.9,
    -0.2,
    0.7
  ],
  "secular_var_coeff_g": [
    0,
    10.7,
    17.9,
    -8.6,
    -3.3,
    2.4,
    3.1,
    -6.2,
    -0.4,
    -10.4,
    -0.4,
    0.8,
    -9.2,
    4,
    -4.2,
    -0.2,
    0.1,
    -1.4,
    0,
    1.3,
    3.8,
    -0.5,
    -0.2,
    -0.6,
    2.4,
    -1.1,
    0.3,
    1.5,
    0.2,
    -0.2,
    -0.4,
    1.3,
    0.2,
    -0.4,
    -0.9,
    0.3,
    0,
    0.1,
    -0.5,
    0.5,
    -0.2,
    0.4,
    0.2,
    -0.4,
    0.3,
    0,
    -0.1,
    -0.1,
    0.4,
    -0.5,
    -0.2,
    0.1,
    0,
    -0.2,
    -0.1,
    0,
    0,
    -0.1,
    0.3,
    -0.1,
    -0.1,
    -0.1,
    0,
    -0.2,
    -0.1,
    -0.2,
    0,
    0,
    -0.1,
    0.1,
    0,
    0,
    0,
    0,
    0,
    0,
    -0.1,
    -0.1,
    0.1,
    0,
    0,
    0.1,
    -0.1,
    0,
    0.1,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  "secular_var_coeff_h": [
    0,
    0,
    -26.8,
    0,
    -27.1,
    -13.3,
    0,
    8.4,
    -0.4,
    2.3,
    0,
    -0.6,
    5.3,
    3,
    -5.3,
    0,
    0.4,
    1.6,
    -1.1,
    3.3,
    0.1,
    0,
    0,
    -2.2,
    -0.7,
    0.1,
    1,
    1.3,
    0,
    0.7,
    0.5,
    -0.2,
    -0.1,
    -0.7,
    0.1,
    0.1,
    0,
    -0.3,
    0.3,
    0.3,
    0.6,
    -0.1,
    -0.2,
    0.3,
    0,
    0,
    -0.2,
    -0.1,
    -0.2,
    0.1,
    0.1,
    0,
    -0.2,
    0.4,
    0.3,
    0,
    0.1,
    -0.1,
    0,
    0,
    -0.2,
    0.1,
    -0.1,
    -0.2,
    0.1,
    -0.1,
    0,
    0,
    0.1,
    0,
    0.1,
    0,
    0,
    0.1,
    0,
    -0.1,
    0,
    -0.1,
    0,
    0,
    0,
    -0.1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  "n_max": 12,
  "n_max_sec_var": 12,
  "epoch": 2015,
  "name": "WMM-2015",
  "start_date": "2014-12-15T07:00:00.000Z",
  "end_date": "2019-12-15T07:00:00.000Z"
}
},{}],10:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":11}],11:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
  try {
    cachedSetTimeout = setTimeout;
  } catch (e) {
    cachedSetTimeout = function () {
      throw new Error('setTimeout is not defined');
    }
  }
  try {
    cachedClearTimeout = clearTimeout;
  } catch (e) {
    cachedClearTimeout = function () {
      throw new Error('clearTimeout is not defined');
    }
  }
} ())
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = cachedSetTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    cachedClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        cachedSetTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],"geomagnetism":[function(require,module,exports){
var Model = require('./lib/model.js');
var geomagnetism = module.exports = {};

var base_model;

geomagnetism.model = function(date) {
	date = date || new Date();
	if (!base_model) {
		base_model = new Model();
	}
	return base_model.getTimedModel(date);
};
},{"./lib/model.js":8}]},{},[]);
