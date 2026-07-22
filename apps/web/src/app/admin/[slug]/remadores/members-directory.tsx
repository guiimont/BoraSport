"use client";

import { useMemo, useState } from "react";
import type { CompanyMember, MembershipRole } from "../../../../types/saas";
import styles from "../admin.module.css";

const PAGE_SIZE = 20;

function getRoleLabel(role: MembershipRole) {
  if (role === "admin") return "Admin";
  if (role === "professional") return "Treinador";
  return "Remador";
}

function normalized(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function MembersDirectory({ members }: { members: CompanyMember[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | MembershipRole>("all");
  const [page, setPage] = useState(1);

  const filteredMembers = useMemo(() => {
    const search = normalized(query);
    return members.filter((member) => {
      const matchesRole = role === "all" || member.role === role;
      const matchesSearch = !search || normalized(`${member.profile?.name ?? ""} ${member.profile?.phone ?? ""}`).includes(search);
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
        <div className={styles.membersTable} role="table" aria-label="Pessoas do clube">
          <div className={styles.membersTableHead} role="row">
            <span>Pessoa</span><span>Função</span><span>Status</span><span>Celular</span><span>Entrada</span>
          </div>
          {visibleMembers.map((member) => (
            <div className={styles.memberRow} role="row" key={member.id}>
              <div className={styles.memberIdentity} role="cell">
                <span className={styles.memberAvatar} aria-hidden="true">
                  {(member.profile?.name || "U").trim().charAt(0).toUpperCase()}
                </span>
                <strong>{member.profile?.name || "Usuário BoraSport"}</strong>
              </div>
              <span className={styles.memberRole} data-label="Função" role="cell">{getRoleLabel(member.role)}</span>
              <span className={styles.memberActive} data-label="Status" role="cell">Ativo</span>
              <span className={styles.memberPhone} data-label="Celular" role="cell">{member.profile?.phone || "Não informado"}</span>
              <span className={styles.memberSince} data-label="Entrada" role="cell">{new Date(member.created_at).toLocaleDateString("pt-BR")}</span>
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
