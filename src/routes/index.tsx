import { createFileRoute } from "@tanstack/react-router";
import { LibraryShell } from "@/components/library-shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <LibraryShell />;
}
