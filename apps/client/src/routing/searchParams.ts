import { z } from 'zod';

// TanStack Router JSON-parses each value, so a scalar (`?token=123` arrives as a number) is turned
// back into text; a structured value (a repeated key's array, a `{…}` object) is malformed.
const searchText = z.union([z.string(), z.number(), z.boolean()]).transform(String);

/** An optional text search param; a malformed value falls back to absent. */
export const optionalSearchText = () => searchText.optional().catch(undefined);

/** An optional error code; a malformed one still reads as an error, just an unrecognised one. */
export const optionalSearchError = () => searchText.optional().catch('MALFORMED');
