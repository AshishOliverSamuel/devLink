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
    <html lang="en" className="h-full dark">
      <body
        className={`${spaceGrotesk.variable} min-h-screen bg-background text-foreground`}
        style={{
          fontFamily: "var(--font-space-grotesk), ui-sans-serif, system-ui",
        }}
      >
        {children}

        <Toaster
          position="top-right"
          gutter={12}
          containerClassName="toast-container"
          toastOptions={{
            duration: 3200,
            className: "toast-base",
            style: {
              background: "rgba(16,25,34,0.9)",
              color: "#fff",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: "14px",
              padding: "14px 16px",
              fontSize: "14px",
              boxShadow:
                "0 10px 30px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.03)",
            },
            success: {
              iconTheme: {
                primary: "#22c55e",
                secondary: "#052e16",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#450a0a",
              },
            },
            loading: {
              iconTheme: {
                primary: "#3b82f6",
                secondary: "#0f172a",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
