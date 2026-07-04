import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { FloorGeometry, Furniture, Opening } from '../types'
import { FURNITURE_HEIGHTS, FURNITURE_HEIGHT_DEFAULT } from './furnitureHeights'

// Conversion: world inches → three.js units (1 unit = 1 foot for readability)
const IN_TO_UNIT = 1 / 12

interface FloorViewer3DProps {
  geometry: FloorGeometry
}

export function FloorViewer3D({ geometry }: FloorViewer3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth
    const h = mount.clientHeight

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)

    // ── Camera ─────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000)

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(w, h)
    renderer.shadowMap.enabled = true
    mount.appendChild(renderer.domElement)

    // ── Orbit controls ─────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08

    // ── Lighting ───────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const sun = new THREE.DirectionalLight(0xffffff, 0.9)
    sun.position.set(30, 50, 20)
    sun.castShadow = true
    scene.add(sun)

    // ── Materials ──────────────────────────────────────────────────────────
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xd8cfc4, side: THREE.DoubleSide })
    const floorMat = new THREE.MeshLambertMaterial({ color: 0xe8dcc8, side: THREE.DoubleSide })
    const ceilMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f0, side: THREE.DoubleSide })
    const interiorWallMat = new THREE.MeshLambertMaterial({ color: 0xc8bfb4, side: THREE.DoubleSide })

    // ── Build geometry ─────────────────────────────────────────────────────
    const group = new THREE.Group()
    scene.add(group)

    // Collect all points to compute bounding box for camera positioning
    const allPts: THREE.Vector2[] = []

    // Rooms
    for (const room of geometry.rooms) {
      if (room.vertices.length < 3) continue

      const verts2d = room.vertices.map(
        (v) => new THREE.Vector2(v.x * IN_TO_UNIT, -v.y * IN_TO_UNIT),
      )
      allPts.push(...verts2d)

      // Floor polygon.
      // After rotation.x = -π/2 the shape XY plane maps to world XZ:
      //   world X = shape X,  world Z = -(shape Y)
      // Walls are placed at world Z = -y * IN_TO_UNIT, so the shape Y
      // must equal +y * IN_TO_UNIT (not negated) for the floor to align.
      const floorVerts2d = room.vertices.map(
        (v) => new THREE.Vector2(v.x * IN_TO_UNIT, v.y * IN_TO_UNIT),
      )
      const shape = new THREE.Shape(floorVerts2d)
      const floorGeo = new THREE.ShapeGeometry(shape)
      const floorMesh = new THREE.Mesh(floorGeo, floorMat)
      floorMesh.rotation.x = -Math.PI / 2
      floorMesh.receiveShadow = true
      group.add(floorMesh)

      // Per-edge walls
      for (const edge of room.edges) {
        const v1 = room.vertices[edge.start_vertex_index]
        const v2 = room.vertices[edge.end_vertex_index]
        const mat = edge.wall_type === 'exterior' ? wallMat : interiorWallMat
        buildWallSegments(group, v1.x, v1.y, v2.x, v2.y, edge.height_inches ?? 96, edge.openings, mat, ceilMat)
      }
    }

    // Freestanding walls
    for (const wall of geometry.walls) {
      allPts.push(
        new THREE.Vector2(wall.start.x * IN_TO_UNIT, -wall.start.y * IN_TO_UNIT),
        new THREE.Vector2(wall.end.x * IN_TO_UNIT, -wall.end.y * IN_TO_UNIT),
      )
      buildWallSegments(group, wall.start.x, wall.start.y, wall.end.x, wall.end.y, wall.height_inches ?? 96, wall.openings, interiorWallMat, ceilMat)
    }

    // Furniture
    for (const item of geometry.furniture ?? []) {
      allPts.push(new THREE.Vector2(item.x * IN_TO_UNIT, -item.y * IN_TO_UNIT))
      buildFurnitureMesh(group, item)
    }

    // ── Position camera ────────────────────────────────────────────────────
    if (allPts.length > 0) {
      const xs = allPts.map((p) => p.x)
      const zs = allPts.map((p) => p.y)
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2
      const cz = (Math.min(...zs) + Math.max(...zs)) / 2
      const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs))
      const dist = span * 1.4 + 5

      // Typical wall height in units
      const wallH = ((geometry.rooms[0]?.edges[0]?.height_inches ?? 96) * IN_TO_UNIT) / 2

      camera.position.set(cx + dist * 0.6, wallH + dist * 0.5, cz + dist * 0.9)
      controls.target.set(cx, wallH * 0.4, cz)
      controls.update()
    } else {
      camera.position.set(0, 10, 20)
      controls.update()
    }

    // ── Resize handler ─────────────────────────────────────────────────────
    function onResize() {
      const w2 = mount!.clientWidth
      const h2 = mount!.clientHeight
      camera.aspect = w2 / h2
      camera.updateProjectionMatrix()
      renderer.setSize(w2, h2)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    // ── Render loop ────────────────────────────────────────────────────────
    let rafId: number
    function animate() {
      rafId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [geometry])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}

// ── Wall segment builder ─────────────────────────────────────────────────────

const WINDOW_SILL_IN = 36  // default sill height for windows

function buildWallSegments(
  group: THREE.Group,
  x1: number, y1: number,
  x2: number, y2: number,
  heightIn: number,
  openings: Opening[],
  mat: THREE.Material,
  ceilMat: THREE.Material,
) {
  const wallLen = Math.hypot(x2 - x1, y2 - y1)
  if (wallLen < 0.5) return

  const wallH = heightIn * IN_TO_UNIT

  // Sort openings by offset
  const sorted = [...openings].sort((a, b) => a.offset_along_edge - b.offset_along_edge)

  // Build horizontal segments (solid wall strips along the edge)
  // Then for each horizontal segment, check vertical strips for windows
  const hSegments = solidSegments(wallLen, sorted)

  // Wall direction in 3D (x-z plane, y is up)
  const dx = (x2 - x1) * IN_TO_UNIT
  const dz = -(y2 - y1) * IN_TO_UNIT  // flip y→z
  const len3d = Math.hypot(dx, dz)
  const ux = dx / len3d
  const uz = dz / len3d

  const p1x = x1 * IN_TO_UNIT
  const p1z = -y1 * IN_TO_UNIT

  // Draw solid horizontal segments as full-height quads
  for (const [a, b] of hSegments) {
    addQuad(group, p1x, p1z, ux, uz, a * IN_TO_UNIT, b * IN_TO_UNIT, 0, wallH, mat)
  }

  // For each door opening: nothing from 0 to door height (gap already handled above)
  // For each window opening: draw below-sill + above-window rectangles
  for (const o of sorted) {
    const oStart = o.offset_along_edge * IN_TO_UNIT
    const oEnd = (o.offset_along_edge + o.width) * IN_TO_UNIT

    if (o.type === 'window') {
      const sillH = WINDOW_SILL_IN * IN_TO_UNIT
      const winTopH = Math.min((WINDOW_SILL_IN + o.height) * IN_TO_UNIT, wallH)
      // Below sill
      if (sillH > 0) {
        addQuad(group, p1x, p1z, ux, uz, oStart, oEnd, 0, sillH, mat)
      }
      // Above window
      if (winTopH < wallH) {
        addQuad(group, p1x, p1z, ux, uz, oStart, oEnd, winTopH, wallH, mat)
      }
    }
    // Doors: the full horizontal gap is already absent; no vertical strips needed
  }

  // Ceiling strip (top cap) — only on solid horizontal segments
  for (const [a, b] of hSegments) {
    addHorizontalCap(group, p1x, p1z, ux, uz, a * IN_TO_UNIT, b * IN_TO_UNIT, wallH, ceilMat)
  }
}

function addQuad(
  group: THREE.Group,
  p1x: number, p1z: number,
  ux: number, uz: number,
  aLong: number, bLong: number,
  yBot: number, yTop: number,
  mat: THREE.Material,
) {
  // Four corners of the quad
  const ax = p1x + ux * aLong, az = p1z + uz * aLong
  const bx = p1x + ux * bLong, bz = p1z + uz * bLong

  const positions = new Float32Array([
    ax, yBot, az,
    bx, yBot, bz,
    bx, yTop, bz,
    ax, yTop, az,
  ])
  const indices = [0, 1, 2, 0, 2, 3]
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
}

function addHorizontalCap(
  group: THREE.Group,
  p1x: number, p1z: number,
  ux: number, uz: number,
  aLong: number, bLong: number,
  y: number,
  mat: THREE.Material,
) {
  // Thin flat quad at the top of the wall (normal pointing up)
  // Perpendicular in xz plane
  const nx = -uz, nz = ux
  const t = 0.1  // half-thickness in units (~1.2 inches) for top cap visibility

  const ax = p1x + ux * aLong, az = p1z + uz * aLong
  const bx = p1x + ux * bLong, bz = p1z + uz * bLong

  const positions = new Float32Array([
    ax - nx * t, y, az - nz * t,
    bx - nx * t, y, bz - nz * t,
    bx + nx * t, y, bz + nz * t,
    ax + nx * t, y, az + nz * t,
  ])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex([0, 1, 2, 0, 2, 3])
  geo.computeVertexNormals()
  group.add(new THREE.Mesh(geo, mat))
}

// ── Furniture mesh builder ───────────────────────────────────────────────────

function buildFurnitureMesh(group: THREE.Group, item: Furniture) {
  const def = FURNITURE_HEIGHTS[item.type] ?? FURNITURE_HEIGHT_DEFAULT
  const w = item.width  * IN_TO_UNIT
  const d = item.height * IN_TO_UNIT  // "height" in 2D = depth in plan view
  const h = def.heightIn * IN_TO_UNIT
  const zBase = (item.z_elevation ?? 0) * IN_TO_UNIT

  const geo = new THREE.BoxGeometry(w, h, d)
  const mat = new THREE.MeshLambertMaterial({ color: def.color })
  const mesh = new THREE.Mesh(geo, mat)

  mesh.position.set(
    item.x  * IN_TO_UNIT,
    zBase + h / 2,           // sit on its elevation base
    -item.y * IN_TO_UNIT,    // flip Y→Z to match wall coordinate system
  )

  mesh.rotation.y = -item.rotation * (Math.PI / 180)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
}

function solidSegments(wallLen: number, openings: Opening[]): [number, number][] {
  const segments: [number, number][] = []
  let pos = 0
  for (const o of openings) {
    const start = Math.max(0, o.offset_along_edge)
    const end = Math.min(wallLen, o.offset_along_edge + o.width)
    if (end <= start) continue
    if (start > pos) segments.push([pos, start])
    pos = end
  }
  if (pos < wallLen) segments.push([pos, wallLen])
  return segments
}
