import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Gamepad2,
  Home,
  LibraryBig,
  Plus,
  Search,
} from "lucide-react";
import { paintCoverDataUrl } from "@/studio/covers";
import { isFilled, safeHttpUrl, slotTitle, type GameSlot } from "@/studio/slots";

/*
 * Independent NJengines interface informed by broad dashboard/library ideas
 * in https://github.com/Manav-Sonawane/Playstation-Revamp . The reference
 * repository declares no license, so none of its source code or assets are used.
 */
type DashboardView = "home" | "library";

type ConsoleDashboardProps = {
  slots: GameSlot[];
  onOpenSlot: (id: string) => void;
};

export function ConsoleDashboard({ slots, onOpenSlot }: ConsoleDashboardProps) {
  const [view, setView] = useState<DashboardView>("home");
  const [query, setQuery] = useState("");
  const filledSlots = slots.filter(isFilled);
  const firstFree = slots.find((slot) => !isFilled(slot)) ?? null;
  const featured = filledSlots[0] ?? null;
  const playHref = featured ? safeHttpUrl(featured.playUrl) : "";

  const covers = useMemo(
    () =>
      new Map(
        slots.map((slot) => [
          slot.id,
          slot.imageUrl ||
            paintCoverDataUrl({
              bay: slot.bay,
              title: slot.title,
              filled: isFilled(slot),
            }),
        ] as const),
      ),
    [slots],
  );

  const featuredCover = featured
    ? covers.get(featured.id) ?? ""
    : firstFree
      ? covers.get(firstFree.id) ?? ""
      : "";
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const visibleSlots = normalizedQuery
    ? slots.filter(
        (slot) =>
          isFilled(slot) &&
          `${slot.title} ${slot.genre} ${slot.platform} ${slot.bay}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalizedQuery),
      )
    : slots;

  function addGame() {
    if (firstFree) onOpenSlot(firstFree.id);
  }

  return (
    <section className="nj-dashboard" aria-label="Painel do NJengines">
      <header className="nj-topbar">
        <div className="nj-brand">
          <span className="nj-brand-mark" aria-hidden="true">
            NJ
          </span>
          <span className="nj-brand-copy">
            <strong>NJengines</strong>
            <small>ESTÚDIO DE JOGOS</small>
          </span>
        </div>
        <div className="nj-collection-status" aria-label={`${filledSlots.length} de ${slots.length} jogos cadastrados`}>
          <span className="nj-status-dot" aria-hidden="true" />
          <span>COLEÇÃO LOCAL</span>
          <strong>{String(filledSlots.length).padStart(2, "0")} / {String(slots.length).padStart(2, "0")}</strong>
        </div>
      </header>

      <div className="nj-dashboard-body">
        <nav className="nj-navigation" aria-label="Navegação principal">
          <button
            type="button"
            className={`nj-nav-item${view === "home" ? " is-active" : ""}`}
            aria-current={view === "home" ? "page" : undefined}
            onClick={() => setView("home")}
          >
            <Home aria-hidden="true" />
            <span>Início</span>
          </button>
          <button
            type="button"
            className={`nj-nav-item${view === "library" ? " is-active" : ""}`}
            aria-current={view === "library" ? "page" : undefined}
            onClick={() => setView("library")}
          >
            <LibraryBig aria-hidden="true" />
            <span>Biblioteca</span>
          </button>
          <div className="nj-nav-spacer" />
          <button
            type="button"
            className="nj-nav-item nj-nav-add"
            onClick={addGame}
            disabled={!firstFree}
            aria-label={firstFree ? `Adicionar jogo na baia ${firstFree.bay}` : "Todas as baias estão ocupadas"}
          >
            <Plus aria-hidden="true" />
            <span>{firstFree ? "Adicionar" : "Completa"}</span>
          </button>
        </nav>

        <div className="nj-dashboard-scroll" key={view}>
          {view === "home" ? (
            <HomeView
              featured={featured}
              featuredCover={featuredCover}
              playHref={playHref}
              filledSlots={filledSlots}
              covers={covers}
              firstFree={firstFree}
              onOpenSlot={onOpenSlot}
              onAddGame={addGame}
              onShowLibrary={() => setView("library")}
            />
          ) : (
            <LibraryView
              slots={slots}
              covers={covers}
              visibleSlots={visibleSlots}
              query={query}
              onQueryChange={setQuery}
              onOpenSlot={onOpenSlot}
              onAddGame={addGame}
              hasFreeSlot={Boolean(firstFree)}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function HomeView({
  featured,
  featuredCover,
  playHref,
  filledSlots,
  covers,
  firstFree,
  onOpenSlot,
  onAddGame,
  onShowLibrary,
}: {
  featured: GameSlot | null;
  featuredCover: string;
  playHref: string;
  filledSlots: GameSlot[];
  covers: Map<string, string>;
  firstFree: GameSlot | null;
  onOpenSlot: (id: string) => void;
  onAddGame: () => void;
  onShowLibrary: () => void;
}) {
  return (
    <div className="nj-view nj-home-view">
      <div className="nj-page-heading">
        <div>
          <p className="nj-eyebrow"><span className="nj-heading-mark" />PAINEL DO ESTÚDIO</p>
          <h1>Seus jogos, em um só lugar.</h1>
          <p className="nj-page-description">
            Organize capas, detalhes e links de acesso na sua biblioteca NJengines.
          </p>
        </div>
        <button type="button" className="nj-primary-button" onClick={onAddGame} disabled={!firstFree}>
          <Plus aria-hidden="true" />
          <span>{firstFree ? "Adicionar jogo" : "Biblioteca completa"}</span>
        </button>
      </div>

      <section className="nj-feature" aria-labelledby="nj-feature-title">
        <div className="nj-feature-copy">
          <p className="nj-eyebrow">{featured ? "JOGO EM DESTAQUE" : "PRIMEIROS PASSOS"}</p>
          <h2 id="nj-feature-title">
            {featured ? slotTitle(featured) : "Sua biblioteca começa aqui."}
          </h2>
          <p className="nj-feature-description">
            {featured
              ? featured.description.trim() || "Abra a ficha para adicionar uma descrição ao jogo."
              : "Adicione um jogo para guardar a capa, os detalhes e o link de acesso. As informações ficam salvas neste aparelho."}
          </p>
          <div className="nj-feature-meta">
            {featured ? (
              <>
                {featured.genre.trim() && <span>{featured.genre}</span>}
                {featured.platform.trim() && <span>{featured.platform}</span>}
                {featured.year.trim() && <span>{featured.year}</span>}
                {!featured.genre.trim() && !featured.platform.trim() && !featured.year.trim() && (
                  <span>FICHA DO JOGO</span>
                )}
              </>
            ) : (
              <span>ATÉ 12 BAIAS</span>
            )}
          </div>
          <div className="nj-feature-actions">
            {featured && playHref ? (
              <a className="nj-primary-button" href={playHref} target="_blank" rel="noreferrer">
                <Gamepad2 aria-hidden="true" />
                <span>Abrir jogo</span>
                <ArrowUpRight aria-hidden="true" />
              </a>
            ) : (
              <button
                type="button"
                className="nj-primary-button"
                onClick={() => (featured ? onOpenSlot(featured.id) : onAddGame())}
                disabled={!featured && !firstFree}
              >
                <Plus aria-hidden="true" />
                <span>{featured ? "Editar ficha" : firstFree ? "Adicionar primeiro jogo" : "Sem baias livres"}</span>
              </button>
            )}
            {featured && (
              <button type="button" className="nj-quiet-button" onClick={() => onOpenSlot(featured.id)}>
                Ver ficha
                <ArrowRight aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <div className="nj-feature-art">
          {featuredCover && <img src={featuredCover} alt={featured ? `Capa de ${slotTitle(featured)}` : "Capa ilustrativa da primeira baia"} />}
          <div className="nj-feature-art-shade" />
          <span className="nj-feature-bay">{featured ? `BAIA ${featured.bay}` : firstFree ? `BAIA ${firstFree.bay}` : "NJENGINES"}</span>
        </div>
      </section>

      <section className="nj-collection-section" aria-labelledby="nj-collection-title">
        <div className="nj-section-heading">
          <div>
            <p className="nj-eyebrow">SUA COLEÇÃO</p>
            <h2 id="nj-collection-title">Jogos cadastrados</h2>
          </div>
          <button type="button" className="nj-text-button" onClick={onShowLibrary}>
            Ver biblioteca
            <ArrowRight aria-hidden="true" />
          </button>
        </div>

        {filledSlots.length ? (
          <div className="nj-game-row">
            {filledSlots.slice(0, 4).map((slot) => (
              <button
                key={slot.id}
                type="button"
                className="nj-game-card"
                onClick={() => onOpenSlot(slot.id)}
                aria-label={`Abrir ficha de ${slotTitle(slot)}, baia ${slot.bay}`}
              >
                <span className="nj-game-card-art">
                  <img src={covers.get(slot.id)} alt="" />
                  <span className="nj-card-bay">{slot.bay}</span>
                </span>
                <span className="nj-game-card-copy">
                  <strong>{slotTitle(slot)}</strong>
                  <small>{slot.genre.trim() || slot.platform.trim() || `Baia ${slot.bay}`}</small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="nj-inline-empty">
            <span className="nj-empty-icon"><Gamepad2 aria-hidden="true" /></span>
            <div>
              <strong>Nenhum jogo cadastrado ainda</strong>
              <p>As baias vazias ficam prontas para receber sua coleção.</p>
            </div>
            <button type="button" className="nj-quiet-button" onClick={onAddGame} disabled={!firstFree}>
              Configurar uma baia
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function LibraryView({
  slots,
  covers,
  visibleSlots,
  query,
  onQueryChange,
  onOpenSlot,
  onAddGame,
  hasFreeSlot,
}: {
  slots: GameSlot[];
  covers: Map<string, string>;
  visibleSlots: GameSlot[];
  query: string;
  onQueryChange: (value: string) => void;
  onOpenSlot: (id: string) => void;
  onAddGame: () => void;
  hasFreeSlot: boolean;
}) {
  const count = slots.filter(isFilled).length;

  return (
    <div className="nj-view nj-library-view">
      <div className="nj-page-heading">
        <div>
          <p className="nj-eyebrow"><span className="nj-heading-mark" />CATÁLOGO PESSOAL</p>
          <h1>Biblioteca</h1>
          <p className="nj-page-description">
            {count} de {slots.length} baias ocupadas. Selecione uma para editar a ficha.
          </p>
        </div>
        <button type="button" className="nj-primary-button" onClick={onAddGame} disabled={!hasFreeSlot}>
          <Plus aria-hidden="true" />
          <span>{hasFreeSlot ? "Adicionar jogo" : "Biblioteca completa"}</span>
        </button>
      </div>

      <label className="nj-search">
        <Search aria-hidden="true" />
        <span className="sr-only">Buscar jogos por título, gênero, plataforma ou baia</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar na biblioteca"
          autoComplete="off"
        />
      </label>

      {visibleSlots.length ? (
        <div className="nj-library-grid">
          {visibleSlots.map((slot) => {
            const filled = isFilled(slot);
            return (
              <button
                key={slot.id}
                type="button"
                className={`nj-library-card${filled ? " is-filled" : " is-empty"}`}
                onClick={() => onOpenSlot(slot.id)}
                aria-label={filled ? `Editar ${slotTitle(slot)}, baia ${slot.bay}` : `Adicionar jogo na baia ${slot.bay}`}
              >
                <span className="nj-library-art">
                  <img src={covers.get(slot.id)} alt="" loading="lazy" />
                  <span className="nj-library-art-shade" />
                  <span className="nj-library-bay">BAIA {slot.bay}</span>
                  {!filled && <Plus className="nj-library-plus" aria-hidden="true" />}
                </span>
                <span className="nj-library-card-copy">
                  <strong>{filled ? slotTitle(slot) : "Adicionar jogo"}</strong>
                  <small>{filled ? slot.genre.trim() || slot.platform.trim() || "Abrir ficha" : "Baia livre"}</small>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="nj-search-empty" role="status">
          <Search aria-hidden="true" />
          <strong>Nenhum jogo encontrado</strong>
          <p>Tente outro termo de busca.</p>
        </div>
      )}
    </div>
  );
}
