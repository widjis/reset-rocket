import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { number, message } = await req.json()

    // Make request to local WhatsApp service
    const response = await fetch('http://localhost:8192/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        message: message,
        number: number
      })
    })

    if (!response.ok) {
      throw new Error(`WhatsApp API responded with status: ${response.status}`)
    }

    const result = await response.text()
    
    return new Response(
      JSON.stringify({ success: true, message: 'Message sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})