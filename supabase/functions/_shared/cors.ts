// CORS + the one reply shape every function uses. Shared so a new resource
// can't drift from "failures are always `{ error: string }`".

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
};

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Fail a request with a specific status from anywhere inside a handler. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
