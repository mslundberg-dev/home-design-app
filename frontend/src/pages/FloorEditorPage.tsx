import { FloorCanvas } from '../canvas/FloorCanvas'
import { Toolbar } from '../components/Toolbar'
import { UnitToggle } from '../components/UnitToggle'
import { PropertiesPanel } from '../components/PropertiesPanel'

export function FloorEditorPage() {
  return (
    <div className="floor-editor">
      <div className="floor-editor-header">
        <Toolbar />
        <UnitToggle />
      </div>
      <div className="floor-editor-body">
        <FloorCanvas />
        <PropertiesPanel />
      </div>
    </div>
  )
}
