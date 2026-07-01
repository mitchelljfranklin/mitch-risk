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

type ReminderEmailProps = {
  vendorName: string;
  assessmentTitle: string;
  portalUrl: string;
  dueDate: string;
};

export function ReminderEmail({
  vendorName,
  assessmentTitle,
  portalUrl,
  dueDate,
}: ReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Reminder: your security questionnaire is due on {dueDate}
      </Preview>
      <Body style={{ fontFamily: "sans-serif", padding: "32px" }}>
        <Container>
          <Heading as="h2">Reminder: questionnaire due soon</Heading>
          <Text>
            {vendorName} — this is a reminder to complete your security
            questionnaire: <strong>{assessmentTitle}</strong>.
          </Text>
          <Text>
            Your responses are due by <strong>{dueDate}</strong>.
          </Text>
          <Button href={portalUrl}>Open questionnaire</Button>
          <Text style={{ marginTop: "24px", color: "#888", fontSize: "12px" }}>
            No login is required. You can save your progress and return later
            using the same link.
          </Text>
          <Text style={{ color: "#888", fontSize: "12px" }}>
            Link: <Link href={portalUrl}>{portalUrl}</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

ReminderEmail.PreviewProps = {
  vendorName: "Acme Logistics",
  assessmentTitle: "Annual security review",
  portalUrl: "https://mitch-risk.local/portal/abc123",
  dueDate: "15 August 2026",
} satisfies ReminderEmailProps;
