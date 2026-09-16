import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { CapturePage } from './pages/CapturePage'
import { PlantDetailPage } from './pages/PlantDetailPage'
import { PlantEditPage } from './pages/PlantEditPage'
import { ObservationEditPage } from './pages/ObservationEditPage'
import { LocationsPage } from './pages/LocationsPage'
import { LocationPage } from './pages/LocationPage'
import { LocationEditorPage } from './pages/LocationEditorPage'
import { InstallBanner } from './components/InstallBanner'
import { requestPersistentStorage } from './db/db'

export default function App() {
  useEffect(() => {
    void requestPersistentStorage()
  }, [])

  return (
    <HashRouter>
      <div className="mx-auto min-h-dvh max-w-lg pb-28">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/capture" element={<CapturePage />} />
          <Route path="/capture/:plantId" element={<CapturePage />} />
          <Route path="/plants/new" element={<PlantEditPage />} />
          <Route path="/plants/:id/edit" element={<PlantEditPage />} />
          <Route path="/plants/:id" element={<PlantDetailPage />} />
          <Route path="/observations/:id/edit" element={<ObservationEditPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/locations/new" element={<LocationEditorPage />} />
          <Route path="/locations/:id" element={<LocationPage />} />
          <Route path="/locations/:id/edit" element={<LocationEditorPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>
      <InstallBanner />
    </HashRouter>
  )
}
