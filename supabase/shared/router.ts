// Tiny path-matching helper so "GET the collection" and "GET one resource by id" can be real,
// separate routes (`GET /` vs `GET /:id`) instead of the same route branching on `?id=` in the
// query string — see CLAUDE.md's "Write them as normal REST APIs" for why. Deliberately minimal:
// this app never needs more than one dynamic segment per resource (`/:id`), so there's no need
// for a real path-templating library.

export type RouteTable<Ctx> = Record<string, (ctx: Ctx) => Promise<unknown>>;

export type Match<Ctx> = { handler: (ctx: Ctx) => Promise<unknown>; id?: string };

/** `subPath` is already stripped down to this function's own path (see each resource's own
 * `subPath()`), e.g. `/` or `/abc123`. Tries an exact match first (`GET /`, `POST /`); a single
 * remaining segment with no exact match falls back to that method's own `/:id` entry, if the
 * route table has one — the id is decoded and handed back separately rather than re-parsed by
 * every handler. */
export function matchRoute<Ctx>(method: string, subPath: string, routes: RouteTable<Ctx>): Match<Ctx> | null {
  const exact = routes[`${method} ${subPath}`];
  if (exact) return { handler: exact };

  const segments = subPath.split('/').filter(Boolean);
  if (segments.length === 1) {
    const wildcard = routes[`${method} /:id`];
    if (wildcard) return { handler: wildcard, id: decodeURIComponent(segments[0]) };
  }

  return null;
}
