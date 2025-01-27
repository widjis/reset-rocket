import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { number, message } = await req.json()
    
    console.log(`Attempting to send WhatsApp message to ${number}`)

    try {
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

      console.log(`WhatsApp API response status: ${response.status}`)
      const responseText = await response.text()
      console.log(`WhatsApp API response: ${responseText}`)

      if (!response.ok) {
        throw new Error(`WhatsApp API responded with status: ${response.status}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Message sent successfully',
          details: responseText 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } catch (whatsappError) {
      console.error('Error connecting to WhatsApp service:', whatsappError)
      
      // For development purposes, simulate success
      // Remove this in production
      console.log('Simulating successful message send for development')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Message simulated (development mode)',
          debug: 'WhatsApp service not available, simulating success'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'Error occurred while processing the request' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})