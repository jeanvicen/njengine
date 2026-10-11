// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CircleHelp,
  Film,
  Gamepad2,
  LibraryBig,
  MonitorPlay,
  Plus,
  Radio,
  Search,
  ShoppingBag,
  Sparkles,
  UserRound,
} from "lucide-react";

const SLOT_STORAGE_KEY = "njengines.bays.v1";

function readUserGames() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SLOT_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((slot) => {
      if (!slot || typeof slot !== "object") return false;
      return Boolean(
        (typeof slot.title === "string" && slot.title.trim()) ||
        (typeof slot.description === "string" && slot.description.trim()) ||
        (typeof slot.imageUrl === "string" && slot.imageUrl.startsWith("data:image/")) ||
        (typeof slot.playUrl === "string" && slot.playUrl.trim()) ||
        (typeof slot.videoUrl === "string" && slot.videoUrl.trim()),
      );
    });
  } catch {
    return [];
  }
}

function useUserGames() {
  const [games, setGames] = useState([]);
  useEffect(() => {
    const refresh = () => setGames(readUserGames());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);
  return games;
}

function safeExternalUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

const pageCopy = {
  store: {
    eyebrow: "LOJA",
    title: "Sem catálogo por enquanto.",
    body: "Não há jogos ou produtos publicados nesta loja. Ela só mostrará itens reais quando forem cadastrados — sem ofertas, preços ou compras de demonstração.",
    Icon: ShoppingBag,
  },
  media: {
    eyebrow: "MÍDIA",
    title: "Nenhuma mídia disponível.",
    body: "Vídeos, serviços e conteúdos aparecerão aqui quando houver itens reais conectados. Nenhum conteúdo de exemplo está sendo exibido.",
    Icon: Film,
  },
  profile: {
    eyebrow: "PERFIL",
    title: "Seu perfil ainda não foi configurado.",
    body: "Não há uma conta ou dados pessoais conectados para mostrar. Seu nome, atividade e conquistas não serão inventados.",
    Icon: UserRound,
  },
  subscriptions: {
    eyebrow: "ASSINATURAS",
    title: "Nenhuma assinatura cadastrada.",
    body: "Não há planos ou benefícios ativos conectados a esta experiência. Esta área permanecerá vazia até existir uma oferta real.",
    Icon: CircleHelp,
  },
  accessories: {
    eyebrow: "ACESSÓRIOS",
    title: "Nenhum acessório listado.",
    body: "Não há produtos ou preços verificados para exibir. Nenhuma compra de demonstração será apresentada como real.",
    Icon: Gamepad2,
  },
};

function EmptyCard({ icon: Icon, title, body, children, className = "", kicker = "STATUS" }) {
  return (
    <section className={`nj-empty-card ${className}`} aria-labelledby="nj-empty-title">
      <div className="nj-empty-mark" aria-hidden="true"><Icon size={24} strokeWidth={1.5} /></div>
      <p className="nj-kicker">{kicker}</p>
      <h2 id="nj-empty-title">{title}</h2>
      <p className="nj-empty-copy">{body}</p>
      {children}
    </section>
  );
}

export function NJEmptySection({ title = "Sem dados disponíveis.", body = "Nenhum conteúdo cadastrado.", Icon = CircleHelp }) {
  return <section className="nj-empty-inline"><Icon size={19} aria-hidden="true" /><div><h3>{title}</h3><p>{body}</p></div></section>;
}

function UserGameCard({ game }) {
  const gameName = typeof game.title === "string" && game.title.trim() ? game.title.trim() : `Baia ${String(game.bay || "").padStart(2, "0")}`;
  const image = typeof game.imageUrl === "string" && game.imageUrl.startsWith("data:image/") ? game.imageUrl : "";
  const launchUrl = safeExternalUrl(game.playUrl);
  const videoUrl = safeExternalUrl(game.videoUrl);
  const gameMeta = [game.genre, game.platform, game.year].filter((value) => typeof value === "string" && value.trim()).join(" · ");
  return (
    <article className="nj-game-card">
      <div className="nj-game-art" aria-hidden="true">
        {image ? <img src={image} alt="" loading="lazy" /> : <Gamepad2 size={30} strokeWidth={1.35} />}
        <span className="nj-game-bay">BAIA {String(game.bay || "").padStart(2, "0")}</span>
      </div>
      <div className="nj-game-info">
        <h3>{gameName}</h3>
        {gameMeta && <p>{gameMeta}</p>}
        {typeof game.description === "string" && game.description.trim() && <p className="nj-game-description">{game.description.trim()}</p>}
        {(launchUrl || videoUrl) && <div className="nj-game-links">
          {launchUrl && <a className="nj-text-link" href={launchUrl} target="_blank" rel="noreferrer">Abrir jogo <ArrowUpRight size={15} /></a>}
          {videoUrl && <a className="nj-text-link" href={videoUrl} target="_blank" rel="noreferrer">Assistir vídeo <ArrowUpRight size={15} /></a>}
        </div>}
      </div>
    </article>
  );
}

function PageFrame({ eyebrow, title, description, children, className = "" }) {
  return (
    <main className={`nj-screen ${className}`}>
      <div className="nj-page-heading">
        <p className="nj-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="nj-page-description">{description}</p>}
      </div>
      {children}
    </main>
  );
}

export function HomePage() {
  const games = useUserGames();
  const hasGames = games.length > 0;
  return (
    <PageFrame
      eyebrow="NJENGINES · SEU ESPAÇO"
      title={hasGames ? "Seus jogos, do seu jeito." : "Um espaço pronto para os seus jogos."}
      description="Uma biblioteca pessoal, simples e sem títulos de demonstração."
      className="nj-home-screen"
    >
      <section className="nj-home-hero">
        <div className="nj-home-hero-copy">
          <span className="nj-home-badge"><span /> NJENGINES</span>
          {hasGames ? (
            <>
              <h2>{games.length} {games.length === 1 ? "jogo salvo" : "jogos salvos"}</h2>
              <p>Somente os títulos que você adicionou ao seu Estúdio aparecem nesta biblioteca.</p>
            </>
          ) : (
            <>
              <h2>Sua biblioteca começa aqui.</h2>
              <p>Não há jogos cadastrados. Os espaços ficam livres até você adicionar os seus no Estúdio.</p>
            </>
          )}
          <div className="nj-actions">
            <a className="nj-button nj-button-gold" href="/" aria-label="Voltar ao Estúdio para gerenciar seus jogos">
              <Plus size={17} /> Abrir Estúdio
            </a>
            <Link className="nj-button nj-button-quiet" to="/library"><LibraryBig size={17} /> Biblioteca</Link>
          </div>
        </div>
        <div className="nj-home-visual" aria-hidden="true">
          <div className="nj-orbit nj-orbit-one" />
          <div className="nj-orbit nj-orbit-two" />
          <div className="nj-orbit-core"><Gamepad2 size={48} strokeWidth={1.15} /></div>
          <span className="nj-visual-caption">SEU UNIVERSO · SEM LIMITES</span>
        </div>
      </section>

      {hasGames ? (
        <section className="nj-home-library" aria-labelledby="nj-library-preview-title">
          <div className="nj-section-heading">
            <div><p className="nj-kicker">SEUS TÍTULOS</p><h2 id="nj-library-preview-title">Na sua biblioteca</h2></div>
            <Link className="nj-text-link" to="/library">Ver biblioteca <ArrowUpRight size={15} /></Link>
          </div>
          <div className="nj-game-grid">{games.slice(0, 3).map((game) => <UserGameCard key={game.id || game.bay} game={game} />)}</div>
        </section>
      ) : (
        <EmptyCard
          icon={LibraryBig}
          kicker="BIBLIOTECA"
          title="Ainda não há jogos na biblioteca."
          body="Os títulos de exemplo foram removidos. Quando você cadastrar jogos no Estúdio, eles aparecerão aqui e na biblioteca."
        >
          <a className="nj-text-link" href="/">Adicionar seus jogos no Estúdio <ArrowUpRight size={15} /></a>
        </EmptyCard>
      )}

      <section className="nj-feature-row" aria-label="Recursos do NJengines">
        <Link to="/showcase" className="nj-feature-card"><span className="nj-feature-icon"><Radio size={20} /></span><span><strong>Experiência de controle</strong><small>Abra o showcase do controle.</small></span><ArrowUpRight size={17} /></Link>
        <Link to="/media" className="nj-feature-card"><span className="nj-feature-icon"><MonitorPlay size={20} /></span><span><strong>Área de mídia</strong><small>Confira o estado atual do catálogo.</small></span><ArrowUpRight size={17} /></Link>
      </section>
    </PageFrame>
  );
}

export function LibraryPage() {
  const games = useUserGames();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("bay");
  const displayedGames = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    const filtered = games.filter((game) => [game.title, game.genre, game.description].some((value) => typeof value === "string" && value.toLocaleLowerCase().includes(term)));
    return filtered.sort((a, b) => sort === "name" ? String(a.title || a.bay).localeCompare(String(b.title || b.bay), "pt-BR") : Number(a.bay) - Number(b.bay));
  }, [games, query, sort]);
  return (
    <PageFrame eyebrow="SUA COLEÇÃO" title="Biblioteca" description="Somente os jogos salvos por você no Estúdio são exibidos aqui." className="nj-library-screen">
      <div className="nj-section-heading nj-library-toolbar">
        <div><p className="nj-kicker">{games.length === 1 ? "1 JOGO SALVO" : `${games.length} JOGOS SALVOS`}</p><h2>{games.length ? "Seus títulos" : "Nenhum jogo cadastrado"}</h2></div>
        <a className="nj-button nj-button-quiet" href="/"><Plus size={17} /> Abrir Estúdio</a>
      </div>
      {games.length > 0 && <div className="nj-library-controls">
        <label className="nj-search-control"><Search size={17} aria-hidden="true" /><span className="nj-sr-only">Buscar na biblioteca</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar seus jogos" /></label>
        <label className="nj-sort-control"><span className="nj-sr-only">Ordenar jogos</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="bay">Ordem das baias</option><option value="name">Nome · A a Z</option></select></label>
      </div>}
      {displayedGames.length > 0 ? (
        <div className="nj-game-grid">{displayedGames.map((game) => <UserGameCard key={game.id || game.bay} game={game} />)}</div>
      ) : games.length === 0 ? (
        <EmptyCard icon={LibraryBig} kicker="BIBLIOTECA VAZIA" title="Sua biblioteca está vazia." body="As capas e os títulos de demonstração foram removidos. Adicione somente os seus próprios jogos pelo Estúdio." className="nj-library-empty">
          <a className="nj-button nj-button-gold" href="/"><Plus size={17} /> Abrir Estúdio</a>
        </EmptyCard>
      ) : (
        <EmptyCard icon={Search} kicker="BUSCA" title="Nenhum jogo encontrado." body="Não há títulos salvos que correspondam a essa busca." className="nj-library-empty">
          <button className="nj-button nj-button-quiet" type="button" onClick={() => setQuery("")}>Limpar busca</button>
        </EmptyCard>
      )}
    </PageFrame>
  );
}

function CatalogEmptyPage({ type }) {
  const config = pageCopy[type];
  const Icon = config.Icon;
  return (
    <PageFrame eyebrow={config.eyebrow} title={type === "store" ? "Loja" : type === "media" ? "Mídia" : type === "profile" ? "Perfil" : type === "subscriptions" ? "Assinaturas" : "Acessórios"} description="NJengines · Interface pessoal" className="nj-catalog-screen">
      <EmptyCard icon={Icon} kicker={config.eyebrow} title={config.title} body={config.body} className="nj-catalog-empty">
        <div className="nj-actions">
          {type !== "profile" && <Link className="nj-button nj-button-quiet" to="/home"><ArrowLeft size={16} /> Início</Link>}
          {type === "store" && <Link className="nj-button nj-button-gold" to="/library"><LibraryBig size={17} /> Minha biblioteca</Link>}
          {type === "profile" && <Link className="nj-button nj-button-quiet" to="/home"><ArrowLeft size={16} /> Voltar ao início</Link>}
        </div>
      </EmptyCard>
      {type === "profile" && <p className="nj-profile-note">Os dados da sua conta não são conectados por esta interface.</p>}
      {type === "store" && <div className="nj-store-note"><Sparkles size={16} /><span>A loja permanece vazia até que haja um catálogo real.</span></div>}
    </PageFrame>
  );
}

export function StorePage() { return <CatalogEmptyPage type="store" />; }
export function MediaPage() { return <CatalogEmptyPage type="media" />; }
export function ProfilePage() { return <CatalogEmptyPage type="profile" />; }
export function SubscriptionsPage() { return <CatalogEmptyPage type="subscriptions" />; }
export function AccessoriesPage() { return <CatalogEmptyPage type="accessories" />; }

export default HomePage;
