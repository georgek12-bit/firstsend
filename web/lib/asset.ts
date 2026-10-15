/** Path to a file in public/, including the base path when the site is served from a sub-path. */
export const asset = (path: string) => (process.env.NEXT_PUBLIC_BASE_PATH || '') + path;
