const NAME = 'webpack-route-manifest';

function toAsset(str) {
	if (/\.js$/i.test(str)) return 'script';
	if (/\.(svg|png)$/i.test(str)) return 'image';
	if (/\.(woff2?|otf|ttf|eot)$/i.test(str)) return 'font';
	if (/\.css$/i.test(str)) return 'style';
	return false;
}

function toLink(assets, _pattern, _filemap) {
	let value = '';
	assets.forEach(obj => {
		if (value) value += ', ';
		value += `<${obj.href}>; rel=preload; as=${obj.type}`;
		if (/^(font|script)$/.test(obj.type)) value += '; crossorigin=anonymous';
	});
	return [{ key: 'Link', value }];
}

function toFunction(val) {
	if (typeof val === 'function') return val;
	if (typeof val === 'object') return key => val[key];
}

class RouteManifest {
	constructor(opts={}) {
		const { routes, assets, headers, minify } = opts;
		const filename = opts.filename || 'manifest.json';

		if (!routes) {
			throw new Error('A "routes" mapping is required');
		}

		const toRoute = toFunction(routes);
		const toHeaders = toFunction(headers) || headers === true && toLink;
		const toType = toFunction(assets) || toAsset;

		this.run = bundle => {
			const Pages = [];
			const Manifest = {};
			const Files = {};

			const { publicPath, chunks, modules } = bundle.getStats().toJson();

			// Map pages to files
			chunks.forEach(chunk => {
				const { id, files, origins } = chunk;
				const origin = origins[0].request;
				Pages[id] = {
					assets: new Set(files),
					pattern: origin ? toRoute(origin) : '*'
				};
			});

			// Grab extra files per route
			modules.forEach(mod => {
				mod.assets.forEach(asset => {
					mod.chunks.forEach(id => {
						Pages[id].assets.add(asset);
					});
				});
			});

			// Construct `Files` first
			Pages.forEach(obj => {
				let tmp = Files[obj.pattern] = [];

				// Iterate, possibly filtering out
				// TODO: Add priority hints?
				obj.assets.forEach(str => {
					let type = toType(str);
					let href = publicPath + str;
					if (type) tmp.push({ type, href });
				});
			});

			const write = data => {
				const str = JSON.stringify(data, null, minify ? 0 : 2);
				bundle.assets[filename] = {
					size: () => str.length,
					source: () => str
				};
			};

			// No headers? Then stop here
			if (!toHeaders) return write(Files);

			// Otherwise compute "headers" per pattern
			// And save existing Files as "files" key
			for (const pattern in Files) {
				const files = Files[pattern];
				const headers = toHeaders(files, pattern, Files) || [];
				Manifest[pattern] = { files, headers };
			}

			return write(Manifest);
		};
	}

	apply(compiler) {
		if (compiler.hooks !== void 0) {
			compiler.hooks.emit.tap(NAME, this.run);
		} else {
			compiler.plugin('emit', this.run);
		}
	}
}

module.exports = RouteManifest;
