import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProjectListPage } from './pages/ProjectListPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { FloorEditorPage } from './pages/FloorEditorPage'
import { FloorViewer3DPage } from './pages/FloorViewer3DPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectListPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/floors/:floorId" element={<FloorEditorPage />} />
        <Route path="/floors/:floorId/3d" element={<FloorViewer3DPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
