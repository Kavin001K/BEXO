import React from "react";
import { LegalView, LegalSection } from "@/components/LegalView";

export default function PrivacyPolicy() {
  return (
    <LegalView title="Privacy Policy" lastUpdated="May 14, 2026">
      <LegalSection title="1. Introduction">
        Welcome to BEXO. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us at privacy@bexo.ai.
      </LegalSection>

      <LegalSection title="2. Information We Collect">
        We collect personal information that you voluntarily provide to us when you express an interest in obtaining information about us or our products, such as your email address when joining our waitlist, and professional data if you use our resume parsing features.
      </LegalSection>

      <LegalSection title="3. How We Use Your Information">
        We use personal information collected via our Services for a variety of business purposes described below:
        • To facilitate account creation and logon process.
        • To send you marketing and promotional communications.
        • To deliver and facilitate delivery of services to the user.
        • To respond to user inquiries and offer support.
      </LegalSection>

      <LegalSection title="4. Data Security">
        We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.
      </LegalSection>

      <LegalSection title="5. AI Processing">
        Our platform utilizes Advanced AI models (including Google Gemini) to process and analyze portfolio data. This processing is performed to provide you with automated insights and structural improvements. We do not use your private portfolio data to train foundation models without your explicit consent.
      </LegalSection>

      <LegalSection title="6. Your Privacy Rights">
        Depending on your location, you may have certain rights regarding your personal data, including the right to access, correct, or delete the information we hold about you. You can exercise these rights by contacting us.
      </LegalSection>

      <LegalSection title="7. Updates to This Policy">
        We may update this privacy policy from time to time. The updated version will be indicated by an updated "Last Updated" date and the updated version will be effective as soon as it is accessible.
      </LegalSection>
    </LegalView>
  );
}
