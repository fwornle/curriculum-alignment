import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from './button'
import { ZoomIn, ZoomOut, RotateCw, Move } from 'lucide-react'

interface ImageCropperProps {
  imageSrc: string
  onCrop: (croppedFile: File) => void
  onCancel: () => void
  aspectRatio?: number // width/height ratio (1 for square)
}

interface CropState {
  x: number
  y: number
  width: number
  height: number
  scale: number
  rotation: number
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  onCrop,
  onCancel,
  aspectRatio = 1
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  
  const [cropState, setCropState] = useState<CropState>({
    x: 0,
    y: 0,
    width: 300,
    height: 300,
    scale: 1,
    rotation: 0
  })

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image || !isLoaded) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Save context for transformations
    ctx.save()

    // Calculate scaled image dimensions
    const scaledWidth = image.naturalWidth * cropState.scale
    const scaledHeight = image.naturalHeight * cropState.scale
    
    // Center the image and apply offset
    const imgX = (canvas.width - scaledWidth) / 2 + cropState.x
    const imgY = (canvas.height - scaledHeight) / 2 + cropState.y

    // Apply rotation around the center of the canvas
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((cropState.rotation * Math.PI) / 180)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)

    // Draw image
    ctx.drawImage(image, imgX, imgY, scaledWidth, scaledHeight)

    // Restore context for overlay
    ctx.restore()

    // Draw semi-transparent overlay (but NOT over the crop area)
    const cropX = (canvas.width - cropState.width) / 2
    const cropY = (canvas.height - cropState.height) / 2
    
    // Draw overlay in 4 rectangles around the crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    
    // Top rectangle
    ctx.fillRect(0, 0, canvas.width, cropY)
    // Bottom rectangle  
    ctx.fillRect(0, cropY + cropState.height, canvas.width, canvas.height - cropY - cropState.height)
    // Left rectangle
    ctx.fillRect(0, cropY, cropX, cropState.height)
    // Right rectangle
    ctx.fillRect(cropX + cropState.width, cropY, canvas.width - cropX - cropState.width, cropState.height)

    // Draw crop border
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.strokeRect(cropX, cropY, cropState.width, cropState.height)

    // Draw grid lines (rule of thirds)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.lineWidth = 1
    for (let i = 1; i < 3; i++) {
      // Vertical lines
      const x = cropX + (cropState.width / 3) * i
      ctx.beginPath()
      ctx.moveTo(x, cropY)
      ctx.lineTo(x, cropY + cropState.height)
      ctx.stroke()

      // Horizontal lines
      const y = cropY + (cropState.height / 3) * i
      ctx.beginPath()
      ctx.moveTo(cropX, y)
      ctx.lineTo(cropX + cropState.width, y)
      ctx.stroke()
    }
  }, [isLoaded, cropState])

  useEffect(() => {
    const image = new Image()
    image.onload = () => {
      imageRef.current = image
      setIsLoaded(true)
      
      // Initialize crop size based on image and canvas
      const canvas = canvasRef.current
      if (canvas) {
        const maxSize = Math.min(canvas.width, canvas.height) * 0.6
        const width = aspectRatio >= 1 ? maxSize : maxSize * aspectRatio
        const height = aspectRatio >= 1 ? maxSize / aspectRatio : maxSize
        
        // Scale image to fit nicely in canvas
        const imageAspect = image.naturalWidth / image.naturalHeight
        const canvasAspect = canvas.width / canvas.height
        let initialScale = 1
        
        if (imageAspect > canvasAspect) {
          // Image is wider - scale based on canvas width
          initialScale = (canvas.width * 0.8) / image.naturalWidth
        } else {
          // Image is taller - scale based on canvas height  
          initialScale = (canvas.height * 0.8) / image.naturalHeight
        }
        
        setCropState(prev => ({
          ...prev,
          width,
          height,
          scale: Math.max(0.2, Math.min(2, initialScale))
        }))
      }
    }
    image.src = imageSrc
  }, [imageSrc, aspectRatio])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - lastMousePos.x
    const deltaY = e.clientY - lastMousePos.y

    setCropState(prev => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }))

    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setCropState(prev => ({
      ...prev,
      scale: Math.max(0.2, Math.min(4, prev.scale + delta))
    }))
  }, [])

  const handleZoom = (delta: number) => {
    setCropState(prev => ({
      ...prev,
      scale: Math.max(0.2, Math.min(4, prev.scale + delta))
    }))
  }

  const handleRotate = () => {
    setCropState(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }))
  }

  const handleCrop = async () => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    // Create a new canvas for the cropped image
    const cropCanvas = document.createElement('canvas')
    const cropCtx = cropCanvas.getContext('2d')
    if (!cropCtx) return

    // Set output dimensions (square for profile picture)
    const outputSize = 400
    cropCanvas.width = outputSize
    cropCanvas.height = outputSize

    // Calculate crop area coordinates on the display canvas
    const cropX = (canvas.width - cropState.width) / 2
    const cropY = (canvas.height - cropState.height) / 2

    // Calculate the scaled image dimensions and position
    const scaledWidth = image.naturalWidth * cropState.scale
    const scaledHeight = image.naturalHeight * cropState.scale
    const imgX = (canvas.width - scaledWidth) / 2 + cropState.x
    const imgY = (canvas.height - scaledHeight) / 2 + cropState.y

    // Calculate what part of the original image corresponds to the crop area
    const sourceX = (cropX - imgX) / cropState.scale
    const sourceY = (cropY - imgY) / cropState.scale
    const sourceWidth = cropState.width / cropState.scale
    const sourceHeight = cropState.height / cropState.scale

    // Apply rotation if needed
    if (cropState.rotation !== 0) {
      cropCtx.save()
      cropCtx.translate(cropCanvas.width / 2, cropCanvas.height / 2)
      cropCtx.rotate((cropState.rotation * Math.PI) / 180)
      cropCtx.translate(-cropCanvas.width / 2, -cropCanvas.height / 2)
    }

    // Draw the cropped portion, scaling it to fit the output canvas
    cropCtx.drawImage(
      image,
      Math.max(0, sourceX),
      Math.max(0, sourceY),
      Math.min(image.naturalWidth - Math.max(0, sourceX), sourceWidth),
      Math.min(image.naturalHeight - Math.max(0, sourceY), sourceHeight),
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    )

    if (cropState.rotation !== 0) {
      cropCtx.restore()
    }

    // Convert to blob and create file
    cropCanvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' })
        onCrop(file)
      }
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Crop Image</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom(-0.1)}
              disabled={cropState.scale <= 0.1}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom(0.1)}
              disabled={cropState.scale >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center mb-4">
          <div 
            ref={containerRef}
            className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-300"
          >
            <canvas
              ref={canvasRef}
              width={600}
              height={450}
              className="cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            />
            {isDragging && (
              <div className="absolute top-3 left-3 bg-blue-500 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-2 shadow-lg">
                <Move className="h-4 w-4" />
                Drag to reposition
              </div>
            )}
            <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
              Zoom: {Math.round(cropState.scale * 100)}%
            </div>
            <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-lg text-xs">
              Use mouse wheel or buttons to zoom • Drag to move image
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleCrop} disabled={!isLoaded}>
            Crop Image
          </Button>
        </div>
      </div>
    </div>
  )
}