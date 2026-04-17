import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="serif text-6xl text-ink">Introuvable</h1>
        <div className="divider-gold mx-auto my-6" />
        <p className="text-sm text-muted-foreground">
          Cette page n'existe pas dans notre mémoire.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 tracking-ritual text-primary-foreground transition-opacity hover:opacity-90"
          >
            Revenir
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
      },
      { title: "Nous — un espace intime pour les couples" },
      {
        name: "description",
        content:
          "Nous est un journal à deux : chacun dépose sa semaine en privé, puis vous l'ouvrez ensemble le vendredi soir.",
      },
      { name: "theme-color", content: "#8a5a52" },
      { property: "og:title", content: "Nous — un espace intime pour les couples" },
      {
        property: "og:description",
        content: "Un journal intime à deux, révélé ensemble chaque vendredi.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
