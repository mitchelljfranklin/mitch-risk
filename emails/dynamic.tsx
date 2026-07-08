import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Text,
} from "@react-email/components";

type DynamicEmailProps = {
  heading: string;
  body: string;
  htmlBody?: string;
};

export function DynamicEmail({ heading, body, htmlBody }: DynamicEmailProps) {
  const paragraphs = body.split("\n").filter((line) => line.length > 0);

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", padding: "32px" }}>
        <Container>
          <Heading as="h2">{heading}</Heading>
          {htmlBody ? (
            <section
              style={{ lineHeight: "1.6", color: "#333" }}
              dangerouslySetInnerHTML={{ __html: htmlBody }}
            />
          ) : (
            paragraphs.map((line) => (
              <Text key={line.slice(0, 20)}>{line}</Text>
            ))
          )}

          <Text
            style={{
              marginTop: "32px",
              color: "#888",
              fontSize: "12px",
            }}
          >
            This email was sent by mitch-risk. If the button does not work, copy
            and paste the link into your browser.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

DynamicEmail.PreviewProps = {
  heading: "Annual review",
  body: "Acme Logistics, you have been asked to complete the security questionnaire: Annual review.\n\nPlease submit by 2026-08-15.\n\nOpen: https://mitch-risk.local/portal/abc123",
} satisfies DynamicEmailProps;
