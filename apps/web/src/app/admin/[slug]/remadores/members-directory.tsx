"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import type { CompanyMember, MembershipRole } from "../../../../types/saas";
import {
  type MembershipFormState,
  removeMemberAction,
  updateMemberRoleAction,
} from "../actions";
import styles from "../admin.module.css";

const PAGE_SIZE = 20;

function getRoleLabel(role: MembershipRole) {
  if (role === "admin") return "Admin";
  if (role === "professional") return "Treinador";
  return "Remador";
}

function normalized(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const initialActionState: MembershipFormState = {};

function MemberActionButton({
  label,
  pendingLabel,
  tone = "default",
}: {
  label: string;
  pendingLabel: string;
  tone?: "danger" | "default";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={
        tone === "danger"
          ? styles.memberDangerButton
          : styles.memberSaveButton
      }
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

type MembersDirectoryProps = {
  canManage: boolean;
  companyId: string;
  currentUserId: string;
  members: CompanyMember[];
  slug: string;
};

export function MembersDirectory({
  canManage,
  companyId,
  currentUserId,
  members,
  slug,
}: MembersDirectoryProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | MembershipRole>("all");
  const [page, setPage] = useState(1);
  const [updateState, updateAction] = useActionState(
    updateMemberRoleAction,
    initialActionState,
  );
  const [removeState, removeAction] = useActionState(
    removeMemberAction,
    initialActionState,
  );

  useEffect(() => {
    if (updateState.success || removeState.success) {
      router.refresh();
    }
  }, [removeState.success, router, updateState.success]);

  const filteredMembers = useMemo(() => {
    const search = normalized(query);
    return members.filter((member) => {
      const matchesRole = role === "all" || member.role === role;
      const matchesSearch =
        !search ||
        normalized(
          `${member.profile?.name ?? ""} ${member.profile?.phone ?? ""}`,
        ).includes(search);
      return matchesRole && matchesSearch;
    });
  }, [members, query, role]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleMembers = filteredMembers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetPage() {
    setPage(1);
  }

  return (
    <div className={styles.membersDirectory}>
      <div className={styles.membersToolbar}>
        <label className={styles.memberSearch}>
          <span>Buscar pessoa</span>
          <input
            onChange={(event) => { setQuery(event.target.value); resetPage(); }}
            placeholder="Nome ou celular"
            type="search"
            value={query}
          />
        </label>
        <label className={styles.memberFilter}>
          <span>Função</span>
          <select
            onChange={(event) => { setRole(event.target.value as "all" | MembershipRole); resetPage(); }}
            value={role}
          >
            <option value="all">Todas</option>
            <option value="client">Remadores</option>
            <option value="professional">Treinadores</option>
            <option value="admin">Admins</option>
          </select>
        </label>
      </div>

      <div className={styles.membersResultBar} aria-live="polite">
        <strong>{filteredMembers.length}</strong> {filteredMembers.length === 1 ? "pessoa encontrada" : "pessoas encontradas"}
      </div>

      {visibleMembers.length ? (
        <div
          aria-label="Pessoas do clube"
          className={styles.membersTable}
          data-manage={canManage ? "true" : "false"}
          role="table"
        >
          <div className={styles.membersTableHead} role="row">
            <span>Pessoa</span>
            <span>Função</span>
            <span>Status</span>
            <span>Celular</span>
            <span>Entrada</span>
            {canManage ? <span>Ações</span> : null}
          </div>
          {visibleMembers.map((member) => (
            <div className={styles.memberRow} role="row" key={member.id}>
              <div className={styles.memberIdentity} role="cell">
                <span className={styles.memberAvatar} aria-hidden="true">
                  {(member.profile?.name || "U").trim().charAt(0).toUpperCase()}
                </span>
                <strong>{member.profile?.name || "Usuário BoraSport"}</strong>
              </div>
              {canManage ? (
                <form
                  action={updateAction}
                  className={styles.memberRoleForm}
                  role="cell"
                >
                  <input name="companyId" type="hidden" value={companyId} />
                  <input name="membershipId" type="hidden" value={member.id} />
                  <input name="slug" type="hidden" value={slug} />
                  <label>
                    <span className={styles.srOnly}>
                      Função de {member.profile?.name || "usuário"}
                    </span>
                    <select defaultValue={member.role} name="role">
                      <option value="client">Remador</option>
                      <option value="professional">Treinador</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <MemberActionButton
                    label="Salvar"
                    pendingLabel="Salvando..."
                  />
                </form>
              ) : (
                <span className={styles.memberRole} data-label="Função" role="cell">{getRoleLabel(member.role)}</span>
              )}
              <span className={styles.memberActive} data-label="Status" role="cell">Ativo</span>
              <span className={styles.memberPhone} data-label="Celular" role="cell">{member.profile?.phone || "Não informado"}</span>
              <span className={styles.memberSince} data-label="Entrada" role="cell">{new Date(member.created_at).toLocaleDateString("pt-BR")}</span>
              {canManage ? (
                <div className={styles.memberActions} data-label="Ações" role="cell">
                  {member.user_id === currentUserId ? (
                    <span className={styles.memberSelfLabel}>Seu acesso</span>
                  ) : (
                    <form
                      action={removeAction}
                      onSubmit={(event) => {
                        if (
                          !window.confirm(
                            `Remover ${member.profile?.name || "esta pessoa"} do clube?`,
                          )
                        ) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input name="companyId" type="hidden" value={companyId} />
                      <input name="membershipId" type="hidden" value={member.id} />
                      <input name="slug" type="hidden" value={slug} />
                      <MemberActionButton
                        label="Remover"
                        pendingLabel="Removendo..."
                        tone="danger"
                      />
                    </form>
                  )}
                </div>
              ) : null}
              {updateState.membershipId === member.id &&
              updateState.success ? (
                <p className={styles.memberActionSuccess}>
                  {updateState.success}
                </p>
              ) : null}
              {updateState.membershipId === member.id && updateState.error ? (
                <p className={styles.memberActionError}>{updateState.error}</p>
              ) : null}
              {removeState.membershipId === member.id && removeState.error ? (
                <p className={styles.memberActionError}>{removeState.error}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Nenhuma pessoa corresponde aos filtros.</p>
      )}

      {totalPages > 1 ? (
        <nav className={styles.membersPagination} aria-label="Paginação das pessoas">
          <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} type="button">Anterior</button>
          <span>Página {currentPage} de {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} type="button">Próxima</button>
        </nav>
      ) : null}
    </div>
  );
}
