import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, storage } from '../../firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  where 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { isAdmin as checkIsAdmin } from '../../utils/adminUtils';
import './Feedback.css';

interface FeedbackPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: any;
  updatedAt?: any;
  imageUrls?: string[];
  replies?: FeedbackReply[];
  isSecret?: boolean;
}

interface FeedbackReply {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: any;
  updatedAt?: any;
  imageUrls?: string[];
}

const Feedback: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<FeedbackPost | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSecret, setIsSecret] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingReplyImages, setUploadingReplyImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedReplyImages, setSelectedReplyImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [replyImageUrls, setReplyImageUrls] = useState<string[]>([]);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyContent, setEditingReplyContent] = useState<string>('');
  const [editingReplyImages, setEditingReplyImages] = useState<File[]>([]);
  const [editingReplyImageUrls, setEditingReplyImageUrls] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const editingReplyFileInputRef = useRef<HTMLInputElement>(null);

  // 관리자 권한 확인
  useEffect(() => {
    console.log('Feedback 컴포넌트 - currentUser:', currentUser);
    console.log('Feedback 컴포넌트 - userData:', userData);
    
    if (currentUser && userData) {
      setIsAdmin(checkIsAdmin(userData));
    }
  }, [currentUser, userData]);

  // 이미지 업로드 함수
  const uploadImages = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `feedback-images/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    });

    return Promise.all(uploadPromises);
  };

  // 이미지 파일 선택 처리
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, isReply: boolean = false) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (isReply) {
      setSelectedReplyImages(prev => [...prev, ...imageFiles]);
    } else {
      setSelectedImages(prev => [...prev, ...imageFiles]);
    }
  };

  // 이미지 제거
  const removeImage = (index: number, isReply: boolean = false) => {
    if (isReply) {
      setSelectedReplyImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setSelectedImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  // 이미지 미리보기 URL 생성
  const getImagePreviewUrl = (file: File): string => {
    return URL.createObjectURL(file);
  };

  const fetchPosts = useCallback(async () => {
    try {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const postsData: FeedbackPost[] = [];
      
      for (const doc of querySnapshot.docs) {
        const postData = doc.data();
        
        // 답글 불러오기
        const repliesQuery = query(
          collection(db, 'feedback', doc.id, 'replies'),
          orderBy('createdAt', 'asc')
        );
        const repliesSnapshot = await getDocs(repliesQuery);
        const replies: FeedbackReply[] = repliesSnapshot.docs.map(replyDoc => {
          const data = replyDoc.data();
          return {
            id: replyDoc.id,
            content: data.content || '',
            authorId: data.authorId || '',
            authorName: data.authorName || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            imageUrls: data.imageUrls || []
          } as FeedbackReply;
        });

        postsData.push({
          id: doc.id,
          ...postData,
          replies
        } as FeedbackPost);
      }
      
      setPosts(postsData);
    } catch (error) {
      console.error('게시글 불러오기 오류:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 게시글 목록 불러오기
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // 게시글 작성
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !title.trim() || !content.trim()) return;

    setUploadingImages(true);
    try {
      // 사용자 데이터를 직접 Firestore에서 가져오기
      let authorName = '익명';
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userDataFromFirestore = userDoc.data();
          authorName = userDataFromFirestore.nickname || userDataFromFirestore.name || currentUser.email?.split('@')[0] || '익명';
          console.log('Firestore에서 가져온 사용자 데이터:', userDataFromFirestore);
          console.log('최종 authorName:', authorName);
        } else {
          // 사용자 데이터가 없으면 이메일에서 사용자명 추출
          authorName = currentUser.email?.split('@')[0] || '익명';
          console.log('사용자 데이터가 없어서 이메일에서 추출:', authorName);
        }
      } catch (error) {
        console.error('사용자 데이터 가져오기 오류:', error);
        authorName = currentUser.email?.split('@')[0] || '익명';
        console.log('오류 발생으로 이메일에서 추출:', authorName);
      }

      let uploadedImageUrls: string[] = [];
      
      if (selectedImages.length > 0) {
        uploadedImageUrls = await uploadImages(selectedImages);
      }

      const postData = {
        title: title.trim(),
        content: content.trim(),
        authorId: currentUser.uid,
        authorName: authorName,
        createdAt: serverTimestamp(),
        imageUrls: uploadedImageUrls,
        isSecret: isSecret,
      };

      await addDoc(collection(db, 'feedback'), postData);
      setTitle('');
      setContent('');
      setIsSecret(false);
      setSelectedImages([]);
      setImageUrls([]);
      setIsWriting(false);
      fetchPosts();
    } catch (error) {
      console.error('게시글 작성 오류:', error);
    } finally {
      setUploadingImages(false);
    }
  };

  // 게시글 수정
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !title.trim() || !content.trim()) return;

    setUploadingImages(true);
    try {
      let uploadedImageUrls: string[] = [...(selectedPost.imageUrls || [])];
      
      if (selectedImages.length > 0) {
        const newImageUrls = await uploadImages(selectedImages);
        uploadedImageUrls = [...uploadedImageUrls, ...newImageUrls];
      }

      const postRef = doc(db, 'feedback', selectedPost.id);
      await updateDoc(postRef, {
        title: title.trim(),
        content: content.trim(),
        updatedAt: serverTimestamp(),
        imageUrls: uploadedImageUrls,
        isSecret: isSecret,
      });

      setTitle('');
      setContent('');
      setIsSecret(false);
      setSelectedImages([]);
      setImageUrls([]);
      setIsEditing(false);
      setSelectedPost(null);
      fetchPosts();
    } catch (error) {
      console.error('게시글 수정 오류:', error);
    } finally {
      setUploadingImages(false);
    }
  };

  // 게시글 삭제 (작성자용)
  const handleDelete = async (postId: string) => {
    if (!currentUser) return;
    
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    // 본인이 작성한 글인지 확인
    if (currentUser.uid !== post.authorId) {
      alert('삭제 권한이 없습니다.');
      return;
    }
    
    if (window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      try {
        // 게시글의 이미지들 삭제
        const post = posts.find(p => p.id === postId);
        if (post?.imageUrls) {
          for (const imageUrl of post.imageUrls) {
            try {
              const imageRef = ref(storage, imageUrl);
              await deleteObject(imageRef);
            } catch (error) {
              console.error('이미지 삭제 오류:', error);
            }
          }
        }

        await deleteDoc(doc(db, 'feedback', postId));
        fetchPosts();
        if (selectedPost?.id === postId) {
          setSelectedPost(null);
        }
      } catch (error) {
        console.error('게시글 삭제 오류:', error);
      }
    }
  };

  // 게시글 삭제 (관리자용)
  const handleAdminDelete = async (postId: string) => {
    if (!currentUser || !checkIsAdmin(userData)) return;
    
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    if (window.confirm('관리자 권한으로 이 게시글을 삭제하시겠습니까?')) {
      try {
        // 게시글의 이미지들 삭제
        if (post?.imageUrls) {
          for (const imageUrl of post.imageUrls) {
            try {
              const imageRef = ref(storage, imageUrl);
              await deleteObject(imageRef);
            } catch (error) {
              console.error('이미지 삭제 오류:', error);
            }
          }
        }

        await deleteDoc(doc(db, 'feedback', postId));
        fetchPosts();
        if (selectedPost?.id === postId) {
          setSelectedPost(null);
        }
      } catch (error) {
        console.error('게시글 삭제 오류:', error);
        alert('게시글 삭제에 실패했습니다.');
      }
    }
  };

  // 특정 게시글의 답글만 불러오기
  const fetchRepliesForPost = async (postId: string) => {
    try {
      const repliesQuery = query(
        collection(db, 'feedback', postId, 'replies'),
        orderBy('createdAt', 'asc')
      );
      const repliesSnapshot = await getDocs(repliesQuery);
      const replies: FeedbackReply[] = repliesSnapshot.docs.map(replyDoc => {
        const data = replyDoc.data();
        return {
          id: replyDoc.id,
          content: data.content || '',
          authorId: data.authorId || '',
          authorName: data.authorName || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          imageUrls: data.imageUrls || []
        } as FeedbackReply;
      });

      // selectedPost의 답글 목록 업데이트
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost({
          ...selectedPost,
          replies
        });
      }

      // posts 목록도 업데이트
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId ? { ...post, replies } : post
        )
      );
    } catch (error) {
      console.error('답글 불러오기 오류:', error);
    }
  };

  // 답글 작성
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedPost || !replyContent.trim()) return;

    setUploadingReplyImages(true);
    try {
      // 사용자 데이터를 직접 Firestore에서 가져오기
      let authorName = '익명';
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userDataFromFirestore = userDoc.data();
          authorName = userDataFromFirestore.nickname || userDataFromFirestore.name || currentUser.email?.split('@')[0] || '익명';
        } else {
          // 사용자 데이터가 없으면 이메일에서 사용자명 추출
          authorName = currentUser.email?.split('@')[0] || '익명';
        }
      } catch (error) {
        console.error('사용자 데이터 가져오기 오류:', error);
        authorName = currentUser.email?.split('@')[0] || '익명';
      }

      let uploadedImageUrls: string[] = [];
      
      if (selectedReplyImages.length > 0) {
        uploadedImageUrls = await uploadImages(selectedReplyImages);
      }

      const replyData = {
        content: replyContent.trim(),
        authorId: currentUser.uid,
        authorName: authorName,
        createdAt: serverTimestamp(),
        imageUrls: uploadedImageUrls,
      };

      await addDoc(collection(db, 'feedback', selectedPost.id, 'replies'), replyData);
      setReplyContent('');
      setSelectedReplyImages([]);
      setReplyImageUrls([]);
      
      // 답글 등록 후 현재 게시글의 답글만 다시 불러오기
      await fetchRepliesForPost(selectedPost.id);
    } catch (error) {
      console.error('답글 작성 오류:', error);
    } finally {
      setUploadingReplyImages(false);
    }
  };

  // 답글 수정 시작
  const startReplyEdit = (reply: FeedbackReply) => {
    setEditingReplyId(reply.id);
    setEditingReplyContent(reply.content);
    setEditingReplyImages([]);
    setEditingReplyImageUrls(reply.imageUrls || []);
  };

  // 답글 수정 취소
  const cancelReplyEdit = () => {
    setEditingReplyId(null);
    setEditingReplyContent('');
    setEditingReplyImages([]);
    setEditingReplyImageUrls([]);
  };

  // 답글 수정
  const handleReplyEdit = async (e: React.FormEvent, replyId: string) => {
    e.preventDefault();
    if (!currentUser || !selectedPost || !editingReplyContent.trim()) return;

    setUploadingReplyImages(true);
    try {
      let uploadedImageUrls: string[] = [...editingReplyImageUrls];
      
      if (editingReplyImages.length > 0) {
        const newImageUrls = await uploadImages(editingReplyImages);
        uploadedImageUrls = [...uploadedImageUrls, ...newImageUrls];
      }

      const replyRef = doc(db, 'feedback', selectedPost.id, 'replies', replyId);
      await updateDoc(replyRef, {
        content: editingReplyContent.trim(),
        imageUrls: uploadedImageUrls,
        updatedAt: serverTimestamp()
      });

      setEditingReplyId(null);
      setEditingReplyContent('');
      setEditingReplyImages([]);
      setEditingReplyImageUrls([]);
      
      // 답글 수정 후 현재 게시글의 답글만 다시 불러오기
      await fetchRepliesForPost(selectedPost.id);
    } catch (error) {
      console.error('답글 수정 오류:', error);
      alert('답글 수정에 실패했습니다.');
    } finally {
      setUploadingReplyImages(false);
    }
  };

  // 답글 삭제 (작성자용)
  const handleReplyDelete = async (replyId: string) => {
    if (!currentUser || !selectedPost) return;
    
    // 답글 정보 가져오기
    const replyRef = doc(db, 'feedback', selectedPost.id, 'replies', replyId);
    const replyDoc = await getDoc(replyRef);
    
    if (!replyDoc.exists()) {
      alert('답글을 찾을 수 없습니다.');
      return;
    }
    
    const replyData = replyDoc.data();
    
    // 본인이 작성한 답글인지 확인
    if (currentUser.uid !== replyData.authorId) {
      alert('삭제 권한이 없습니다.');
      return;
    }
    
    if (!window.confirm('답글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      // 답글의 이미지 삭제
      if (replyData.imageUrls && replyData.imageUrls.length > 0) {
        for (const imageUrl of replyData.imageUrls) {
          try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('이미지 삭제 오류:', error);
          }
        }
      }
      
      await deleteDoc(replyRef);
      
      // 답글 삭제 후 현재 게시글의 답글만 다시 불러오기
      await fetchRepliesForPost(selectedPost.id);
    } catch (error) {
      console.error('답글 삭제 오류:', error);
      alert('답글 삭제에 실패했습니다.');
    }
  };

  // 답글 삭제 (관리자용)
  const handleAdminReplyDelete = async (replyId: string) => {
    if (!currentUser || !selectedPost || !checkIsAdmin(userData)) return;
    
    // 답글 정보 가져오기
    const replyRef = doc(db, 'feedback', selectedPost.id, 'replies', replyId);
    const replyDoc = await getDoc(replyRef);
    
    if (!replyDoc.exists()) {
      alert('답글을 찾을 수 없습니다.');
      return;
    }
    
    const replyData = replyDoc.data();
    
    if (!window.confirm('관리자 권한으로 이 답글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      // 답글의 이미지 삭제
      if (replyData.imageUrls && replyData.imageUrls.length > 0) {
        for (const imageUrl of replyData.imageUrls) {
          try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('이미지 삭제 오류:', error);
          }
        }
      }
      
      await deleteDoc(replyRef);
      
      // 답글 삭제 후 현재 게시글의 답글만 다시 불러오기
      await fetchRepliesForPost(selectedPost.id);
    } catch (error) {
      console.error('답글 삭제 오류:', error);
      alert('답글 삭제에 실패했습니다.');
    }
  };

  // 수정 모드 시작
  const startEdit = (post: FeedbackPost) => {
    setSelectedPost(post);
    setTitle(post.title);
    setContent(post.content);
    setIsSecret(post.isSecret || false);
    setImageUrls(post.imageUrls || []);
    setIsEditing(true);
  };

  // 게시글 보기
  const viewPost = (post: FeedbackPost) => {
    // 비밀글 접근 권한 체크: 작성자와 관리자만 볼 수 있음
    if (post.isSecret === true) {
      if (!currentUser) {
        alert('비밀글은 작성자와 관리자만 볼 수 있습니다.');
        return;
      }
      if (post.authorId !== currentUser.uid && !checkIsAdmin(userData)) {
        alert('비밀글은 작성자와 관리자만 볼 수 있습니다.');
        return;
      }
    }
    
    setSelectedPost(post);
    setIsWriting(false);
    setIsEditing(false);
    setEditingReplyId(null);
    setEditingReplyContent('');
    setEditingReplyImages([]);
    setEditingReplyImageUrls([]);
  };

  // 목록으로 돌아가기
  const backToList = () => {
    setSelectedPost(null);
    setIsWriting(false);
    setIsEditing(false);
    setTitle('');
    setContent('');
    setIsSecret(false);
    setReplyContent('');
    setSelectedImages([]);
    setSelectedReplyImages([]);
    setImageUrls([]);
    setReplyImageUrls([]);
    setEditingReplyId(null);
    setEditingReplyContent('');
    setEditingReplyImages([]);
    setEditingReplyImageUrls([]);
  };

  if (!currentUser) {
    return (
      <div className="feedback-page">
        <div className="feedback-container">
          <div className="feedback-login-required">
            <h2>로그인이 필요합니다</h2>
            <p>Feedback 게시판을 이용하려면 로그인이 필요합니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-page">
      <div className="feedback-container">
        <div className="table-header">
          <h2>Feedback 게시판</h2>
          <p className="table-header-description">서비스 이용 후 피드백을 남겨주세요.</p>
        </div>

        {!selectedPost && !isWriting && !isEditing && (
          <div className="feedback-list-header">
            <h1>Feedback 게시판</h1>
          </div>
        )}

        {!selectedPost && !isWriting && !isEditing && (
          <div className="feedback-list">
          <div className="feedback-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setIsWriting(true)}
            >
              글쓰기
            </button>
          </div>

          {loading ? (
            <div className="loading">게시글을 불러오는 중...</div>
          ) : (
            <div className="posts-table">
              <table>
                <thead>
                  <tr>
                                         <th>번호</th>
                     <th>제목</th>
                     <th>작성자</th>
                     <th>작성일</th>
                     <th>답글</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post, index) => (
                    <tr key={post.id}>
                      <td>{posts.length - index}</td>
                      <td>
                        <button 
                          className="post-title-btn"
                          onClick={() => viewPost(post)}
                        >
                          {post.isSecret && <span className="secret-indicator">🔒 </span>}
                          {post.title}
                          {post.imageUrls && post.imageUrls.length > 0 && (
                            <span className="image-indicator"> 📷</span>
                          )}
                        </button>
                      </td>
                      <td>{post.authorName}</td>
                      <td>
                        {post.createdAt?.toDate?.() 
                          ? post.createdAt.toDate().toLocaleDateString()
                          : '날짜 없음'
                        }
                      </td>
                                             <td>{post.replies?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isWriting && (
        <div className="feedback-write">
          <h2>글쓰기</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                required
              />
            </div>
            <div className="form-group">
              <label>내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력하세요"
                rows={10}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={(e) => setIsSecret(e.target.checked)}
                />
                <span>비밀글 (작성자와 관리자만 볼 수 있습니다)</span>
              </label>
            </div>
            
            {/* 이미지 업로드 섹션 */}
            <div className="form-group">
              <label>이미지 첨부</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleImageSelect(e)}
                accept="image/*"
                multiple
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                이미지 선택
              </button>
              
              {/* 선택된 이미지 미리보기 */}
              {selectedImages.length > 0 && (
                <div className="image-preview-container">
                  <h4>선택된 이미지 ({selectedImages.length}개)</h4>
                  <div className="image-preview-grid">
                    {selectedImages.map((file, index) => (
                      <div key={index} className="image-preview-item">
                        <img
                          src={getImagePreviewUrl(file)}
                          alt={`미리보기 ${index + 1}`}
                          className="image-preview"
                        />
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => removeImage(index)}
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={uploadingImages}
              >
                {uploadingImages ? '업로드 중...' : '등록'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setIsWriting(false);
                  setTitle('');
                  setContent('');
                  setIsSecret(false);
                  setSelectedImages([]);
                }}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {isEditing && selectedPost && (
        <div className="feedback-edit">
          <h2>글 수정</h2>
          <form onSubmit={handleEdit}>
            <div className="form-group">
              <label>제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={(e) => setIsSecret(e.target.checked)}
                />
                <span>비밀글 (작성자와 관리자만 볼 수 있습니다)</span>
              </label>
            </div>
            
            {/* 기존 이미지 표시 */}
            {imageUrls.length > 0 && (
              <div className="form-group">
                <label>기존 이미지</label>
                <div className="image-preview-grid">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="image-preview-item">
                      <img
                        src={url}
                        alt={`기존 이미지 ${index + 1}`}
                        className="image-preview"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 새 이미지 업로드 */}
            <div className="form-group">
              <label>새 이미지 첨부</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleImageSelect(e)}
                accept="image/*"
                multiple
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                이미지 선택
              </button>
              
              {/* 선택된 이미지 미리보기 */}
              {selectedImages.length > 0 && (
                <div className="image-preview-container">
                  <h4>선택된 이미지 ({selectedImages.length}개)</h4>
                  <div className="image-preview-grid">
                    {selectedImages.map((file, index) => (
                      <div key={index} className="image-preview-item">
                        <img
                          src={getImagePreviewUrl(file)}
                          alt={`미리보기 ${index + 1}`}
                          className="image-preview"
                        />
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => removeImage(index)}
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={uploadingImages}
              >
                {uploadingImages ? '업로드 중...' : '수정'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={backToList}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedPost && !isWriting && !isEditing && (
        <div className="feedback-view">
          <div className="post-header">
            <h2>
              {selectedPost.isSecret && <span className="secret-indicator">🔒 </span>}
              {selectedPost.title}
            </h2>
            <div className="post-meta">
              <span>작성자: {selectedPost.authorName}</span>
              <span>
                작성일: {
                  selectedPost.createdAt?.toDate?.() 
                    ? selectedPost.createdAt.toDate().toLocaleDateString()
                    : '날짜 없음'
                }
              </span>
              {selectedPost.updatedAt && (
                <span>
                  수정일: {
                    selectedPost.updatedAt?.toDate?.() 
                      ? selectedPost.updatedAt.toDate().toLocaleDateString()
                      : '날짜 없음'
                  }
                </span>
              )}
            </div>
          </div>

          <div className="post-content">
            {selectedPost.content.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
            
            {/* 게시글 이미지 표시 */}
            {selectedPost.imageUrls && selectedPost.imageUrls.length > 0 && (
              <div className="post-images">
                <h4>첨부된 이미지</h4>
                <div className="image-grid">
                  {selectedPost.imageUrls.map((url, index) => (
                    <div key={index} className="image-item">
                      <img
                        src={url}
                        alt={`게시글 이미지 ${index + 1}`}
                        className="post-image"
                        onClick={() => window.open(url, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

                     <div className="post-actions">
             {currentUser && currentUser.uid === selectedPost.authorId && (
               <button 
                 className="btn btn-secondary"
                 onClick={() => startEdit(selectedPost)}
               >
                 수정
               </button>
             )}
             {currentUser && currentUser.uid === selectedPost.authorId && (
               <button 
                 className="btn btn-danger"
                 onClick={() => handleDelete(selectedPost.id)}
               >
                 삭제
               </button>
             )}
             <button 
               className="btn btn-primary"
               onClick={backToList}
             >
               목록으로
             </button>
             {isAdmin && (
               <button 
                 className="btn btn-danger btn-admin-delete-post"
                 onClick={() => handleAdminDelete(selectedPost.id)}
               >
                 관리자삭제
               </button>
             )}
           </div>

          {/* 답글 섹션 */}
          <div className="replies-section">
            <h3>답글 ({selectedPost.replies?.length || 0})</h3>
            
            {selectedPost.replies && selectedPost.replies.length > 0 && (
              <div className="replies-list">
                {selectedPost.replies.map((reply) => (
                  <div key={reply.id} className="reply-item">
                    {editingReplyId === reply.id ? (
                      // 답글 수정 폼
                      <form onSubmit={(e) => handleReplyEdit(e, reply.id)}>
                        <div className="form-group">
                          <textarea
                            value={editingReplyContent}
                            onChange={(e) => setEditingReplyContent(e.target.value)}
                            placeholder="답글을 입력하세요"
                            rows={4}
                            required
                            style={{
                              width: '100%',
                              padding: '0.875rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              fontFamily: 'inherit',
                              resize: 'vertical',
                              minHeight: '100px'
                            }}
                          />
                        </div>
                        
                        {/* 수정 중인 답글 이미지 업로드 */}
                        <div className="form-group">
                          <label>이미지 첨부</label>
                          <input
                            type="file"
                            ref={editingReplyFileInputRef}
                            onChange={(e) => {
                              if (e.target.files) {
                                const files = Array.from(e.target.files);
                                setEditingReplyImages(prev => [...prev, ...files]);
                              }
                            }}
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => editingReplyFileInputRef.current?.click()}
                          >
                            이미지 추가
                          </button>
                          
                          {/* 기존 이미지 표시 */}
                          {editingReplyImageUrls.length > 0 && (
                            <div className="image-preview-container" style={{ marginTop: '1rem' }}>
                              <h4>기존 이미지</h4>
                              <div className="image-preview-grid">
                                {editingReplyImageUrls.map((url, index) => (
                                  <div key={index} className="image-preview-item">
                                    <img
                                      src={url}
                                      alt={`기존 이미지 ${index + 1}`}
                                      className="image-preview"
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-sm"
                                      onClick={() => {
                                        setEditingReplyImageUrls(prev => prev.filter((_, i) => i !== index));
                                      }}
                                    >
                                      삭제
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* 새로 선택한 이미지 미리보기 */}
                          {editingReplyImages.length > 0 && (
                            <div className="image-preview-container" style={{ marginTop: '1rem' }}>
                              <h4>새로 추가할 이미지 ({editingReplyImages.length}개)</h4>
                              <div className="image-preview-grid">
                                {editingReplyImages.map((file, index) => (
                                  <div key={index} className="image-preview-item">
                                    <img
                                      src={URL.createObjectURL(file)}
                                      alt={`미리보기 ${index + 1}`}
                                      className="image-preview"
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-sm"
                                      onClick={() => {
                                        setEditingReplyImages(prev => prev.filter((_, i) => i !== index));
                                      }}
                                    >
                                      삭제
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="reply-form-actions">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={cancelReplyEdit}
                            disabled={uploadingReplyImages}
                          >
                            취소
                          </button>
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={uploadingReplyImages}
                          >
                            {uploadingReplyImages ? '수정 중...' : '수정 완료'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      // 답글 표시
                      <>
                        <div className="reply-header">
                          <span className="reply-author">{reply.authorName}</span>
                          <span className="reply-date">
                            {reply.createdAt?.toDate?.() 
                              ? reply.createdAt.toDate().toLocaleDateString()
                              : '날짜 없음'
                            }
                            {reply.updatedAt && (
                              <span style={{ marginLeft: '0.5rem', color: '#9ca3af', fontSize: '0.8rem' }}>
                                (수정됨)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="reply-content">
                          {reply.content.split('\n').map((line, index) => (
                            <p key={index}>{line}</p>
                          ))}
                          
                          {/* 답글 이미지 표시 */}
                          {reply.imageUrls && reply.imageUrls.length > 0 && (
                            <div className="reply-images">
                              <div className="image-grid">
                                {reply.imageUrls.map((url, index) => (
                                  <div key={index} className="image-item">
                                    <img
                                      src={url}
                                      alt={`답글 이미지 ${index + 1}`}
                                      className="reply-image"
                                      onClick={() => window.open(url, '_blank')}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="reply-actions">
                          {currentUser && currentUser.uid === reply.authorId && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => startReplyEdit(reply)}
                            >
                              수정
                            </button>
                          )}
                          {currentUser && currentUser.uid === reply.authorId && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleReplyDelete(reply.id)}
                            >
                              삭제
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              className="btn btn-danger btn-sm btn-admin-delete"
                              onClick={() => handleAdminReplyDelete(reply.id)}
                            >
                              관리자삭제
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="reply-form">
              <h4>답글 작성</h4>
              <form onSubmit={handleReplySubmit}>
                <div className="form-group">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="답글을 입력하세요"
                    rows={4}
                    required
                  />
                </div>
                
                {/* 답글 이미지 업로드 */}
                <div className="form-group">
                  <label>이미지 첨부</label>
                  <input
                    type="file"
                    ref={replyFileInputRef}
                    onChange={(e) => handleImageSelect(e, true)}
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => replyFileInputRef.current?.click()}
                  >
                    이미지 선택
                  </button>
                  
                  {/* 선택된 답글 이미지 미리보기 */}
                  {selectedReplyImages.length > 0 && (
                    <div className="image-preview-container">
                      <h4>선택된 이미지 ({selectedReplyImages.length}개)</h4>
                      <div className="image-preview-grid">
                        {selectedReplyImages.map((file, index) => (
                          <div key={index} className="image-preview-item">
                            <img
                              src={getImagePreviewUrl(file)}
                              alt={`미리보기 ${index + 1}`}
                              className="image-preview"
                            />
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => removeImage(index, true)}
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={uploadingReplyImages}
                >
                  {uploadingReplyImages ? '업로드 중...' : '답글 등록'}
                </button>
              </form>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default Feedback; 