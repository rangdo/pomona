import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { clampView, zoomAt, type MapView } from './mapView'

interface Sizes {
  vw: number
  vh: number
  lw: number
  lh: number
}

export function useMapViewport() {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const layerRef = useRef<HTMLDivElement | null>(null)
  const [view, setView] = useState<MapView>({ s: 1, tx: 0, ty: 0 })
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null)
  const viewRef = useRef(view)
  viewRef.current = view

  const attachViewport = (node: HTMLDivElement | null) => {
    viewportRef.current = node
    setViewportEl(node)
  }

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pan = useRef<{ id: number; x: number; y: number; tx: number; ty: number } | null>(null)
  const pinch = useRef<{ dist: number; x: number; y: number } | null>(null)

  function sizes(): Sizes | null {
    const vp = viewportRef.current
    const layer = layerRef.current
    if (!vp || !layer) return null
    return {
      vw: vp.clientWidth,
      vh: vp.clientHeight,
      lw: layer.offsetWidth,
      lh: layer.offsetHeight,
    }
  }

  function setClamped(next: MapView) {
    const size = sizes()
    if (!size) return
    setView(clampView(next, size.lw, size.lh, size.vw, size.vh))
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('[data-pin]')) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // pointer capture unsupported for this pointer; panning still works via move events
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]
    if (pts.length >= 2) {
      pan.current = null
      pinch.current = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      }
    } else if (pts.length === 1) {
      pan.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        tx: viewRef.current.tx,
        ty: viewRef.current.ty,
      }
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const p = pointers.current.get(e.pointerId)
    if (!p) return
    p.x = e.clientX
    p.y = e.clientY
    const size = sizes()
    if (!size) return
    if (pinch.current && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const x = (pts[0].x + pts[1].x) / 2
      const y = (pts[0].y + pts[1].y) / 2
      const factor = pinch.current.dist > 0 ? dist / pinch.current.dist : 1
      setClamped(zoomAt(viewRef.current, x, y, factor, size.lw, size.lh, size.vw, size.vh))
      pinch.current = { dist, x, y }
    } else if (pan.current && pan.current.id === e.pointerId) {
      const dx = e.clientX - pan.current.x
      const dy = e.clientY - pan.current.y
      setClamped({
        ...viewRef.current,
        tx: pan.current.tx + dx,
        ty: pan.current.ty + dy,
      })
    }
  }

  function endPointer(e: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.delete(e.pointerId)) return
    if (pinch.current && pointers.current.size < 2) {
      pinch.current = null
      const rest = [...pointers.current.entries()]
      if (rest.length === 1) {
        const [remainingId, rp] = rest[0]
        pan.current = {
          id: remainingId,
          x: rp.x,
          y: rp.y,
          tx: viewRef.current.tx,
          ty: viewRef.current.ty,
        }
      }
    } else if (!pinch.current && pointers.current.size === 0) {
      pan.current = null
    }
  }

  useEffect(() => {
    const el = viewportEl
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const size = sizes()
      if (!size) return
      const factor = Math.exp(-e.deltaY * 0.0015)
      setClamped(
        zoomAt(viewRef.current, e.clientX, e.clientY, factor, size.lw, size.lh, size.vw, size.vh),
      )
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [viewportEl])

  useEffect(() => {
    const el = viewportEl
    if (!el) return
    const ro = new ResizeObserver(() => {
      const size = sizes()
      if (!size) return
      setView((cur) => clampView(cur, size.lw, size.lh, size.vw, size.vh))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [viewportEl])

  function zoomBy(factor: number) {
    const size = sizes()
    if (!size) return
    setClamped(
      zoomAt(
        viewRef.current,
        size.vw / 2,
        size.vh / 2,
        factor,
        size.lw,
        size.lh,
        size.vw,
        size.vh,
      ),
    )
  }

  function reset() {
    setClamped({ s: 1, tx: 0, ty: 0 })
  }

  function recenter() {
    const size = sizes()
    if (!size) return
    setView((cur) => clampView(cur, size.lw, size.lh, size.vw, size.vh))
  }

  return {
    viewportRef,
    attachViewport,
    layerRef,
    view,
    pinScale: 1 / view.s,
    viewportHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
    },
    zoomBy,
    reset,
    recenter,
  }
}
