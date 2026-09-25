import 'server-only';
import { isSmtpMailConfigured } from './smtpMail';
export function notificationConfiguration() {
 return {
  email:isSmtpMailConfigured(),
  telegram:Boolean(process.env.SFM_NOTIFY_TELEGRAM_TOKEN&&process.env.SFM_NOTIFY_TELEGRAM_USERNAME&&process.env.SFM_NOTIFY_TELEGRAM_WEBHOOK_SECRET),
  whatsapp:Boolean(process.env.SFM_NOTIFY_WHATSAPP_TOKEN&&process.env.SFM_NOTIFY_WHATSAPP_PHONE_ID&&process.env.SFM_NOTIFY_WHATSAPP_NUMBER&&process.env.SFM_NOTIFY_WHATSAPP_TEMPLATE&&process.env.SFM_NOTIFY_META_APP_SECRET&&process.env.SFM_NOTIFY_META_VERIFY_TOKEN&&process.env.SFM_NOTIFY_META_VERSION),
  push:Boolean(process.env.SFM_NOTIFY_VAPID_PUBLIC_KEY&&process.env.SFM_NOTIFY_VAPID_PRIVATE_KEY&&process.env.SFM_NOTIFY_VAPID_SUBJECT),
 };
}
