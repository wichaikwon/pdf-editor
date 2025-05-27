import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

async function loadPDF(url: string): Promise<PDFDocumentProxy> {
  const loadingTask = getDocument(url);
  const pdf: PDFDocumentProxy = await loadingTask.promise;
  return pdf;
}
export { loadPDF };
