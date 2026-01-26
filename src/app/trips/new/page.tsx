import { redirect } from "next/navigation";
import { auth } from "@/auth";
import NewTripClient from "./NewTripClient";

export default async function NewTripPage() {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    redirect("/api/auth/signin?callbackUrl=/trips/new");
  }

  return <NewTripClient />;
}
