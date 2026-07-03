import { useUIStore } from '../store/uiStore'
import type { UnitDisplay } from '../units/format'

export function UnitToggle() {
  const unitDisplay = useUIStore((s) => s.unitDisplay)
  const setUnitDisplay = useUIStore((s) => s.setUnitDisplay)
  return (
    <select value={unitDisplay} onChange={(e) => setUnitDisplay(e.target.value as UnitDisplay)}>
      <option value="imperial">Imperial (ft-in)</option>
      <option value="metric">Metric (cm)</option>
    </select>
  )
}
