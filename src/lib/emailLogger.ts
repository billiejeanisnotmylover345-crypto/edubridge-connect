import { supabase } from "@/integrations/supabase/client";

interface EmailLogParams {
  recipientId: string;
  emailType: "mentor_assignment" | "session_scheduled" | "question_answered";
  subject: string;
  body: string;
}

export const logMockEmail = async ({ recipientId, emailType, subject, body }: EmailLogParams) => {
  try {
    await supabase.from("email_logs").insert({
      recipient_id: recipientId,
      email_type: emailType,
      subject,
      body,
    });
    console.log(`[Mock Email] To: ${recipientId} | Type: ${emailType} | Subject: ${subject}`);
  } catch (err) {
    console.error("[Mock Email] Failed to log:", err);
  }
};
