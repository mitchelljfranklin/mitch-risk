import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

type AssessmentInviteEmailProps = {
  vendorName: string;
  assessmentTitle: string;
  portalUrl: string;
  dueDate: string;
};

export function AssessmentInviteEmail({
  vendorName,
  assessmentTitle,
  portalUrl,
  dueDate,
}: AssessmentInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Complete your security questionnaire for {assessmentTitle}
      </Preview>
      <Body style={{ fontFamily: "sans-serif", padding: "32px" }}>
        <Container>
          <Heading as="h2">Security questionnaire</Heading>
          <Text>
            {vendorName} — you have been asked to complete a security
            questionnaire: <strong>{assessmentTitle}</strong>.
          </Text>
          {dueDate ? (
            <Text>
              Please submit your responses by <strong>{dueDate}</strong>.
            </Text>
          ) : null}
          <Button href={portalUrl}>Open questionnaire</Button>
          <Text style={{ marginTop: "24px", color: "#888", fontSize: "12px" }}>
            No login is required. You can save your progress and return later
            using the same link.
          </Text>
          <Text style={{ color: "#888", fontSize: "12px" }}>
            If the button does not work, copy and paste this link into your
            browser: <Link href={portalUrl}>{portalUrl}</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

AssessmentInviteEmail.PreviewProps = {
  vendorName: "Acme Logistics",
  assessmentTitle: "Annual security review",
  portalUrl: "https://mitch-risk.local/portal/abc123",
  dueDate: "15 August 2026",
} satisfies AssessmentInviteEmailProps;
