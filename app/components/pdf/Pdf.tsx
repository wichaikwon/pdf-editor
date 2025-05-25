'use client'

import dynamic from "next/dynamic"

const Pdf = dynamic(() => import('./UploadPdf'), {ssr: false})

export default Pdf