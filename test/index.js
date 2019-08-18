const test = require('tape');
const RouteManifest = require('..');

test('exports', t => {
	t.is(typeof RouteManifest, 'function');
	t.is(RouteManifest.name, 'RouteManifest');
	t.end();
});

test('throws', t => {
	try {
		new RouteManifest();
	} catch (err) {
		t.true(err instanceof Error, 'throws an Error');
		t.is(err.message, 'A "routes" mapping is required', '~> says "routes" needed');
	}
	t.end();
});
