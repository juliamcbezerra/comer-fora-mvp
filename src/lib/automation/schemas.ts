import { z } from "zod";

export const AUTOMATION_CONTRACT_VERSION = "1.0" as const;

export const AUTOMATION_ALERT_TYPES = [
  "ACTIVATION_REGISTERED",
  "NO_REDEMPTIONS",
  "LOW_CONVERSION",
  "BUDGET_WARNING",
  "HEALTHY",
] as const;

export type AutomationAlertType = (typeof AUTOMATION_ALERT_TYPES)[number];

export const AUTOMATION_NOTIFICATION_CHANNELS = [
  "none",
  "email",
  "slack",
  "discord",
  "webhook",
] as const;

export type AutomationNotificationChannel =
  (typeof AUTOMATION_NOTIFICATION_CHANNELS)[number];

export const AUTOMATION_NOTIFICATION_STATUSES = [
  "recorded",
  "sent",
  "failed",
  "skipped",
] as const;

export type AutomationNotificationStatus =
  (typeof AUTOMATION_NOTIFICATION_STATUSES)[number];

export const activationWebhookPayloadSchema = z.object({
  contract_version: z.literal(AUTOMATION_CONTRACT_VERSION),
  event: z.literal("campaign_activated"),
  mode: z.literal("demonstrativo"),
  idempotency_key: z.string().trim().min(8).max(180),
  sent_at: z.string().datetime(),
  session_id: z.string().uuid(),
  campaign: z.object({
    id: z.string().uuid(),
    restaurant_id: z.string().uuid(),
    title: z.string().trim().min(1).max(120),
    objective: z.string().trim().min(1).max(120),
    target_window: z.string().trim().min(1).max(120),
    coupon_limit: z.number().int().positive(),
    budget_limit: z.number().positive(),
    estimated_cost_per_redemption: z.number().positive(),
    approved_at: z.string().datetime(),
  }),
});

export type ActivationWebhookPayload = z.infer<
  typeof activationWebhookPayloadSchema
>;

export const campaignMonitorQuerySchema = z.object({
  session_id: z.string().uuid("session_id deve ser um UUID válido."),
  campaign_id: z.string().uuid("campaign_id deve ser um UUID válido.").optional(),
  only_actionable: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

export type CampaignMonitorQueryInput = z.infer<
  typeof campaignMonitorQuerySchema
>;

export const campaignAlertInputSchema = z
  .object({
    session_id: z.string().uuid("session_id deve ser um UUID válido."),
    campaign_id: z.string().uuid("campaign_id deve ser um UUID válido."),
    restaurant_id: z.string().uuid("restaurant_id deve ser um UUID válido."),
    alert_type: z.enum(AUTOMATION_ALERT_TYPES),
    message: z
      .string()
      .trim()
      .min(5, "A mensagem do alerta deve ter ao menos 5 caracteres.")
      .max(500, "A mensagem do alerta deve ter no máximo 500 caracteres."),
    recommendation: z
      .string()
      .trim()
      .min(5, "A recomendação deve ter ao menos 5 caracteres.")
      .max(500, "A recomendação deve ter no máximo 500 caracteres.")
      .nullable()
      .optional(),
    metrics_snapshot: z.record(z.string(), z.unknown()).default({}),
    notification_channel: z
      .enum(AUTOMATION_NOTIFICATION_CHANNELS)
      .default("none"),
    notification_status: z
      .enum(AUTOMATION_NOTIFICATION_STATUSES)
      .default("recorded"),
    idempotency_key: z
      .string()
      .trim()
      .min(8, "idempotency_key deve ter ao menos 8 caracteres.")
      .max(180, "idempotency_key deve ter no máximo 180 caracteres."),
  })
  .superRefine((data, ctx) => {
    const isExternalDeliveryStatus =
      data.notification_status === "sent" ||
      data.notification_status === "failed";

    if (isExternalDeliveryStatus && data.notification_channel === "none") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["notification_status"],
        message:
          "notification_status 'sent' ou 'failed' exige um canal externo (notification_channel diferente de 'none'). Para registro interno sem envio externo, utilize 'recorded'.",
      });
    }
  });

export type CampaignAlertInput = z.infer<typeof campaignAlertInputSchema>;
