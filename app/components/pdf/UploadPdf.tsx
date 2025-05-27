'use client'
import React, { useEffect, useRef, useState } from 'react'
import { PDFDocumentProxy } from 'pdfjs-dist'
import { loadPDF } from '@/utils/pdfUtils'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { ChevronLeft, ChevronRight, Save, Signature, X, ZoomIn, ZoomOut } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'

const UploadPdf: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isSignature, setIsSignature] = useState(false)
  const signatureRef = useRef<SignatureCanvas>(null)
  const [signatureImgUrl, setSignatureImgUrl] = useState<string>('')
  const [isUploadTab, setIsUploadTab] = useState(false)
  const [signaturePosition, setSignaturePosition] = useState({ x: 0, y: 0 })
  const [isDraggingSignature, setIsDraggingSignature] = useState(false)
  const [showSignatureOnPdf, setShowSignatureOnPdf] = useState(false)

  const handlePlaceSignature = () => {
    if (!signatureRef.current) return
    const dataUrl = signatureRef.current.toDataURL()
    setSignatureImgUrl(dataUrl)
    setIsSignature(false)
    setShowSignatureOnPdf(true)
  }

  const startDraggingSignature = (e: React.MouseEvent) => {
    setIsDraggingSignature(true)
    const rect = e.currentTarget.getBoundingClientRect()
    setSignaturePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleDragSignature = (e: React.MouseEvent) => {
    if (!isDraggingSignature) return
    const rect = e.currentTarget.getBoundingClientRect()
    setSignaturePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const stopDraggingSignature = () => {
    setIsDraggingSignature(false)
  }

  useEffect(() => {
    if (pdfDocument) {
      renderPage(currentPage)
    }
  }, [pdfDocument, currentPage])

  const renderPage = async (pageNumber: number) => {
    if (!canvasRef.current || !pdfDocument) return

    try {
      const page = await pdfDocument.getPage(pageNumber)
      const containerWidth = containerRef.current?.offsetWidth || 800
      const renderWidth = containerWidth
      const baseViewport = page.getViewport({ scale: 1 })
      const scale = renderWidth / baseViewport.width
      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (canvas && context) {
        const dpr = window.devicePixelRatio || 1
        canvas.width = viewport.width * dpr
        canvas.height = viewport.height * dpr
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        context.setTransform(dpr, 0, 0, dpr, 0, 0)
        context.clearRect(0, 0, canvas.width, canvas.height)
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }
        await page.render(renderContext).promise

        if (showSignatureOnPdf && signatureImgUrl) {
          const img = new Image()
          img.src = signatureImgUrl
          img.onload = () => {
            const signatureWidth = viewport.width * 0.2
            const signatureHeight = (signatureWidth * img.height) / img.width

            context.drawImage(
              img,
              signaturePosition.x,
              signaturePosition.y,
              signatureWidth,
              signatureHeight
            )
          }
        }
      }
    } catch (error) {
      console.error('Error rendering page:', error)
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async e => {
        const pdfData = e.target?.result
        if (pdfData) {
          try {
            const pdf = await loadPDF(pdfData as string)
            setPdfDocument(pdf)
            setTotalPages(pdf.numPages)
            setShowSignatureOnPdf(false)
            setSignatureImgUrl('')
          } catch (error) {
            console.error('Error loading PDF:', error)
          }
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const savePdfWithSignature = async () => {
    if (!pdfDocument || !canvasRef.current) return

    try {
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) return

      tempCanvas.width = canvasRef.current.width
      tempCanvas.height = canvasRef.current.height
      tempCtx.drawImage(canvasRef.current, 0, 0)

      if (showSignatureOnPdf && signatureImgUrl) {
        const img = new Image()
        img.src = signatureImgUrl
        await new Promise(resolve => {
          img.onload = resolve
        })

        const signatureWidth = tempCanvas.width * 0.2
        const signatureHeight = (signatureWidth * img.height) / img.width

        tempCtx.drawImage(
          img,
          signaturePosition.x * (tempCanvas.width / canvasRef.current.offsetWidth),
          signaturePosition.y * (tempCanvas.height / canvasRef.current.offsetHeight),
          signatureWidth,
          signatureHeight
        )
      }

      const pdfWithSignatureBase64 = tempCanvas.toDataURL('image/png')
      console.log(pdfWithSignatureBase64)

      // อ่าน callback URL จาก query parameters
      const urlParams = new URLSearchParams(window.location.search)
      const callbackUrl = urlParams.get('callback')

      if (callbackUrl) {
        const response = await fetch(callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: pdfWithSignatureBase64 }),
        })

        if (response.ok) {
          alert('PDF with signature saved successfully!')
          window.close()
        } else {
          alert('Failed to save PDF with signature.')
        }
      } else {
        alert('No callback URL provided.')
      }
    } catch (error) {
      console.error('Error saving PDF:', error)
      alert('Error saving file.' + error)
    }
  }

  return (
    <div className="overflow-y-auto">
      <input
        type="file"
        accept="application/pdf"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="mb-4"
      />
      {pdfDocument && (
        <div ref={containerRef}>
          <TransformWrapper initialScale={1} minScale={1} maxScale={5} wheel={{ step: 0.1 }}>
            {({ zoomIn, zoomOut }) => (
              <>
                <div className="flex gap-2 items-center justify-between border">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => zoomIn()}
                      className="p-2 bg-blue-500 text-white rounded"
                    >
                      <ZoomIn />
                    </button>
                    <button
                      onClick={() => zoomOut()}
                      className="p-2 bg-blue-500 text-white rounded"
                    >
                      <ZoomOut />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsSignature(true)}
                      className="flex items-center gap-1 p-2 bg-green-500 text-white rounded"
                    >
                      <Signature/>
                    </button>
                    {showSignatureOnPdf && (
                      <button
                        onClick={() => setShowSignatureOnPdf(false)}
                        className="flex items-center gap-1 p-2 bg-red-500 text-white rounded"
                      >
                        <X />
                      </button>
                    )}
                  </div>
                </div>
                <div
                  className="flex justify-center flex-col border border-t-transparent relative w-full"
                  ref={containerRef}
                  onMouseDown={startDraggingSignature}
                  onMouseMove={handleDragSignature}
                  onMouseUp={stopDraggingSignature}
                  onMouseLeave={stopDraggingSignature}
                >
                  <TransformComponent wrapperClass="w-full">
                    <canvas ref={canvasRef} />
                  </TransformComponent>
                  {showSignatureOnPdf && signatureImgUrl && (
                    <img
                      src={signatureImgUrl}
                      alt="Signature"
                      style={{
                        position: 'absolute',
                        left: `${signaturePosition.x}px`,
                        top: `${signaturePosition.y}px`,
                        width: '20%',
                        cursor: 'move',
                        zIndex: 10,
                      }}
                      onMouseDown={startDraggingSignature}
                    />
                  )}
                  <button
                    className="absolute -translate-y-1/2 bottom-1/2 left-0 z-50 bg-white/80 p-1 rounded-full shadow"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    className="absolute right-0 -translate-y-1/2 bottom-1/2 z-50 bg-white/80 p-1 rounded-full shadow"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight />
                  </button>
                </div>
              </>
            )}
          </TransformWrapper>
          <button
            onClick={savePdfWithSignature}
            className="flex p-2 left-1/2 -translate-x-1/2 bottom-1/10 absolute bg-blue-600 text-white rounded"
          >
            <Save size={16} /> บันทึก PDF
          </button>
        </div>
      )}
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
            <div className="flex border-b mb-4">
              <button
                className={`flex-1 px-4 py-2 ${
                  !isUploadTab ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'
                }`}
                onClick={() => setIsUploadTab(false)}
              >
                เซ็น
              </button>
              <button
                className={`flex-1 px-4 py-2 ${
                  isUploadTab ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'
                }`}
                onClick={() => setIsUploadTab(true)}
              >
                อัปโหลดรูป
              </button>
            </div>
            {!isUploadTab ? (
              <>
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
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Upload an image to use as your signature.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = ev => {
                        if (ev.target?.result) {
                          setSignatureImgUrl(ev.target.result as string)
                          setShowSignatureOnPdf(true)
                          setIsSignature(false)
                        }
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                  className="mb-4"
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadPdf
