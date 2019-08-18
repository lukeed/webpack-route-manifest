const NAME = 'webpack-route-manifest';

class RouteManifest {
	constructor(opts = {}) {
		opts = opts || {};
	}

	apply(compiler) {
		if (compiler.hooks !== void 0) {
			compiler.hooks.emit.tap(NAME, onStart);
		} else {
			compiler.plugin('emit', onStart);
		}
	}
}

module.exports = RouteManifest;
