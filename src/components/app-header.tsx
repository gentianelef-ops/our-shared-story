import { Link } from "@tanstack/react-router";

interface Props {
  eyebrow?: string;
  title?: string;
  backTo?: string;
  backLabel?: string;
}

export function AppHeader({ eyebrow, title, backTo, backLabel = "Retour" }: Props) {
  return (
    <header className="px-6 pt-10 pb-6">
      <div className="flex items-center justify-between">
        {backTo ? (
          <Link
            to={backTo}
            className="tracking-ritual text-muted-foreground hover:text-ink transition"
          >
            ← {backLabel}
          </Link>
        ) : (
          <span className="tracking-ritual text-muted-foreground">Nous</span>
        )}
        {eyebrow && <span className="tracking-ritual text-muted-foreground">{eyebrow}</span>}
      </div>
      {title && (
        <>
          <h1 className="serif italic text-4xl text-ink mt-6">{title}</h1>
          <div className="divider-gold mt-4" />
        </>
      )}
    </header>
  );
}
