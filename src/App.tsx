import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Library } from './pages/Library'
import { ReadingDetail } from './pages/ReadingDetail'
import { ReadingFormPage } from './pages/ReadingForm'
import { Settings } from './pages/Settings'

// HashRouter : les URL (#/lecture/3) fonctionnent sur n'importe quel hébergement statique,
// y compris GitHub Pages, sans configuration de redirection.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/ajouter" element={<ReadingFormPage />} />
        <Route path="/lecture/:id" element={<ReadingDetail />} />
        <Route path="/lecture/:id/modifier" element={<ReadingFormPage />} />
        <Route path="/reglages" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
