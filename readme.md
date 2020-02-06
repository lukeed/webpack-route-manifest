# webpack-route-manifest

> Generate an asset manifest file, keyed by route patterns!

***The Context***

Modern applications (should!) take advantage of route-based code splitting. This enables an application to be compartmentalized into smaller, highly relevant "chunks" for a particular section or feature of that application. By default, this means that your application is only giving its client(s) the code it needs for that page.

***The Problem***

While amazing, this isn't (yet) a perfect solution. The client wants to navigate to other pages!

In a default, code-splitting configuration, when the client goes to a new page (eg; `/blog`), the blog page's assets only start downloading **after** the click has been made. What this means is that our super speedy and state of the art application is at the mercy of the client's network connection.

Our client is staring at a loading screen/spinner &mdash; or worse, a split-second flash of the loader &mdash; until the blog's code has loaded.

***The Solution***

With this plugin, you regain control of your application's assets. :muscle:

You are given the knowledge of exactly which files are _going to be requested_ for each route of your application.

In turn, this means you can preemptively load the assets for `/blog` _before_ the client clicks and waits.<br>
You can begin preloading the assets for any/all routes if you desire (although _all_ is not recommended), while still reaping the benefits of dynamic code-splitting, since the initial/critical code was kept as light as possible.

***Further Reading***

* https://github.com/GoogleChromeLabs/quicklink
* https://developer.mozilla.org/en-US/docs/Web/HTML/Preloading_content
* https://www.smashingmagazine.com/2016/02/preload-what-is-it-good-for/
* https://w3c.github.io/preload/#x2.link-type-preload
* https://github.com/lukeed/regexparam



## Install

```
$ npm install webpack-route-manifest --save-dev
```


## Usage

```js
// webpack.config.js
const RouteManifest = require('webpack-route-manifest');

module.exports = {
  // ...
  plugins: [
    new RouteManifest({
      routes(str) {
        // Assume all entries are '../../../pages/Home' format
        let out = str.replace('../../../pages', '').toLowerCase();
        if (out === '/article') return '/blog/:title';
        if (out === '/home') return '/';
        return out;
      }
    })
  ]
}
```


## API

### RouteManifest(options)

#### options.routes
Type: `Function` or `Object`<br>
Required: `true`

Map your application's `import()` statements into the URL route patterns they'll operate on.

> **Note:** Check out the [supported route patterns](#route-patterns).

When `routes` is a function, it receives the strings and expects a pattern (string) to be returned.

When `routes` is an object, its keys must be the expected import paths and its values must be the pattern strings.

> **Important:** You may also return a falsey value to exclude the route from the manifest.

***Example***

Let's assume your `src/app.js` entry file imports pages from the sibling `src/pages/*` directory:

```js
import React from 'react';
import Loadable from 'react-loadable';
import { Route } from 'react-router-dom';

// Route-Split Components
const loading = () => <div>Loading...</div>;
const load = loader => Loadable({ loader, loading });

// Our Lazy-loaded Page Components
const Home = load(() => import('./pages/Home'));
const About = load(() => import('./pages/About'));
const Article = load(() => import('./pages/Article'));
const Blog = load(() => import('./pages/Blog'));

// ...

// Assigning Routes to Components
<Route path="/" exact component={ Home } />
<Route path="/blog" exact component={ Blog } />
<Route path="/blog/:title" component={ Article } />
<Route path="/about" exact component={ About } />
```

At this point, your `routes` option will see:

* `'./pages/Home'`
* `'./pages/About'`
* `'./pages/Article'`
* `'./pages/Blog'`

As a function, `routes` should look like this:

```js
routes(str) {
  let out = str.replace('./pages', '').toLowerCase();
  if (out === '/article') return '/blog/:title';
  if (out === '/home') return '/';
  return out;
}
```

As an object, `routes` should look like this:

```js
routes: {
  './pages/Home': '/',
  './pages/About': '/about',
  './pages/Article': '/blog/:title',
  './pages/Blog': '/blog'
}
```


#### options.assets
Type: `Function` or `Object`

Optionally customize the `type` or `as` value of an asset.

> **Important:** You may also return a falsey value to exclude the asset from the manifest.

The `assets` option receives the fully formed, public-facing URL of the file (aka, including [`output.publicPath`](https://webpack.js.org/configuration/output/#outputpublicpath)).

Your function or object must return a valid [resource "destination"](https://fetch.spec.whatwg.org/#concept-request-destination) value.

Below is the default `assets` parser:

```js
function assets(str) {
  if (/\.js$/i.test(str)) return 'script';
  if (/\.(svg|jpe?g|png)$/i.test(str)) return 'image';
  if (/\.(woff2?|otf|ttf|eot)$/i.test(str)) return 'font';
  if (/\.css$/i.test(str)) return 'style';
  return false;
}
```


#### options.headers
Type: `true` or `Function`

Optionally include (and customize) a "headers" section per manifest entry.

> **Important:** When configured, the output format of your manifest file will change! See [Manifest Contents](#manifest-contents)

When `true`, the default/internal function is used, which produces a [HTTP `Link` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Link) per pattern, pointing to the pattern's assets.

You may also provide a function to define your own `Link` header and/or add additional headers per route.<br>
This function will receive:

* `assets` – the `Array<Asset>` files for this route
* `pattern` – the current [route pattern](#route-patterns) string
* `filemap` – the entire manifest file mapping (`{ pattern: Asset[] }`)

> **Note:** An `Asset` is defined as `{ type: string, href: string }` shape.


#### options.filename
Type: `String`<br>
Default: `manifest.json`

The output filename for the manifest.

This file is written to disk, in a compiler's configured [`output.path`](https://webpack.js.org/configuration/output/#outputpath) directory.


#### options.minify
Type: `Boolean`<br>
Default: `false`

Minify the manifest's file contents.

#### options.sort
Type: `Boolean`<br>
Default: `true`

If route patterns should be sorted by specificity. By default, this is `true` as to ensure client consumers (eg, [`route-manifest`](https://github.com/lukeed/route-manifest)) find the correct entry for a URL path.

> **Note:** See `route-sort`s  [Specificity](https://github.com/lukeed/route-sort#specificity) explainer.

#### options.inline
Type: `Boolean`<br>
Default: `true`

Attempts to inline the manifest file directly into your main entry file (eg; `bundle.xxxxx.js`).<br>When successful, the manifest will be available globally as `window.__rmanifest`.

While not required, it is strongly recommended that this option remains enabled so that the manifest contents are available to your Application _immediately_ upon loading. This saves a network request and the trouble of coordinating subsequent prefetches.

> **Note:** The `manifest.json` file will still be written to disk for easier developer analysis.


## Route Patterns

The supported route pattern types are:

* static – `/users`
* named parameters – `/users/:id`
* nested parameters – `/users/:id/books/:title`
* optional parameters – `/users/:id?/books/:title?`
* suffixed parameters – `/movies/:title.mp4`, `/movies/:title.(mp4|mov)`
* wildcards – `/users/*`


## Manifest Contents

The manifest file contains a JSON object whose keys are the [route patterns](#route-patterns) you've defined for your application via the [`options.routes`](#optionsroutes) mapping.

> **Note:** There will often be a `"*"` key, which signifies your common/catch-all route.<br>
This typically contains your `bundle.(js|css)` files, and maybe some images that your main stylesheet requires.

Each key will point to an "Entry" item whose data type will vary depending on your [`options.headers`](#optionsheaders) configuration. Either way, this Entry will always contain an "Asset" array, so let's define that first:

```ts
interface Asset {
  type: string;
  href: string;
}
```

Now, without `options.headers` (default), the manifest pairs patterns directly to its list of Assets:

```ts
type Entry = Asset[];
// keys are `[pattern: string]`
type Manifest = Record<string, Entry>;
```

With `options.headers` configured, each manifest Entry becomes object containing "files" and "headers" keys:

```ts
interface Entry {
  files: Asset[];
  headers: any[]; // you decide its shape
}

// keys are `[pattern: string]`
type Manifest = Record<string, Entry>;
```

Lastly, if `options.headers === true`, the default function runs, providing you with this format:

```ts
interface Header {
  key: string;
  value: string;
}

interface Entry {
  files: Asset[];
  headers: Header[];
}

// keys are `[pattern: string]`
type Manifest = Record<string, Entry>;
```


## License

MIT © [Luke Edwards](https://lukeed.com)
