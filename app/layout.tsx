import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AIDOC - AI Health Tracker',
    description: 'Your personal AI-powered health assistant',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white antialiased">
                {children}
            </body>
        </html>
    );
}
