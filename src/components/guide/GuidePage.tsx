import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../utils/adminUtils';
import { getNotices, createNotice, updateNotice, deleteNotice, Notice } from '../../services/noticeService';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { FaEdit, FaTrash } from 'react-icons/fa';
import './GuidePage.css';

// 타입 안전성을 위한 아이콘 컴포넌트 래퍼
const EditIcon: React.FC<{ size?: number }> = ({ size = 16 }) => {
  // @ts-ignore - react-icons 타입 호환성 문제 우회
  return React.createElement(FaEdit as any, { size });
};

const TrashIcon: React.FC<{ size?: number }> = ({ size = 16 }) => {
  // @ts-ignore - react-icons 타입 호환성 문제 우회
  return React.createElement(FaTrash as any, { size });
};

const GuidePage: React.FC = () => {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('notice');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filteredNotices, setFilteredNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isImportant: false
  });

  const tabs = [
    { id: 'notice', label: '공지사항' },
    { id: 'guide', label: '이용안내' },
    { id: 'terms', label: '이용약관' },
    { id: 'refund', label: '환불안내' },
    { id: 'privacy', label: '개인정보취급방침' }
  ];

  const isAdminUser = isAdmin(userData);

  // HTML 콘텐츠에서 실제 텍스트만 추출하여 검증
  const isContentEmpty = (htmlContent: string): boolean => {
    if (!htmlContent) return true;
    // HTML 태그 제거 후 공백만 남는지 확인
    const textContent = htmlContent.replace(/<[^>]*>/g, '').trim();
    return textContent === '' || textContent === '\n';
  };

  // 공지사항 불러오기
  useEffect(() => {
    loadNotices();
  }, []);

  // Esc 키로 모달 닫기
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && editingNotice && !showForm) {
        setEditingNotice(null);
      }
    };

    if (editingNotice && !showForm) {
      window.addEventListener('keydown', handleEscKey);
    }

    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [editingNotice, showForm]);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const noticeList = await getNotices();
      setNotices(noticeList);
      setFilteredNotices(noticeList);
    } catch (error) {
      console.error('공지사항 로드 실패:', error);
      alert('공지사항을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 검색 처리
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredNotices(notices);
      setCurrentPage(1);
    } else {
      const filtered = notices.filter(notice =>
        notice.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredNotices(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, notices]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredNotices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotices = filteredNotices.slice(startIndex, endIndex);

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 검색은 useEffect에서 자동 처리됨
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      isImportant: false
    });
    setEditingNotice(null);
    setIsEditing(false);
    setShowForm(false);
  };

  // 공지사항 등록
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !isAdminUser) {
      alert('관리자 권한이 필요합니다.');
      return;
    }

    if (!formData.title.trim() || isContentEmpty(formData.content)) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      await createNotice(
        formData.title,
        formData.content,
        userData.uid,
        userData.name || userData.nickname || '관리자',
        formData.isImportant
      );
      alert('공지사항이 등록되었습니다.');
      resetForm();
      loadNotices();
    } catch (error) {
      console.error('공지사항 등록 실패:', error);
      alert('공지사항 등록에 실패했습니다.');
    }
  };

  // 공지사항 수정
  const handleUpdateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('공지사항 수정 시도:', {
      editingNotice,
      formData,
      isAdminUser,
      userData
    });

    if (!editingNotice) {
      console.error('수정할 공지사항이 선택되지 않았습니다.');
      alert('수정할 공지사항을 선택해주세요.');
      return;
    }

    if (!userData || !isAdminUser) {
      console.error('관리자 권한이 없습니다.');
      alert('관리자 권한이 필요합니다.');
      return;
    }

    if (!formData.title.trim() || isContentEmpty(formData.content)) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      console.log('공지사항 수정 API 호출:', {
        noticeId: editingNotice.id,
        title: formData.title,
        content: formData.content,
        isImportant: formData.isImportant
      });

      await updateNotice(
        editingNotice.id,
        formData.title,
        formData.content,
        formData.isImportant
      );
      
      console.log('공지사항 수정 성공');
      alert('공지사항이 수정되었습니다.');
      resetForm();
      loadNotices();
    } catch (error) {
      console.error('공지사항 수정 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`공지사항 수정에 실패했습니다: ${errorMessage}`);
    }
  };

  // 공지사항 삭제
  const handleDeleteNotice = async (noticeId: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      await deleteNotice(noticeId);
      alert('공지사항이 삭제되었습니다.');
      loadNotices();
    } catch (error) {
      console.error('공지사항 삭제 실패:', error);
      alert('공지사항 삭제에 실패했습니다.');
    }
  };

  // 수정 폼 열기
  const handleEditNotice = (notice: Notice) => {
    console.log('공지사항 수정 모드 진입:', notice);
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      isImportant: notice.isImportant || false
    });
    setIsEditing(true);
    setShowForm(true);
    console.log('수정 폼 상태:', {
      isEditing: true,
      showForm: true,
      formData: {
        title: notice.title,
        content: notice.content,
        isImportant: notice.isImportant || false
      }
    });
  };

  // 날짜 포맷팅
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  return (
    <div className="guide-page">
      <div className="guide-container">
        <h1 className="guide-title">이용안내</h1>
        
        <div className="guide-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`guide-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="guide-content">
          {activeTab === 'notice' && (
            <div className="guide-section">
              <div className="notice-header">
                <h2>공지사항</h2>
                {isAdminUser && (
                  <button
                    className="notice-add-btn"
                    onClick={() => {
                      resetForm();
                      setShowForm(true);
                    }}
                  >
                    + 공지사항 등록
                  </button>
                )}
              </div>

              {showForm && isAdminUser && (
                <div className="notice-form">
                  <h3>{isEditing ? '공지사항 수정' : '공지사항 등록'}</h3>
                  <form onSubmit={isEditing ? handleUpdateNotice : handleCreateNotice}>
                    <div className="form-group">
                      <label>제목</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="공지사항 제목을 입력하세요"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>내용</label>
                      <ReactQuill
                        theme="snow"
                        value={formData.content}
                        onChange={(value) => setFormData({ ...formData, content: value })}
                        placeholder="공지사항 내용을 입력하세요"
                        modules={{
                          toolbar: [
                            [{ 'header': [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            [{ 'color': [] }, { 'background': [] }],
                            [{ 'align': [] }],
                            ['link', 'image'],
                            ['clean']
                          ]
                        }}
                        formats={[
                          'header',
                          'bold', 'italic', 'underline', 'strike',
                          'list', 'bullet',
                          'color', 'background',
                          'align',
                          'link', 'image'
                        ]}
                        style={{ minHeight: '300px', marginBottom: '0' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={formData.isImportant}
                          onChange={(e) => setFormData({ ...formData, isImportant: e.target.checked })}
                        />
                        중요 공지
                      </label>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn-submit">
                        {isEditing ? '수정' : '등록'}
                      </button>
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={resetForm}
                      >
                        취소
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {loading ? (
                <div className="loading">로딩 중...</div>
              ) : (
                <>
                  <div className="notice-count">
                    총 <strong>{filteredNotices.length}개</strong>의 글이 등록되어 있습니다.
                  </div>
                  
                  <form onSubmit={handleSearch} className="notice-search-form">
                    <input
                      type="text"
                      className="notice-search-input"
                      placeholder="제목을 입력하세요"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="notice-search-btn">검색</button>
                  </form>

                  {filteredNotices.length === 0 ? (
                    <div className="no-notice">등록된 공지사항이 없습니다.</div>
                  ) : (
                    <>
                      <div className="notice-table-container">
                        <table className="notice-table">
                          <thead>
                            <tr>
                              <th style={{ width: '60px' }}>번호</th>
                              <th style={{ width: '120px' }}>상태</th>
                              <th>제목</th>
                              <th style={{ width: '150px' }}>작성일</th>
                              <th style={{ width: '120px' }}>작성자</th>
                              {isAdminUser && <th style={{ width: '120px' }}>관리</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {currentNotices.map((notice, index) => (
                              <tr key={notice.id} className={notice.isImportant ? 'important-row' : ''}>
                                <td>{filteredNotices.length - startIndex - index}</td>
                                <td>
                                  {notice.isImportant && <span className="status-badge important-badge">중요</span>}
                                  {!notice.isImportant && <span className="status-badge">일반</span>}
                                </td>
                                <td className="notice-title-cell">
                                  <span 
                                    className="notice-title-link"
                                    onClick={() => {
                                      setEditingNotice(notice);
                                      setShowForm(false);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    {notice.title}
                                  </span>
                                  {notice.updatedAt && notice.updatedAt.getTime() !== notice.createdAt.getTime() && (
                                    <span className="updated-indicator">수정됨</span>
                                  )}
                                </td>
                                <td>{formatDate(notice.createdAt)}</td>
                                <td>{notice.authorName || '관리자'}</td>
                                {isAdminUser && (
                                  <td>
                                    <div className="table-actions">
                                      <button
                                        className="btn-edit-small"
                                        onClick={() => handleEditNotice(notice)}
                                        title="수정"
                                      >
                                        <EditIcon size={16} />
                                      </button>
                                      <button
                                        className="btn-delete-small"
                                        onClick={() => handleDeleteNotice(notice.id)}
                                        title="삭제"
                                      >
                                        <TrashIcon size={16} />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {totalPages > 1 && (
                        <div className="pagination">
                          <button
                            className="pagination-btn"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            &lt;
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            className="pagination-btn"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            &gt;
                          </button>
                        </div>
                      )}

                      {editingNotice && !showForm && (
                        <div className="notice-detail-modal">
                          <div className="notice-detail-content">
                            <div className="notice-detail-header">
                              <h3>{editingNotice.title}</h3>
                              <button className="close-btn" onClick={() => setEditingNotice(null)}>×</button>
                            </div>
                            <div className="notice-detail-info">
                              <span>작성일: {formatDate(editingNotice.createdAt)}</span>
                              {editingNotice.updatedAt && editingNotice.updatedAt.getTime() !== editingNotice.createdAt.getTime() && (
                                <span>수정일: {formatDate(editingNotice.updatedAt)}</span>
                              )}
                              <span>작성자: {editingNotice.authorName || '관리자'}</span>
                            </div>
                            <div 
                              className="notice-detail-body"
                              dangerouslySetInnerHTML={{ __html: editingNotice.content }}
                            />
                            {isAdminUser && (
                              <div className="notice-detail-actions">
                                <button
                                  className="btn-edit"
                                  onClick={() => {
                                    handleEditNotice(editingNotice);
                                    setShowForm(true);
                                  }}
                                  title="수정"
                                >
                                  <EditIcon size={14} /> 수정
                                </button>
                                <button
                                  className="btn-delete"
                                  onClick={() => handleDeleteNotice(editingNotice.id)}
                                  title="삭제"
                                >
                                  <TrashIcon size={14} /> 삭제
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="guide-section">
              <h2>이용안내</h2>
              <div className="guide-text">
                <h3>1. 회원가입 및 로그인</h3>
                <p>이메일을 이용하여 회원가입 및 로그인을 진행할 수 있습니다.</p>
                
                <h3>2. 포인트 충전</h3>
                <p>문제 생성을 위해서는 포인트가 필요합니다. 최소 1,000원부터 충전 가능하며, 1원 = 1포인트 비율로 충전됩니다.</p>
                <p><strong>포인트 충전 경로:</strong> 상단 네비게이션바의 "포인트구매" 메뉴를 통해 포인트를 충전할 수 있습니다. 1회 최대 충전 금액은 10만원입니다.</p>
                <p><strong>충전금액 사용 용도:</strong> 충전된 포인트는 영어 문제 생성 서비스 이용을 위해 사용됩니다.</p>
                <p><strong>충전 후 결제 사용 경로:</strong> 상단 네비게이션바의 "문제생성" 메뉴에서 다양한 유형의 영어 문제를 생성할 수 있으며, 문제 생성 시 포인트가 차감됩니다.</p>
                
                <h3>3. 문제 생성</h3>
                <p>다양한 유형의 영어 문제를 생성할 수 있습니다:</p>
                <ul>
                  <li>문단 순서 맞추기</li>
                  <li>독해 문제</li>
                  <li>빈칸 채우기</li>
                  <li>어법 오류 찾기</li>
                  <li>단어 학습</li>
                  <li>그 외 다양한 유형</li>
                </ul>
                
                <h3>4. 문제 생성 비용</h3>
                <p>문제 유형에 따라 포인트가 다르게 차감됩니다. 각 문제 유형별 포인트는 문제 생성 시 확인할 수 있습니다.</p>
                
                <h3>5. 생성된 문제 확인</h3>
                <p>"나의문제목록" 메뉴에서 생성된 문제들을 확인하고, PDF로 다운로드할 수 있습니다.</p>
                <p><strong>주의사항:</strong> 생성된 문제는 생성일로부터 6개월 동안만 확인 및 다운로드 가능하며, 6개월이 지난 내역은 자동으로 삭제됩니다.</p>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="guide-section">
              <h2>이용약관</h2>
              <div className="guide-text">
                <p><strong>시행일자:</strong> 2025년 08월 01일</p>

                <h3>제1조 (목적)</h3>
                <p>이 약관은 회원이 영어 문제 생성 웹사이트(이하 "플랫폼")에서 제공하는 서비스(문제 생성 및 다운로드 포함)를 이용함에 있어 회사와 회원 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>

                <h3>제2조 (정의)</h3>
                <p>이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
                <ul>
                  <li>① "서비스"라 함은 구현되는 단말기(PC, TV, 휴대형단말기 등의 각종 유무선 장치를 포함)와 상관없이 "회원"이 이용할 수 있는 "플랫폼" 및 관련 제반 서비스를 의미합니다.</li>
                  <li>② "회원"이란 플랫폼에 가입하여 이 약관에 따라 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
                  <li>③ "포인트"란 회사가 제공하는 서비스를 유료로 이용하기 위해 회원이 구매하거나 지급받은 가상의 결제 수단을 의미합니다.</li>
                  <li>④ "문제 생성 서비스"란 회원이 제공한 텍스트를 기반으로 회사가 AI 등을 통해 영어 문제를 자동 생성하고 PDF 파일로 제공하는 서비스를 의미합니다.</li>
                </ul>

                <h3>제3조 (약관의 게시와 개정)</h3>
                <ul>
                  <li>① "회사"는 이 약관의 내용을 "회원"이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.</li>
                  <li>② "회사"는 "약관의규제에관한법률", "정보통신망이용촉진및정보보호등에관한법률(이하 "정보통신망법")" 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.</li>
                  <li>③ "회사"가 약관을 개정할 경우에는 지체없이 적용일자 및 주요 개정 사유를 명시하여 서비스 내에 공지합니다.</li>
                </ul>

                <h3>제4조 (포인트 이용 및 환불)</h3>
                <ul>
                  <li>① "포인트"는 문제 생성 서비스를 사용하기 위하여 이용되는 결제 수단으로 신용카드, 계좌이체 등의 결제 과정을 거쳐 충전이 가능합니다.</li>
                  <li>② "회원"은 "회사"가 정하는 절차와 조건에 따라 서비스 이용 시 "포인트"를 사용할 수 있습니다.</li>
                  <li>③ "충전된 포인트"의 이용기간과 환불가능기간은 결제시점으로부터 1년 이내로 제한됩니다.</li>
                  <li>④ "회원"은 "포인트"를 본인의 거래에 대해서만 사용할 수 있으며, 어떠한 경우라도 타인에게 매매 또는 양도할 수 없습니다.</li>
                  <li>⑤ "포인트"의 환불 정책은 각 "포인트"의 적립 조건에 따라 정해진 정책을 따르며 환불 요청 후 업무일 기준 15일 이내에 환불처리를 합니다.</li>
                  <li>⑥ 포인트를 구매한 후, 미사용한 포인트에 대해 결제 취소 및 환불을 진행할 수 있습니다.</li>
                  <li>⑦ 미사용 포인트는 구매 시점(충전일)에 결제된 금액에 따라 취소 및 전액환불, 또는 90% 환불됩니다.</li>
                  <li>⑧ 이미 사용한 포인트는 취소 및 환불이 불가능합니다.</li>
                  <li>⑨ "회사"의 귀책사유로 결제 오류가 발생한 경우, "회원"은 결제에 대한 취소 및 환불을 요구할 수 있습니다.</li>
                  <li>⑩ "회사"의 귀책사유로 서비스가 중단되는 경우, "회원"은 결제에 대한 취소 및 환불을 요구할 수 있습니다.</li>
                  <li>⑪ "포인트" 환불은 꼭 결제가 되었던 수단(신용카드, 계좌이체 등)으로 진행되어야 합니다.</li>
                  <li>⑫ 충전형 상품은 카드사에서 결제 금액을 일정 금액 이하로 제한할 수 있으며, 일부 카드사 이용이 불가할 수 있습니다.</li>
                  <li>⑬ 충전형 상품은 카카오페이, 네이버페이, 페이코, 토스페이를 제외한 간편결제 이용이 불가능합니다.</li>
                </ul>

                <h3>제5조 (서비스의 제공 등)</h3>
                <ul>
                  <li>① "회사"는 "회원"에게 문제 생성 플랫폼 서비스를 제공합니다.</li>
                  <li>② "서비스"는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.</li>
                  <li>③ "회사"는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 또는 운영상 상당한 이유가 있는 경우 "서비스"의 제공을 일시적으로 중단할 수 있습니다.</li>
                </ul>

                <p><strong>[부칙]</strong></p>
                <p>이 약관은 2025년 08월 01일부터 시행합니다.</p>
              </div>
            </div>
          )}

          {activeTab === 'refund' && (
            <div className="guide-section">
              <h2>환불/취소안내</h2>
              <div className="guide-text">
                <h3>환불 정책</h3>
                <p>가. "포인트"의 환불 정책은 각 "포인트"의 적립 조건에 따라 정해진 정책을 따르며 환불 요청 후 업무일 기준 15일 이내에 환불처리를 합니다.</p>
                <p>나. 포인트를 구매한 후, 미사용한 포인트에 대해 결제 취소 및 환불을 진행할 수 있습니다.</p>
                <p>다. 미사용 포인트는 구매 시점(충전일)에 결제된 금액에 따라 취소 및 전액환불, 또는 90% 환불됩니다. (1. 직접 충전한 포인트의 환불 참조)</p>
                <p>라. 이미 사용한 포인트는 취소 및 환불이 불가능합니다.</p>
                <p>마. 회사의 귀책사유로 결제 오류가 발생한 경우, 결제에 대한 취소 및 환불을 요구할 수 있습니다.</p>
                <p>사. 회사의 귀책사유로 서비스가 중단되는 경우, 결제에 대한 취소 및 환불을 요구할 수 있습니다.</p>
                
                <h3>1. 직접 충전한 포인트의 환불</h3>
                <ul>
                  <li><strong>충전일로부터 3일 이내 환불 신청 시:</strong> 잔여 환불대상 금액의 100% 환불 가능합니다.</li>
                  <li><strong>충전일로부터 3일 초과하여 환불 신청 시:</strong> 잔여 환불대상 금액의 90% 환불합니다.</li>
                  <li><strong>환불 수단:</strong> 환불은 꼭 결제가 되었던 수단(신용카드, 계좌이체 등)으로 진행됩니다.</li>
                </ul>
                
                <h3>2. 무상으로 제공받은 포인트</h3>
                <p>"회원"이 "회사"로부터 "포인트"를 무상으로 제공받은 경우 환불할 수 없으며, "회사"는 그 기한과 이용 방법을 별도로 정할 수 있습니다.</p>
                
                <h3>3. 환불 신청 방법</h3>
                <p>환불을 원하시는 경우 Feedback 메뉴를 통해 문의해 주시기 바랍니다. 환불 신청 시 다음 정보를 포함해 주세요:</p>
                <ul>
                  <li>회원 정보 (이메일 주소)</li>
                  <li>충전 일시 및 금액</li>
                  <li>결제 수단 (신용카드/계좌이체 등)</li>
                  <li>환불 사유</li>
                </ul>
                
                <h3>4. 환불 처리 기간</h3>
                <p>환불 신청 후 업무일 기준 15일 이내에 환불 처리가 완료됩니다.</p>
                
                <h3>5. 환불 불가 사항</h3>
                <ul>
                  <li>이미 사용한 포인트는 환불되지 않습니다.</li>
                  <li>무상으로 제공받은 포인트는 환불되지 않습니다.</li>
                  <li>부당 또는 부정하게 취득한 포인트는 환불되지 않습니다.</li>
                  <li>결제시점으로부터 1년이 경과한 포인트는 환불되지 않습니다.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="guide-section">
              <h2>개인정보취급방침</h2>
              <div className="guide-text">
                <p><strong>시행일자:</strong> 2025년 08월 01일</p>

                <h3>1. 개인정보의 수집 및 이용 목적</h3>
                <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다:</p>
                <ul>
                  <li>서비스 제공 및 계약의 이행: 문제 생성 서비스 제공, 본인 확인, 포인트 충전 및 사용</li>
                  <li>회원 관리: 회원제 서비스 이용에 따른 본인 확인, 개인 식별, 불량 회원의 부정 이용 방지</li>
                  <li>서비스 개선: 신규 서비스 개발 및 맞춤 서비스 제공, 서비스 품질 향상</li>
                </ul>

                <h3>2. 수집하는 개인정보의 항목</h3>
                <p>회사는 다음의 개인정보 항목을 수집합니다:</p>
                <ul>
                  <li>필수 항목: 이메일 주소, 비밀번호</li>
                  <li>선택 항목: 닉네임, 전화번호</li>
                  <li>자동 수집 항목: IP 주소, 쿠키, 접속 로그, 기기 정보</li>
                </ul>

                <h3>3. 개인정보의 보유 및 이용 기간</h3>
                <ul>
                  <li>회원 탈퇴 시까지 보유 및 이용합니다.</li>
                  <li>단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</li>
                  <li>결제 정보는 전자상거래법에 따라 5년간 보관합니다.</li>
                </ul>

                <h3>4. 개인정보의 제3자 제공</h3>
                <p>회사는 원칙적으로 회원의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:</p>
                <ul>
                  <li>회원이 사전에 동의한 경우</li>
                  <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                </ul>

                <h3>5. 개인정보의 처리 위탁</h3>
                <p>회사는 서비스 향상을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:</p>
                <ul>
                  <li>결제 처리: 토스페이먼츠 (결제 정보 처리)</li>
                  <li>클라우드 서비스: Firebase (데이터 저장 및 관리)</li>
                </ul>

                <h3>6. 회원의 권리와 그 행사방법</h3>
                <ul>
                  <li>회원은 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있습니다.</li>
                  <li>회원은 언제든지 개인정보 처리의 정지를 요구할 수 있으며, 회사는 지체 없이 조치하겠습니다.</li>
                  <li>회원은 언제든지 회원 탈퇴를 통해 개인정보의 수집 및 이용 동의를 철회할 수 있습니다.</li>
                </ul>

                <h3>7. 개인정보의 파기</h3>
                <p>회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>

                <h3>8. 개인정보 보호책임자</h3>
                <p>개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
                <ul>
                  <li>이메일: support@edgeenglish.net</li>
                  <li>문의: Feedback 메뉴를 통해 문의해 주시기 바랍니다.</li>
                </ul>

                <h3>9. 개인정보 처리방침 변경</h3>
                <p>이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuidePage;

