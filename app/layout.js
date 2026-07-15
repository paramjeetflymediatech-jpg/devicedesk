
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./auth/AuthContext";
import EmailToast from "./components/EmailToast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DeviceDesk | Fly Media Technology",
  description: "Office System Inventory & Complaint Ticket Manager — Fly Media Technology",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <EmailToast />
        </AuthProvider>
      </body>
    </html>
  );
}
