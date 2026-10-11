// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown,
  CircleHelp,
  Gamepad2,
  Home,
  LibraryBig,
  Menu,
  MonitorPlay,
  ShoppingBag,
  Smartphone,
  UserRound,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useDualSenseWS } from "./Anikator/useDualSenseWS";

const primaryLinks = [
  { label: "Início", path: "/home", Icon: Home },
  { label: "Biblioteca", path: "/library", Icon: LibraryBig },
  { label: "Loja", path: "/store", Icon: ShoppingBag },
  { label: "Mídia", path: "/media", Icon: MonitorPlay },
];

function Brand() {
  return (
    <Link className="nj-brand" to="/home" aria-label="NJengines — Início">
      <span className="nj-brand-mark" aria-hidden="true"><span /></span>
      <span className="nj-brand-name">NJ<span>ENGINES</span></span>
    </Link>
  );
}

export default function GlobalNavbar() {
  const { pathname } = useLocation();
  const { session } = useDualSenseWS();
  const [showQR, setShowQR] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setShowQR(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const closeMenu = () => setMoreOpen(false);
  const moreIsActive = ["/accessories", "/subscriptions"].includes(pathname);

  return (
    <>
      <header className="nj-topbar">
        <Brand />
        <nav className="nj-desktop-nav" aria-label="Navegação principal">
          {primaryLinks.map(({ label, path, Icon }) => {
            const active = pathname === path;
            return <Link key={path} to={path} className={`nj-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={16} strokeWidth={1.7} /><span>{label}</span></Link>;
          })}
          <Link to="/showcase" className={`nj-nav-link${pathname === "/showcase" ? " is-active" : ""}`} aria-current={pathname === "/showcase" ? "page" : undefined}><Gamepad2 size={16} strokeWidth={1.7} /><span>Controles</span></Link>
          <div className="nj-more-wrap">
            <button type="button" className={`nj-nav-link nj-more-button${moreOpen || moreIsActive ? " is-active" : ""}`} onClick={() => setMoreOpen((value) => !value)} aria-expanded={moreOpen} aria-haspopup="menu"><Menu size={16} /><span>Mais</span><ChevronDown size={14} /></button>
            {moreOpen && <div className="nj-more-menu" role="menu">
              <Link role="menuitem" to="/accessories" onClick={closeMenu}><Gamepad2 size={16} />Acessórios</Link>
              <Link role="menuitem" to="/subscriptions" onClick={closeMenu}><CircleHelp size={16} />Assinaturas</Link>
            </div>}
          </div>
        </nav>
        <div className="nj-topbar-actions">
          <button type="button" className="nj-connect-button" onClick={() => setShowQR(true)} aria-label="Ver conexão do celular">
            <Smartphone size={16} /><span>Conectar celular</span>
          </button>
          <Link to="/profile" className={`nj-profile-link${pathname === "/profile" ? " is-active" : ""}`} aria-label="Perfil" aria-current={pathname === "/profile" ? "page" : undefined}><UserRound size={19} /></Link>
          <button type="button" className="nj-mobile-more-trigger" onClick={() => setMoreOpen((value) => !value)} aria-expanded={moreOpen} aria-label="Mais opções"><Menu size={20} /></button>
        </div>
        {moreOpen && <div className="nj-mobile-more-menu">
          <Link to="/showcase" onClick={closeMenu}><Gamepad2 size={17} /> Controles</Link>
          <Link to="/accessories" onClick={closeMenu}><Gamepad2 size={17} /> Acessórios</Link>
          <Link to="/subscriptions" onClick={closeMenu}><CircleHelp size={17} /> Assinaturas</Link>
        </div>}
      </header>

      <nav className="nj-mobile-nav" aria-label="Navegação para celular">
        {primaryLinks.slice(0, 4).map(({ label, path, Icon }) => {
          const active = pathname === path;
          return <Link key={path} to={path} className={`nj-mobile-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={19} strokeWidth={1.8} /><span>{label}</span></Link>;
        })}
        <Link to="/profile" className={`nj-mobile-link${pathname === "/profile" ? " is-active" : ""}`} aria-current={pathname === "/profile" ? "page" : undefined}><UserRound size={19} strokeWidth={1.8} /><span>Perfil</span></Link>
      </nav>

      {showQR && (
        <div className="nj-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowQR(false); }}>
          <section className="nj-connect-modal" role="dialog" aria-modal="true" aria-labelledby="nj-connect-title">
            <button type="button" className="nj-modal-close" onClick={() => setShowQR(false)} aria-label="Fechar"><X size={20} /></button>
            <div className="nj-empty-mark"><Smartphone size={22} /></div>
            <p className="nj-kicker">CONEXÃO</p>
            <h2 id="nj-connect-title">Conectar celular</h2>
            <p className="nj-modal-copy">A conexão entre dispositivos usa WebRTC/P2P e sinalização. Redes com NAT ou firewall restritivos podem impedir a conexão; não há relay TURN configurado, então o funcionamento não é garantido.</p>
            <div className="nj-qr-frame"><QRCodeSVG value={`${window.location.origin}/controller?session=${session || ""}`} size={176} includeMargin /></div>
            <p className="nj-session-label">Sessão local <code>{session || "—"}</code></p>
            <button type="button" className="nj-button nj-button-quiet nj-modal-dismiss" onClick={() => setShowQR(false)}>Fechar</button>
          </section>
        </div>
      )}
    </>
  );
}
