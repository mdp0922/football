import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Modal, Toast } from 'antd-mobile'
import { getRotatedImage } from '../utils/canvasUtils'

const readFile = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result as string), false)
    reader.readAsDataURL(file)
  })
}

interface ImageCropperProps {
  visible: boolean
  image: File | null
  aspect: number
  onClose: () => void
  onCrop: (file: File) => void
}

const ImageCropper: React.FC<ImageCropperProps> = ({ visible, image, aspect, onClose, onCrop }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)

  React.useEffect(() => {
    if (image) {
      readFile(image).then(setImageSrc)
    }
  }, [image])

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const showCroppedImage = useCallback(async () => {
    try {
      if (!imageSrc || !croppedAreaPixels) return
      const croppedImage = await getRotatedImage(
        imageSrc,
        croppedAreaPixels,
        rotation
      )
      if (croppedImage) {
        // Convert blob to file
        const res = await fetch(croppedImage)
        const blob = await res.blob()
        const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' })
        onCrop(file)
        onClose()
      }
    } catch (e) {
      console.error(e)
      Toast.show('裁剪失败')
    }
  }, [imageSrc, croppedAreaPixels, rotation, onCrop, onClose])

  return (
    <Modal
      visible={visible}
      content={
        <div className="h-[400px] w-full relative bg-black">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
            />
          )}
        </div>
      }
      title="图片裁剪"
      closeOnAction={false}
      onClose={onClose}
      actions={[
        { key: 'cancel', text: '取消', onClick: onClose },
        { key: 'confirm', text: '确定', primary: true, onClick: showCroppedImage },
      ]}
    />
  )
}

export default ImageCropper
