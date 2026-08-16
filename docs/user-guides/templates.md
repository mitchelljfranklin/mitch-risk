# Templates

Templates are reusable questionnaire blueprints. They define the structure (sections, questions, risk weights, control mappings) that assessments are built from.

Four complete templates ship out of the box — **NIST CSF 2.0**, **ISO 27001**, **SOC 2**, and **Essential Eight** — each covering every control in its framework (one auto-scored question per control), alongside shorter "Starter" templates.

## Template Structure

```
Template
  ├── Section 1 (title, order)
  │   ├── Question 1 (text, type, riskWeight, expectedAnswer, options, conditionalLogic, controlIds, helpText)
  │   └── Question 2
  └── Section 2
      ├── Question 3
      └── Question 4
```

Each question is a self-contained unit with its own type, risk weight, expected answer, and framework control mappings. When an assessment is created, questions are **frozen** into the assessment — editing the template afterward does not affect existing assessments.

## Help Text (Markdown)

Each question can include optional **help text** — supplementary guidance displayed to the vendor in the questionnaire portal. Help text is written using a WYSIWYG Markdown editor with a toolbar for bold, italic, lists, links, and other formatting.

Help text is rendered as rich Markdown in the vendor portal and the template preview, helping vendors understand what each question is asking for. Existing plain text continues to work — it is already valid Markdown.

## Question Types

12 question types are supported:

| Type | Description | Auto-Scored |
|------|-------------|:-----------:|
| `YES_NO` | Binary yes/no choice | Yes |
| `MULTIPLE_CHOICE` | Single selection from a list | Yes |
| `FREE_TEXT` | Open-ended text input | No |
| `FILE_UPLOAD` | File attachment (evidence) | No |
| `DATE` | Calendar date picker | No |
| `NUMERIC` | Number input | Yes |
| `COMBOBOX` | Dropdown with single selection | Yes |
| `MULTI_SELECT` | Multiple selections from a list | Yes |
| `RATING` | Numeric rating (e.g. 1-5) | Yes |
| `URL` | URL input | No |
| `EMAIL` | Email input | No |
| `CHECKBOX` | Boolean true/false | Yes |

> **Note:** Non-scorable types (Free Text, File Upload, Date, URL, Email) require manual review. They are excluded from the auto-score calculation.

## Risk Weights

Each question carries a risk weight that determines its contribution to the overall score:

| Risk Weight | Value | Description |
|-------------|:-----:|-------------|
| `CRITICAL` | 10 | Essential control — failure is high-risk |
| `HIGH` | 6 | Important control with significant security impact |
| `MEDIUM` | 3 | Standard control with moderate impact |
| `LOW` | 1 | Good-to-have control with minimal direct risk |

Weights are configurable in Settings → Scoring. The default values above can be adjusted to match your organisation's risk appetite.

## Expected Answers

Expected answers define the compliant response for auto-scored questions. The scoring engine compares the vendor's answer against this value:

- For `YES_NO`: string equality
- For `MULTIPLE_CHOICE` and `COMBOBOX`: string equality, or **any-of** — a list of accepted answers (the vendor's single selection is compliant if it matches any entry)
- For `NUMERIC` and `RATING`: numeric equality
- For `MULTI_SELECT`: sorted array comparison (same length, all values match)
- For `CHECKBOX`: boolean comparison

Single-choice questions (`MULTIPLE_CHOICE`, `COMBOBOX`) can define multiple accepted answers. For example, a maturity-scale question with options `Not Done`, `Implemented`, `Optimized`, `Perfect` could accept `Optimized` and `Perfect` — either answer is compliant. In the question editor this is a checkbox list over the defined options.

Questions without an expected answer (or with unscorable types) are excluded from the score.

## Conditional Logic

Show or hide questions based on previous answers using condition rules stored as JSON:

```json
{
  "match": "all",
  "rules": [
    { "questionId": "<question-id>", "operator": "equals", "value": "YES" }
  ]
}
```

| Field | Description |
|-------|-------------|
| `match` | `"all"` for AND logic, `"any"` for OR logic |
| `rules` | Array of condition objects |
| `questionId` | The ID of the controlling question |
| `operator` | `equals`, `notEquals`, `contains`, `notContains`, `gt`, `lt`, `gte`, `lte`, `answered`, `notAnswered` |
| `value` | The value to compare against |

Conditional logic is evaluated client-side in the portal and server-side during submission — hidden questions cannot be answered or submitted.

## Control Mapping

Each question can map to multiple framework controls. This is the link between assessment answers and compliance:

- One question can map to controls across **different frameworks** simultaneously
- A question about business continuity, for example, might map to ISO 27001 A.5.29, SOC 2 CC7.1, and NIST CSF RC.RP-01
- When an answer is non-compliant, findings are generated with the mapped control codes
- Control mapping is configured in the question editor via the framework picker

## Publishing States

Templates have three states that control their availability:

| State | Description |
|-------|-------------|
| **Draft** | Editable, not visible for assessment creation. Default state for new templates. |
| **Published** | Read-only, available for assessment creation. Can be versioned. |
| **Archived** | Hidden from active use. Existing assessments using this template are unaffected. |

> Templates must be published before they can be used to create assessments. Unpublishing returns a template to Draft state. Versioning creates a new editable draft while preserving the published version.

## Template Import (JSON)

Import a complete template definition from a JSON file using a step-by-step wizard.

1. Navigate to **Templates → Import**.
2. **Upload** — Select a JSON file, or download the JSON template from the link provided on the page. The app parses the file and shows a preview with section and question counts.
3. **Review** — Confirm the import. Click **Import template** to create the template.

The JSON structure must match the template schema (`name`, optional `description`, `sections` array with `questions`). Each question requires `text`, `type`, and `riskWeight` at minimum. Optional per-question fields are `helpText`, `required`, `options`, `expectedAnswer`, `conditionalLogic`, and `controlCodes`. Control codes in questions must reference existing controls from a seeded framework. Max file size: 1 MB.

The `expectedAnswer` value must match the question type:

| Type | `expectedAnswer` JSON type |
|------|---------------------------|
| `YES_NO`, `CHECKBOX` | string |
| `MULTIPLE_CHOICE`, `COMBOBOX` | string, or array of strings (any-of accepted answers) |
| `NUMERIC`, `RATING` | number |
| `MULTI_SELECT` | array of strings |

Imports with a mismatched `expectedAnswer` shape are rejected with an error.
