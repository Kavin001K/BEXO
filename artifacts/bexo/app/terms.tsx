import React from "react";
import { LegalView, LegalSection } from "@/components/LegalView";

export default function TermsOfService() {
  return (
    <LegalView title="Terms of Service" lastUpdated="May 14, 2026">
      <LegalSection title="1. Agreement to Terms">
        By accessing or using BEXO, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service. These terms apply to all visitors, users, and others who access or use the Service.
      </LegalSection>

      <LegalSection title="2. Intellectual Property">
        The Service and its original content, features, and functionality are and will remain the exclusive property of BEXO and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of BEXO.
      </LegalSection>

      <LegalSection title="3. User Generated Content">
        Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the Content that you post to the Service, including its legality, reliability, and appropriateness.
      </LegalSection>

      <LegalSection title="4. Prohibited Uses">
        You may use the Service only for lawful purposes and in accordance with Terms. You agree not to use the Service:
        • In any way that violates any applicable national or international law.
        • To transmit, or procure the sending of, any advertising or promotional material.
        • To impersonate or attempt to impersonate BEXO, a BEXO employee, or another user.
      </LegalSection>

      <LegalSection title="5. AI-Assisted Content">
        BEXO provides AI-driven tools for portfolio creation. While we strive for high-quality outputs, BEXO does not guarantee the accuracy or suitability of AI-generated content for specific professional applications. Users maintain full responsibility for the final content published via their portfolios.
      </LegalSection>

      <LegalSection title="6. Termination">
        We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
      </LegalSection>

      <LegalSection title="7. Limitation of Liability">
        In no event shall BEXO, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
      </LegalSection>

      <LegalSection title="8. Governing Law">
        These Terms shall be governed and construed in accordance with the laws of Delaware, United States, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
      </LegalSection>
    </LegalView>
  );
}
