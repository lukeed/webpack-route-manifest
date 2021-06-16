const test = require('tape');
const RouteManifest = require('..');

// Helpers
// ---
function toModule(chunkID, files=[]) {
	const chunks = [].concat(chunkID);
	return { chunks, assets:files };
}

function toChunk(id, req, entry, files=[]) {
	const origins = [{ request:req }];
	return { id, entry, files, origins };
}

function toBundle(chunks, modules, publicPath = '/') {
	return {
		assets: {},
		getStats: () => ({
			toJson: () => ({ chunks, modules, publicPath })
		})
	};
}

const DEFAULT = {
	chunks: [
		toChunk(0, null, true, ['bundle.1234.js', 'bundle.612d.css', 'link.svg']),
		toChunk(1, 'main.js', true, ['bundle.5678.js', 'bundle.890d.css', 'button.svg']),
		toChunk(2, '@pages/Home', false, ['1.ashg.js', '1.dfghj.css', 'hero.jpg']),
		toChunk(3, '@pages/Page', false, ['2.abc1.js', '2.avsj2.css', 'avatar.png']),
	],
	modules: [
		toModule(0, []),
		toModule(0, []),
		toModule(1, []),
		toModule(2, ['contact.svg']),
		toModule(3, ['font.ttf']),
	],
	routes(str) {
		return str.includes('Home') ? '/' : '/:slug';
	}
};
// end ---

test('exports', t => {
	t.is(typeof RouteManifest, 'function');
	t.is(RouteManifest.name, 'RouteManifest');
	t.end();
});


test('routes', t => {
	try {
		new RouteManifest();
	} catch (err) {
		t.true(err instanceof Error, 'throws an Error w/o "routes" defined');
		t.is(err.message, 'A "routes" mapping is required', '~> says "routes" needed');
	}

	const foo = {};
	const bar = () => {};

	const ctx1 = new RouteManifest({ routes:foo });
	const ctx2 = new RouteManifest({ routes:bar });

	t.ok(ctx1, '~> "routes" accepts object');
	t.ok(ctx2, '~> "routes" accepts function');

	t.is(typeof ctx1.run, 'function', '~> ctx1.run() exists');
	t.is(typeof ctx2.run, 'function', '~> ctx2.run() exists');

	t.end();
});


test('routes :: filter', t => {
	// setup
	const compilation = toBundle(DEFAULT.chunks, DEFAULT.modules);
	const Plugin = new RouteManifest({
		headers: true,
		routes(str) {
			return str.includes('Home') ? false : DEFAULT.routes(str);
		}
	});
	// end setup

	Plugin.run(compilation);
	const { assets } = compilation;

	const filename = 'manifest.json';
	t.true(filename in assets, '~> created "manifest.json" file (default)');

	const contents = assets[filename].source();
	t.is(typeof contents, 'string', '~> saved contents a JSON string');
	t.true(contents.startsWith(`{\n  `), '~> is NOT minified by default');
	t.is(typeof assets[filename].size(), 'number', '~> has `size()` getter for webpack');

	const data = JSON.parse(contents);
	t.same(Object.keys(data), ['/:slug', '*'], '~> has patterns as keys; NO HOME');

	t.is(
		// re-stringify; tape deepequal is unreliable
		JSON.stringify(data),
		JSON.stringify({
			'/:slug': {
				files: [
					{ type: 'script', href: '/2.abc1.js' },
					{ type: 'style', href: '/2.avsj2.css' },
					{ type: 'image', href: '/avatar.png' },
					{ type: 'font', href: '/font.ttf' }
				],
				headers: [{
					key: 'Link',
					value: [
						'</2.abc1.js>; rel=preload; as=script; crossorigin=anonymous',
						'</2.avsj2.css>; rel=preload; as=style',
						'</avatar.png>; rel=preload; as=image',
						'</font.ttf>; rel=preload; as=font; crossorigin=anonymous',
					].join(', ')
				}]
			},
			'*': {
				files: [
					{ type: 'script', href: '/bundle.1234.js' },
					{ type: 'style', href: '/bundle.612d.css' },
					{ type: 'image', href: '/link.svg' },
					{ type: 'script', href: '/bundle.5678.js' },
					{ type: 'style', href: '/bundle.890d.css' },
					{ type: 'image', href: '/button.svg' },
				],
				headers: [{
					key: 'Link',
					value: [
						'</bundle.1234.js>; rel=preload; as=script; crossorigin=anonymous',
						'</bundle.612d.css>; rel=preload; as=style',
						'</link.svg>; rel=preload; as=image',
						'</bundle.5678.js>; rel=preload; as=script; crossorigin=anonymous',
						'</bundle.890d.css>; rel=preload; as=style',
						'</button.svg>; rel=preload; as=image',
					].join(', ')
				}]
			}
		})
	);

	t.end();
});


test('defaults', t => {
	// setup
	const compilation = toBundle(DEFAULT.chunks, DEFAULT.modules);
	const Plugin = new RouteManifest({ routes: DEFAULT.routes });
	// end setup

	Plugin.run(compilation);
	const { assets } = compilation;

	const filename = 'manifest.json';
	t.true(filename in assets, '~> created "manifest.json" file (default)');

	const contents = assets[filename].source();
	t.is(typeof contents, 'string', '~> saved contents a JSON string');
	t.true(contents.startsWith(`{\n  `), '~> is NOT minified by default');
	t.is(typeof assets[filename].size(), 'number', '~> has `size()` getter for webpack');

	const data = JSON.parse(contents);
	t.same(Object.keys(data), ['/', '/:slug', '*'], '~> has patterns as keys');

	t.is(
		// re-stringify; tape deepequal is unreliable
		JSON.stringify(data),
		JSON.stringify({
			'/': [
				{ type: 'script', href: '/1.ashg.js' },
				{ type: 'style', href: '/1.dfghj.css' },
				{ type: 'image', href: '/hero.jpg' },
				{ type: 'image', href: '/contact.svg' }
			],
			'/:slug': [
				{ type: 'script', href: '/2.abc1.js' },
				{ type: 'style', href: '/2.avsj2.css' },
				{ type: 'image', href: '/avatar.png' },
				{ type: 'font', href: '/font.ttf' }
			],
			'*': [
				{ type: 'script', href: '/bundle.1234.js' },
				{ type: 'style', href: '/bundle.612d.css' },
				{ type: 'image', href: '/link.svg' },
				{ type: 'script', href: '/bundle.5678.js' },
				{ type: 'style', href: '/bundle.890d.css' },
				{ type: 'image', href: '/button.svg' },
			]
		})
	);

	t.end();
});


test('headers :: true', t => {
	// setup
	const compilation = toBundle(DEFAULT.chunks, DEFAULT.modules);
	const Plugin = new RouteManifest({
		routes: DEFAULT.routes,
		headers: true
	});
	// end setup

	Plugin.run(compilation);
	const { assets } = compilation;

	const filename = 'manifest.json';
	t.true(filename in assets, '~> created "manifest.json" file (default)');

	const contents = assets[filename].source();
	t.is(typeof contents, 'string', '~> saved contents a JSON string');
	t.true(contents.startsWith(`{\n  `), '~> is NOT minified by default');
	t.is(typeof assets[filename].size(), 'number', '~> has `size()` getter for webpack');

	const data = JSON.parse(contents);
	t.same(Object.keys(data), ['/', '/:slug', '*'], '~> has patterns as keys');

	t.is(
		// re-stringify; tape deepequal is unreliable
		JSON.stringify(data),
		JSON.stringify({
			'/': {
				files: [
					{ type: 'script', href: '/1.ashg.js' },
					{ type: 'style', href: '/1.dfghj.css' },
					{ type: 'image', href: '/hero.jpg' },
					{ type: 'image', href: '/contact.svg' }
				],
				headers: [{
					key: 'Link',
					value: [
						'</1.ashg.js>; rel=preload; as=script; crossorigin=anonymous',
						'</1.dfghj.css>; rel=preload; as=style',
						'</hero.jpg>; rel=preload; as=image',
						'</contact.svg>; rel=preload; as=image',
					].join(', ')
				}]
			},
			'/:slug': {
				files: [
					{ type: 'script', href: '/2.abc1.js' },
					{ type: 'style', href: '/2.avsj2.css' },
					{ type: 'image', href: '/avatar.png' },
					{ type: 'font', href: '/font.ttf' }
				],
				headers: [{
					key: 'Link',
					value: [
						'</2.abc1.js>; rel=preload; as=script; crossorigin=anonymous',
						'</2.avsj2.css>; rel=preload; as=style',
						'</avatar.png>; rel=preload; as=image',
						'</font.ttf>; rel=preload; as=font; crossorigin=anonymous',
					].join(', ')
				}]
			},
			'*': {
				files: [
					{ type: 'script', href: '/bundle.1234.js' },
					{ type: 'style', href: '/bundle.612d.css' },
					{ type: 'image', href: '/link.svg' },
					{ type: 'script', href: '/bundle.5678.js' },
					{ type: 'style', href: '/bundle.890d.css' },
					{ type: 'image', href: '/button.svg' },
				],
				headers: [{
					key: 'Link',
					value: [
						'</bundle.1234.js>; rel=preload; as=script; crossorigin=anonymous',
						'</bundle.612d.css>; rel=preload; as=style',
						'</link.svg>; rel=preload; as=image',
						'</bundle.5678.js>; rel=preload; as=script; crossorigin=anonymous',
						'</bundle.890d.css>; rel=preload; as=style',
						'</button.svg>; rel=preload; as=image',
					].join(', ')
				}]
			}
		})
	);

	t.end();
});


test('headers :: custom', t => {
	// setup
	const compilation = toBundle(DEFAULT.chunks, DEFAULT.modules);
	const Plugin = new RouteManifest({
		routes: DEFAULT.routes,
		headers(assets, pattern, filemap) {
			return filemap['*'].concat(assets);
		}
	});
	// end setup

	Plugin.run(compilation);
	const { assets } = compilation;

	const filename = 'manifest.json';
	t.true(filename in assets, '~> created "manifest.json" file (default)');

	const contents = assets[filename].source();
	t.is(typeof contents, 'string', '~> saved contents a JSON string');
	t.true(contents.startsWith(`{\n  `), '~> is NOT minified by default');
	t.is(typeof assets[filename].size(), 'number', '~> has `size()` getter for webpack');

	const data = JSON.parse(contents);
	t.same(Object.keys(data), ['/', '/:slug', '*'], '~> has patterns as keys');

	t.is(
		// re-stringify; tape deepequal is unreliable
		JSON.stringify(data),
		JSON.stringify({
			'/': {
				files: [
					{ type: 'script', href: '/1.ashg.js' },
					{ type: 'style', href: '/1.dfghj.css' },
					{ type: 'image', href: '/hero.jpg' },
					{ type: 'image', href: '/contact.svg' }
				],
				headers: [
					// *
					{ type: 'script', href: '/bundle.1234.js' },
					{ type: 'style', href: '/bundle.612d.css' },
					{ type: 'image', href: '/link.svg' },
					{ type: 'script', href: '/bundle.5678.js' },
					{ type: 'style', href: '/bundle.890d.css' },
					{ type: 'image', href: '/button.svg' },
					// /
					{ type: 'script', href: '/1.ashg.js' },
					{ type: 'style', href: '/1.dfghj.css' },
					{ type: 'image', href: '/hero.jpg' },
					{ type: 'image', href: '/contact.svg' }
				]
			},
			'/:slug': {
				files: [
					{ type: 'script', href: '/2.abc1.js' },
					{ type: 'style', href: '/2.avsj2.css' },
					{ type: 'image', href: '/avatar.png' },
					{ type: 'font', href: '/font.ttf' }
				],
				headers: [
					// *
					{ type: 'script', href: '/bundle.1234.js' },
					{ type: 'style', href: '/bundle.612d.css' },
					{ type: 'image', href: '/link.svg' },
					{ type: 'script', href: '/bundle.5678.js' },
					{ type: 'style', href: '/bundle.890d.css' },
					{ type: 'image', href: '/button.svg' },
					// /:slug
					{ type: 'script', href: '/2.abc1.js' },
					{ type: 'style', href: '/2.avsj2.css' },
					{ type: 'image', href: '/avatar.png' },
					{ type: 'font', href: '/font.ttf' }
				]
			},
			'*': {
				files: [
					{ type: 'script', href: '/bundle.1234.js' },
					{ type: 'style', href: '/bundle.612d.css' },
					{ type: 'image', href: '/link.svg' },
					{ type: 'script', href: '/bundle.5678.js' },
					{ type: 'style', href: '/bundle.890d.css' },
					{ type: 'image', href: '/button.svg' },
				],
				headers: [
					// *
					{ type: 'script', href: '/bundle.1234.js' },
					{ type: 'style', href: '/bundle.612d.css' },
					{ type: 'image', href: '/link.svg' },
					{ type: 'script', href: '/bundle.5678.js' },
					{ type: 'style', href: '/bundle.890d.css' },
					{ type: 'image', href: '/button.svg' },
					// *
					{ type: 'script', href: '/bundle.1234.js' },
					{ type: 'style', href: '/bundle.612d.css' },
					{ type: 'image', href: '/link.svg' },
					{ type: 'script', href: '/bundle.5678.js' },
					{ type: 'style', href: '/bundle.890d.css' },
					{ type: 'image', href: '/button.svg' },
				]
			}
		})
	);

	t.end();
});


test('filename & minify', t => {
	// setup
	const filename = 'foobarbaz.json';
	const compilation = toBundle(DEFAULT.chunks, DEFAULT.modules);
	const Plugin = new RouteManifest({
		routes: DEFAULT.routes,
		minify: true,
		filename,
	});
	// end setup

	Plugin.run(compilation);
	const { assets } = compilation;

	t.true(filename in assets, '~> created "foobarbaz.json" file (custom)');

	const contents = assets[filename].source();
	t.is(typeof contents, 'string', '~> saved contents a JSON string');
	t.true(contents.startsWith(`{"/"`), '~> is minified');
	t.is(typeof assets[filename].size(), 'number', '~> has `size()` getter for webpack');

	const data = JSON.parse(contents);
	t.same(Object.keys(data), ['/', '/:slug', '*'], '~> has patterns as keys');

	t.is(
		// re-stringify; tape deepequal is unreliable
		JSON.stringify(data),
		JSON.stringify({
			'/': [
				{ type: 'script', href: '/1.ashg.js' },
				{ type: 'style', href: '/1.dfghj.css' },
				{ type: 'image', href: '/hero.jpg' },
				{ type: 'image', href: '/contact.svg' }
			],
			'/:slug': [
				{ type: 'script', href: '/2.abc1.js' },
				{ type: 'style', href: '/2.avsj2.css' },
				{ type: 'image', href: '/avatar.png' },
				{ type: 'font', href: '/font.ttf' }
			],
			'*': [
				{ type: 'script', href: '/bundle.1234.js' },
				{ type: 'style', href: '/bundle.612d.css' },
				{ type: 'image', href: '/link.svg' },
				{ type: 'script', href: '/bundle.5678.js' },
				{ type: 'style', href: '/bundle.890d.css' },
				{ type: 'image', href: '/button.svg' },
			]
		})
	);

	t.end();
});


test('assets', t => {
	// setup
	const compilation = toBundle(DEFAULT.chunks, DEFAULT.modules);
	const Plugin = new RouteManifest({
		routes: DEFAULT.routes,
		headers: true,
		assets(str) {
			if (/\.js$/.test(str)) return 'x-script';
			if (/\.css$/.test(str)) return 'x-style';
			if (/\.ttf$/.test(str)) return 'x-font';
			return false; // images
		}
	});
	// end setup

	Plugin.run(compilation);
	const { assets } = compilation;

	const filename = 'manifest.json';
	t.true(filename in assets, '~> created "manifest.json" file (default)');

	const contents = assets[filename].source();
	t.is(typeof contents, 'string', '~> saved contents a JSON string');
	t.true(contents.startsWith(`{\n  `), '~> is NOT minified by default');
	t.is(typeof assets[filename].size(), 'number', '~> has `size()` getter for webpack');

	const data = JSON.parse(contents);
	t.same(Object.keys(data), ['/', '/:slug', '*'], '~> has patterns as keys');

	t.is(
		// re-stringify; tape deepequal is unreliable
		JSON.stringify(data),
		JSON.stringify({
			'/': {
				files: [
					{ type: 'x-script', href: '/1.ashg.js' },
					{ type: 'x-style', href: '/1.dfghj.css' },
				],
				headers: [{
					key: 'Link',
					value: [
						'</1.ashg.js>; rel=preload; as=x-script',
						'</1.dfghj.css>; rel=preload; as=x-style',
					].join(', ')
				}]
			},
			'/:slug': {
				files: [
					{ type: 'x-script', href: '/2.abc1.js' },
					{ type: 'x-style', href: '/2.avsj2.css' },
					{ type: 'x-font', href: '/font.ttf' }
				],
				headers: [{
					key: 'Link',
					value: [
						'</2.abc1.js>; rel=preload; as=x-script',
						'</2.avsj2.css>; rel=preload; as=x-style',
						'</font.ttf>; rel=preload; as=x-font',
					].join(', ')
				}]
			},
			'*': {
				files: [
					{ type: 'x-script', href: '/bundle.1234.js' },
					{ type: 'x-style', href: '/bundle.612d.css' },
					{ type: 'x-script', href: '/bundle.5678.js' },
					{ type: 'x-style', href: '/bundle.890d.css' }
				],
				headers: [{
					key: 'Link',
					value: [
						'</bundle.1234.js>; rel=preload; as=x-script',
						'</bundle.612d.css>; rel=preload; as=x-style',
						'</bundle.5678.js>; rel=preload; as=x-script',
						'</bundle.890d.css>; rel=preload; as=x-style'
					].join(', ')
				}]
			}
		})
	);

	t.end();
});


test('routes :: no sort', t => {
	// setup
	const compilation = toBundle(DEFAULT.chunks, DEFAULT.modules);
	const Plugin = new RouteManifest({ routes: DEFAULT.routes, sort: false });
	// end setup

	Plugin.run(compilation);
	const { assets } = compilation;

	const filename = 'manifest.json';
	t.true(filename in assets, '~> created "manifest.json" file (default)');

	const contents = assets[filename].source();
	t.is(typeof contents, 'string', '~> saved contents a JSON string');
	t.true(contents.startsWith(`{\n  `), '~> is NOT minified by default');
	t.is(typeof assets[filename].size(), 'number', '~> has `size()` getter for webpack');

	const data = JSON.parse(contents);
	t.same(Object.keys(data), ['*', '/', '/:slug'], '~> has patterns as keys');

	t.is(
		// re-stringify; tape deepequal is unreliable
		JSON.stringify(data),
		JSON.stringify({
			'*': [
				{ type: 'script', href: '/bundle.1234.js' },
				{ type: 'style', href: '/bundle.612d.css' },
				{ type: 'image', href: '/link.svg' },
				{ type: 'script', href: '/bundle.5678.js' },
				{ type: 'style', href: '/bundle.890d.css' },
				{ type: 'image', href: '/button.svg' },
			],
			'/': [
				{ type: 'script', href: '/1.ashg.js' },
				{ type: 'style', href: '/1.dfghj.css' },
				{ type: 'image', href: '/hero.jpg' },
				{ type: 'image', href: '/contact.svg' }
			],
			'/:slug': [
				{ type: 'script', href: '/2.abc1.js' },
				{ type: 'style', href: '/2.avsj2.css' },
				{ type: 'image', href: '/avatar.png' },
				{ type: 'font', href: '/font.ttf' }
			]
		})
	);

	t.end();
});
