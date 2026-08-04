"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { BaseScheduleStatus } from "../../../../../../types/saas";
import {
  changeBaseScheduleStatus,
  type AdminFormState,
} from "../../../actions";
import styles from "../../../admin.module.css";

type BaseScheduleStatusActionProps = {
  companyId: string;
  scheduleId: string;
  slug: string;
  status: BaseScheduleStatus;
};

const initialState: AdminFormState = {};

function SubmitButton({ status }: { status: BaseScheduleStatus }) {
  const { pending } = useFormStatus();

  return (
    <button className={styles.secondaryButton} disabled={pending} type="submit">
      {pending
        ? "Atualizando..."
        : status === "active"
          ? "Reativar"
          : "Inativar"}
    </button>
  );
}

export function BaseScheduleStatusAction({
  companyId,
  scheduleId,
  slug,
  status,
}: BaseScheduleStatusActionProps) {
  const [state, action] = useActionState(changeBaseScheduleStatus, initialState);

  return (
    <form action={action} className={styles.inlineActionForm}>
      <input name="companyId" type="hidden" value={companyId} />
      <input name="scheduleId" type="hidden" value={scheduleId} />
      <input name="slug" type="hidden" value={slug} />
      <input name="status" type="hidden" value={status} />
      <SubmitButton status={status} />
      {state.error ? <p className={styles.error}>{state.error}</p> : null}
      {state.success ? <p className={styles.success}>{state.success}</p> : null}
    </form>
  );
}
