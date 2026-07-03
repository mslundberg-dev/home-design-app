import { FloorCanvas } from '../canvas/FloorCanvas'
import { Toolbar } from '../components/Toolbar'
import { UnitToggle } from '../components/UnitToggle'

export function FloorEditorPage() {
  return (
    <div className="floor-editor">
      <div className="floor-editor-header">
        <Toolbar />
        <UnitToggle />
      </div>
      <FloorCanvas />
    </div>
  )
}
