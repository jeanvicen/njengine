import { createFileRoute } from "@tanstack/react-router";
import { ConsoleShell } from "@/components/console-shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ConsoleShell />;
}
