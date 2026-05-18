import { redirect } from "next/navigation";
import HomeClient from "./HomeClient";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");

  return <HomeClient />;
}
