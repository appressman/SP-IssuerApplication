export function getDb(platform: App.Platform | undefined): D1Database {
	if (!platform?.env?.DB) {
		throw new Error('Database not available. Check D1 binding configuration.');
	}
	return platform.env.DB;
}
