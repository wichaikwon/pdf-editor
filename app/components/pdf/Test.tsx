'use client'
import { loadPdf } from '@/utils/pdfUtils'
import {
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  CirclePlus,
  Hand,
  Signature,
  Type,
} from 'lucide-react'
import { PDFDocumentProxy } from 'pdfjs-dist'
import React, { useEffect, useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

const UploadPdf: React.FC = () => {
  const UploadPdf = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const signatureRef = useRef<SignatureCanvas | null>(null)

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [modalZoom, setModalZoom] = useState<boolean>(false)
  const [isSignature, setIsSignature] = useState<boolean>(false)
  const [zoomValue, setZoomValue] = useState<number>(100)
  const lastDistanceRef = useRef<number | null>(null)

  const [signatureImgUrl, setSignatureImgUrl] = useState<string | null>(null)
  const [sigPosition, setSigPosition] = useState({ x: 50, y: 50 })
  const dragRef = useRef<HTMLImageElement>(null)
  const isDraggingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastDistanceRef.current = Math.sqrt(dx * dx + dy * dy)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastDistanceRef.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const newDistance = Math.sqrt(dx * dx + dy * dy)
        const diff = newDistance - lastDistanceRef.current

        if (Math.abs(diff) > 5) {
          setZoomValue(z => {
            let next = z + (diff > 0 ? 5 : -5)
            return Math.max(25, Math.min(200, next))
          })
          lastDistanceRef.current = newDistance
        }
      }
    }

    const handleTouchEnd = () => {
      lastDistanceRef.current = null
    }

    container.addEventListener('touchstart', handleTouchStart)
    container.addEventListener('touchmove', handleTouchMove)
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [containerRef])

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage)
    }
    // eslint-disable-next-line
  }, [pdfDoc, currentPage, zoomValue])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        setSigPosition({
          x: e.clientX - offsetRef.current.x,
          y: e.clientY - offsetRef.current.y,
        })
      }
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length === 1) {
        const touch = e.touches[0]
        setSigPosition({
          x: touch.clientX - offsetRef.current.x,
          y: touch.clientY - offsetRef.current.y,
        })
      }
    }

    const handleTouchEnd = () => {
      isDraggingRef.current = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async e => {
        const pdfData = e.target?.result
        if (pdfData) {
          try {
            const pdf = await loadPdf(pdfData as ArrayBuffer)
            setPdfDoc(pdf)
            setTotalPages(pdf.numPages)
          } catch (error) {
            console.error('Error loading PDF:', error)
          }
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const renderPage = async (pageNumber: number) => {
    if (!canvasRef.current || !pdfDoc) return
    try {
      const page = await pdfDoc.getPage(pageNumber)
      // Responsive width: use container width or window width (with max)
      const containerWidth =
        containerRef.current?.offsetWidth ||
        Math.min(window.innerWidth - 32, 800)
      const baseViewport = page.getViewport({ scale: 1 })
      const scale = (containerWidth / baseViewport.width) * (zoomValue / 100)
      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height)
        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport,
        }

        await page.render(renderContext).promise
      }
    } catch (error) {
      console.error('Error rendering page:', error)
    }
  }

  const handlePlaceSignature = () => {
    if (!signatureRef.current) return
    const dataUrl = signatureRef.current.toDataURL()
    setSignatureImgUrl(dataUrl)
    setIsSignature(false)
  }

  const confirmSignaturePlacement = () => {
    if (!canvasRef.current || !signatureImgUrl) return
    const ctx = canvasRef.current.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx?.drawImage(img, sigPosition.x, sigPosition.y, 150, 50)
      setSignatureImgUrl(null)
    }
    img.src = signatureImgUrl
  }

  const nextPage = () => {
    if (pdfDoc && currentPage < totalPages) {
      setCurrentPage(prev => Math.min(prev + 1, totalPages))
    }
  }

  const prevPage = () => {
    if (pdfDoc && currentPage > 1) {
      setCurrentPage(prev => Math.max(prev - 1, 1))
    }
  }

  return (
    <div className="flex flex-col items-center justify-center relative w-full px-2">
      <input
        type="file"
        accept="application/pdf"
        ref={UploadPdf}
        onChange={handleFileChange}
        className="mb-4"
      />

      {pdfDoc && (
        <div className="w-full max-w-4xl relative">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 w-full py-2">
            <div className="flex gap-2">
              <button>
                <Hand />
              </button>
              <button>
                <Type />
              </button>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <button onClick={prevPage} disabled={currentPage <= 1}>
                <ChevronLeft />
              </button>
              <input
                type="number"
                value={currentPage}
                className="w-12 text-center border rounded"
                readOnly
              />
              <span>/</span>
              <input
                type="number"
                value={totalPages}
                readOnly
                className="w-12 text-center border rounded bg-gray-100"
              />
              <button onClick={nextPage} disabled={currentPage >= totalPages}>
                <ChevronRight />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button onClick={() => setZoomValue(z => Math.max(25, z - 25))}>
                <CircleMinus />
              </button>
              <div className="relative">
                <button onClick={() => setModalZoom(!modalZoom)}>{zoomValue}%</button>
                {modalZoom && (
                  <div className="absolute bg-white rounded py-2 shadow-lg z-10 min-w-[60px]">
                    <div className="flex flex-col gap-1">
                      {[100, 125, 150, 175, 200].map(val => (
                        <button
                          key={val}
                          className={`px-2 ${zoomValue === val ? 'bg-blue-500 text-white' : ''}`}
                          onClick={() => {
                            setZoomValue(val)
                            setModalZoom(false)
                          }}
                        >
                          {val}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setZoomValue(z => Math.min(200, z + 25))}>
                <CirclePlus />
              </button>
            </div>

            {/* Signature Button */}
            <button onClick={() => setIsSignature(true)} className="flex items-center gap-1">
              <Signature />
            </button>
          </div>

          {/* PDF Viewer */}
          <div
            ref={containerRef}
            className="relative w-full flex justify-center items-center overflow-auto mt-2 border rounded bg-white"
            style={{
              maxWidth: '100%',
              minHeight: '300px',
              // Responsive minHeight for mobile
              minWidth: 0,
            }}
          >
            <canvas
              ref={canvasRef}
              className="border border-gray-300 max-w-full h-auto block"
              style={{
                width: '100%',
                height: 'auto',
                maxWidth: '100%',
                minWidth: 0,
              }}
            />

            {signatureImgUrl && (
              <img
                src={signatureImgUrl}
                alt="Signature"
                style={{
                  position: 'absolute',
                  top: `${sigPosition.y}px`,
                  left: `${sigPosition.x}px`,
                  width: '150px',
                  height: '50px',
                  cursor: 'move',
                  touchAction: 'none',
                  zIndex: 20,
                  maxWidth: '80vw',
                  maxHeight: '20vw',
                }}
                onMouseDown={e => {
                  isDraggingRef.current = true
                  offsetRef.current = {
                    x: e.clientX - sigPosition.x,
                    y: e.clientY - sigPosition.y,
                  }
                }}
                onTouchStart={e => {
                  if (e.touches.length === 1) {
                    const touch = e.touches[0]
                    isDraggingRef.current = true
                    offsetRef.current = {
                      x: touch.clientX - sigPosition.x,
                      y: touch.clientY - sigPosition.y,
                    }
                  }
                }}
              />
            )}
          </div>
          {/* Confirm signature placement button (responsive) */}
          {signatureImgUrl && (
            <div className="flex justify-center mt-2">
              <button
                onClick={confirmSignaturePlacement}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                ยืนยันตำแหน่งลายเซ็น
              </button>
            </div>
          )}
        </div>
      )}

      {/* Signature Modal */}
      {isSignature && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-10"
          onClick={() => setIsSignature(false)}
        >
          <div
            className="bg-white p-4 rounded shadow-lg w-[90vw] max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-2">Signature Mode</h2>
            <p className="mb-4">Draw your signature below:</p>
            <SignatureCanvas
              penColor="black"
              canvasProps={{
                width: 300,
                height: 100,
                className: 'border border-gray-300 rounded mb-2 w-full h-24',
                style: { width: '100%', height: '100px' },
              }}
              ref={signatureRef}
            />
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <button
                onClick={handlePlaceSignature}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                วางลายเซ็นบน PDF
              </button>
              <button
                onClick={() => setIsSignature(false)}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadPdf
