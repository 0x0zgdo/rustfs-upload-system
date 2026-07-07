import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TransferProvider } from "../components/TransferContext";
import TransferManager from "../components/TransferManager";
import { AuthProvider } from "../contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "RustFS Upload System",
  description: "Secure file management system",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <TransferProvider>
            {children}
            <TransferManager />
          </TransferProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
