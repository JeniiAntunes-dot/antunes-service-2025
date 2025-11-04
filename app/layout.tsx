

import './globals.css';
import Header from './components/Header/page'; 
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR"> 
      
      <body className="text-gray-100 min-h-screen flex flex-col antialiased">
        
        {}
        <Header /> 
        
        {}
        <main className="py-8 flex-grow w-full"> 
          {children}
        </main>
        
        {}
        <footer className="bg-slate-800 text-gray-400 text-center p-4 mt-auto">
          <p>
             &copy; 2025 Jenifer Paola Antunes de Jesus
          </p>
        </footer>
      </body>
    </html>
  );
}