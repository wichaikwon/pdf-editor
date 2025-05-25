import { getDocument, GlobalWorkerOptions, PDFDocumentProxy } from 'pdfjs-dist'

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export const loadPdf = async (
  pdfData: ArrayBuffer
): Promise<PDFDocumentProxy> => {
  const loadingTask = getDocument({ data: pdfData })
  return await loadingTask.promise
}
