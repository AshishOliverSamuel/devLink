import "./globals.css";
import { Space_Grotesk } from "next/font/google";
import { Toaster } from "react-hot-toast";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
  className={`${spaceGrotesk.variable} min-h-screen bg-[var(--color-background-dark)] text-white`}
  style={{
    fontFamily: "var(--font-space-grotesk), ui-sans-serif, system-ui",
  }}
>
  {children}

  <Toaster
    position="top-right"
    toastOptions={{
      duration: 3000,
      style: {
        background: "#101922",
        color: "#fff",
        border: "1px solid #1f2937",
      },
    }}
  />
</body>

    </html>
  );
}
