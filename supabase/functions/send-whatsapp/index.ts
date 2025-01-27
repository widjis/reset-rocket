import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { number, message } = await req.json()

    // Format phone number (remove any non-numeric characters)
    const formattedNumber = number.replace(/\D/g, '')

    // Construct the CallMeBot API URL
    const apiUrl = `https://api.callmebot.com/whatsapp.php?phone=${formattedNumber}&text=${encodeURIComponent(message)}&apikey=6139013`

    // Send the request to CallMeBot API
    const response = await fetch(apiUrl)
    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(`Failed to send WhatsApp message: ${responseText}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "WhatsApp message sent successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )

  } catch (error) {
    console.error("Error sending WhatsApp message:", error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})