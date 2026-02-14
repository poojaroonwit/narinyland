import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Narinyland Pet - Interactive Love & Growth Garden',
  description: 'Experience Narinyland, an interactive virtual pet and love garden. Track your relationship growth, collect memories, and nurture your digital bond.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Tailwind CDN - Keeping existing setup for now */}
        <script src="https://cdn.tailwindcss.com"></script>
        {/* Font Awesome */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        {/* Google Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;700&family=Pacifico&family=Outfit:wght@300;400;500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
