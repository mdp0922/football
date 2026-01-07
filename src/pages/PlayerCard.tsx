import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Skeleton } from 'antd-mobile'
import request from '../utils/request'
import PlayerCardModal from '../components/PlayerCardModal'

const PlayerCard: React.FC = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchUserProfile()
    }, [id])

    const fetchUserProfile = async () => {
        try {
            const res: any = await request.get(`/user/${id}`)
            
            // 智能获取球队信息（支持多球队，优先取第一个有效球队）
            let teamInfo = null;
            
            // 1. 尝试从 res.teamId 获取
            if (res.teamId) {
                if (res.team && res.team.logo) {
                    teamInfo = res.team;
                } else {
                    try {
                        teamInfo = await request.get(`/teams/${res.teamId}`)
                    } catch (e) { console.warn('Fetch team failed', e) }
                }
            } 
            // 2. 尝试从 res.teams 数组获取
            else if (Array.isArray(res.teams) && res.teams.length > 0) {
                const firstTeam = res.teams[0];
                // 如果已经是对象且有logo，直接使用
                if (typeof firstTeam === 'object' && firstTeam.logo) {
                    teamInfo = firstTeam;
                } else {
                    // 否则获取 ID 并请求详情
                    const tid = typeof firstTeam === 'string' ? firstTeam : (firstTeam.id || firstTeam._id);
                    if (tid) {
                        try {
                            teamInfo = await request.get(`/teams/${tid}`)
                        } catch (e) { console.warn('Fetch teams[0] failed', e) }
                    }
                }
            }

            if (teamInfo) {
                res.teamName = teamInfo.name
                res.teamLogo = teamInfo.logo
            }
            
            setUser(res)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <Skeleton.Title animated />
    if (!user) return <div className="p-4 text-center">用户不存在</div>

    return (
        <PlayerCardModal 
            visible={true} 
            onClose={() => navigate(-1)} 
            data={{
                name: user.name,
                jerseyNumber: user.jerseyNumber,
                position: user.sportsProfile?.position,
                avatar: user.avatar,
                radarData: user.radarData,
                teamName: user.teamName || user.team?.name,
                teamLogo: user.teamLogo || user.team?.logo,
                height: user.sportsProfile?.height,
                weight: user.sportsProfile?.weight,
                age: user.sportsProfile?.age,
                footballAge: user.sportsProfile?.footballAge,
                matches: user.stats?.matches || 0,
                goals: user.stats?.goals || 0,
                assists: user.stats?.assists || 0,
                mvp: user.stats?.mvpCount || 0
            }}
        />
    )
}

export default PlayerCard