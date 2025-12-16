import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ProjectColab - Gestión Colaborativa de Proyectos',
  description: 'Sistema colaborativo de gestión de proyectos tipo Microsoft Project',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}

