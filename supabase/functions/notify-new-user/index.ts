import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const email = payload.user?.email ?? 'usuario desconhecido'
    const isNewUser = payload.event === 'USER_CREATED'

    await fetch('https://ntfy.sh/FLIX', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Title': isNewUser ? 'Novo usuario no FLIX!' : 'Login no FLIX!',
        'Priority': isNewUser ? 'high' : 'default',
      },
      body: isNewUser
        ? `Oba! ${email} se cadastrou no FLIX!`
        : `${email} acabou de entrar no FLIX!`,
    })

    return new Response(JSON.stringify({ message: 'ok' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})