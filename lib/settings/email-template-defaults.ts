import { type Locale } from "@/lib/i18n/config";

import { emailTemplateSchema, type EmailTemplateSettings } from "./schema";

const englishDefaults: EmailTemplateSettings = emailTemplateSchema.parse({});

const spanishDefaults: EmailTemplateSettings = {
  inviteSubject: "Cuestionario de seguridad: {{assessmentTitle}}",
  inviteBody:
    "{{vendorName}}, se te ha pedido completar el cuestionario de seguridad: {{assessmentTitle}}. Envíalo antes del {{dueDate}}.\n\nAbrir: {{portalUrl}}\n\nNo se requiere iniciar sesión. Puedes guardar tu progreso y volver más tarde con el mismo enlace.",
  reminderSubject: "Recordatorio: {{assessmentTitle}} vence el {{dueDate}}",
  reminderBody:
    "{{vendorName}}, este es un recordatorio para completar tu cuestionario de seguridad: {{assessmentTitle}}. Vence el {{dueDate}}.\n\nAbrir: {{portalUrl}}",
  escalationSubject: "Vencido: {{assessmentTitle}} — {{vendorName}}",
  escalationBody:
    "{{reviewerName}}, el cuestionario {{assessmentTitle}} enviado a {{vendorName}} está vencido.\n\nVer la evaluación: {{assessmentUrl}}",
  submissionSubject:
    "{{vendorName}} ha enviado {{assessmentTitle}} para revisión",
  submissionBody:
    "{{reviewerName}}, {{vendorName}} ha enviado su cuestionario de seguridad: {{assessmentTitle}}.\n\nVer la evaluación: {{assessmentUrl}}",
  clarificationSubject: "Se necesita más información: {{assessmentTitle}}",
  clarificationBody:
    "{{vendorName}}, tu cuestionario de seguridad {{assessmentTitle}} se ha devuelto para solicitar más información.\n\n{{message}}\n\nRevisa los elementos solicitados y vuelve a enviarlo: {{portalUrl}}\n\nTus respuestas anteriores se han guardado.",
  resetSubject: "Restablecimiento de contraseña",
  resetBody:
    "Se ha solicitado restablecer la contraseña de tu cuenta de {{appName}}.\n\nHaz clic aquí para restablecer tu contraseña: {{resetUrl}}\n\nEste enlace caduca en {{expiresIn}}.",
  expirySubject: "Caduca pronto: {{itemName}} de {{vendorName}}",
  expiryBody:
    "{{itemName}} de {{vendorName}} caduca el {{expiresDate}}.\n\nRevisa el proveedor y programa una reevaluación o renovación: {{vendorUrl}}",
  invitePasswordSubject: "Cuestionario de seguridad: {{assessmentTitle}}",
  invitePasswordBody:
    "{{vendorName}}, se te ha pedido completar el cuestionario de seguridad: {{assessmentTitle}}. Envíalo antes del {{dueDate}}.\n\nEste cuestionario está protegido con contraseña.\nTu contraseña: {{portalPassword}}\n\nAbrir: {{portalUrl}}\n\nTus respuestas se guardan automáticamente. Puedes cerrar esta página y volver con el mismo enlace cuando quieras.",
};

const LOCALIZED_DEFAULTS: Record<Locale, EmailTemplateSettings> = {
  en: englishDefaults,
  es: spanishDefaults,
};

export function getEmailTemplateDefaults(
  locale: Locale,
): EmailTemplateSettings {
  return LOCALIZED_DEFAULTS[locale];
}

export function localizeEmailTemplates(
  stored: EmailTemplateSettings,
  locale: Locale,
): EmailTemplateSettings {
  if (locale === "en") return stored;

  const localized: EmailTemplateSettings = { ...stored };
  for (const key of Object.keys(stored) as (keyof EmailTemplateSettings)[]) {
    if (stored[key] === englishDefaults[key]) {
      localized[key] = LOCALIZED_DEFAULTS[locale][key];
    }
  }
  return localized;
}
