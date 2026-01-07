import React, { useEffect, useState } from 'react'
import { Button, Rate, Toast } from 'antd-mobile'
import { MapPin, Phone, Search } from 'lucide-react'
import request from '../utils/request'

const Venues: React.FC = () => {
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVenues()
  }, [])

  const fetchVenues = async () => {
    try {
      const res: any = await request.get('/venues')
      setVenues(res)
    } catch (error) {
      console.error(error)
      Toast.show({ content: '获取场地列表失败', icon: 'fail' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-24 pt-20">
      {/* Sticky Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="px-4 py-3 pt-safe-top max-w-md mx-auto">
             <div className="bg-gray-100/80 rounded-full px-4 py-2 flex items-center gap-2 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-500/20 shadow-inner">
                <Search size={18} className="text-gray-400" />
                <input 
                    type="text" 
                    placeholder="搜索场馆..." 
                    className="bg-transparent border-none outline-none text-base w-full text-gray-800 placeholder:text-gray-400"
                />
             </div>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-md mx-auto">
        {venues.map(venue => (
          <div key={venue.id} className="bg-white rounded-2xl shadow-card overflow-hidden group active:scale-[0.99] transition-transform duration-200">
            <div className="h-48 w-full relative bg-gray-100">
                {venue.image ? (
                    <img src={venue.image} className="w-full h-full object-cover block" alt={venue.name} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <MapPin size={32} />
                    </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none z-[1]" />

                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold text-orange-500 shadow-sm flex items-center gap-1 z-10">
                    <span>¥</span>
                    <span className="text-lg">{venue.price}</span>
                    <span className="font-normal text-gray-400">/场</span>
                </div>

                <div className="absolute bottom-3 left-4 right-4 z-10">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="bg-violet-500/80 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-md font-medium">
                            {venue.type || '标准场'}
                        </div>
                        <Rate readOnly value={venue.rating || 5} style={{ '--star-size': '10px', '--active-color': '#fbbf24' }} />
                    </div>
                    <h3 className="text-xl font-bold text-white leading-tight shadow-black/50 drop-shadow-md line-clamp-1">{venue.name}</h3>
                </div>
            </div>
            
            <div className="p-4 pt-3">
              <div className="space-y-2 text-sm text-gray-500 mb-4">
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-violet-500 shrink-0 mt-0.5" />
                  <span className="leading-tight">{venue.address}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-50">
                 <Button 
                    block
                    size="small"
                    color="primary"
                    className="flex-1 rounded-xl shadow-lg shadow-violet-100"
                    disabled={!venue.contactPhone}
                    onClick={() => {
                        if (venue.contactPhone) {
                            window.location.href = `tel:${venue.contactPhone}`
                        } else {
                            Toast.show('暂无联系方式')
                        }
                    }}
                 >
                     <div className="flex items-center justify-center gap-1.5">
                        <Phone size={14} />
                        <span>电话预订</span>
                     </div>
                 </Button>
              </div>
            </div>
          </div>
        ))}
        
        {venues.length === 0 && !loading && (
           <div className="text-center text-gray-400 mt-20">
               <MapPin size={48} className="mx-auto mb-4 opacity-20" />
               <p>暂无场地信息</p>
           </div>
        )}
      </div>
    </div>
  )
}

export default Venues
