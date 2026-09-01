import { redirect } from "next/navigation";

import { Button, MemberShell } from "../../components/ui";
import {
  getCurrentUser,
  getCurrentUserMemberships,
  getCurrentUserNotifications,
} from "../../lib/saas/queries";
import { markNotificationsRead } from "./actions";
import styles from "./notifications.module.css";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function NotificationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/notificacoes");
  }

  const [notifications, memberships] = await Promise.all([
    getCurrentUserNotifications(),
    getCurrentUserMemberships(),
  ]);
  const primaryCompany = memberships[0]?.companies ?? null;
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return (
    <MemberShell
      company={primaryCompany}
      context="Central do remador"
      description="Confirmações de vaga e movimentos importantes da sua agenda. Estes avisos são visíveis somente para você."
      title="Meus avisos"
    >
      <section className={styles.panel}>
        <header className={styles.header}>
          <div>
            <p>{unreadCount ? `${unreadCount} aviso${unreadCount === 1 ? "" : "s"} novo${unreadCount === 1 ? "" : "s"}` : "Tudo em dia"}</p>
            <h2>Atualizações da sua agenda</h2>
          </div>
          {unreadCount ? (
            <form action={markNotificationsRead}>
              <Button type="submit" variant="secondary">
                Marcar como lidos
              </Button>
            </form>
          ) : null}
        </header>

        {notifications.length ? (
          <ol className={styles.list}>
            {notifications.map((notification) => (
              <li
                className={styles.item}
                data-unread={!notification.read_at}
                key={notification.id}
              >
                <span className={styles.marker} aria-hidden />
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <time dateTime={notification.created_at}>
                    {dateFormatter.format(new Date(notification.created_at))}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles.empty}>
            <span aria-hidden>✓</span>
            <h2>Nenhum aviso por enquanto</h2>
            <p>Entradas na lista de espera e confirmações de vaga aparecerão aqui.</p>
          </div>
        )}
      </section>
    </MemberShell>
  );
}
