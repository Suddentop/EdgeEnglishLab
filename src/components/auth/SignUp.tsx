import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import PhoneNumberInput from './PhoneNumberInput';
import SEO from '../common/SEO';

const SignUp: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // validation schema 최적화
  const validationSchema = Yup.object({
    name: Yup.string()
      .required('이름을 입력해주세요'),
    nickname: Yup.string()
      .required('닉네임을 입력해주세요')
      .min(2, '닉네임은 최소 2자 이상이어야 합니다'),
    email: Yup.string()
      .email('올바른 이메일 형식이 아닙니다')
      .required('이메일을 입력해주세요'),
    phoneNumber: Yup.string()
      .nullable()
      .matches(/^[0-9]{10,11}$/, '올바른 전화번호 형식이 아닙니다'),
    password: Yup.string()
      .required('비밀번호를 입력해주세요')
      .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
      .matches(/[a-zA-Z]/, '비밀번호는 영문자를 포함해야 합니다')
      .matches(/[0-9]/, '비밀번호는 숫자를 포함해야 합니다')
      .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, '비밀번호는 특수문자를 포함해야 합니다'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], '비밀번호가 일치하지 않습니다')
      .required('비밀번호 확인을 입력해주세요')
  });

  const formik = useFormik({
    initialValues: {
      name: '',
      nickname: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!agreeToTerms) {
        setError('개인정보 수집 및 이용에 동의해주세요');
        return;
      }

      try {
        setError('');
        await signup(values.email, values.password, {
          name: values.name,
          nickname: values.nickname,
          phoneNumber: values.phoneNumber
        });
        navigate('/');
      } catch (err) {
        console.error('회원가입 에러:', err);
        if (err instanceof Error) {
          // Firebase 오류 메시지를 사용자 친화적으로 변환
          let errorMessage = err.message;
          if (err.message.includes('auth/email-already-in-use')) {
            errorMessage = '이미 가입된 이메일입니다.';
          } else if (err.message.includes('auth/weak-password')) {
            errorMessage = '비밀번호가 너무 약합니다.';
          } else if (err.message.includes('auth/invalid-email')) {
            errorMessage = '올바르지 않은 이메일 형식입니다.';
          }
          setError(`회원가입 오류: ${errorMessage}`);
        } else {
          setError('회원가입 중 오류가 발생했습니다');
        }
      }
    }
  });

  // 전화번호 입력 핸들러
  const handlePhoneNumberChange = (value: string) => {
    formik.setFieldValue('phoneNumber', value);
  };

  // 약관 동의 핸들러 최적화
  const handleAgreeToTerms = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAgreeToTerms(e.target.checked);
  };

  return (
    <div className="signup-container">
      <SEO 
        title="회원가입" 
        description="엣지잉글리쉬랩에 무료로 가입하고 AI 영어 문제 생성 도구를 체험해보세요. 선생님을 위한 스마트한 문제 제작 솔루션입니다." 
      />
      <h2>회원가입</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={formik.handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">이름</label>
          <input
            id="name"
            type="text"
            {...formik.getFieldProps('name')}
          />
          {formik.touched.name && formik.errors.name && (
            <div className="error-message">{formik.errors.name}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="nickname">닉네임</label>
          <input
            id="nickname"
            type="text"
            {...formik.getFieldProps('nickname')}
          />
          {formik.touched.nickname && formik.errors.nickname && (
            <div className="error-message">{formik.errors.nickname}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="email">이메일 (로그인 ID로 사용)</label>
          <input
            id="email"
            type="email"
            {...formik.getFieldProps('email')}
            placeholder="이메일을 입력하세요"
          />
          {formik.touched.email && formik.errors.email && (
            <div className="error-message">{formik.errors.email}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="phoneNumber">전화번호 (선택사항)</label>
          <PhoneNumberInput
            id="phoneNumber"
            name="phoneNumber"
            value={formik.values.phoneNumber}
            onChange={handlePhoneNumberChange}
            onBlur={() => formik.handleBlur('phoneNumber')}
            error={formik.errors.phoneNumber}
            touched={formik.touched.phoneNumber}
            required={false}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            {...formik.getFieldProps('password')}
            placeholder="비밀번호를 입력하세요"
          />
          <div className="password-requirement-text">
            *비밀번호는 8자 이상이며, 특수문자, 문자, 숫자를 포함해야 합니다.
          </div>
          {formik.touched.password && formik.errors.password && (
            <div className="error-message">{formik.errors.password}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">비밀번호 확인</label>
          <input
            id="confirmPassword"
            type="password"
            {...formik.getFieldProps('confirmPassword')}
            placeholder="비밀번호를 다시 입력하세요"
          />
          {formik.touched.confirmPassword && formik.errors.confirmPassword && (
            <div className="error-message">{formik.errors.confirmPassword}</div>
          )}
        </div>

        <div className="form-group checkbox">
          <input
            type="checkbox"
            id="agreeToTerms"
            checked={agreeToTerms}
            onChange={handleAgreeToTerms}
          />
          <label htmlFor="agreeToTerms">
            개인정보 수집 및 이용에 동의합니다
          </label>
        </div>

        <div className="terms-content">
          <h4>개인정보 수집 및 이용 동의</h4>
          <p>
            1. 수집하는 개인정보 항목: 이름, 닉네임, 이메일 (필수), 전화번호 (선택)<br />
            2. 수집 및 이용목적: 서비스 제공 및 회원관리<br />
            3. 보유 및 이용기간: 회원 탈퇴 시까지<br />
            4. 동의를 거부할 권리가 있으며, 동의 거부 시 서비스 이용이 제한됩니다.
          </p>
        </div>

        <button type="submit" className="submit-button">
          회원가입
        </button>
      </form>
    </div>
  );
};

export default SignUp; 