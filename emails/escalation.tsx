import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

type EscalationEmailProps = {
  reviewerName: string;
  vendorName: string;
  assessmentTitle: string;
  assessmentUrl: string;
};

export function EscalationEmail({
  reviewerName,
  vendorName,
  assessmentTitle,
  assessmentUrl,
}: EscalationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {vendorName} has not completed their security questionnaire
      </Preview>
      <Body style={{ fontFamily: "sans-serif", padding: "32px" }}>
        <Container>
          <Heading as="h2">Overdue questionnaire</Heading>
          <Text>
            {reviewerName} — the security questionnaire{" "}
            <strong>{assessmentTitle}</strong> sent to {vendorName} is now
            overdue.
          </Text>
          <Text>
            Please follow up with the vendor or review the assessment status:{" "}
            <Link href={assessmentUrl}>{assessmentUrl}</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

EscalationEmail.PreviewProps = {
  reviewerName: "Jane Reviewer",
  vendorName: "Acme Logistics",
  assessmentTitle: "Annual security review",
  assessmentUrl: "https://mitch-risk.local/assessments/abc123",
} satisfies EscalationEmailProps;
