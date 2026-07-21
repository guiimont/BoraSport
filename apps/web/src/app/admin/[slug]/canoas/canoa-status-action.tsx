"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { Resource, VesselStatus } from "../../../../types/saas";
import {
  updateResourceStatusAction,
  type AdminFormState,
} from "../actions";
import styles from "../admin.module.css";

type CanoaStatusActionProps = {
  companyId: string;
  resource: Resource;
  slug: string;
  status: VesselStatus;
};

const initialState: AdminFormState = {};

const labels: Record<VesselStatus, string> = {
  disponivel: "Reativar",
  inativa: "Inativar",
  manutencao: "Manutencao",
};

function SubmitButton({ status }: { status: VesselStatus }) {
  const { pending } = useFormStatus();

  return (
    <button className={styles.compactButton} disabled={pending} type="submit">
      {pending ? "..." : labels[status]}
    </button>
  );
}

export function CanoaStatusAction({
  companyId,
  resource,
  slug,
  status,
}: CanoaStatusActionProps) {
  const [state, action] = useActionState(updateResourceStatusAction, initialState);

  if (resource.vessel_status === status) {
    return null;
  }

  return (
    <form action={action} className={styles.inlineActionForm}>
      <input name="companyId" type="hidden" value={companyId} />
      <input name="resourceId" type="hidden" value={resource.id} />
      <input name="slug" type="hidden" value={slug} />
      <input name="vesselStatus" type="hidden" value={status} />
      <SubmitButton status={status} />
      {state.error ? <span className={styles.inlineError}>{state.error}</span> : null}
    </form>
  );
}
