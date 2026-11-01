import { redirect } from "next/navigation";

export const metadata = { title: "Connections · Soli" };

export default function ConnectionsPage() {
  redirect("/settings/connectors");
}
