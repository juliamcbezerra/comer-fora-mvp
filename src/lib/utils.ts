import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals).replace(".", ",")}%`;
}

export const SALON_PROMOTION_LABELS: Record<string, string> = {
  nenhuma: "Nenhuma divulgação no salão",
  apenas_redes_sociais: "Divulga apenas no Instagram / redes sociais",
  placa_simples_caixa: "Placa simples no caixa",
  display_mesa_ativo: "Display de mesa ativo com abordagem da equipe",
};

export const PRIMARY_GOAL_LABELS: Record<string, string> = {
  preencher_horarios_ociosos: "Preencher horários ociosos",
  aumentar_divulgacao_salao: "Aumentar divulgação no salão",
  gerar_recorrencia_giftback: "Gerar recorrência / Giftback",
  aumentar_ticket_medio: "Aumentar ticket médio no salão",
};
