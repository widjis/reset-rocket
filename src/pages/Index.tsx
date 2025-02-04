import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const whatsappSchema = z.object({
  whatsapp: z.string().min(10, "Please enter a valid WhatsApp number"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Please enter a valid 6-digit OTP"),
});

const securityQuestions = [
  { id: "1", question: "What is your mother's maiden name?" },
  { id: "2", question: "What was the name of your first pet?" },
  { id: "3", question: "In which city were you born?" },
  { id: "4", question: "What was your childhood nickname?" },
  { id: "5", question: "What is the name of your favorite childhood teacher?" },
  { id: "custom", question: "Custom question" }
];

const securityQuestionSchema = z.object({
  questionId: z.string().optional(),
  customQuestion: z.string().optional(),
  answer: z.string().min(1, "Please provide an answer"),
}).refine(data => {
  if (data.questionId === 'custom') {
    return data.customQuestion && data.customQuestion.length > 0;
  }
  return true;
}, {
  message: "Please provide a custom question",
  path: ["customQuestion"],
});

const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Index = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const verifiedEmail = searchParams.get("verified_email");
    const redirectStep = searchParams.get("step");
    
    if (verifiedEmail && redirectStep) {
      emailForm.setValue("email", verifiedEmail);
      setStep(parseInt(redirectStep));
      toast({
        title: "Email Verified",
        description: "You can now continue with the account recovery process.",
      });
    }
  }, [searchParams]);

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  const whatsappForm = useForm<z.infer<typeof whatsappSchema>>({
    resolver: zodResolver(whatsappSchema),
    defaultValues: {
      whatsapp: "",
    },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const securityForm = useForm<z.infer<typeof securityQuestionSchema>>({
    resolver: zodResolver(securityQuestionSchema),
    defaultValues: {
      questionId: undefined,
      customQuestion: "",
      answer: "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onEmailSubmit = async (data: z.infer<typeof emailSchema>) => {
    setIsLoading(true);
    try {
      const { data: checkResult, error: checkError } = await supabase.functions.invoke('check-user-exists', {
        body: { email: data.email }
      });

      if (checkError) throw checkError;

      if (!checkResult.exists) {
        const verificationToken = crypto.randomUUID();
        const verificationLink = `${window.location.origin}/verify?email=${encodeURIComponent(data.email)}&token=${verificationToken}&step=2`;
        
        const { error: verificationError } = await supabase.functions.invoke('send-verification', {
          body: { 
            email: data.email,
            verificationLink,
            verificationToken
          }
        });

        if (verificationError) throw verificationError;

        toast({
          title: "Verification Email Sent",
          description: "Please check your email to verify your address and continue with the recovery process.",
        });
        return;
      }

      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(data.email);
      if (supabaseError) throw supabaseError;

      toast({
        title: "Password Reset Email Sent",
        description: "Please check your email for the password reset link.",
      });
      setStep(2);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onWhatsappSubmit = async (data: z.infer<typeof whatsappSchema>) => {
    setIsLoading(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      const { error: messageError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          number: data.whatsapp,
          message: `Your MTI verification code is: ${otp}`
        }
      });

      if (messageError) throw messageError;

      localStorage.setItem('expectedOtp', otp);
      
      toast({
        title: "OTP Sent",
        description: "Please check your WhatsApp for the OTP.",
      });
      setStep(3);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onOTPSubmit = async (data: z.infer<typeof otpSchema>) => {
    setIsLoading(true);
    try {
      const expectedOtp = localStorage.getItem('expectedOtp');
      
      if (data.otp === expectedOtp) {
        localStorage.removeItem('expectedOtp');
        toast({
          title: "OTP Verified",
          description: "OTP verification successful.",
        });
        setStep(4);
      } else {
        throw new Error('Invalid OTP. Please try again.');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSecurityQuestionSubmit = async (data: z.infer<typeof securityQuestionSchema>) => {
    setIsLoading(true);
    try {
      let questionId;
      
      if (data.questionId === 'custom' && data.customQuestion) {
        // Insert the custom question first
        const { data: questionData, error: questionError } = await supabase
          .from('security_questions')
          .insert([{ question: data.customQuestion }])
          .select('id')
          .single();

        if (questionError) throw questionError;
        questionId = questionData.id;
      } else if (data.questionId && data.questionId !== 'custom') {
        // Use existing question ID
        const { data: existingQuestion, error: existingQuestionError } = await supabase
          .from('security_questions')
          .select('id')
          .eq('id', data.questionId)
          .single();

        if (existingQuestionError) {
          // If question doesn't exist, create it
          const selectedQuestion = securityQuestions.find(q => q.id === data.questionId);
          if (!selectedQuestion) throw new Error("Invalid question selected");

          const { data: newQuestion, error: newQuestionError } = await supabase
            .from('security_questions')
            .insert([{ question: selectedQuestion.question }])
            .select('id')
            .single();

          if (newQuestionError) throw newQuestionError;
          questionId = newQuestion.id;
        } else {
          questionId = existingQuestion.id;
        }
      } else {
        throw new Error("Invalid question selection");
      }

      const { error: answerError } = await supabase
        .from('user_security_answers')
        .insert([
          {
            question_id: questionId,
            answer: data.answer,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            status: 'answered'
          }
        ]);

      if (answerError) throw answerError;

      toast({
        title: "Security Question Saved",
        description: "Your security question has been saved successfully.",
      });
      setStep(5);
    } catch (error: any) {
      console.error('Error saving security question:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (data: z.infer<typeof passwordSchema>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully.",
      });
      setStep(1);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="mb-8 text-center">
        <img 
          src="https://imip.co.id/wp-content/uploads/2024/09/MTI.png" 
          alt="MTI Logo" 
          className="h-16 mb-4 mx-auto"
        />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">PT Merdeka Tsingshan Indonesia</h1>
        <p className="text-gray-600">Account Recovery Portal</p>
      </div>

      <Card className="w-full max-w-md shadow-lg border-0 bg-white/90 backdrop-blur">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-gray-800">
            Account Recovery
          </CardTitle>
          <CardDescription className="text-center">
            Step {step} of 5: {
              step === 1 ? "Email Verification" :
              step === 2 ? "WhatsApp Verification" :
              step === 3 ? "OTP Verification" :
              step === 4 ? "Security Question" :
              "Reset Password"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your email" 
                          className="border-gray-300 focus:border-blue-500" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 transition-colors" 
                  disabled={isLoading}
                >
                  {isLoading ? "Checking..." : "Check Email"}
                </Button>
              </form>
            </Form>
          )}

          {step === 2 && (
            <Form {...whatsappForm}>
              <form onSubmit={whatsappForm.handleSubmit(onWhatsappSubmit)} className="space-y-4">
                <FormField
                  control={whatsappForm.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your WhatsApp number" 
                          className="border-gray-300 focus:border-blue-500"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send OTP"}
                </Button>
              </form>
            </Form>
          )}

          {step === 3 && (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-4">
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Enter OTP</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            placeholder="Enter 6-digit OTP"
                            className="text-center text-lg"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              if (value.length <= 6) {
                                field.onChange(value);
                              }
                            }}
                          />
                          <InputOTP
                            maxLength={6}
                            value={field.value}
                            onChange={field.onChange}
                            render={({ slots }) => (
                              <InputOTPGroup className="gap-2 justify-center">
                                {slots.map((slot, idx) => (
                                  <InputOTPSlot
                                    key={idx}
                                    {...slot}
                                    index={idx}
                                    className="w-10 h-12 text-center text-lg border-2 rounded-md focus:border-blue-500"
                                  />
                                ))}
                              </InputOTPGroup>
                            )}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </Button>
              </form>
            </Form>
          )}

          {step === 4 && (
            <Form {...securityForm}>
              <form onSubmit={securityForm.handleSubmit(onSecurityQuestionSubmit)} className="space-y-4">
                <FormField
                  control={securityForm.control}
                  name="questionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Question</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a security question" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {securityQuestions.map((q) => (
                            <SelectItem key={q.id} value={q.id}>
                              {q.question}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {securityForm.watch("questionId") === "custom" && (
                  <FormField
                    control={securityForm.control}
                    name="customQuestion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Question</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your custom security question" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={securityForm.control}
                  name="answer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Answer</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your answer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Security Question"}
                </Button>
              </form>
            </Form>
          )}

          {step === 5 && (
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
