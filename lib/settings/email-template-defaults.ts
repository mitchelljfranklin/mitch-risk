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

const frenchDefaults: EmailTemplateSettings = {
  inviteSubject: "Questionnaire de sécurité : {{assessmentTitle}}",
  inviteBody:
    "{{vendorName}}, il vous a été demandé de remplir le questionnaire de sécurité : {{assessmentTitle}}. Veuillez soumettre avant le {{dueDate}}.\n\nOuvert : {{portalUrl}}\n\nAucune connexion n'est requise. Vous pouvez enregistrer votre progression et revenir plus tard en utilisant le même lien.",
  reminderSubject: "Rappel : {{assessmentTitle}} dû le {{dueDate}}",
  reminderBody:
    "{{vendorName}}, ceci est un rappel pour remplir votre questionnaire de sécurité : {{assessmentTitle}}. Il est dû avant le {{dueDate}}.\n\nOuvert : {{portalUrl}}",
  escalationSubject: "En retard : {{assessmentTitle}} — {{vendorName}}",
  escalationBody:
    "{{reviewerName}}, le questionnaire {{assessmentTitle}} envoyé à {{vendorName}} est désormais en retard.\n\nAfficher l'évaluation : {{assessmentUrl}}",
  submissionSubject: "{{vendorName}} a soumis {{assessmentTitle}} pour examen",
  submissionBody:
    "{{reviewerName}}, {{vendorName}} a soumis son questionnaire de sécurité : {{assessmentTitle}}.\n\nAfficher l'évaluation : {{assessmentUrl}}",
  clarificationSubject: "Plus d'informations nécessaires : {{assessmentTitle}}",
  clarificationBody:
    "{{vendorName}}, votre questionnaire de sécurité {{assessmentTitle}} a été renvoyé pour plus d'informations.\n\n{{message}}\n\nVeuillez examiner les éléments demandés et soumettre à nouveau : {{portalUrl}}\n\nVos réponses précédentes ont été enregistrées.",
  resetSubject: "Réinitialisation du mot de passe",
  resetBody:
    "Une réinitialisation du mot de passe a été demandée pour votre compte {{appName}}.\n\nCliquez ici pour réinitialiser votre mot de passe : {{resetUrl}}\n\nCe lien expire dans {{expiresIn}}.",
  expirySubject: "Expire bientôt : {{itemName}} pour {{vendorName}}",
  expiryBody:
    "{{itemName}} pour {{vendorName}} expire le {{expiresDate}}.\n\nExaminez le fournisseur et organisez une réévaluation ou un renouvellement : {{vendorUrl}}",
  invitePasswordSubject: "Questionnaire de sécurité : {{assessmentTitle}}",
  invitePasswordBody:
    "{{vendorName}}, il vous a été demandé de remplir le questionnaire de sécurité : {{assessmentTitle}}. Veuillez soumettre avant le {{dueDate}}.\n\nCe questionnaire est protégé par mot de passe.\nVotre mot de passe : {{portalPassword}}\n\nOuvert : {{portalUrl}}\n\nVos réponses sont enregistrées automatiquement. Vous pouvez fermer cette page et revenir en utilisant le même lien à tout moment.",
};

const germanDefaults: EmailTemplateSettings = {
  inviteSubject: "Sicherheitsfragebogen: {{assessmentTitle}}",
  inviteBody:
    "{{vendorName}}, Sie wurden gebeten, den Sicherheitsfragebogen auszufüllen: {{assessmentTitle}}. Bitte reichen Sie es bis zum {{dueDate}} ein.\n\nÖffnen: {{portalUrl}}\n\nEs ist keine Anmeldung erforderlich. Sie können Ihren Fortschritt speichern und später über denselben Link zurückkehren.",
  reminderSubject: "Erinnerung: {{assessmentTitle}} fällig am {{dueDate}}",
  reminderBody:
    "{{vendorName}}, dies ist eine Erinnerung daran, Ihren Sicherheitsfragebogen auszufüllen: {{assessmentTitle}}. Es ist bis zum {{dueDate}} fällig.\n\nÖffnen: {{portalUrl}}",
  escalationSubject: "Überfällig: {{assessmentTitle}} – {{vendorName}}",
  escalationBody:
    "{{reviewerName}}, der an {{vendorName}} gesendete Fragebogen {{assessmentTitle}} ist jetzt überfällig.\n\nSehen Sie sich die Bewertung an: {{assessmentUrl}}",
  submissionSubject:
    "{{vendorName}} hat {{assessmentTitle}} zur Überprüfung eingereicht",
  submissionBody:
    "{{reviewerName}}, {{vendorName}} hat seinen Sicherheitsfragebogen eingereicht: {{assessmentTitle}}.\n\nSehen Sie sich die Bewertung an: {{assessmentUrl}}",
  clarificationSubject:
    "Weitere Informationen erforderlich: {{assessmentTitle}}",
  clarificationBody:
    "{{vendorName}}, Ihr Sicherheitsfragebogen {{assessmentTitle}} wurde für weitere Informationen zurückgesendet.\n\n{{message}}\n\nBitte überprüfen Sie die angeforderten Elemente und reichen Sie sie erneut ein: {{portalUrl}}\n\nIhre vorherigen Antworten wurden gespeichert.",
  resetSubject: "Passwort zurücksetzen",
  resetBody:
    "Für Ihr {{appName}}-Konto wurde eine Passwortzurücksetzung angefordert.\n\nKlicken Sie hier, um Ihr Passwort zurückzusetzen: {{resetUrl}}\n\nDieser Link läuft in {{expiresIn}} ab.",
  expirySubject: "Läuft bald ab: {{itemName}} für {{vendorName}}",
  expiryBody:
    "{{itemName}} für {{vendorName}} läuft am {{expiresDate}} ab.\n\nÜberprüfen Sie den Anbieter und vereinbaren Sie eine Neubewertung oder Verlängerung: {{vendorUrl}}",
  invitePasswordSubject: "Sicherheitsfragebogen: {{assessmentTitle}}",
  invitePasswordBody:
    "{{vendorName}}, Sie wurden gebeten, den Sicherheitsfragebogen auszufüllen: {{assessmentTitle}}. Bitte reichen Sie es bis zum {{dueDate}} ein.\n\nDieser Fragebogen ist passwortgeschützt.\nIhr Passwort: {{portalPassword}}\n\nÖffnen: {{portalUrl}}\n\nIhre Antworten werden automatisch gespeichert. Sie können diese Seite jederzeit schließen und über denselben Link zurückkehren.",
};

const portugueseDefaults: EmailTemplateSettings = {
  inviteSubject: "Questionário de segurança: {{assessmentTitle}}",
  inviteBody:
    "{{vendorName}}, você foi solicitado a preencher o questionário de segurança: {{assessmentTitle}}. Envie até {{dueDate}}.\n\nAbrir: {{portalUrl}}\n\nNenhum login é necessário. Você pode salvar seu progresso e retornar mais tarde usando o mesmo link.",
  reminderSubject: "Lembrete: {{assessmentTitle}} até {{dueDate}}",
  reminderBody:
    "{{vendorName}}, este é um lembrete para preencher seu questionário de segurança: {{assessmentTitle}}. O prazo é até {{dueDate}}.\n\nAbrir: {{portalUrl}}",
  escalationSubject: "Vencido: {{assessmentTitle}} — {{vendorName}}",
  escalationBody:
    "{{reviewerName}}, o questionário {{assessmentTitle}} enviado para {{vendorName}} está vencido.\n\nVeja a avaliação: {{assessmentUrl}}",
  submissionSubject: "{{vendorName}} enviou {{assessmentTitle}} para revisão",
  submissionBody:
    "{{reviewerName}}, {{vendorName}} enviou seu questionário de segurança: {{assessmentTitle}}.\n\nVeja a avaliação: {{assessmentUrl}}",
  clarificationSubject: "Mais informações necessárias: {{assessmentTitle}}",
  clarificationBody:
    "{{vendorName}}, seu questionário de segurança {{assessmentTitle}} foi enviado de volta para obter mais informações.\n\n{{message}}\n\nRevise os itens solicitados e reenvie: {{portalUrl}}\n\nSuas respostas anteriores foram salvas.",
  resetSubject: "Redefinição de senha",
  resetBody:
    "Uma redefinição de senha foi solicitada para sua conta {{appName}}.\n\nClique aqui para redefinir sua senha: {{resetUrl}}\n\nEste link expira em {{expiresIn}}.",
  expirySubject: "Expira em breve: {{itemName}} para {{vendorName}}",
  expiryBody:
    "{{itemName}} para {{vendorName}} expira em {{expiresDate}}.\n\nRevise o fornecedor e agende uma reavaliação ou renovação: {{vendorUrl}}",
  invitePasswordSubject: "Questionário de segurança: {{assessmentTitle}}",
  invitePasswordBody:
    "{{vendorName}}, você foi solicitado a preencher o questionário de segurança: {{assessmentTitle}}. Envie até {{dueDate}}.\n\nEste questionário é protegido por senha.\nSua senha: {{portalPassword}}\n\nAbrir: {{portalUrl}}\n\nSuas respostas são salvas automaticamente. Você pode fechar esta página e retornar usando o mesmo link a qualquer momento.",
};

const italianDefaults: EmailTemplateSettings = {
  inviteSubject: "Questionario sulla sicurezza: {{assessmentTitle}}",
  inviteBody:
    "{{vendorName}}, ti è stato chiesto di completare il questionario sulla sicurezza: {{assessmentTitle}}. Si prega di inviare entro il giorno {{dueDate}}.\n\nAperto: {{portalUrl}}\n\nNon è richiesto alcun accesso. Puoi salvare i tuoi progressi e tornare più tardi utilizzando lo stesso collegamento.",
  reminderSubject:
    "Promemoria: {{assessmentTitle}} scadenza il giorno {{dueDate}}",
  reminderBody:
    "{{vendorName}}, questo è un promemoria per completare il questionario sulla sicurezza: {{assessmentTitle}}. La scadenza è il giorno {{dueDate}}.\n\nAperto: {{portalUrl}}",
  escalationSubject: "In ritardo: {{assessmentTitle}} — {{vendorName}}",
  escalationBody:
    "{{reviewerName}}, il questionario {{assessmentTitle}} inviato a {{vendorName}} è ormai scaduto.\n\nVisualizza la valutazione: {{assessmentUrl}}",
  submissionSubject:
    "{{vendorName}} ha inviato {{assessmentTitle}} per la revisione",
  submissionBody:
    "{{reviewerName}}, {{vendorName}} ha inviato il questionario sulla sicurezza: {{assessmentTitle}}.\n\nVisualizza la valutazione: {{assessmentUrl}}",
  clarificationSubject:
    "Sono necessarie ulteriori informazioni: {{assessmentTitle}}",
  clarificationBody:
    "{{vendorName}}, il tuo questionario di sicurezza {{assessmentTitle}} è stato inviato per ulteriori informazioni.\n\n{{message}}\n\nControlla gli elementi richiesti e inviali nuovamente: {{portalUrl}}\n\nLe tue risposte precedenti sono state salvate.",
  resetSubject: "Reimpostazione della password",
  resetBody:
    "È stata richiesta la reimpostazione della password per il tuo account {{appName}}.\n\nFai clic qui per reimpostare la password: {{resetUrl}}\n\nQuesto collegamento scade tra {{expiresIn}}.",
  expirySubject: "In scadenza a breve: {{itemName}} per {{vendorName}}",
  expiryBody:
    "{{itemName}} per {{vendorName}} scade il {{expiresDate}}.\n\nEsamina il fornitore e organizza una rivalutazione o un rinnovo: {{vendorUrl}}",
  invitePasswordSubject: "Questionario sulla sicurezza: {{assessmentTitle}}",
  invitePasswordBody:
    "{{vendorName}}, ti è stato chiesto di completare il questionario sulla sicurezza: {{assessmentTitle}}. Si prega di inviare entro il giorno {{dueDate}}.\n\nQuesto questionario è protetto da password.\nLa tua password: {{portalPassword}}\n\nAperto: {{portalUrl}}\n\nLe tue risposte vengono salvate automaticamente. Puoi chiudere questa pagina e ritornare utilizzando lo stesso link in qualsiasi momento.",
};

const dutchDefaults: EmailTemplateSettings = {
  inviteSubject: "Beveiligingsvragenlijst: {{assessmentTitle}}",
  inviteBody:
    "{{vendorName}}, u bent gevraagd de beveiligingsvragenlijst in te vullen: {{assessmentTitle}}. Dien uw aanvraag in vóór {{dueDate}}.\n\nOpen: {{portalUrl}}\n\nEr is geen login vereist. U kunt uw voortgang opslaan en later terugkeren via dezelfde link.",
  reminderSubject: "Herinnering: {{assessmentTitle}} vervalt op {{dueDate}}",
  reminderBody:
    "{{vendorName}}, dit is een herinnering om uw beveiligingsvragenlijst in te vullen: {{assessmentTitle}}. Het moet uiterlijk op {{dueDate}} zijn.\n\nOpen: {{portalUrl}}",
  escalationSubject: "Te laat: {{assessmentTitle}} — {{vendorName}}",
  escalationBody:
    "{{reviewerName}}, de vragenlijst {{assessmentTitle}} verzonden naar {{vendorName}} is nu te laat.\n\nBekijk de beoordeling: {{assessmentUrl}}",
  submissionSubject:
    "{{vendorName}} heeft {{assessmentTitle}} ter beoordeling ingediend",
  submissionBody:
    "{{reviewerName}}, {{vendorName}} heeft de beveiligingsvragenlijst ingediend: {{assessmentTitle}}.\n\nBekijk de beoordeling: {{assessmentUrl}}",
  clarificationSubject: "Meer informatie nodig: {{assessmentTitle}}",
  clarificationBody:
    "{{vendorName}}, uw beveiligingsvragenlijst {{assessmentTitle}} is teruggestuurd voor meer informatie.\n\n{{message}}\n\nControleer de gevraagde items en dien deze opnieuw in: {{portalUrl}}\n\nUw eerdere antwoorden zijn opgeslagen.",
  resetSubject: "Wachtwoord opnieuw instellen",
  resetBody:
    "Er is een wachtwoordreset aangevraagd voor uw {{appName}}-account.\n\nKlik hier om uw wachtwoord opnieuw in te stellen: {{resetUrl}}\n\nDeze link verloopt over {{expiresIn}}.",
  expirySubject: "Verloopt binnenkort: {{itemName}} voor {{vendorName}}",
  expiryBody:
    "{{itemName}} voor {{vendorName}} vervalt op {{expiresDate}}.\n\nBeoordeel de leverancier en regel een herbeoordeling of verlenging: {{vendorUrl}}",
  invitePasswordSubject: "Beveiligingsvragenlijst: {{assessmentTitle}}",
  invitePasswordBody:
    "{{vendorName}}, u bent gevraagd de beveiligingsvragenlijst in te vullen: {{assessmentTitle}}. Dien uw aanvraag in vóór {{dueDate}}.\n\nDeze vragenlijst is beveiligd met een wachtwoord.\nUw wachtwoord: {{portalPassword}}\n\nOpen: {{portalUrl}}\n\nUw antwoorden worden automatisch opgeslagen. U kunt deze pagina op elk gewenst moment sluiten en via dezelfde link terugkeren.",
};

const japaneseDefaults: EmailTemplateSettings = {
  inviteSubject: "セキュリティに関するアンケート: {{assessmentTitle}}",
  inviteBody:
    "{{vendorName}} 様、セキュリティ質問事項: {{assessmentTitle}} に回答するよう求められました。 {{dueDate}}までに提出してください。\n\n開く: {{portalUrl}}\n\nログインは必要ありません。進行状況を保存し、後で同じリンクを使用して戻ることができます。",
  reminderSubject: "リマインダー: {{assessmentTitle}} の期限は {{dueDate}}",
  reminderBody:
    "{{vendorName}} 様、これはセキュリティに関するアンケートにご回答いただくためのリマインダーです: {{assessmentTitle}}。期限は {{dueDate}} までです。\n\n開く: {{portalUrl}}",
  escalationSubject: "期限切れ: {{assessmentTitle}} — {{vendorName}}",
  escalationBody:
    "{{reviewerName}}、{{vendorName}} に送信されたアンケート {{assessmentTitle}} は期限を過ぎています。\n\n評価を表示します: {{assessmentUrl}}",
  submissionSubject:
    "{{vendorName}} が審査のために {{assessmentTitle}} を送信しました",
  submissionBody:
    "{{reviewerName}}、{{vendorName}} がセキュリティに関するアンケートを提出しました: {{assessmentTitle}}。\n\n評価を表示します: {{assessmentUrl}}",
  clarificationSubject: "さらに詳しい情報が必要です: {{assessmentTitle}}",
  clarificationBody:
    "{{vendorName}} 様、詳細情報を求めるセキュリティ質問書 {{assessmentTitle}} が返送されました。\n\n{{message}}\n\nリクエストされたアイテムを確認して再送信してください: {{portalUrl}}\n\n以前の回答は保存されました。",
  resetSubject: "パスワードのリセット",
  resetBody:
    "{{appName}} アカウントのパスワードのリセットがリクエストされました。\n\nパスワードをリセットするにはここをクリックしてください: {{resetUrl}}\n\nこのリンクは {{expiresIn}} で期限切れになります。",
  expirySubject: "まもなく期限切れになります: {{vendorName}} の {{itemName}}",
  expiryBody:
    "{{vendorName}} の {{itemName}} は {{expiresDate}} に期限切れになります。\n\nベンダーを確認し、再評価または更新を手配します: {{vendorUrl}}",
  invitePasswordSubject: "セキュリティに関するアンケート: {{assessmentTitle}}",
  invitePasswordBody:
    "{{vendorName}} 様、セキュリティ質問事項: {{assessmentTitle}} に回答するよう求められました。 {{dueDate}}までに提出してください。\n\nこのアンケートはパスワードで保護されています。\nあなたのパスワード: {{portalPassword}}\n\n開く: {{portalUrl}}\n\n回答は自動的に保存されます。いつでもこのページを閉じて、同じリンクを使用して戻ることができます。",
};

const koreanDefaults: EmailTemplateSettings = {
  inviteSubject: "보안 설문지: {{assessmentTitle}}",
  inviteBody:
    "{{vendorName}}님, 보안 설문지 {{assessmentTitle}}을 작성해 달라는 요청을 받았습니다. {{dueDate}}까지 제출해 주세요.\n\n열기: {{portalUrl}}\n\n로그인이 필요하지 않습니다. 진행 상황을 저장하고 나중에 동일한 링크를 사용하여 돌아올 수 있습니다.",
  reminderSubject: "알림: {{assessmentTitle}} 마감일: {{dueDate}}",
  reminderBody:
    "{{vendorName}}님, 보안 설문지 {{assessmentTitle}} 작성을 다시 한번 알려드립니다. 마감일은 {{dueDate}}입니다.\n\n열기: {{portalUrl}}",
  escalationSubject: "연체: {{assessmentTitle}} — {{vendorName}}",
  escalationBody:
    "{{reviewerName}}님, {{vendorName}}에게 보낸 설문지 {{assessmentTitle}}의 기한이 지났습니다.\n\n평가 보기: {{assessmentUrl}}",
  submissionSubject:
    "{{vendorName}}에서 검토를 위해 {{assessmentTitle}}을(를) 제출했습니다.",
  submissionBody:
    "{{reviewerName}}님, {{vendorName}}님이 보안 설문지를 제출했습니다: {{assessmentTitle}}.\n\n평가 보기: {{assessmentUrl}}",
  clarificationSubject: "추가 정보 필요: {{assessmentTitle}}",
  clarificationBody:
    "{{vendorName}}님, 자세한 내용을 확인하기 위해 귀하의 보안 설문지 {{assessmentTitle}}이(가) 반송되었습니다.\n\n{{message}}\n\n요청된 항목을 검토한 후 다시 제출해 주세요: {{portalUrl}}\n\n이전 답변이 저장되었습니다.",
  resetSubject: "비밀번호 재설정",
  resetBody:
    "귀하의 {{appName}} 계정에 대한 비밀번호 재설정이 요청되었습니다.\n\n비밀번호를 재설정하려면 여기를 클릭하세요: {{resetUrl}}\n\n이 링크는 {{expiresIn}} 후에 만료됩니다.",
  expirySubject: "곧 만료됨: {{vendorName}}의 {{itemName}}",
  expiryBody:
    "{{vendorName}}의 {{itemName}}이(가) {{expiresDate}}에 만료됩니다.\n\n공급업체를 검토하고 재평가 또는 갱신을 준비합니다. {{vendorUrl}}",
  invitePasswordSubject: "보안 설문지: {{assessmentTitle}}",
  invitePasswordBody:
    "{{vendorName}}님, 보안 설문지 {{assessmentTitle}}을 작성해 달라는 요청을 받았습니다. {{dueDate}}까지 제출해 주세요.\n\n본 설문지는 비밀번호로 보호되어 있습니다.\n귀하의 비밀번호: {{portalPassword}}\n\n열기: {{portalUrl}}\n\n귀하의 답변은 자동으로 저장됩니다. 언제든지 이 페이지를 닫고 동일한 링크를 사용하여 돌아올 수 있습니다.",
};

const chineseDefaults: EmailTemplateSettings = {
  inviteSubject: "安全调查问卷：{{assessmentTitle}}",
  inviteBody:
    "{{vendorName}}，您需要填写安全调查问卷：{{assessmentTitle}}。请在 {{dueDate}} 之前提交。\n\n打开：{{portalUrl}}\n\n无需登录。您可以保存进度并稍后使用相同的链接返回。",
  reminderSubject: "提醒：{{assessmentTitle}}截止日期：{{dueDate}}",
  reminderBody:
    "{{vendorName}}，谨此提醒您填写安全调查问卷：{{assessmentTitle}}。截止日期为 {{dueDate}}。\n\n打开：{{portalUrl}}",
  escalationSubject: "逾期：{{assessmentTitle}} — {{vendorName}}",
  escalationBody:
    "{{reviewerName}}，发送给 {{vendorName}} 的调查问卷 {{assessmentTitle}} 现已逾期。\n\n查看评估：{{assessmentUrl}}",
  submissionSubject: "{{vendorName}} 提交了 {{assessmentTitle}} 供审核",
  submissionBody:
    "{{reviewerName}}，{{vendorName}} 已提交安全调查问卷：{{assessmentTitle}}。\n\n查看评估：{{assessmentUrl}}",
  clarificationSubject: "需要更多信息：{{assessmentTitle}}",
  clarificationBody:
    "{{vendorName}}，您的安全调查问卷 {{assessmentTitle}} 已发回以获取更多信息。\n\n{{message}}\n\n请检查所请求的项目并重新提交：{{portalUrl}}\n\n您之前的答案已保存。",
  resetSubject: "密码重置",
  resetBody:
    "您的 {{appName}} 帐户已请求重置密码。\n\n单击此处重置您的密码：{{resetUrl}}\n\n此链接将于 {{expiresIn}} 后过期。",
  expirySubject: "即将过期：{{vendorName}} 的 {{itemName}}",
  expiryBody:
    "{{vendorName}} 的 {{itemName}} 将于 {{expiresDate}} 到期。\n\n审查供应商并安排重新评估或续订：{{vendorUrl}}",
  invitePasswordSubject: "安全调查问卷：{{assessmentTitle}}",
  invitePasswordBody:
    "{{vendorName}}，您需要填写安全调查问卷：{{assessmentTitle}}。请在 {{dueDate}} 之前提交。\n\n该调查问卷受密码保护。\n您的密码：{{portalPassword}}\n\n打开：{{portalUrl}}\n\n您的答案会自动保存。您可以随时关闭此页面并使用同一链接返回。",
};

const arabicDefaults: EmailTemplateSettings = {
  inviteSubject: "استبيان الأمان: {{assessmentTitle}}",
  inviteBody:
    "{{vendorName}}، لقد طُلب منك إكمال استبيان الأمان: {{assessmentTitle}}. يرجى الإرسال بحلول {{dueDate}}.\n\nفتح: {{portalUrl}}\n\nلا يلزم تسجيل الدخول. يمكنك حفظ تقدمك والعودة لاحقًا باستخدام نفس الرابط.",
  reminderSubject: "تذكير: {{assessmentTitle}} موعد الاستحقاق {{dueDate}}",
  reminderBody:
    "{{vendorName}}، هذا تذكير لإكمال استبيان الأمان الخاص بك: {{assessmentTitle}}. ومن المقرر بحلول {{dueDate}}.\n\nفتح: {{portalUrl}}",
  escalationSubject: "متأخر: {{assessmentTitle}} — {{vendorName}}",
  escalationBody:
    "{{reviewerName}}، الاستبيان {{assessmentTitle}} الذي تم إرساله إلى {{vendorName}} قد فات موعد تقديمه الآن.\n\nعرض التقييم: {{assessmentUrl}}",
  submissionSubject: "تم إرسال {{vendorName}} {{assessmentTitle}} للمراجعة",
  submissionBody:
    "{{reviewerName}}، أرسل {{vendorName}} استبيان الأمان الخاص به: {{assessmentTitle}}.\n\nعرض التقييم: {{assessmentUrl}}",
  clarificationSubject: "مزيد من المعلومات المطلوبة: {{assessmentTitle}}",
  clarificationBody:
    "{{vendorName}}، تم إرسال استبيان الأمان الخاص بك {{assessmentTitle}} مرة أخرى للحصول على مزيد من المعلومات.\n\n{{message}}\n\nيرجى مراجعة العناصر المطلوبة وإعادة الإرسال: {{portalUrl}}\n\nلقد تم حفظ إجاباتك السابقة.",
  resetSubject: "إعادة تعيين كلمة المرور",
  resetBody:
    "تم طلب إعادة تعيين كلمة المرور لحساب {{appName}}.\n\nانقر هنا لإعادة تعيين كلمة المرور الخاصة بك: {{resetUrl}}\n\nتنتهي صلاحية هذا الرابط في {{expiresIn}}.",
  expirySubject: "ستنتهي قريبًا: {{itemName}} لـ {{vendorName}}",
  expiryBody:
    "تنتهي صلاحية {{itemName}} لـ {{vendorName}} في {{expiresDate}}.\n\nقم بمراجعة المورد وترتيب إعادة التقييم أو التجديد: {{vendorUrl}}",
  invitePasswordSubject: "استبيان الأمان: {{assessmentTitle}}",
  invitePasswordBody:
    "{{vendorName}}، لقد طُلب منك إكمال استبيان الأمان: {{assessmentTitle}}. يرجى الإرسال بحلول {{dueDate}}.\n\nهذا الاستبيان محمي بكلمة مرور.\nكلمة المرور الخاصة بك: {{portalPassword}}\n\nفتح: {{portalUrl}}\n\nيتم حفظ إجاباتك تلقائيا. يمكنك إغلاق هذه الصفحة والعودة باستخدام نفس الرابط في أي وقت.",
};

const hindiDefaults: EmailTemplateSettings = {
  inviteSubject: "सुरक्षा प्रश्नावली: {{assessmentTitle}}",
  inviteBody:
    "{{vendorName}}, आपसे सुरक्षा प्रश्नावली पूरी करने के लिए कहा गया है: {{assessmentTitle}}। कृपया {{dueDate}} तक सबमिट करें।\n\nखोलें: {{portalUrl}}\n\nकोई लॉगिन आवश्यक नहीं है. आप अपनी प्रगति सहेज सकते हैं और उसी लिंक का उपयोग करके बाद में वापस आ सकते हैं।",
  reminderSubject: "अनुस्मारक: {{assessmentTitle}} देय {{dueDate}}",
  reminderBody:
    "{{vendorName}}, यह आपकी सुरक्षा प्रश्नावली को पूरा करने के लिए एक अनुस्मारक है: {{assessmentTitle}}। यह {{dueDate}} तक देय है।\n\nखोलें: {{portalUrl}}",
  escalationSubject: "अतिदेय: {{assessmentTitle}} — {{vendorName}}",
  escalationBody:
    "{{reviewerName}}, {{vendorName}} को भेजी गई प्रश्नावली {{assessmentTitle}} अब अतिदेय है।\n\nमूल्यांकन देखें: {{assessmentUrl}}",
  submissionSubject:
    "{{vendorName}} ने समीक्षा के लिए {{assessmentTitle}} सबमिट किया",
  submissionBody:
    "{{reviewerName}}, {{vendorName}} ने अपनी सुरक्षा प्रश्नावली जमा कर दी है: {{assessmentTitle}}।\n\nमूल्यांकन देखें: {{assessmentUrl}}",
  clarificationSubject: "अधिक जानकारी की आवश्यकता: {{assessmentTitle}}",
  clarificationBody:
    "{{vendorName}}, आपकी सुरक्षा प्रश्नावली {{assessmentTitle}} अधिक जानकारी के लिए वापस भेज दी गई है।\n\n{{message}}\n\nकृपया अनुरोधित वस्तुओं की समीक्षा करें और पुनः सबमिट करें: {{portalUrl}}\n\nआपके पिछले उत्तर सहेजे गए हैं.",
  resetSubject: "पासवर्ड रीसेट",
  resetBody:
    "आपके {{appName}} खाते के लिए पासवर्ड रीसेट का अनुरोध किया गया था।\n\nअपना पासवर्ड रीसेट करने के लिए यहां क्लिक करें: {{resetUrl}}\n\nयह लिंक {{expiresIn}} में समाप्त हो रहा है।",
  expirySubject: "जल्द ही समाप्त हो रहा है: {{vendorName}} के लिए {{itemName}}",
  expiryBody:
    "{{vendorName}} के लिए {{itemName}} की समय सीमा {{expiresDate}} को समाप्त हो रही है।\n\nविक्रेता की समीक्षा करें और पुनर्मूल्यांकन या नवीनीकरण की व्यवस्था करें: {{vendorUrl}}",
  invitePasswordSubject: "सुरक्षा प्रश्नावली: {{assessmentTitle}}",
  invitePasswordBody:
    "{{vendorName}}, आपसे सुरक्षा प्रश्नावली पूरी करने के लिए कहा गया है: {{assessmentTitle}}। कृपया {{dueDate}} तक सबमिट करें।\n\nयह प्रश्नावली पासवर्ड से सुरक्षित है.\nआपका पासवर्ड: {{portalPassword}}\n\nखोलें: {{portalUrl}}\n\nआपके उत्तर स्वचालित रूप से सहेजे जाते हैं. आप इस पृष्ठ को बंद कर सकते हैं और किसी भी समय उसी लिंक का उपयोग करके वापस लौट सकते हैं।",
};

const LOCALIZED_DEFAULTS: Record<Locale, EmailTemplateSettings> = {
  en: englishDefaults,
  es: spanishDefaults,
  fr: frenchDefaults,
  de: germanDefaults,
  pt: portugueseDefaults,
  it: italianDefaults,
  nl: dutchDefaults,
  ja: japaneseDefaults,
  ko: koreanDefaults,
  zh: chineseDefaults,
  ar: arabicDefaults,
  hi: hindiDefaults,
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
