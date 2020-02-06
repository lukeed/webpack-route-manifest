declare namespace Manifest {
	type Pattern = string;
	type Filter<T> = T | false | void | null;

	interface Asset {
		type: string;
		href: string;
	}

	type FileMap = Record<Pattern, Asset[]>;

	interface Options {
		routes: Record<string, Pattern> | ((input: string) => Filter<Pattern>);
		assets?: Record<string, string> | ((filepath: string) => Filter<string>);
		headers?: true | ((files: Asset[], pattern: Pattern, filemap: FileMap) => any[]);
		filename?: string;
		minify?: boolean;
		sort?: boolean;
		inline?: boolean;
	}
}

declare class Manifest {
	constructor(opts: Manifest.Options);
	run(compilation: any): void;
	apply(compiler: any): void;
}

export = Manifest;
