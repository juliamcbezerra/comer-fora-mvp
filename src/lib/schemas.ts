import { z } from "zod";

export const restaurantInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do restaurante (mínimo 2 caracteres).")
    .max(100, "Nome muito longo (máximo 100 caracteres)."),
  category: z
    .string()
    .trim()
    .min(2, "Informe a categoria culinária.")
    .max(60, "Categoria muito longa."),
  neighborhood: z
    .string()
    .trim()
    .min(2, "Informe o bairro.")
    .max(80, "Bairro muito longo."),
  city: z
    .string()
    .trim()
    .min(2, "Informe a cidade.")
    .max(80, "Cidade muito longa.")
    .default("São Paulo"),
  avg_ticket: z.coerce
    .number()
    .positive("O ticket médio deve ser maior que zero.")
    .max(5000, "Ticket médio fora do intervalo esperado."),
  seating_capacity: z.coerce
    .number()
    .int("A capacidade deve ser um número inteiro.")
    .min(4, "Capacidade mínima de 4 lugares.")
    .max(2000, "Capacidade fora do intervalo esperado."),
  opening_hours: z
    .string()
    .trim()
    .min(4, "Informe os horários de funcionamento.")
    .max(120, "Horário de funcionamento muito longo."),
  low_demand_slots: z
    .array(z.string().trim().min(2))
    .min(1, "Selecione ou informe ao menos um horário de baixa demanda.")
    .max(14, "Informe no máximo 14 janelas de ociosidade."),
  current_salon_promotion: z
    .string()
    .trim()
    .min(2, "Informe como o Comer Fora é divulgado hoje no salão.")
    .max(100),
  uses_totem: z.boolean().default(false),
  monthly_promo_budget: z.coerce
    .number()
    .min(50, "Defina um orçamento promocional mensal de pelo menos R$ 50.")
    .max(200000, "Orçamento fora do intervalo demonstrativo."),
  max_discount_pct: z.coerce
    .number()
    .min(5, "O desconto máximo permitido deve ser de pelo menos 5%.")
    .max(30, "Por segurança de margem, o teto máximo permitido é 30%."),
  primary_goal: z
    .string()
    .trim()
    .min(2, "Selecione o objetivo principal.")
    .max(100),
});

export const campaignPlanInputSchema = z.object({
  restaurant_id: z.string().uuid("ID de restaurante inválido."),
  diagnostic_id: z.string().uuid().nullable().optional(),
  objective: z.string().trim().min(3, "Selecione o objetivo da campanha.").max(120),
  target_window: z
    .string()
    .trim()
    .min(3, "Informe a janela de dias/horários alvo.")
    .max(120),
  budget_limit: z.coerce
    .number()
    .positive("O limite de orçamento deve ser maior que zero."),
  estimated_cost_per_redemption: z.coerce
    .number()
    .positive("O custo estimado por resgate deve ser maior que zero."),
  coupon_limit: z.coerce
    .number()
    .int("O limite de cupons deve ser um número inteiro.")
    .min(1, "Defina pelo menos 1 cupom."),
  mechanic_notes: z.string().trim().max(400).optional(),
});

export const diagnosticAiOutputSchema = z.object({
  executive_summary: z.string().trim().min(20).max(520),
  bottlenecks: z
    .array(
      z.object({
        title: z.string().trim().min(3).max(120),
        impact: z.enum(["alto", "medio", "baixo"]),
        explanation: z.string().trim().min(10).max(320),
      })
    )
    .length(3),
  opportunities: z
    .array(
      z.object({
        title: z.string().trim().min(3).max(120),
        priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        rationale: z.string().trim().min(10).max(320),
        expected_lever: z.string().trim().min(5).max(180),
      })
    )
    .length(3),
  recommended_plans: z
    .array(
      z.object({
        objective: z.string().trim().min(3).max(120),
        title: z.string().trim().min(3).max(120),
        target_window: z.string().trim().min(3).max(120),
        mechanic_summary: z.string().trim().min(10).max(320),
        suggested_cost_per_redemption: z.number().positive(),
        suggested_coupon_limit: z.number().int().min(1),
        why_it_fits: z.string().trim().min(10).max(300),
      })
    )
    .length(3),
});

export const creativeKitOutputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  offer_description: z.string().trim().min(10).max(360),
  promo_copy: z.string().trim().min(20).max(700),
  table_tent_headline: z.string().trim().min(5).max(60),
  table_tent_body: z.string().trim().min(15).max(160),
  staff_script: z.string().trim().min(20).max(450),
  cta_text: z.string().trim().min(5).max(80),
  recurrence_hook: z.string().trim().min(10).max(300),
});

export const campaignUpdateSchema = z.object({
  title: z.string().trim().min(3, "Informe o título da campanha.").max(120),
  offer_description: z
    .string()
    .trim()
    .min(10, "Descreva a oferta com clareza.")
    .max(360),
  target_window: z.string().trim().min(3, "Informe a janela de validade.").max(120),
  promo_copy: z
    .string()
    .trim()
    .min(20, "O texto de divulgação precisa ter ao menos 20 caracteres.")
    .max(700),
  table_tent_headline: z
    .string()
    .trim()
    .min(5, "Informe o título do display de mesa.")
    .max(60, "O título do display deve ter no máximo 60 caracteres."),
  table_tent_body: z
    .string()
    .trim()
    .min(15, "Informe o texto do display de mesa.")
    .max(160, "O texto do display deve ter no máximo 160 caracteres."),
  staff_script: z
    .string()
    .trim()
    .min(20, "Informe o script de abordagem da equipe.")
    .max(450),
  cta_text: z.string().trim().min(5, "Informe a chamada para o QR Code.").max(80),
  recurrence_hook: z
    .string()
    .trim()
    .min(10, "Informe a mecânica de retorno / Giftback.")
    .max(300),
  approve_and_activate: z.boolean().optional(),
  human_approved: z.boolean().optional(),
});

export const redeemRequestSchema = z.object({
  recurrence_opt_in: z.boolean().default(false),
  source: z.enum(["qr_scan", "simulator"]).default("qr_scan"),
});
