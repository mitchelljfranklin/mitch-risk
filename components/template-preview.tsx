import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type TemplateForBuilder } from "@/lib/db/templates";
import ReactMarkdown from "react-markdown";
import { summarizeConditionalLogic } from "@/lib/portal";

type PreviewQuestion =
  TemplateForBuilder["sections"][number]["questions"][number];

function toOptions(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function QuestionPreview({ question }: { question: PreviewQuestion }) {
  const options = toOptions(question.options);

  switch (question.type) {
    case "YES_NO":
      return (
        <div className="flex gap-4">
          {["Yes", "No"].map((label) => (
            <label
              key={label}
              className="text-muted-foreground flex items-center gap-2 text-sm"
            >
              <input type="radio" disabled /> {label}
            </label>
          ))}
        </div>
      );
    case "MULTIPLE_CHOICE":
      return (
        <div className="flex flex-col gap-1.5">
          {options.map((option) => (
            <label
              key={option}
              className="text-muted-foreground flex items-center gap-2 text-sm"
            >
              <input type="radio" disabled /> {option}
            </label>
          ))}
        </div>
      );
    case "MULTI_SELECT":
      return (
        <div className="flex flex-col gap-1.5">
          {options.map((option) => (
            <label
              key={option}
              className="text-muted-foreground flex items-center gap-2 text-sm"
            >
              <Checkbox disabled /> {option}
            </label>
          ))}
        </div>
      );
    case "COMBOBOX":
      return (
        <select
          disabled
          className="border-input bg-muted/40 h-9 w-full max-w-sm rounded-md border px-2 text-sm"
        >
          <option>Select…</option>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      );
    case "FREE_TEXT":
      return <Textarea disabled rows={3} placeholder="Free-text answer" />;
    case "FILE_UPLOAD":
      return (
        <div className="border-input text-muted-foreground rounded-md border border-dashed p-3 text-sm">
          Attachment upload
        </div>
      );
    case "DATE":
      return <Input type="date" disabled className="max-w-xs" />;
    case "NUMERIC":
    case "RATING":
      return (
        <Input
          type="number"
          disabled
          placeholder={question.type === "RATING" ? "1–5" : "Number"}
          className="max-w-xs"
        />
      );
    case "URL":
      return (
        <Input
          type="url"
          disabled
          placeholder="https://…"
          className="max-w-sm"
        />
      );
    case "EMAIL":
      return (
        <Input
          type="email"
          disabled
          placeholder="name@example.com"
          className="max-w-sm"
        />
      );
    case "CHECKBOX":
      return (
        <label className="text-muted-foreground flex items-center gap-2 text-sm">
          <Checkbox disabled /> I acknowledge
        </label>
      );
    default:
      return null;
  }
}

export function TemplatePreview({
  template,
}: {
  template: TemplateForBuilder;
}) {
  const questionText = new Map<string, string>();
  for (const section of template.sections) {
    for (const question of section.questions) {
      questionText.set(question.id, question.text);
    }
  }

  if (template.sections.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        This template has no sections yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {template.sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {section.questions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No questions.</p>
            ) : (
              section.questions.map((question) => {
                const condition = summarizeConditionalLogic(
                  question.conditionalLogic,
                  questionText,
                );
                return (
                  <div key={question.id} className="flex flex-col gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {question.text}
                        {question.required ? (
                          <span className="text-destructive"> *</span>
                        ) : null}
                      </p>
                      {question.helpText ? (
                        <div className="text-muted-foreground prose prose-xs dark:prose-invert max-w-none text-xs">
                          <ReactMarkdown>{question.helpText}</ReactMarkdown>
                        </div>
                      ) : null}
                      {condition ? (
                        <p className="text-muted-foreground text-xs italic">
                          {condition}
                        </p>
                      ) : null}
                    </div>
                    <QuestionPreview question={question} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
