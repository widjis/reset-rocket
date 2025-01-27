import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Verify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const email = searchParams.get("email");
        const token = searchParams.get("token");
        const step = searchParams.get("step");

        if (!email || !token || !step) {
          throw new Error("Invalid verification link");
        }

        console.log("Verifying token for email:", email);

        // Verify the token
        const { data: verificationData, error: verificationError } = await supabase
          .from("verification_tokens")
          .select("*")
          .eq("email", email)
          .eq("token", token)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .single();

        console.log("Verification data:", verificationData);
        console.log("Verification error:", verificationError);

        if (verificationError || !verificationData) {
          throw new Error("Invalid or expired verification token");
        }

        // Mark token as used
        const { error: updateError } = await supabase
          .from("verification_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("id", verificationData.id);

        if (updateError) {
          console.error("Error updating token:", updateError);
          throw new Error("Failed to process verification");
        }

        // Redirect to the account recovery process with the verified email
        navigate(`/?verified_email=${encodeURIComponent(email)}&step=${step}`);
        
        toast({
          title: "Email Verified",
          description: "Your email has been verified. You can now continue with the account recovery process.",
        });
      } catch (error: any) {
        console.error("Verification error:", error);
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: error.message,
        });
        navigate("/");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-0 bg-white/90 backdrop-blur">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Email Verification
          </CardTitle>
          <CardDescription className="text-center">
            {isVerifying ? "Verifying your email..." : "Verification complete"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {isVerifying ? (
            <div className="animate-pulse">Please wait while we verify your email...</div>
          ) : (
            <div>You will be redirected automatically...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Verify;