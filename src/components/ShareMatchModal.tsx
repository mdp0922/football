import React, { useRef } from 'react'
import { Modal, Button, Toast, Image } from 'antd-mobile'
import { QRCodeSVG } from 'qrcode.react'
import html2canvas from 'html2canvas'
import dayjs from 'dayjs'
import { Calendar, MapPin, Download, X } from 'lucide-react'

interface ShareMatchModalProps {
  visible: boolean
  onClose: () => void
  match: any
}

const ShareMatchModal: React.FC<ShareMatchModalProps> = ({ visible, onClose, match }) => {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleSaveImage = async () => {
    if (!cardRef.current) return
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 2, // Higher quality
        backgroundColor: null,
      })
      
      const link = document.createElement('a')
      link.download = `match-share-${match.id}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      
      Toast.show({
        content: '图片已保存',
        icon: 'success'
      })
    } catch (error) {
      console.error('Generate image failed:', error)
      Toast.show({
        content: '生成图片失败',
        icon: 'fail'
      })
    }
  }

  if (!match) return null

  const shareUrl = window.location.href

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      bodyStyle={{ padding: 0, backgroundColor: 'transparent' }}
      closeOnMaskClick
      content={
        <div className="flex flex-col items-center">
            {/* Close Button */}
            <div className="w-full flex justify-end mb-2">
                 <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-full cursor-pointer" onClick={onClose}>
                    <X className="text-white" size={20} />
                 </div>
            </div>

            {/* Share Card */}
            <div 
                ref={cardRef} 
                className="w-[300px] rounded-2xl overflow-hidden shadow-2xl relative"
                style={{ backgroundColor: '#ffffff' }}
            >
                {/* Header / Cover */}
                <div className="h-40 relative" style={{ backgroundColor: '#0f172a' }}>
                    {match.coverUrl ? (
                        <Image src={match.coverUrl} fit="cover" className="w-full h-full opacity-80" />
                    ) : (
                        <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)' }} />
                    )}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />
                    
                    <div className="absolute bottom-4 left-4 right-4">
                        <div className="font-bold text-xl leading-tight drop-shadow-md mb-2" style={{ color: '#ffffff' }}>
                            {match.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.9)' }}>
                            <span className="backdrop-blur-sm px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                {match.type === 'LEAGUE' ? '联赛' : 
                                 match.type === 'TEAM_FRIENDLY' ? '球队友谊赛' : 
                                 match.type === 'PICKUP' ? '散场友谊赛' : '夜场'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-5">
                    {/* Match Info */}
                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-sm" style={{ color: '#374151' }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#eef2ff' }}>
                                <Calendar size={16} color="#4f46e5" />
                            </div>
                            <div className="flex-1">
                                <div className="text-xs" style={{ color: '#9ca3af' }}>比赛时间</div>
                                <div className="font-medium">
                                    {match.startTime 
                                        ? dayjs(match.startTime).format('MM月DD日 HH:mm') 
                                        : match.date
                                    }
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm" style={{ color: '#374151' }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#eef2ff' }}>
                                <MapPin size={16} color="#4f46e5" />
                            </div>
                            <div className="flex-1">
                                <div className="text-xs" style={{ color: '#9ca3af' }}>比赛地点</div>
                                <div className="font-medium break-all" style={{ lineHeight: '1.5' }}>{match.location}</div>
                            </div>
                        </div>
                    </div>

                    {/* QR Code Section */}
                    <div className="flex flex-col items-center justify-center pt-6 pb-2" style={{ borderTop: '1px dashed #e5e7eb' }}>
                        <div className="p-2 border rounded-xl shadow-sm mb-2" style={{ backgroundColor: '#ffffff', borderColor: '#f3f4f6' }}>
                             <QRCodeSVG value={shareUrl} size={120} level="M" />
                        </div>
                        <div className="text-xs text-center" style={{ color: '#9ca3af' }}>
                            长按识别二维码 · 查看比赛详情
                        </div>
                    </div>
                </div>

                {/* Footer Branding */}
                <div className="p-3 text-center" style={{ backgroundColor: '#f9fafb' }}>
                    <div className="text-xs font-bold tracking-wider" style={{ color: '#6366f1' }}>
                        LONGLI FOOTBALL
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <div className="mt-6 w-[300px]">
                <Button 
                    block 
                    color="primary" 
                    size="large" 
                    shape="rounded"
                    onClick={handleSaveImage}
                    className="font-bold shadow-lg shadow-indigo-500/30"
                >
                    <div className="flex items-center justify-center gap-2">
                        <Download size={18} />
                        保存图片分享
                    </div>
                </Button>
            </div>
        </div>
      }
    />
  )
}

export default ShareMatchModal
