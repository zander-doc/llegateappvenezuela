import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AccountProvider } from '../components/AccountProvider';
export const Route = createRootRoute({
  component: () => (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>LlégateApp</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <AccountProvider><Outlet /></AccountProvider>
      </body>
    </html>
  ),
});
