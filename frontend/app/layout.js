import "./globals.css";

export const metadata = {
  title: "Matriq",
  description: "AI-based material sample tracking system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}