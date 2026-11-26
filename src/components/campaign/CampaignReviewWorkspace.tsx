"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  QrCode,
  Save,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import type { CampaignRecord, Restaurant } from "@/lib/types";
import { cn, formatBRL, PRIMARY_GOAL_LABELS } from "@/lib/utils";
import { NavButton, SECONDARY_BUTTON_CLASS } from "@/components/ui/NavButton";

interface CampaignReviewWorkspaceProps {
  initialCampaign: CampaignRecord;
  restaurant: Restaurant;
  configuredAppUrl: string;
  generatedByFallback: boolean;
}

export function CampaignReviewWorkspace({
  initialCampaign,
  restaurant,
  configuredAppUrl,
  generatedByFallback,
}: CampaignReviewWorkspaceProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignRecord>(initialCampaign);
  const [title, setTitle] = useState(initialCampaign.title);
  const [offerDescription, setOfferDescription] = useState(
    initialCampaign.offer_description
  );
  const [targetWindow, setTargetWindow] = useState(
    initialCampaign.target_window
  );
  const [promoCopy, setPromoCopy] = useState(initialCampaign.promo_copy);
  const [tableTentHeadline, setTableTentHeadline] = useState(
    initialCampaign.table_tent_headline
  );
  const [tableTentBody, setTableTentBody] = useState(
    initialCampaign.table_tent_body
  );
  const [staffScript, setStaffScript] = useState(initialCampaign.staff_script);
  const [ctaText, setCtaText] = useState(initialCampaign.cta_text);
  const [recurrenceHook, setRecurrenceHook] = useState(
    initialCampaign.recurrence_hook
  );

  const [humanApproved, setHumanApproved] = useState(
    initialCampaign.human_approved
  );
  const [confirmingActivation, setConfirmingActivation] = useState(false);

  const [savingMode, setSavingMode] = useState<"save" | "activate" | null>(
    null
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [resolvedOrigin, setResolvedOrigin] = useState(
    configuredAppUrl.replace(/\/$/, "")
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const browserOrigin = window.location.origin;
    const isLocalBrowser =
      browserOrigin.includes("localhost") ||
      browserOrigin.includes("127.0.0.1");

    if (!isLocalBrowser) {
      setResolvedOrigin(browserOrigin);
    }
  }, []);

  const isSeedReadOnly = campaign.session_id === null;
  const isActive = campaign.status === "active";
  const qrUrl = `${resolvedOrigin}/r/${campaign.id}`;

  async function copyToClipboard(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setErrorMessage("Não foi possível copiar para a área de transferência.");
    }
  }

  async function submitUpdate(approveAndActivate: boolean) {
    if (isSeedReadOnly) return;

    if (approveAndActivate && !humanApproved) {
      setErrorMessage(
        "Marque a confirmação de revisão antes de ativar a campanha."
      );
      return;
    }

    setSavingMode(approveAndActivate ? "activate" : "save");
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          offer_description: offerDescription,
          target_window: targetWindow,
          promo_copy: promoCopy,
          table_tent_headline: tableTentHeadline,
          table_tent_body: tableTentBody,
          staff_script: staffScript,
          cta_text: ctaText,
          recurrence_hook: recurrenceHook,
          human_approved: humanApproved,
          approve_and_activate: approveAndActivate,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.field_errors) {
          setFieldErrors(data.field_errors);
        }
        setErrorMessage(
          data.error ?? "Não foi possível salvar as alterações da campanha."
        );
        return;
      }

      setCampaign(data.campaign);
      setConfirmingActivation(false);

      if (data.activated) {
        setSuccessMessage(
          "Campanha aprovada e ativada em modo demonstração. O QR Code ao lado já está liberado para escaneamento e resgate."
        );
      } else {
        setSuccessMessage("Alterações salvas com sucesso.");
      }

      router.refresh();
    } catch {
      setErrorMessage(
        "Erro de conexão ao salvar a campanha. Tente novamente."
      );
    } finally {
      setSavingMode(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Navegação superior */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <NavButton
          href={`/restaurante/${restaurant.id}/planejar`}
          loadingText="Voltando..."
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#717171] transition-colors hover:text-[#EA1D2C]"
        >
          Voltar para planejamento
        </NavButton>

        <div className="flex flex-wrap items-center gap-2">
          <NavButton
            href={`/r/${campaign.id}?source=simulator`}
            loadingText="Abrindo..."
            icon={<Smartphone className="h-3.5 w-3.5 text-[#EA1D2C]" />}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold",
              SECONDARY_BUTTON_CLASS
            )}
          >
            Testar tela do cliente
          </NavButton>

          <NavButton
            href={`/restaurante/${restaurant.id}/resultados`}
            loadingText="Abrindo..."
            icon={<BarChart3 className="h-3.5 w-3.5 text-[#EA1D2C]" />}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold",
              SECONDARY_BUTTON_CLASS
            )}
          >
            Ver resultados
          </NavButton>
        </div>
      </div>

      {generatedByFallback ? (
        <div
          role="status"
          className="print:hidden mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-[#3F3E3E] sm:text-sm"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-bold text-[#1A1A1A]">
              Materiais criados em modo de contingência
            </p>
            <p className="mt-0.5">
              O serviço de redação automática esteve temporariamente ocupado.
              Montamos uma sugestão pronta dentro do seu orçamento — fique à
              vontade para editar todos os textos abaixo.
            </p>
          </div>
        </div>
      ) : null}

      {isSeedReadOnly ? (
        <div
          role="status"
          className="print:hidden mt-4 flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-xs text-[#3F3E3E] sm:text-sm"
        >
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#EA1D2C]" />
          <div>
            <p className="font-bold text-[#1A1A1A]">
              Campanha de exemplo (somente leitura)
            </p>
            <p className="mt-0.5">
              Esta campanha pertence ao restaurante de exemplo {restaurant.name}
              . Você pode testar o QR Code agora ou{" "}
              <Link
                href={`/restaurante/${restaurant.id}/planejar`}
                className="font-bold text-[#EA1D2C] underline"
              >
                criar uma nova campanha na sua conta
              </Link>{" "}
              para editar e aprovar livremente.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-6 lg:grid-cols-12">
        {/* Coluna Esquerda: Edição dos materiais */}
        <section className="print:hidden rounded-xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8 lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold",
                    isActive
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-amber-50 text-amber-900"
                  )}
                >
                  {isActive ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Campanha ativa (Demonstração)
                    </>
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5" />
                      Rascunho — aguardando sua aprovação
                    </>
                  )}
                </span>

                <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-[#717171]">
                  {PRIMARY_GOAL_LABELS[campaign.objective] ?? campaign.objective}
                </span>
              </div>

              <h1 className="mt-2.5 text-xl font-extrabold text-[#1A1A1A] sm:text-2xl">
                Revisar materiais e QR Code do salão
              </h1>
              <p className="mt-1 text-xs text-[#717171]">
                Personalize os textos como preferir. A prévia do display de mesa
                ao lado atualiza na hora.
              </p>
            </div>
          </div>

          {/* Resumo dos limites definidos */}
          <div className="mt-5 grid grid-cols-3 gap-2.5 rounded-lg border border-neutral-200/80 bg-neutral-50 p-3.5 text-center">
            <div>
              <p className="text-[11px] font-semibold text-[#717171]">
                Benefício/cliente
              </p>
              <p className="text-sm font-extrabold text-[#1A1A1A]">
                {formatBRL(campaign.estimated_cost_per_redemption)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#717171]">
                Limite de cupons
              </p>
              <p className="text-sm font-extrabold text-[#1A1A1A]">
                {campaign.coupon_limit} cupons
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#717171]">
                Orçamento máximo
              </p>
              <p className="text-sm font-extrabold text-[#1A1A1A]">
                {formatBRL(campaign.budget_limit)}
              </p>
            </div>
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-[#9C050B] sm:text-sm"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EA1D2C]" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {successMessage ? (
            <div
              role="status"
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 sm:text-sm"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          ) : null}

          <div className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <EditField
                label="Nome da campanha *"
                error={fieldErrors.title?.[0]}
              >
                <input
                  type="text"
                  value={title}
                  disabled={isSeedReadOnly}
                  onChange={(e) => setTitle(e.target.value)}
                  className={fieldInputClass(Boolean(fieldErrors.title))}
                />
              </EditField>

              <EditField
                label="Dias e horários válidos *"
                error={fieldErrors.target_window?.[0]}
              >
                <input
                  type="text"
                  value={targetWindow}
                  disabled={isSeedReadOnly}
                  onChange={(e) => setTargetWindow(e.target.value)}
                  className={fieldInputClass(Boolean(fieldErrors.target_window))}
                />
              </EditField>
            </div>

            <EditField
              label="Descrição da oferta para o cliente *"
              error={fieldErrors.offer_description?.[0]}
            >
              <textarea
                rows={2}
                value={offerDescription}
                disabled={isSeedReadOnly}
                onChange={(e) => setOfferDescription(e.target.value)}
                className={fieldInputClass(
                  Boolean(fieldErrors.offer_description)
                )}
              />
            </EditField>

            {/* Bloco Display de Mesa */}
            <div className="space-y-4 rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-4">
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[#3F3E3E]">
                <QrCode className="h-3.5 w-3.5 text-[#EA1D2C]" />
                Textos do Display de Mesa
              </p>

              <EditField
                label="Título no display *"
                counter={`${tableTentHeadline.length}/60`}
                counterOver={tableTentHeadline.length > 60}
                error={fieldErrors.table_tent_headline?.[0]}
              >
                <input
                  type="text"
                  maxLength={60}
                  value={tableTentHeadline}
                  disabled={isSeedReadOnly}
                  onChange={(e) => setTableTentHeadline(e.target.value)}
                  className={fieldInputClass(
                    Boolean(fieldErrors.table_tent_headline)
                  )}
                />
              </EditField>

              <EditField
                label="Explicação curta na mesa *"
                counter={`${tableTentBody.length}/160`}
                counterOver={tableTentBody.length > 160}
                error={fieldErrors.table_tent_body?.[0]}
              >
                <textarea
                  rows={3}
                  maxLength={160}
                  value={tableTentBody}
                  disabled={isSeedReadOnly}
                  onChange={(e) => setTableTentBody(e.target.value)}
                  className={fieldInputClass(
                    Boolean(fieldErrors.table_tent_body)
                  )}
                />
              </EditField>

              <EditField
                label="Chamada do QR Code *"
                counter={`${ctaText.length}/80`}
                counterOver={ctaText.length > 80}
                error={fieldErrors.cta_text?.[0]}
              >
                <input
                  type="text"
                  maxLength={80}
                  value={ctaText}
                  disabled={isSeedReadOnly}
                  onChange={(e) => setCtaText(e.target.value)}
                  className={fieldInputClass(Boolean(fieldErrors.cta_text))}
                />
              </EditField>
            </div>

            <EditField
              label="Texto pronto para Instagram / WhatsApp *"
              error={fieldErrors.promo_copy?.[0]}
              action={
                <button
                  type="button"
                  onClick={() => void copyToClipboard("promo", promoCopy)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EA1D2C] hover:underline"
                >
                  {copiedKey === "promo" ? (
                    <>
                      <Check className="h-3 w-3" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copiar texto
                    </>
                  )}
                </button>
              }
            >
              <textarea
                rows={3}
                value={promoCopy}
                disabled={isSeedReadOnly}
                onChange={(e) => setPromoCopy(e.target.value)}
                className={fieldInputClass(Boolean(fieldErrors.promo_copy))}
              />
            </EditField>

            <EditField
              label="Sugestão de fala para garçons e atendentes (15s) *"
              error={fieldErrors.staff_script?.[0]}
              action={
                <button
                  type="button"
                  onClick={() => void copyToClipboard("script", staffScript)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EA1D2C] hover:underline"
                >
                  {copiedKey === "script" ? (
                    <>
                      <Check className="h-3 w-3" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copiar fala
                    </>
                  )}
                </button>
              }
            >
              <textarea
                rows={3}
                value={staffScript}
                disabled={isSeedReadOnly}
                onChange={(e) => setStaffScript(e.target.value)}
                className={fieldInputClass(Boolean(fieldErrors.staff_script))}
              />
            </EditField>

            <EditField
              label="Convite de retorno / Giftback após a visita *"
              error={fieldErrors.recurrence_hook?.[0]}
            >
              <textarea
                rows={2}
                value={recurrenceHook}
                disabled={isSeedReadOnly}
                onChange={(e) => setRecurrenceHook(e.target.value)}
                className={fieldInputClass(
                  Boolean(fieldErrors.recurrence_hook)
                )}
              />
            </EditField>

            {/* Confirmação obrigatória antes de ativar */}
            {!isSeedReadOnly ? (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[#1A1A1A]">
                  <ShieldCheck className="h-4 w-4 text-[#EA1D2C]" />
                  Confirmação antes de ativar
                </p>

                <label className="mt-3 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-[#3F3E3E]">
                  <input
                    type="checkbox"
                    checked={humanApproved}
                    onChange={(e) => {
                      setHumanApproved(e.target.checked);
                      if (!e.target.checked) setConfirmingActivation(false);
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#EA1D2C]"
                  />
                  <span>
                    Confirmo que revisei os textos, os horários válidos e o
                    limite de{" "}
                    <strong>{campaign.coupon_limit} cupons</strong> (até{" "}
                    <strong>{formatBRL(campaign.budget_limit)}</strong>).
                    Entendo que esta ativação é demonstrativa, sem envio real de
                    mensagens ou cobranças.
                  </span>
                </label>

                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    disabled={savingMode !== null}
                    onClick={() => void submitUpdate(false)}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60",
                      SECONDARY_BUTTON_CLASS
                    )}
                  >
                    {savingMode === "save" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar alterações
                  </button>

                  {!isActive ? (
                    confirmingActivation ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={savingMode !== null}
                          onClick={() => setConfirmingActivation(false)}
                          className={cn(
                            "rounded-lg px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60",
                            SECONDARY_BUTTON_CLASS
                          )}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={!humanApproved || savingMode !== null}
                          onClick={() => void submitUpdate(true)}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#9C050B] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingMode === "activate" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Confirmar ativação
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!humanApproved || savingMode !== null}
                        onClick={() => setConfirmingActivation(true)}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#EA1D2C] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#A02331] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Aprovar e ativar campanha (Demonstração)
                      </button>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Campanha aprovada e pronta para resgate
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Coluna Direita: Prévia do Display de Mesa com Logo Oficial e QR Code */}
        <aside className="lg:col-span-5">
          <div className="sticky top-28 space-y-4">
            <div className="print:hidden flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wide text-[#3F3E3E]">
                Prévia do Display de Mesa
              </span>
              <span className="text-[11px] font-semibold text-[#717171]">
                Atualiza ao digitar
              </span>
            </div>

            {/* Tent Card Imprimível na Identidade iFood */}
            <div
              id="tent-card-printable"
              className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
            >
              <div className="h-1.5 w-full bg-[#EA1D2C]" />

              <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/ifood-logo.webp"
                    alt="iFood"
                    className="h-6 w-auto object-contain"
                  />
                  <span
                    aria-hidden="true"
                    className="h-4 w-px bg-neutral-200"
                  />
                  <span className="text-xs font-bold text-[#3F3E3E]">
                    Comer Fora
                  </span>
                </div>
                <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#EA1D2C]">
                  Benefício na Mesa
                </span>
              </div>

              <div className="px-6 py-6 text-center">
                <p className="text-xs font-semibold text-[#717171]">
                  {restaurant.name} • {restaurant.neighborhood}
                </p>

                <h2 className="mt-2 text-xl font-extrabold leading-tight text-[#1A1A1A]">
                  {tableTentHeadline || "Título do display de mesa"}
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-[#3F3E3E]">
                  {tableTentBody ||
                    "Explicação curta de como ativar o benefício do iFood Comer Fora na mesa."}
                </p>

                <div className="mt-4 inline-flex items-center rounded-md bg-neutral-100 px-3 py-1 text-xs font-bold text-[#3F3E3E]">
                  Válido: {targetWindow || "Horário da campanha"}
                </div>

                {/* QR Code Real */}
                <div className="mx-auto mt-5 flex w-fit flex-col items-center rounded-xl border border-neutral-200 bg-white p-4">
                  <QRCodeSVG
                    value={qrUrl}
                    size={192}
                    level="M"
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    marginSize={3}
                  />
                  <p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-[#EA1D2C]">
                    {ctaText || "Escaneie e ative seu benefício"}
                  </p>
                </div>

                <p className="mt-4 text-[11px] text-[#717171]">
                  Limitado a <strong>{campaign.coupon_limit} cupons</strong>{" "}
                  demonstrativos • Sem cobrança real.
                </p>
              </div>

              <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-2.5 text-center text-[10px] font-semibold text-[#717171]">
                iFood | Comer Fora Up • Protótipo Conceitual • Dados
                Demonstrativos
              </div>
            </div>

            {/* Ações do QR Code e Impressão */}
            <div className="print:hidden space-y-2.5 rounded-xl border border-neutral-200/80 bg-white p-4">
              <div className="break-all rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-[11px] text-[#3F3E3E]">
                {qrUrl}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void copyToClipboard("qrUrl", qrUrl)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold",
                    SECONDARY_BUTTON_CLASS
                  )}
                >
                  {copiedKey === "qrUrl" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Link copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar link
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold",
                    SECONDARY_BUTTON_CLASS
                  )}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir display
                </button>
              </div>

              <NavButton
                href={`/r/${campaign.id}?source=simulator`}
                loadingText="Abrindo tela do cliente..."
                icon={<ExternalLink className="h-3.5 w-3.5" />}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors",
                  isActive
                    ? "bg-[#EA1D2C] text-white hover:bg-[#A02331]"
                    : SECONDARY_BUTTON_CLASS
                )}
              >
                {isActive
                  ? "Abrir experiência do cliente na mesa"
                  : "Visualizar tela do QR Code (rascunho)"}
              </NavButton>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function EditField({
  label,
  error,
  counter,
  counterOver,
  action,
  children,
}: {
  label: string;
  error?: string;
  counter?: string;
  counterOver?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-[#3F3E3E]">{label}</label>
        <div className="flex items-center gap-2">
          {action}
          {counter ? (
            <span
              className={cn(
                "text-[11px] font-bold",
                counterOver ? "text-[#EA1D2C]" : "text-[#717171]"
              )}
            >
              {counter}
            </span>
          ) : null}
        </div>
      </div>
      {children}
      {error ? (
        <p className="text-xs font-medium text-[#EA1D2C]">{error}</p>
      ) : null}
    </div>
  );
}

function fieldInputClass(hasError: boolean) {
  return cn(
    "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-[#1A1A1A] outline-none transition-colors disabled:bg-neutral-100 disabled:text-[#717171] focus:ring-2",
    hasError
      ? "border-[#EA1D2C] focus:border-[#EA1D2C] focus:ring-[#EA1D2C]/15"
      : "border-neutral-300 focus:border-[#EA1D2C] focus:ring-[#EA1D2C]/15"
  );
}
