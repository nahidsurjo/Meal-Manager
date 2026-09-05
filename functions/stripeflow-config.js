export async function onRequestGet(context) {
  const url = context.env.STRIPEFLOW_SUPABASE_URL || '';
  const key = context.env.STRIPEFLOW_SUPABASE_PUBLISHABLE_KEY || '';
  const workspaceId = context.env.STRIPEFLOW_WORKSPACE_ID || '00000000-0000-0000-0000-000000000001';

  return new Response(JSON.stringify({ url, key, workspaceId }), {
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store'
    }
  });
}
