import { useUIStore } from '../store/uiStore'
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES } from '../canvas/furnitureCatalog'
import type { FurnitureType } from '../types'

export function FurniturePanel() {
  const showFurniturePanel = useUIStore((s) => s.showFurniturePanel)
  const setShowFurniturePanel = useUIStore((s) => s.setShowFurniturePanel)
  const setActiveTool = useUIStore((s) => s.setActiveTool)
  const setPendingFurnitureType = useUIStore((s) => s.setPendingFurnitureType)
  const activeTool = useUIStore((s) => s.activeTool)
  const pendingFurnitureType = useUIStore((s) => s.pendingFurnitureType)

  if (!showFurniturePanel) return null

  function selectFurniture(type: FurnitureType) {
    setPendingFurnitureType(type)
    setActiveTool('place-furniture')
  }

  return (
    <div className="furniture-panel">
      <div className="furniture-panel-header">
        <span>Furniture</span>
        <button className="furniture-panel-close" onClick={() => setShowFurniturePanel(false)}>×</button>
      </div>
      {activeTool === 'place-furniture' && pendingFurnitureType && (
        <div className="furniture-panel-hint">
          Click on the canvas to place
        </div>
      )}
      {FURNITURE_CATEGORIES.map((cat) => (
        <div key={cat} className="furniture-category">
          <div className="furniture-category-label">{cat}</div>
          <div className="furniture-items">
            {FURNITURE_CATALOG.filter((e) => e.category === cat).map((entry) => (
              <button
                key={entry.type}
                className={`furniture-item-btn${pendingFurnitureType === entry.type ? ' active' : ''}`}
                onClick={() => selectFurniture(entry.type)}
                title={`${entry.label} — ${entry.defaultWidth}"×${entry.defaultHeight}"`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
