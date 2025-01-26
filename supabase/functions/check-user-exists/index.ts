import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, captchaToken } = await req.json()
    
    // Verify captcha token
    const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: new URLSearchParams({
        secret: Deno.env.get('RECAPTCHA_SECRET_KEY') || '',
        response: captchaToken,
      }),
    })

    const recaptchaData = await recaptchaResponse.json()
    
    if (!recaptchaData.success) {
      throw new Error('Invalid captcha')
    }

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: users, error } = await supabaseClient.auth.admin.listUsers()

    if (error) throw error

    const userExists = users.users.some(user => user.email === email)

    return new Response(
      JSON.stringify({ exists: userExists }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})