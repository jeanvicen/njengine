import { MemoryRouter } from "react-router-dom";
import PlaystationRevampExperience from "../App.jsx";
import "../index.css";

/**
 * Loaded only after NJengines' original intro reaches its gallery phase.
 * MemoryRouter lets the reference screens run inside TanStack Start while
 * honoring a direct route (for example /controller?session=ABCD) on entry.
 */
export default function PlaystationExperience() {
  const initialEntry =
    typeof window === "undefined"
      ? "/home"
      : `${window.location.pathname}${window.location.search}${window.location.hash}`;

  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <div className="fixed inset-0 z-[60] overflow-x-hidden overflow-y-auto bg-[#0a0e1a]">
        <PlaystationRevampExperience />
      </div>
    </MemoryRouter>
  );
}
