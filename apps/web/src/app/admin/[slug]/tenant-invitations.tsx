"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import type { CompanyInvitation } from "../../../types/saas";
import {
  createClientInvitation,
  type AdminFormState,
  type InvitationFormState,
  revokeClientInvitation,
} from "./actions";
import styles from "./admin.module.css";

type TenantInvitationsProps = {
  companyId: string;
  invitations: CompanyInvitation[];
  slug: string;
};

const initialInvitationState: InvitationFormState = {};
const initialAdminState: AdminFormState = {};

function getInvitationStatus(invitation: CompanyInvitation) {
  if (invitation.used_at) {
    return "utilizado";
  }

  if (invitation.revoked_at) {
    return "revogado";
  }

  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    return "expirado";
  }

  return "ativo";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button className={styles.primaryButton} disabled={pending} type="submit">
      {pending ? "Salvando..." : label}
    </button>
  );
}

function RevokeButton() {
  const { pending } = useFormStatus();

  return (
    <button className={styles.secondaryButton} disabled={pending} type="submit">
      {pending ? "Revogando..." : "Revogar"}
    </button>
  );
}

export function TenantInvitations({
  companyId,
  invitations,
  slug,
}: TenantInvitationsProps) {
  const router = useRouter();
  const [copyMessage, setCopyMessage] = useState("");
  const [createState, createAction] = useActionState(
    createClientInvitation,
    initialInvitationState,
  );
  const [revokeState, revokeAction] = useActionState(
    revokeClientInvitation,
    initialAdminState,
  );

  useEffect(() => {
    if (createState.success || revokeState.success) {
      router.refresh();
    }
  }, [createState.success, revokeState.success, router]);

  async function copyInviteLink() {
    if (!createState.inviteLink) {
      return;
    }

    await navigator.clipboard.writeText(createState.inviteLink);
    setCopyMessage("Link copiado.");
  }

  const activeInvitations = invitations.filter(
    (invitation) => getInvitationStatus(invitation) === "ativo",
  );
  const invitationHistory = invitations.filter(
    (invitation) => getInvitationStatus(invitation) !== "ativo",
  );

  return (
    <section className={`${styles.panel} ${styles.invitationsPanel}`}>
      <div className={styles.sectionHeadBalanced}>
        <div>
          <p className={styles.eyebrow}>Novos acessos</p>
          <h2>Convidar remador</h2>
          <p className={styles.muted}>
            Crie um link individual e envie pelo canal que preferir. Cada link
            pode ser utilizado apenas uma vez.
          </p>
        </div>
        <span className={styles.activeInviteCount}>
          {activeInvitations.length} {activeInvitations.length === 1 ? "convite ativo" : "convites ativos"}
        </span>
      </div>

      <form action={createAction} className={styles.inviteComposer}>
        <input name="companyId" type="hidden" value={companyId} />
        <input name="slug" type="hidden" value={slug} />

        <div className={styles.inviteComposerRow}>
          <label className={styles.label}>
            Validade do convite
            <input
              className={styles.input}
              defaultValue="7"
              max="30"
              min="1"
              name="expiresInDays"
              type="number"
            />
          </label>
          <SubmitButton label="Gerar convite" />
        </div>

        <div className={styles.actionRow}>
          {createState.success ? (
            <p className={styles.success}>{createState.success}</p>
          ) : null}
          {createState.error ? (
            <p className={styles.error}>{createState.error}</p>
          ) : null}
        </div>

        {createState.inviteLink ? (
          <div className={styles.inviteResult}>
            <label className={styles.label}>
              Link do convite
              <input
                className={styles.input}
                readOnly
                value={createState.inviteLink}
              />
            </label>
            <button
              className={styles.secondaryButton}
              onClick={copyInviteLink}
              type="button"
            >
              Copiar link
            </button>
            {copyMessage ? <p className={styles.success}>{copyMessage}</p> : null}
          </div>
        ) : null}
      </form>

      <div className={styles.invitationSectionHead}>
        <div>
          <h3>Convites ativos</h3>
          <p>Links que ainda podem ser utilizados.</p>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Criado</th>
              <th>Expira</th>
              <th>Uso</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {activeInvitations.length > 0 ? (
              activeInvitations.map((invitation) => {
                const status = getInvitationStatus(invitation);
                const canRevoke = status === "ativo";

                return (
                  <tr key={invitation.id}>
                    <td>
                      <span className={styles.statusBadge}>{status}</span>
                    </td>
                    <td>{formatDateTime(invitation.created_at)}</td>
                    <td>{formatDateTime(invitation.expires_at)}</td>
                    <td>
                      {invitation.used_at
                        ? `${formatDateTime(invitation.used_at)}${
                            invitation.accepted_email
                              ? ` por ${invitation.accepted_email}`
                              : ""
                          }`
                        : "--"}
                    </td>
                    <td>
                      {canRevoke ? (
                        <form action={revokeAction}>
                          <input name="companyId" type="hidden" value={companyId} />
                          <input name="slug" type="hidden" value={slug} />
                          <input
                            name="invitationId"
                            type="hidden"
                            value={invitation.id}
                          />
                          <RevokeButton />
                        </form>
                      ) : (
                        "--"
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5}>Nenhum convite ativo. Gere um novo quando precisar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {invitationHistory.length > 0 ? (
        <details className={styles.invitationHistory}>
          <summary>Histórico de convites ({invitationHistory.length})</summary>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Criado</th>
                  <th>Expirou</th>
                  <th>Uso</th>
                </tr>
              </thead>
              <tbody>
                {invitationHistory.map((invitation) => (
                  <tr key={invitation.id}>
                    <td><span className={styles.statusBadge}>{getInvitationStatus(invitation)}</span></td>
                    <td>{formatDateTime(invitation.created_at)}</td>
                    <td>{formatDateTime(invitation.expires_at)}</td>
                    <td>
                      {invitation.used_at
                        ? `${formatDateTime(invitation.used_at)}${invitation.accepted_email ? ` por ${invitation.accepted_email}` : ""}`
                        : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      {revokeState.success ? (
        <p className={styles.success}>{revokeState.success}</p>
      ) : null}
      {revokeState.error ? <p className={styles.error}>{revokeState.error}</p> : null}
    </section>
  );
}
