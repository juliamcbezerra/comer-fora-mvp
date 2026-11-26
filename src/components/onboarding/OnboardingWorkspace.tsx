"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  PencilLine,
  Plus,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { calculateDeterministicMetrics } from "@/lib/business-rules";
import type { RestaurantWithSummary } from "@/lib/repositories/restaurants";
import {
  cn,
  formatBRL,
  PRIMARY_GOAL_LABELS,
  SALON_PROMOTION_LABELS,
} from "@/lib/utils";
import { startTopProgress } from "@/components/TopProgressBar";
import { CalculationInfoTooltip } from "@/components/ui/CalculationInfoTooltip";
import { NavButton, SECONDARY_BUTTON_CLASS } from "@/components/ui/NavButton";

const PRESET_SLOTS = [
  "Segunda almoço",
  "Terça almoço",
  "Quarta almoço",
  "Quinta almoço",
  "Terça tarde",
  "Quarta tarde",
  "Quinta tarde",
  "Terça jantar",
  "Quarta jantar",
  "Quinta jantar",
];

interface FormState {
  name: string;
  category: string;
  neighborhood: string;
  city: string;
  avg_ticket: string;
  seating_capacity: string;
  opening_hours: string;
  low_demand_slots: string[];
  current_salon_promotion: string;
  uses_totem: boolean;
  monthly_promo_budget: string;
  max_discount_pct: string;
  primary_goal: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  category: "",
  neighborhood: "",
  city: "São Paulo",
  avg_ticket: "85",
  seating_capacity: "44",
  opening_hours: "Ter a Dom, 12h às 23h",
  low_demand_slots: ["Terça jantar", "Quarta jantar"],
  current_salon_promotion: "nenhuma",
  uses_totem: false,
  monthly_promo_budget: "600",
  max_discount_pct: "20",
  primary_goal: "preencher_horarios_ociosos",
};

function restaurantToFormState(r: RestaurantWithSummary): FormState {
  return {
    name: r.name,
    category: r.category,
    neighborhood: r.neighborhood,
    city: r.city,
    avg_ticket: String(r.avg_ticket),
    seating_capacity: String(r.seating_capacity),
    opening_hours: r.opening_hours,
    low_demand_slots: r.low_demand_slots.length > 0 ? r.low_demand_slots : [],
    current_salon_promotion: r.current_salon_promotion,
    uses_totem: r.uses_totem,
    monthly_promo_budget: String(r.monthly_promo_budget),
    max_discount_pct: String(r.max_discount_pct),
    primary_goal: r.primary_goal,
  };
}

interface OnboardingWorkspaceProps {
  initialRestaurants: RestaurantWithSummary[];
  loadError: string | null;
}

export function OnboardingWorkspace({
  initialRestaurants,
  loadError,
}: OnboardingWorkspaceProps) {
  const router = useRouter();
  const [restaurants, setRestaurants] =
    useState<RestaurantWithSummary[]>(initialRestaurants);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingIsDemo, setEditingIsDemo] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [customSlot, setCustomSlot] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savingMode, setSavingMode] = useState<"save" | "diagnose" | null>(null);

  const liveMetrics = useMemo(() => {
    const avgTicket = Number(form.avg_ticket) || 0;
    const seating = Number(form.seating_capacity) || 0;
    const budget = Number(form.monthly_promo_budget) || 0;
    const maxDiscount = Number(form.max_discount_pct) || 0;

    return calculateDeterministicMetrics({
      avg_ticket: avgTicket,
      seating_capacity: seating,
      low_demand_slots: form.low_demand_slots,
      current_salon_promotion: form.current_salon_promotion,
      uses_totem: form.uses_totem,
      monthly_promo_budget: budget,
      max_discount_pct: maxDiscount,
    });
  }, [form]);

  const demoRestaurants = useMemo(
    () => restaurants.filter((r) => r.is_demo_seed),
    [restaurants]
  );
  const sessionRestaurants = useMemo(
    () => restaurants.filter((r) => !r.is_demo_seed),
    [restaurants]
  );

  function handleSelectForEdit(restaurant: RestaurantWithSummary) {
    setEditingId(restaurant.id);
    setEditingIsDemo(restaurant.is_demo_seed);
    setForm(restaurantToFormState(restaurant));
    setFieldErrors({});
    setSubmitError(null);
    setSuccessMessage(null);
    const formEl = document.getElementById("restaurant-form");
    formEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleResetNew() {
    setEditingId(null);
    setEditingIsDemo(false);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setSubmitError(null);
    setSuccessMessage(null);
  }

  function toggleSlot(slot: string) {
    setForm((prev) => {
      const exists = prev.low_demand_slots.includes(slot);
      return {
        ...prev,
        low_demand_slots: exists
          ? prev.low_demand_slots.filter((item) => item !== slot)
          : [...prev.low_demand_slots, slot],
      };
    });
  }

  function addCustomSlot() {
    const trimmed = customSlot.trim();
    if (trimmed.length < 2) return;
    if (!form.low_demand_slots.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        low_demand_slots: [...prev.low_demand_slots, trimmed],
      }));
    }
    setCustomSlot("");
  }

  async function submitProfile(navigateToDiagnostic: boolean) {
    setSavingMode(navigateToDiagnostic ? "diagnose" : "save");
    setSubmitError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const payload = {
      name: form.name,
      category: form.category,
      neighborhood: form.neighborhood,
      city: form.city,
      avg_ticket: Number(form.avg_ticket),
      seating_capacity: Number(form.seating_capacity),
      opening_hours: form.opening_hours,
      low_demand_slots: form.low_demand_slots,
      current_salon_promotion: form.current_salon_promotion,
      uses_totem: form.uses_totem,
      monthly_promo_budget: Number(form.monthly_promo_budget),
      max_discount_pct: Number(form.max_discount_pct),
      primary_goal: form.primary_goal,
    };

    try {
      const isUpdate = Boolean(editingId);
      const endpoint = isUpdate
        ? `/api/restaurants/${editingId}`
        : "/api/restaurants";
      const method = isUpdate ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.field_errors) {
          setFieldErrors(data.field_errors);
        }
        setSubmitError(
          data.error ?? "Não foi possível salvar o perfil do restaurante."
        );
        return;
      }

      const savedRestaurant = data.restaurant;
      const summaryEntry: RestaurantWithSummary = {
        ...savedRestaurant,
        deterministic_metrics: data.deterministic_metrics,
        has_diagnostic: false,
        active_campaigns_count: 0,
      };

      setRestaurants((prev) => {
        const exists = prev.some((item) => item.id === summaryEntry.id);
        if (exists) {
          return prev.map((item) =>
            item.id === summaryEntry.id
              ? {
                  ...summaryEntry,
                  has_diagnostic: item.has_diagnostic,
                  active_campaigns_count: item.active_campaigns_count,
                }
              : item
          );
        }
        return [summaryEntry, ...prev];
      });

      setEditingId(savedRestaurant.id);
      setEditingIsDemo(false);

      if (navigateToDiagnostic) {
        startTopProgress();
        router.push(`/restaurante/${savedRestaurant.id}/diagnostico?autorun=1`);
        return;
      }

      setSuccessMessage(
        data.cloned_from_demo
          ? "Criamos uma cópia na sua sessão para preservar o exemplo original."
          : `Perfil de "${savedRestaurant.name}" salvo com sucesso.`
      );
      router.refresh();
    } catch {
      setSubmitError(
        "Erro de conexão ao salvar o perfil. Tente novamente em instantes."
      );
    } finally {
      setSavingMode(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Hero Institucional Vermelho iFood */}
      <section className="rounded-2xl bg-[#EA1D2C] p-6 text-white shadow-sm sm:p-8">
        <div className="grid items-center gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-xs font-bold uppercase tracking-wider text-white/85">
              iFood Comer Fora para Parceiros
            </p>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              Encha as mesas nos horários mais tranquilos e traga clientes de
              volta.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
              Descubra onde seu salão pode faturar mais, crie campanhas seguras
              para sua margem e ative o Comer Fora nas mesas em poucos minutos.
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 text-[#3F3E3E] shadow-xs lg:col-span-5">
            <ol className="divide-y divide-neutral-100">
              <li className="pb-3.5">
                <p className="text-xs font-extrabold text-[#EA1D2C]">
                  1. Perfil do salão
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#1A1A1A]">
                  Escolha um restaurante de exemplo ou cadastre o seu
                </p>
              </li>
              <li className="py-3.5">
                <p className="text-xs font-extrabold text-[#EA1D2C]">
                  2. Plano sob medida
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#1A1A1A]">
                  Receba recomendações e materiais prontos dentro do seu
                  orçamento
                </p>
              </li>
              <li className="pt-3.5">
                <p className="text-xs font-extrabold text-[#EA1D2C]">
                  3. Ativação na mesa
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#1A1A1A]">
                  Gere o QR Code do salão e acompanhe resgates e retorno
                </p>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {loadError ? (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-[#9C050B]"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#EA1D2C]" />
          <div>
            <p className="font-bold">
              Não foi possível carregar os restaurantes
            </p>
            <p className="mt-1 text-xs sm:text-sm">{loadError}</p>
          </div>
        </div>
      ) : null}

      {/* Restaurantes cadastrados na conta atual */}
      {sessionRestaurants.length > 0 ? (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-[#1A1A1A] sm:text-xl">
                Seus restaurantes cadastrados
              </h2>
              <p className="text-xs text-[#717171] sm:text-sm">
                Perfis criados ou personalizados por você nesta demonstração.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetNew}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold",
                SECONDARY_BUTTON_CLASS
              )}
            >
              <Plus className="h-4 w-4" />
              Novo restaurante
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessionRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                isSelected={editingId === restaurant.id}
                onEdit={() => handleSelectForEdit(restaurant)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Seletor Rápido dos 3 Restaurantes de Exemplo */}
      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-[#1A1A1A] sm:text-xl">
            Comece com um restaurante de exemplo
          </h2>
          <p className="text-xs text-[#717171] sm:text-sm">
            Explore cenários prontos de salão ou personalize os dados para o seu
            negócio.
          </p>
        </div>

        {demoRestaurants.length === 0 && !loadError ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-[#717171]">
            Nenhum restaurante de exemplo encontrado. Cadastre o perfil do seu
            salão no formulário abaixo para começar.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {demoRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                isSelected={editingId === restaurant.id}
                onEdit={() => handleSelectForEdit(restaurant)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Formulário Completo + Painel de Proteção do Orçamento */}
      <section id="restaurant-form" className="mt-10 scroll-mt-28">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8 lg:col-span-8">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#EA1D2C]">
                  <Store className="h-3.5 w-3.5" />
                  {editingId
                    ? editingIsDemo
                      ? "Personalizar restaurante de exemplo"
                      : "Editar dados do restaurante"
                    : "Cadastrar seu restaurante"}
                </span>
                <h2 className="mt-1 text-xl font-extrabold text-[#1A1A1A]">
                  Dados do salão e orçamento promocional
                </h2>
                {editingIsDemo ? (
                  <p className="mt-1 text-xs text-[#717171]">
                    Suas alterações serão salvas em uma cópia exclusiva da sua
                    conta, mantendo o exemplo original preservado.
                  </p>
                ) : null}
              </div>

              {editingId ? (
                <button
                  type="button"
                  onClick={handleResetNew}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                    SECONDARY_BUTTON_CLASS
                  )}
                >
                  <X className="h-3.5 w-3.5" />
                  Limpar para novo cadastro
                </button>
              ) : null}
            </div>

            {submitError ? (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-[#9C050B] sm:text-sm"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EA1D2C]" />
                <span>{submitError}</span>
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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submitProfile(true);
              }}
              className="mt-6 space-y-6"
              noValidate
            >
              {/* Bloco 1: Identificação */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nome do restaurante *"
                  error={fieldErrors.name?.[0]}
                >
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Ex.: Cantina do Parque"
                    className={inputClass(Boolean(fieldErrors.name))}
                    required
                  />
                </Field>

                <Field label="Categoria *" error={fieldErrors.category?.[0]}>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    placeholder="Ex.: Italiana, Japonesa, Cafeteria & Brunch"
                    className={inputClass(Boolean(fieldErrors.category))}
                    required
                  />
                </Field>

                <Field label="Bairro *" error={fieldErrors.neighborhood?.[0]}>
                  <input
                    type="text"
                    value={form.neighborhood}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        neighborhood: e.target.value,
                      }))
                    }
                    placeholder="Ex.: Pinheiros, Moema, Vila Madalena"
                    className={inputClass(Boolean(fieldErrors.neighborhood))}
                    required
                  />
                </Field>

                <Field label="Cidade *" error={fieldErrors.city?.[0]}>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                    placeholder="São Paulo"
                    className={inputClass(Boolean(fieldErrors.city))}
                    required
                  />
                </Field>
              </div>

              {/* Bloco 2: Capacidade & Finanças */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field
                  label="Ticket médio (R$) *"
                  error={fieldErrors.avg_ticket?.[0]}
                >
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={form.avg_ticket}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, avg_ticket: e.target.value }))
                    }
                    className={inputClass(Boolean(fieldErrors.avg_ticket))}
                    required
                  />
                </Field>

                <Field
                  label="Lugares no salão *"
                  error={fieldErrors.seating_capacity?.[0]}
                >
                  <input
                    type="number"
                    min="4"
                    step="1"
                    value={form.seating_capacity}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        seating_capacity: e.target.value,
                      }))
                    }
                    className={inputClass(Boolean(fieldErrors.seating_capacity))}
                    required
                  />
                </Field>

                <Field
                  label="Orçamento mensal (R$) *"
                  error={fieldErrors.monthly_promo_budget?.[0]}
                >
                  <input
                    type="number"
                    min="50"
                    step="any"
                    value={form.monthly_promo_budget}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        monthly_promo_budget: e.target.value,
                      }))
                    }
                    className={inputClass(
                      Boolean(fieldErrors.monthly_promo_budget)
                    )}
                    required
                  />
                </Field>

                <Field
                  label="Desconto máx. (5–30%) *"
                  error={fieldErrors.max_discount_pct?.[0]}
                >
                  <input
                    type="number"
                    min="5"
                    max="30"
                    step="any"
                    value={form.max_discount_pct}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        max_discount_pct: e.target.value,
                      }))
                    }
                    className={inputClass(Boolean(fieldErrors.max_discount_pct))}
                    required
                  />
                </Field>
              </div>

              {/* Bloco 3: Horários & Movimento */}
              <Field
                label="Horário de funcionamento *"
                error={fieldErrors.opening_hours?.[0]}
              >
                <input
                  type="text"
                  value={form.opening_hours}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      opening_hours: e.target.value,
                    }))
                  }
                  placeholder="Ex.: Ter a Dom, 12h às 23h"
                  className={inputClass(Boolean(fieldErrors.opening_hours))}
                  required
                />
              </Field>

              <Field
                label="Horários mais tranquilos no salão *"
                error={fieldErrors.low_demand_slots?.[0]}
              >
                <div className="flex flex-wrap gap-2">
                  {PRESET_SLOTS.map((slot) => {
                    const active = form.low_demand_slots.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleSlot(slot)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                          active
                            ? "border-[#EA1D2C] bg-[#EA1D2C] text-white"
                            : "border-neutral-200 bg-neutral-50 text-[#3F3E3E] hover:border-[#EA1D2C]/50 hover:bg-white"
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>

                {form.low_demand_slots.some(
                  (s) => !PRESET_SLOTS.includes(s)
                ) ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.low_demand_slots
                      .filter((s) => !PRESET_SLOTS.includes(s))
                      .map((slot) => (
                        <span
                          key={slot}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-[#9C050B]"
                        >
                          {slot}
                          <button
                            type="button"
                            onClick={() => toggleSlot(slot)}
                            aria-label={`Remover ${slot}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                ) : null}

                <div className="mt-2.5 flex gap-2">
                  <input
                    type="text"
                    value={customSlot}
                    onChange={(e) => setCustomSlot(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomSlot();
                      }
                    }}
                    placeholder="Adicionar outro horário (ex.: Sexta happy hour)"
                    className={cn(inputClass(false), "flex-1")}
                  />
                  <button
                    type="button"
                    onClick={addCustomSlot}
                    className={cn(
                      "rounded-lg px-3.5 text-xs font-bold",
                      SECONDARY_BUTTON_CLASS
                    )}
                  >
                    Adicionar
                  </button>
                </div>
              </Field>

              {/* Bloco 4: Divulgação Atual e Objetivo */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Como divulga o iFood Comer Fora hoje? *"
                  error={fieldErrors.current_salon_promotion?.[0]}
                >
                  <select
                    value={form.current_salon_promotion}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        current_salon_promotion: e.target.value,
                      }))
                    }
                    className={inputClass(
                      Boolean(fieldErrors.current_salon_promotion)
                    )}
                  >
                    {Object.entries(SALON_PROMOTION_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field
                  label="Principal objetivo no salão *"
                  error={fieldErrors.primary_goal?.[0]}
                >
                  <select
                    value={form.primary_goal}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        primary_goal: e.target.value,
                      }))
                    }
                    className={inputClass(Boolean(fieldErrors.primary_goal))}
                  >
                    {Object.entries(PRIMARY_GOAL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4">
                <div>
                  <p className="text-sm font-bold text-[#1A1A1A]">
                    O restaurante já utiliza totem do iFood Comer Fora?
                  </p>
                  <p className="text-xs text-[#717171]">
                    Ajuda a personalizar sugestões de divulgação e retorno dos
                    clientes.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.uses_totem}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      uses_totem: e.target.checked,
                    }))
                  }
                  className="h-5 w-5 accent-[#EA1D2C]"
                />
              </label>

              {/* Ações */}
              <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={savingMode !== null}
                  onClick={() => void submitProfile(false)}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60",
                    SECONDARY_BUTTON_CLASS
                  )}
                >
                  {savingMode === "save" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Salvar perfil
                </button>

                <button
                  type="submit"
                  disabled={savingMode !== null}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#EA1D2C] px-6 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#A02331] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingMode === "diagnose" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Salvar e ver diagnóstico
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Card Lateral: Proteção do seu orçamento */}
          <aside className="lg:col-span-4">
            <div className="sticky top-28 rounded-xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#1A1A1A]">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#EA1D2C]" />
                  Proteção do seu orçamento
                </h3>
                <CalculationInfoTooltip />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#717171]">
                Limites definidos com base no seu ticket médio e capacidade para
                proteger sua margem.
              </p>

              <div className="mt-5 space-y-3">
                <div className="rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#717171]">
                      Prontidão para o Comer Fora
                    </span>
                    <span className="text-lg font-extrabold text-[#1A1A1A]">
                      {liveMetrics.readiness_score}/100
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-[#EA1D2C] transition-all"
                      style={{ width: `${liveMetrics.readiness_score}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-neutral-200/80 bg-white p-3.5">
                    <p className="text-[11px] font-semibold text-[#717171]">
                      Benefício seguro por cliente
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-[#1A1A1A]">
                      {formatBRL(liveMetrics.max_safe_cost_per_redemption)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-neutral-200/80 bg-white p-3.5">
                    <p className="text-[11px] font-semibold text-[#717171]">
                      Cupons no benefício máximo
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-[#1A1A1A]">
                      {liveMetrics.recommended_coupon_cap} / mês
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-[#717171]">
                      Sobe se o benefício for menor (até{" "}
                      {liveMetrics.operational_coupon_ceiling}/mês)
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200/80 bg-neutral-50 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A1A]">
                    <TrendingUp className="h-4 w-4 text-[#EA1D2C]" />
                    Receita bruta estimada (demo)
                  </div>
                  <p className="mt-1 text-xl font-extrabold text-[#1A1A1A]">
                    {formatBRL(liveMetrics.potential_monthly_capture)}
                    <span className="text-xs font-medium text-[#717171]">
                      {" "}
                      / mês
                    </span>
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#717171]">
                    Líquida após incentivos:{" "}
                    <strong className="text-[#3F3E3E]">
                      {formatBRL(
                        Math.max(
                          0,
                          liveMetrics.potential_monthly_capture -
                            liveMetrics.recommended_coupon_cap *
                              liveMetrics.max_safe_cost_per_redemption
                        )
                      )}
                    </strong>{" "}
                    • projeção demonstrativa (não incremental). Estimativa de{" "}
                    {liveMetrics.idle_capacity_estimate} lugares livres/mês.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function RestaurantCard({
  restaurant,
  isSelected,
  onEdit,
}: {
  restaurant: RestaurantWithSummary;
  isSelected: boolean;
  onEdit: () => void;
}) {
  return (
    <article
      className={cn(
        "flex flex-col justify-between rounded-xl border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all",
        isSelected
          ? "border-[#EA1D2C] ring-2 ring-[#EA1D2C]/15"
          : "border-neutral-200/80 hover:border-neutral-300"
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
              restaurant.is_demo_seed
                ? "bg-neutral-100 text-[#3F3E3E]"
                : "bg-emerald-50 text-emerald-800"
            )}
          >
            {restaurant.is_demo_seed ? "Exemplo pronto" : "Sua conta"}
          </span>

          <span className="text-xs font-bold text-[#3F3E3E]">
            Prontidão {restaurant.deterministic_metrics.readiness_score}/100
          </span>
        </div>

        <h3 className="mt-3 text-lg font-extrabold text-[#1A1A1A]">
          {restaurant.name}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[#717171]">
          <MapPin className="h-3.5 w-3.5 text-[#EA1D2C]" />
          {restaurant.category} • {restaurant.neighborhood}, {restaurant.city}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5 border-y border-neutral-100 py-3 text-xs">
          <div>
            <span className="text-[#717171]">Ticket médio</span>
            <p className="font-bold text-[#1A1A1A]">
              {formatBRL(restaurant.avg_ticket)}
            </p>
          </div>
          <div>
            <span className="text-[#717171]">Orçamento/mês</span>
            <p className="font-bold text-[#1A1A1A]">
              {formatBRL(restaurant.monthly_promo_budget)}
            </p>
          </div>
          <div className="flex items-center gap-1 text-[#3F3E3E]">
            <Users className="h-3.5 w-3.5 text-[#717171]" />
            <span>{restaurant.seating_capacity} lugares</span>
          </div>
          <div className="flex items-center gap-1 text-[#3F3E3E]">
            <Clock className="h-3.5 w-3.5 text-[#717171]" />
            <span>Desc. máx. {restaurant.max_discount_pct}%</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-[#717171]">
          <strong className="text-[#3F3E3E]">Horários tranquilos:</strong>{" "}
          {restaurant.low_demand_slots.slice(0, 3).join(", ")}
          {restaurant.low_demand_slots.length > 3
            ? ` (+${restaurant.low_demand_slots.length - 3})`
            : ""}
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold",
              SECONDARY_BUTTON_CLASS
            )}
          >
            <PencilLine className="h-3.5 w-3.5" />
            Personalizar
          </button>

          <NavButton
            href={`/restaurante/${restaurant.id}/diagnostico`}
            loadingText="Abrindo..."
            trailingIcon={<ArrowRight className="h-3.5 w-3.5" />}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#EA1D2C] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#A02331]"
          >
            Ver diagnóstico
          </NavButton>
        </div>

        {restaurant.active_campaigns_count > 0 ? (
          <NavButton
            href={`/restaurante/${restaurant.id}/resultados`}
            loadingText="Abrindo resultados..."
            icon={<BarChart3 className="h-3.5 w-3.5 text-[#EA1D2C]" />}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold",
              SECONDARY_BUTTON_CLASS
            )}
          >
            Acompanhar resultados ({restaurant.active_campaigns_count} ativa)
          </NavButton>
        ) : null}
      </div>
    </article>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-[#3F3E3E]">{label}</label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-[#EA1D2C]">{error}</p>
      ) : null}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-neutral-400 focus:ring-2",
    hasError
      ? "border-[#EA1D2C] focus:border-[#EA1D2C] focus:ring-[#EA1D2C]/15"
      : "border-neutral-300 focus:border-[#EA1D2C] focus:ring-[#EA1D2C]/15"
  );
}
