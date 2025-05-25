'use client'
import { loadPdf } from '@/utils/pdfUtils'
import { ChevronLeft, ChevronRight, Signature, Type } from 'lucide-react'
import { PDFDocumentProxy } from 'pdfjs-dist'
import React, { useEffect, useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { PDFDocument } from 'pdf-lib'

const UploadPdf: React.FC = () => {
  const UploadPdf = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [isSignature, setIsSignature] = useState<boolean>(false)
  const [zoomValue, setZoomValue] = useState<number>(100)
  const [confirmSignature, setConfirmSignature] = useState<boolean>(false)
  const lastDistanceRef = useRef<number | null>(null)

  const [signatureImgUrl, setSignatureImgUrl] = useState<string | null>(null)
  const [sigPosition, setSigPosition] = useState({ x: 50, y: 50 })
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
      const containerWidth = containerRef.current?.offsetWidth || 800
      const baseViewport = page.getViewport({ scale: 1 })
      const scale = (containerWidth / baseViewport.width) * (zoomValue / 100)
      const viewport = page.getViewport({ scale })

      // รองรับจอ Retina/HiDPI
      const outputScale = window.devicePixelRatio || 1

      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      // ตั้งค่าขนาดจริงของ canvas (pixel)
      canvas.width = viewport.width * outputScale
      canvas.height = viewport.height * outputScale

      // ตั้งค่าขนาดแสดงผล (CSS pixel)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      // scale context สำหรับ HiDPI
      if (context) {
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0)
      } else {
        console.error('Failed to get 2D context for canvas')
        return
      }

      const renderContext = {
        canvasContext: context,
        viewport,
      }

      await page.render(renderContext).promise
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
  const savePdfWithSignature = async () => {
    if (!pdfDoc || !signatureImgUrl || !canvasRef.current) {
      alert('กรุณาเตรียมเอกสารและลายเซ็นให้พร้อมก่อนบันทึก')
      return
    }
    try {
      // 1. สร้าง PDF ใหม่จาก canvas ที่มีลายเซ็น
      const canvas = canvasRef.current
      const imageData = canvas.toDataURL('image/png')

      // 2. สร้าง PDF ด้วย pdf-lib
      const pdfDocLib = await PDFDocument.create()
      const pngImageBytes = await fetch(imageData).then(res => res.arrayBuffer())
      const pngImage = await pdfDocLib.embedPng(pngImageBytes)

      const page = pdfDocLib.addPage([canvas.width, canvas.height])
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      })

      // 3. บันทึกไฟล์
      const pdfBytes = await pdfDocLib.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      // 4. ดาวน์โหลดไฟล์
      const a = document.createElement('a')
      a.href = url
      a.download = 'เอกสารพร้อมลายเซ็น.pdf'
      document.body.appendChild(a)
      a.click()

      // ล้าง memory
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการบันทึกไฟล์:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      alert('บันทึกไฟล์ไม่สำเร็จ: ' + errorMessage)
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
              {!confirmSignature && (
                <button
                  onClick={() => {
                    confirmSignaturePlacement()
                    setConfirmSignature(true)
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  ยืนยันตำแหน่งลายเซ็น
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <button
        onClick={() => savePdfWithSignature()}
        className="bg-blue-600 text-white px-4 py-2 rounded my-4"
      >
        Save PDF with Signature
      </button>

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
            <p className="text-sm text-gray-600 mb-4">
              Draw your signature below, then press "Use Signature".
            </p>
            <SignatureCanvas
              ref={signatureRef}
              penColor="black"
              canvasProps={{
                width: 300,
                height: 100,
                className: 'border border-gray-300 rounded w-full',
              }}
            />
            <div className="flex justify-between mt-4">
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded"
                onClick={() => signatureRef.current?.clear()}
              >
                Clear
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={handlePlaceSignature}
              >
                Use Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadPdf
