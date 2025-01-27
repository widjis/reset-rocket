import { supabase } from "@/integrations/supabase/client";

export const createSecurityQuestions = async (questions: { question: string }[]) => {
  const { data, error } = await supabase.functions.invoke('manage-security-questions', {
    body: {
      method: 'create',
      questions
    }
  });

  if (error) throw error;
  return data;
};