import React, { useEffect, useState } from 'react'
import { Tabs, Avatar, Image, FloatingBubble, Modal, Form, TextArea, Toast, ImageUploader, Dialog, ImageViewer, Button } from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import { Heart, MessageCircle, Share2, Plus, Trash2 } from 'lucide-react'
import request from '../utils/request'
import { useNavigate } from 'react-router-dom'
import { checkLogin, getUser } from '../utils/auth'

const Community: React.FC = () => {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<any[]>([])
  const [visible, setVisible] = useState(false)
  const [commentVisible, setCommentVisible] = useState(false)
  const [currentPostId, setCurrentPostId] = useState<number | null>(null)
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null)
  const [form] = Form.useForm()
  const [commentForm] = Form.useForm()
  const [fileList, setFileList] = useState<ImageUploadItem[]>([])
  const currentUser = getUser()

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const res: any = await request.get('/community/posts')
      setPosts(res)
    } catch (error) {
      console.error(error)
    }
  }

  const handlePublish = async () => {
    if (!checkLogin(navigate)) return
    setVisible(true)
  }
  
  const mockUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res: any = await request.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return { url: res.url }
    } catch (e) {
      Toast.show({ content: '上传失败', icon: 'fail' })
      throw e
    }
  }

  const onFinish = async (values: any) => {
    try {
      await request.post('/community/posts', {
        content: values.content,
        images: fileList.map(f => f.url)
      })
      Toast.show({
        icon: 'success',
        content: '发布成功',
      })
      setVisible(false)
      form.resetFields()
      setFileList([])
      fetchPosts()
    } catch (error) {
      console.error(error)
    }
  }
  
  const handleDelete = async (id: number) => {
    Dialog.confirm({
      content: '确定删除这条动态吗？',
      onConfirm: async () => {
        try {
          await request.delete(`/community/posts/${id}`)
          Toast.show({ icon: 'success', content: '删除成功' })
          fetchPosts()
        } catch (error) {
          console.error(error)
          Toast.show({ content: '删除失败', icon: 'fail' })
        }
      }
    })
  }

  const handleLike = async (id: number) => {
    if (!checkLogin(navigate)) return
    try {
      await request.post(`/community/posts/${id}/like`)
      fetchPosts()
    } catch (error) {
      console.error(error)
    }
  }
  
  const handleShare = () => {
    Toast.show('功能开发中')
  }

  const handleComment = (id: number) => {
    if (!checkLogin(navigate)) return
    setCurrentPostId(id)
    setCommentVisible(true)
  }

  const onCommentFinish = async (values: any) => {
    if (!currentPostId) return
    try {
      await request.post(`/community/posts/${currentPostId}/comments`, {
        content: values.content
      })
      Toast.show({ icon: 'success', content: '评论成功' })
      setCommentVisible(false)
      commentForm.resetFields()
      setCurrentPostId(null)
      fetchPosts()
    } catch (error) {
      console.error(error)
      Toast.show({ content: '评论失败', icon: 'fail' })
    }
  }

  const PostCard = ({ post }: { post: any }) => {
    const isOwner = currentUser?.id === post.user?.id
    const isAdmin = currentUser?.role === 'super_admin' // Only super_admin can delete any post
    const canDelete = isOwner || isAdmin
    
    const isLiked = post.likes?.includes(currentUser?.id)
    const [showAllComments, setShowAllComments] = useState(false)
    
    const comments = showAllComments ? post.comments : post.comments?.slice(0, 3)
    
    return (
    <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={post.user?.avatar}
            className="w-10 h-10 bg-gray-100 cursor-pointer rounded-full"
            onClick={(e) => {
              e.stopPropagation()
              if (post.user?.id) {
                navigate(`/user/${post.user?.id}`)
              }
            }}
          />
          <div>
            <div className="flex items-center gap-2">
                <div
                  className="font-bold text-sm text-gray-800 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (post.user?.id) {
                      navigate(`/user/${post.user?.id}`)
                    }
                  }}
                >
                  {post.user?.name || '匿名用户'}
                </div>
                {post.user?.teamName && (
                  <div className="flex items-center gap-1 bg-violet-50 px-1.5 py-0.5 rounded-full border border-violet-100">
                    {post.user.teamLogo && <img src={post.user.teamLogo} className="w-3 h-3 object-contain" alt="" />}
                    <span className="text-[10px] text-violet-600 font-medium">
                      {post.user.teamName}
                    </span>
                  </div>
                )}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{new Date(post.createdAt).toLocaleString()}</div>
          </div>
        </div>
        {canDelete && (
          <Button size="mini" fill="none" onClick={() => handleDelete(post.id)}>
             <Trash2 size={16} className="text-gray-400" />
          </Button>
        )}
      </div>
      
      <div className="text-sm text-gray-800 mb-3 leading-6 whitespace-pre-wrap">
        {post.content}
      </div>

      {post.images && post.images.length > 0 && (
        <div className={`grid gap-2 mb-3 ${post.images.length === 1 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {post.images.map((img: string, idx: number) => (
            <div key={idx} className={`aspect-square rounded-xl overflow-hidden cursor-pointer ${post.images.length === 1 ? 'aspect-video w-full' : ''}`} onClick={() => ImageViewer.Multi.show({ images: post.images, defaultIndex: idx })}>
              <Image src={img} fit="cover" className="w-full h-full" />
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center pt-3 border-t border-gray-50">
        <div className="flex gap-6">
          <Button size="mini" fill="none" className="p-0 text-gray-500 hover:text-red-500 transition-colors" onClick={() => handleLike(post.id)}>
            <div className="flex items-center gap-1.5">
                <Heart size={18} className={isLiked ? "fill-red-500 text-red-500" : ""} />
                <span className={`text-xs ${isLiked ? 'text-red-500' : ''}`}>{post.likes?.length || 0}</span>
            </div>
          </Button>
          <Button size="mini" fill="none" className="p-0 text-gray-500 hover:text-violet-500 transition-colors" onClick={() => handleComment(post.id)}>
             <div className="flex items-center gap-1.5">
                <MessageCircle size={18} />
                <span className="text-xs">{post.comments?.length || 0}</span>
             </div>
          </Button>
        </div>
        <Button size="mini" fill="none" className="p-0 text-gray-400" onClick={() => handleShare()}>
             <Share2 size={18} />
        </Button>
      </div>
      
      {/* Comments Preview */}
      {post.comments && post.comments.length > 0 && (
        <div className="mt-3 bg-gray-50 p-3 rounded-xl text-xs space-y-1.5">
          {comments.map((c: any) => (
             <div key={c.id} onClick={() => {
                 setReplyTo({ id: c.userId, name: c.userName })
                 handleComment(post.id)
             }} className="active:bg-gray-100 transition-colors rounded p-0.5 -mx-0.5">
               <span className="font-bold text-gray-700">{c.userName}:</span> <span className="text-gray-600">{c.content}</span>
             </div>
          ))}
          {!showAllComments && post.comments.length > 3 && (
              <div className="text-violet-600 font-medium cursor-pointer pt-1" onClick={() => setShowAllComments(true)}>查看全部 {post.comments.length} 条评论</div>
          )}
        </div>
      )}
    </div>
    )
  }

  return (
    <div className="pb-24 pt-20">
      <div className="bg-white/80 backdrop-blur-md fixed top-0 left-0 right-0 z-30 shadow-sm border-b border-gray-100">
         <div className="max-w-md mx-auto pt-safe-top">
            <div className="px-4 py-2 flex items-center justify-center relative">
                <h1 className="text-lg font-bold text-gray-800">社区动态</h1>
            </div>
            <Tabs activeLineMode="fixed" style={{ '--content-padding': '0', '--active-line-height': '3px', '--active-title-color': '#7c3aed' }}>
                <Tabs.Tab title="推荐" key="recommend" />
            </Tabs>
         </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
        {posts.length === 0 && (
          <div className="text-center py-20 text-gray-400">
              <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
              <p>暂无动态，快来发布第一条吧</p>
          </div>
        )}
      </div>

      <FloatingBubble
        axis="xy"
        magnetic="x"
        style={{
          '--initial-position-bottom': '100px',
          '--initial-position-right': '24px',
          '--edge-distance': '24px',
          '--size': '56px',
        }}
        onClick={handlePublish}
      >
        <div className="flex items-center justify-center w-full h-full bg-gradient-to-r from-violet-500 to-fuchsia-600 rounded-full text-white shadow-xl shadow-violet-500/30 active:scale-90 transition-transform">
          <Plus size={28} strokeWidth={2.5} />
        </div>
      </FloatingBubble>

      <Modal
        visible={visible}
        title="发布动态"
        content={
          <Form form={form} onFinish={onFinish} layout='vertical'>
            <Form.Item name="content" rules={[{ required: true, message: '请输入内容' }]}>
              <TextArea placeholder="分享你的足球故事..." rows={4} maxLength={500} showCount />
            </Form.Item>
            <Form.Item label="图片 (最多9张)">
              <ImageUploader
                value={fileList}
                onChange={setFileList}
                upload={mockUpload}
                maxCount={9}
                style={{ '--cell-size': '80px' }}
              />
            </Form.Item>
          </Form>
        }
        closeOnAction
        onClose={() => setVisible(false)}
        actions={[
          {
            key: 'confirm',
            text: '发布',
            primary: true,
            onClick: () => form.submit(),
          },
          {
            key: 'cancel',
            text: '取消',
            onClick: () => setVisible(false),
          },
        ]}
      />
      
      <Modal
        visible={commentVisible}
        title={replyTo ? `回复 ${replyTo.name}` : "发表评论"}
        content={
          <Form form={commentForm} onFinish={onCommentFinish}>
            <Form.Item name="content" rules={[{ required: true, message: '请输入评论内容' }]}>
              <TextArea placeholder={replyTo ? "回复内容..." : "写下你的评论..."} rows={3} showCount maxLength={200} />
            </Form.Item>
          </Form>
        }
        closeOnAction={false}
        onClose={() => {
          setCommentVisible(false)
          setCurrentPostId(null)
          setReplyTo(null)
        }}
        actions={[
          {
            key: 'confirm',
            text: '发送',
            primary: true,
            onClick: () => commentForm.submit(),
          },
          {
            key: 'cancel',
            text: '取消',
            onClick: () => {
              setCommentVisible(false)
              setCurrentPostId(null)
              setReplyTo(null)
            },
          },
        ]}
      />
    </div>
  )
}

export default Community
