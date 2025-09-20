import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase/config';

import './SampleProblemsBoard.css';

interface SampleProblem {
  id: string;
  title: string;
  content: string;
  problemType: string;
  files: Array<{
    name: string;
    url: string;
    size: number;
  }>;
  createdAt: any;
  updatedAt: any;
  authorId: string;
  authorName: string;
}

const SampleProblemsBoard: React.FC = () => {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [problems, setProblems] = useState<SampleProblem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<SampleProblem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    problemType: '',
    files: [] as File[]
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userDataLoading, setUserDataLoading] = useState(true);

  // 사용자 데이터 로딩 상태 업데이트
  useEffect(() => {
    if (!authLoading) {
      setUserDataLoading(false);
    }
  }, [authLoading]);

  const problemTypes = [
    '01. 문단 순서 맞추기',
    '02. 유사 단어 본문 독해',
    '03. 빈칸(단어) 문제',
    '04. 빈칸(구) 문제',
    '05. 빈칸(문장) 문제',
    '06. 문장 위치 찾기',
    '07. 주제 추론',
    '08. 제목 추론',
    '09. 어법 오류 문제',
    '10. 다중 어법 오류 문제',
    '11. 본문 문장별 해석',
    '12. 단어 학습 문제',
    '13. 빈칸 채우기 (단어-주관식)',
    '14. 빈칸 채우기 (문장-주관식)',
    '패키지01. 종합 문제 세트'
  ];

  // 샘플 문제 목록 가져오기
  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const q = query(collection(db, 'sampleProblems'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const problemsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SampleProblem[];
      setProblems(problemsData);
    } catch (error) {
      console.error('Error fetching problems:', error);
    } finally {
      setLoading(false);
    }
  };

  // 파일 업로드
  const uploadFiles = async (files: File[]): Promise<Array<{name: string, url: string, size: number}>> => {
    const uploadedFiles = [];
    
    for (const file of files) {
      const storageRef = ref(storage, `sample-problems/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      uploadedFiles.push({
        name: file.name,
        url: downloadURL,
        size: file.size
      });
    }
    
    return uploadedFiles;
  };

  // 새 문제 작성
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userData) return;

    setUploading(true);
    try {
      const uploadedFiles = await uploadFiles(formData.files);
      
      const problemData = {
        title: formData.title,
        content: formData.content,
        problemType: formData.problemType,
        files: uploadedFiles,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        authorId: currentUser.uid,
        authorName: userData.name || userData.nickname || '관리자'
      };

      if (editingProblem) {
        // 기존 파일 삭제
        for (const file of editingProblem.files) {
          try {
            // URL에서 파일 경로 추출
            const url = new URL(file.url);
            const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
            if (pathMatch) {
              const filePath = decodeURIComponent(pathMatch[1]);
              const fileRef = ref(storage, filePath);
              await deleteObject(fileRef);
            }
          } catch (error) {
            console.error('Error deleting old file:', error);
          }
        }
        
        await updateDoc(doc(db, 'sampleProblems', editingProblem.id), {
          ...problemData,
          updatedAt: serverTimestamp()
        });
        alert('문제가 성공적으로 수정되었습니다.');
      } else {
        await addDoc(collection(db, 'sampleProblems'), problemData);
        alert('문제가 성공적으로 업로드되었습니다.');
      }

      setFormData({ title: '', content: '', problemType: '', files: [] });
      setEditingProblem(null);
      setIsModalOpen(false);
      fetchProblems();
    } catch (error) {
      console.error('Error saving problem:', error);
      alert('문제 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  };

  // 문제 삭제
  const handleDelete = async (problemId: string, files: Array<{url: string}>) => {
    if (!window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;

    try {
      // 파일 삭제
      for (const file of files) {
        try {
          // URL에서 파일 경로 추출
          const url = new URL(file.url);
          const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
          if (pathMatch) {
            const filePath = decodeURIComponent(pathMatch[1]);
            const fileRef = ref(storage, filePath);
            await deleteObject(fileRef);
          }
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }
      
      await deleteDoc(doc(db, 'sampleProblems', problemId));
      fetchProblems();
      alert('문제가 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting problem:', error);
      alert('문제 삭제 중 오류가 발생했습니다.');
    }
  };

  // 문제 수정 모드
  const handleEdit = (problem: SampleProblem) => {
    setEditingProblem(problem);
    setFormData({
      title: problem.title,
      content: problem.content,
      problemType: problem.problemType,
      files: []
    });
    setIsModalOpen(true);
  };

  // 파일 선택
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // 파일 개수 제한
    if (files.length > 3) {
      alert('최대 3개까지만 첨부할 수 있습니다.');
      return;
    }
    
    // 파일 형식 검증
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp'
    ];
    
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      alert(`다음 파일들은 지원되지 않는 형식입니다:\n${invalidFiles.map(f => f.name).join('\n')}\n\n지원 형식: PDF, JPG, PNG, GIF, BMP, WebP`);
      return;
    }
    
    // 파일 크기 제한 (각 파일 10MB 이하)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      alert(`다음 파일들은 크기가 너무 큽니다 (최대 10MB):\n${oversizedFiles.map(f => f.name).join('\n')}`);
      return;
    }
    
    setFormData(prev => ({ ...prev, files }));
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 날짜 포맷팅
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 문제 유형 클릭 시 해당 화면으로 이동
  const handleProblemTypeClick = (problemType: string) => {
    const typeToRoute: { [key: string]: string } = {
      '문단 순서 맞추기': '/work_01_article-order',
      '독해 문제': '/work_02_reading-comprehension',
      '빈칸(단어) 문제': '/work_03_vocabulary-word',
      '빈칸(구) 문제': '/work_04_blank-phrase-inference',
      '빈칸(문장) 문제': '/work_05_blank-sentence-inference',
      '문장 위치 찾기': '/work_06_sentence-position',
      '주제 추론': '/work_07_main-idea-inference',
      '제목 추론': '/work_08_title-inference',
      '어법 오류 문제': '/work_09_grammar-error',
      '다중 어법 오류 문제': '/work_10_multi-grammar-error',
      '본문 문장별 해석': '/work_11_sentence-translation',
      '단어 학습 문제': '/work_12_word-study'
    };

    const route = typeToRoute[problemType];
    if (route) {
      navigate(route);
    }
  };

  if (loading) {
    return (
      <div className="sample-problems-container">
        <div className="loading-spinner">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="sample-problems-container">
      <div className="sample-problems-header">
        <h1>샘플 문제 다운로드</h1>
        
        {/* 관리자 권한에 따라 다른 내용 표시 */}
        {userDataLoading || authLoading ? (
          <div className="loading-permission">
            <div className="loading-spinner-small"></div>
            <p>권한 정보를 확인하는 중...</p>
          </div>
        ) : userData?.role !== 'admin' && (
          <div className="user-content">
            <p className="user-description">📝준비된 다양한 유형의 영어 문제를 다운로드 해보세요</p>
          </div>
        )}
      </div>

      {/* 관리자 콘텐츠 - 주황색 컨테이너 없이 직접 배치 */}
      {!userDataLoading && !authLoading && userData?.role === 'admin' && (
        <>
          <p className="admin-description">관리자가 업로드한 다양한 유형의 영어 문제를 다운로드하세요</p>
          <div className="admin-actions">
            <button 
              className="upload-button"
              onClick={() => {
                setEditingProblem(null);
                setFormData({ title: '', content: '', problemType: '', files: [] });
                setIsModalOpen(true);
              }}
            >
              <span className="button-icon">📤</span>
              새 문제 업로드
            </button>
          </div>
        </>
      )}

      <div className="problems-grid">
        {problems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h3>아직 업로드된 문제가 없습니다</h3>
            <p>관리자가 샘플 문제를 업로드하면 여기에 표시됩니다.</p>
          </div>
        ) : (
          problems.map((problem) => (
          <div key={problem.id} className="problem-card">
            <div className="problem-header">
              <div 
                className="problem-type-badge clickable"
                onClick={() => handleProblemTypeClick(problem.problemType)}
                title="클릭하여 해당 문제 유형 화면으로 이동"
              >
                {problem.problemType}
              </div>
              <div className="problem-date">{formatDate(problem.createdAt)}</div>
            </div>
            
            <h3 className="problem-title">{problem.title}</h3>
            <p className="problem-content">{problem.content}</p>
            
            <div className="problem-files">
              <h4>첨부 파일 ({problem.files.length}개)</h4>
              {problem.files.map((file, index) => (
                <div key={index} className="file-item">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">({formatFileSize(file.size)})</span>
                  <a 
                    href={file.url} 
                    download={file.name}
                    className="download-button"
                  >
                    다운로드
                  </a>
                </div>
              ))}
            </div>

            {userData?.role === 'admin' && (
              <div className="problem-actions">
                <button 
                  className="edit-button"
                  onClick={() => {
                    console.log('Edit button clicked for problem:', problem.id);
                    handleEdit(problem);
                  }}
                  disabled={uploading}
                >
                  수정
                </button>
                <button 
                  className="delete-button"
                  onClick={() => {
                    console.log('Delete button clicked for problem:', problem.id);
                    handleDelete(problem.id, problem.files);
                  }}
                  disabled={uploading}
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        ))
        )}
      </div>

      {/* 작성/수정 모달 */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingProblem ? '문제 수정' : '새 문제 업로드'}</h2>
              <button 
                className="close-button"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="problem-form">
              <div className="form-group">
                <label htmlFor="title">제목 *</label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="문제 제목을 입력하세요"
                />
              </div>

              <div className="form-group">
                <label htmlFor="problemType">문제 유형 *</label>
                <select
                  id="problemType"
                  value={formData.problemType}
                  onChange={(e) => setFormData(prev => ({ ...prev, problemType: e.target.value }))}
                  required
                >
                  <option value="">유형을 선택하세요</option>
                  {problemTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="content">내용</label>
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 2000) { // 최대 2000자 제한
                      setFormData(prev => ({ ...prev, content: value }));
                    }
                  }}
                  placeholder="문제에 대한 설명이나 참고사항을 입력하세요 (최대 2000자)"
                  rows={4}
                  maxLength={2000}
                />
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: formData.content.length > 1800 ? '#d32f2f' : '#666',
                  textAlign: 'right',
                  marginTop: '0.25rem'
                }}>
                  {formData.content.length}/2000자
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="files">파일 첨부 (최대 3개)</label>
                <input
                  id="files"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                />
                <div className="file-info">
                  {formData.files.map((file, index) => (
                    <div key={index} className="selected-file">
                      {file.name} ({formatFileSize(file.size)})
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setIsModalOpen(false)}
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={uploading}
                >
                  {uploading ? '업로드 중...' : (editingProblem ? '수정' : '업로드')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleProblemsBoard; 