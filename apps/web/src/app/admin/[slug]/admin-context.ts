import { notFound, redirect } from "next/navigation";

import {
  companyHasMembers,
  getCompanyBySlug,
  getCurrentUser,
  getUserCompanyRole,
} from "../../../lib/saas/queries";
import type { Company, MembershipRole, VocabularyConfig } from "../../../types/saas";

export type AdminContext = {
  canClaimTenant: boolean;
  canManageTenant: boolean;
  company: Company;
  role: MembershipRole | null;
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  userLabel: string;
  vocabulary: Required<VocabularyConfig>;
};

export const defaultVocabulary: Required<VocabularyConfig> = {
  booking_label: "Reserva",
  professional_label: "Profissional",
  resource_label: "Recurso",
  service_label: "Serviço",
};

export function normalizeVocabulary(
  vocabulary?: VocabularyConfig | null,
): Required<VocabularyConfig> {
  return {
    booking_label: vocabulary?.booking_label || defaultVocabulary.booking_label,
    professional_label:
      vocabulary?.professional_label || defaultVocabulary.professional_label,
    resource_label:
      vocabulary?.resource_label || defaultVocabulary.resource_label,
    service_label: vocabulary?.service_label || defaultVocabulary.service_label,
  };
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export function getUserLabel(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
) {
  if (!user) {
    return "Usuário";
  }

  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : null;

  return metadataName || user.email || "Usuário Bora";
}

export async function getAdminContext(slug: string): Promise<AdminContext> {
  const company = await getCompanyBySlug(slug);

  if (!company) {
    notFound();
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/admin/${company.slug}`);
  }

  const [role, hasMembers] = await Promise.all([
    getUserCompanyRole(company.id, user.id),
    companyHasMembers(company.id),
  ]);
  const canManageTenant = role === "admin" || role === "professional";
  const canClaimTenant = !hasMembers;

  if (!canManageTenant && !canClaimTenant) {
    notFound();
  }

  return {
    canClaimTenant,
    canManageTenant,
    company,
    role,
    user,
    userLabel: getUserLabel(user),
    vocabulary: normalizeVocabulary(company.vocabulary_config),
  };
}

export async function getManageAdminContext(
  slug: string,
): Promise<AdminContext> {
  const context = await getAdminContext(slug);

  if (!context.canManageTenant) {
    redirect(`/admin/${context.company.slug}`);
  }

  return context;
}
