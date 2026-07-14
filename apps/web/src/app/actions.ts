"use server";

import { createClient } from "../lib/saas/supabase-server";

export type CommercialLeadState = {
  errors?: Partial<Record<CommercialLeadField, string>>;
  message?: string;
  success?: boolean;
};

type CommercialLeadField =
  | "cityState"
  | "clubName"
  | "consent"
  | "email"
  | "message"
  | "name"
  | "phone"
  | "role";

const source = "borasport-commercial-landing";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+()\-\s]/g, "").trim();
}

export async function submitCommercialLead(
  _previousState: CommercialLeadState,
  formData: FormData,
): Promise<CommercialLeadState> {
  const honeypot = readText(formData, "contactFaxConfirmation");

  if (honeypot) {
    return {
      message: "Recebemos sua solicitação.",
      success: true,
    };
  }

  const name = readText(formData, "name");
  const clubName = readText(formData, "clubName");
  const role = readText(formData, "role");
  const cityState = readText(formData, "cityState");
  const phone = normalizePhone(readText(formData, "phone"));
  const email = readText(formData, "email").toLowerCase();
  const message = readText(formData, "message");
  const consent = readText(formData, "consent") === "on";

  const errors: CommercialLeadState["errors"] = {};

  if (name.length < 2) {
    errors.name = "Informe seu nome.";
  }

  if (clubName.length < 2) {
    errors.clubName = "Informe o nome do clube.";
  }

  if (role.length < 2) {
    errors.role = "Informe sua função no clube.";
  }

  if (cityState.length < 2) {
    errors.cityState = "Informe cidade e estado.";
  }

  if (phone.length < 8) {
    errors.phone = "Informe um WhatsApp válido.";
  }

  if (!isValidEmail(email)) {
    errors.email = "Informe um e-mail válido.";
  }

  if (message.length > 1200) {
    errors.message = "Use no máximo 1200 caracteres.";
  }

  if (!consent) {
    errors.consent = "Confirme o consentimento para contato.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      errors,
      message: "Revise os campos destacados.",
      success: false,
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("commercial_leads").insert({
      city_state: cityState,
      club_name: clubName,
      consent_at: new Date().toISOString(),
      email,
      message: message || null,
      name,
      phone,
      role,
      source,
      status: "new",
    });

    if (!error) {
      return {
        message: "Recebemos sua solicitação. Vamos entrar em contato.",
        success: true,
      };
    }
  } catch {
    // Fall through to the generic public error. Do not expose infrastructure details.
  }

  return {
    message: "Não foi possível enviar agora. Tente novamente em instantes.",
    success: false,
  };
}
