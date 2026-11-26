import { NextResponse } from "next/server";
import { getAccessibleCampaignById } from "@/lib/repositories/diagnostics";
import { campaignUpdateSchema } from "@/lib/schemas";
import { attachSessionCookie, getOrCreateSessionId } from "@/lib/session";
import { getSupabaseAdmin, SupabaseConfigError } from "@/lib/supabase/server";
import type { CampaignRecord } from "@/lib/types";

interface RouteContext {
  params: Promise<{ campaignId: string }>;
}

interface WebhookDispatchResult {
  configured: boolean;
  delivered: boolean;
  note: string;
}

async function dispatchOptionalActivationWebhook(
  campaign: CampaignRecord
): Promise<WebhookDispatchResult> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return {
      configured: false,
      delivered: false,
      note: "N8N_WEBHOOK_URL não configurado — ativação concluída localmente em modo demonstrativo.",
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4_000);

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          event: "campaign_activated_demo",
          mode: "demonstrativo",
          campaign_id: campaign.id,
          restaurant_id: campaign.restaurant_id,
          title: campaign.title,
          target_window: campaign.target_window,
          coupon_limit: campaign.coupon_limit,
          budget_limit: campaign.budget_limit,
          approved_at: campaign.approved_at,
        }),
      });

      if (!res.ok) {
        return {
          configured: true,
          delivered: false,
          note: `Webhook respondeu HTTP ${res.status} (ativação preservada sem bloqueio).`,
        };
      }

      return {
        configured: true,
        delivered: true,
        note: "Webhook demonstrativo disparado com sucesso.",
      };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return {
      configured: true,
      delivered: false,
      note: "Webhook indisponível ou timeout (ativação preservada sem bloqueio).",
    };
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;
    const { sessionId, shouldSetCookie } = await getOrCreateSessionId();
    const campaign = await getAccessibleCampaignById(campaignId, sessionId);

    if (!campaign) {
      return NextResponse.json(
        { error: "Campanha não encontrada nesta sessão." },
        { status: 404 }
      );
    }

    const response = NextResponse.json({ campaign });
    return shouldSetCookie ? attachSessionCookie(response, sessionId) : response;
  } catch (error) {
    const status = error instanceof SupabaseConfigError ? 503 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar a campanha.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Corpo da requisição inválido." },
        { status: 400 }
      );
    }

    const parsed = campaignUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Revise os campos do kit antes de salvar.",
          field_errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { sessionId, shouldSetCookie } = await getOrCreateSessionId();
    const existing = await getAccessibleCampaignById(campaignId, sessionId);

    if (!existing) {
      return NextResponse.json(
        { error: "Campanha não encontrada nesta sessão." },
        { status: 404 }
      );
    }

    // Protege campanhas demonstrativas do seed global contra sobrescrita por visitantes
    if (existing.session_id === null) {
      return NextResponse.json(
        {
          error:
            "Esta campanha faz parte dos dados demonstrativos iniciais (somente leitura). Crie uma nova campanha no Planejamento para editar e ativar livremente na sua sessão.",
        },
        { status: 403 }
      );
    }

    const { approve_and_activate, human_approved, ...editableFields } =
      parsed.data;

    if (approve_and_activate && !human_approved) {
      return NextResponse.json(
        {
          error:
            "A confirmação explícita de revisão humana é obrigatória antes de ativar a campanha.",
        },
        { status: 400 }
      );
    }

    const shouldActivate = Boolean(approve_and_activate && human_approved);
    const nextStatus = shouldActivate ? "active" : existing.status;
    const nextHumanApproved = shouldActivate ? true : existing.human_approved;
    const nextApprovedAt = shouldActivate
      ? existing.approved_at ?? new Date().toISOString()
      : existing.approved_at;

    const supabase = getSupabaseAdmin();
    const { data: updated, error } = await supabase
      .from("campaigns")
      .update({
        ...editableFields,
        status: nextStatus,
        human_approved: nextHumanApproved,
        approved_at: nextApprovedAt,
      })
      .eq("id", existing.id)
      .eq("session_id", sessionId)
      .select("*")
      .single();

    if (error || !updated) {
      throw new Error(
        error?.message ?? "Falha ao atualizar a campanha no Supabase."
      );
    }

    const campaign: CampaignRecord = {
      id: String(updated.id),
      restaurant_id: String(updated.restaurant_id),
      diagnostic_id: updated.diagnostic_id ? String(updated.diagnostic_id) : null,
      session_id: updated.session_id ? String(updated.session_id) : null,
      objective: String(updated.objective),
      title: String(updated.title),
      offer_description: String(updated.offer_description),
      estimated_cost_per_redemption: Number(
        updated.estimated_cost_per_redemption
      ),
      budget_limit: Number(updated.budget_limit),
      coupon_limit: Number(updated.coupon_limit),
      target_window: String(updated.target_window),
      promo_copy: String(updated.promo_copy),
      table_tent_headline: String(updated.table_tent_headline),
      table_tent_body: String(updated.table_tent_body),
      staff_script: String(updated.staff_script),
      cta_text: String(updated.cta_text),
      recurrence_hook: String(updated.recurrence_hook),
      status: updated.status as CampaignRecord["status"],
      human_approved: Boolean(updated.human_approved),
      approved_at: updated.approved_at ? String(updated.approved_at) : null,
      created_at: String(updated.created_at),
    };

    const webhookResult = shouldActivate
      ? await dispatchOptionalActivationWebhook(campaign)
      : null;

    const response = NextResponse.json({
      campaign,
      activated: shouldActivate,
      webhook: webhookResult,
    });

    return shouldSetCookie ? attachSessionCookie(response, sessionId) : response;
  } catch (error) {
    const status = error instanceof SupabaseConfigError ? 503 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar a campanha.";
    return NextResponse.json({ error: message }, { status });
  }
}
