'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/AuthContext';
import { 
  FiLogOut, 
  FiFileText, 
  FiDownload, 
  FiCheckCircle, 
  FiClock, 
  FiAward, 
  FiAlertCircle, 
  FiRefreshCw, 
  FiChevronDown, 
  FiChevronUp,
  FiCheck,
  FiX
} from 'react-icons/fi';
import Swal from 'sweetalert2';

export default function CandidateDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mcqData, setMcqData] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [showDetailedReview, setShowDetailedReview] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTest = useCallback(async (isManualRefresh = false) => {
    if (!user?.id) return;
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await fetch(`/api/candidates/me?candidateId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setTest(data.test);
        if (data.test && data.test.test_type === 'mcq') {
          try {
            setMcqData(typeof data.test.test_data === 'string' ? JSON.parse(data.test.test_data) : data.test.test_data || []);
          } catch (e) {
            console.error('Failed to parse MCQ data');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching test:', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.dbRole !== 'Candidate') {
      router.push('/');
      return;
    }
    fetchTest();
  }, [user, router, fetchTest]);

  if (!mounted || !user || user.dbRole !== 'Candidate') return null;

  // Determine if candidate has submitted the test
  const isSubmitted = test && test.status && test.status !== 'Pending';

  // Compute MCQ Metrics
  const correctCount = mcqData.filter(q => q.isCorrect === true).length;
  const wrongCount = mcqData.filter(q => q.isCorrect === false).length;
  const totalCount = mcqData.length || (correctCount + wrongCount);
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  // Evaluation Status Theme Mapping
  const getEvaluationConfig = () => {
    const s = (test?.status || '').toLowerCase();
    if (s === 'selected' || s === 'passed') {
      return {
        badge: 'CONFIRMED & SELECTED',
        title: 'HR Evaluation Confirmed: Selected 🎉',
        desc: 'Congratulations! The HR recruitment team has evaluated your assessment and confirmed your selection for the next round.',
        bg: '#ecfdf5',
        borderColor: '#10b981',
        textColor: '#065f46',
        badgeBg: '#10b981',
        icon: <FiAward style={{ fontSize: '2.5rem', color: '#10b981' }} />,
        grade: accuracy >= 85 ? 'Outstanding (Top Tier)' : 'Passed (Meets Standard)'
      };
    }
    if (s === 'under review') {
      return {
        badge: 'HR REVIEW IN PROGRESS',
        title: 'Assessment Under HR Evaluation ⏳',
        desc: 'Your test results are currently being reviewed by the HR recruitment team. Decisions will be updated here shortly.',
        bg: '#eff6ff',
        borderColor: '#3b82f6',
        textColor: '#1e40af',
        badgeBg: '#3b82f6',
        icon: <FiClock style={{ fontSize: '2.5rem', color: '#3b82f6' }} />,
        grade: 'Under Evaluation'
      };
    }
    if (s === 'rejected') {
      return {
        badge: 'EVALUATION FINALIZED',
        title: 'HR Evaluation: Application Concluded',
        desc: 'Thank you for taking the time to complete our assessment. While this role was not matched, your profile has been retained in our talent pool.',
        bg: '#fef2f2',
        borderColor: '#ef4444',
        textColor: '#991b1b',
        badgeBg: '#ef4444',
        icon: <FiAlertCircle style={{ fontSize: '2.5rem', color: '#ef4444' }} />,
        grade: 'Evaluated'
      };
    }
    if (s === 'evaluated') {
      return {
        badge: 'EVALUATED BY HR',
        title: 'HR Evaluation Completed 📋',
        desc: 'The HR team has finished evaluating your assessment performance. Check below for confirmation notes and performance metrics.',
        bg: '#eef2ff',
        borderColor: '#6366f1',
        textColor: '#3730a3',
        badgeBg: '#6366f1',
        icon: <FiCheckCircle style={{ fontSize: '2.5rem', color: '#6366f1' }} />,
        grade: accuracy >= 70 ? 'Satisfactory' : 'Completed'
      };
    }
    // Completed / Submitted / Default
    return {
      badge: 'SUBMITTED TO HR',
      title: 'Assessment Submitted - Awaiting HR Confirmation 🕒',
      desc: 'Your assessment was submitted successfully. The HR team has received your score and will confirm your evaluation status shortly.',
      bg: '#fffbeb',
      borderColor: '#f59e0b',
      textColor: '#92400e',
      badgeBg: '#f59e0b',
      icon: <FiCheckCircle style={{ fontSize: '2.5rem', color: '#f59e0b' }} />,
      grade: accuracy >= 85 ? 'High Performance' : accuracy >= 70 ? 'Good' : 'Submitted'
    };
  };

  const evalConfig = getEvaluationConfig();

  return (
    <div style={{ width: '100%', flex: 1, minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* Navbar */}
      <nav style={{ background: '#0f172a', padding: '15px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg, #06b6d4, #2563eb)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>
            {user.name?.charAt(0) || 'C'}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: '700' }}>{user.name}</h2>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Candidate ID: {user.id} • Candidate Portal</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => fetchTest(true)} 
            disabled={refreshing}
            style={{ 
              background: 'rgba(255,255,255,0.08)', 
              border: '1px solid rgba(255,255,255,0.15)', 
              color: '#fff', 
              padding: '8px 14px', 
              borderRadius: '8px', 
              cursor: refreshing ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.85rem' 
            }}
          >
            <FiRefreshCw style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Updating...' : 'Check HR Status'}
          </button>
          <button onClick={logout} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
            <FiLogOut /> Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '24px 20px', maxWidth: '880px', margin: '0 auto', width: '100%' }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
            <FiRefreshCw style={{ fontSize: '2rem', color: '#06b6d4', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>Loading Assessment Status...</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Retrieving your test records and HR evaluation status</p>
          </div>
        ) : test ? (
          <>
            {/* ======================================================== */}
            {/* EVALUATION / SUBMITTED PERFORMANCE SCREEN                */}
            {/* ======================================================== */}
            {isSubmitted ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. Executive HR Status Banner */}
                <div style={{ 
                  background: evalConfig.bg, 
                  border: `2px solid ${evalConfig.borderColor}`, 
                  borderRadius: '16px', 
                  padding: '28px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                      <div style={{ padding: '4px' }}>
                        {evalConfig.icon}
                      </div>
                      <div>
                        <div style={{ 
                          display: 'inline-block', 
                          background: evalConfig.badgeBg, 
                          color: '#fff', 
                          padding: '3px 10px', 
                          borderRadius: '20px', 
                          fontSize: '0.75rem', 
                          fontWeight: '800', 
                          letterSpacing: '0.5px',
                          marginBottom: '8px' 
                        }}>
                          {evalConfig.badge}
                        </div>
                        <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: '800', color: evalConfig.textColor }}>
                          {evalConfig.title}
                        </h2>
                        <p style={{ margin: 0, color: evalConfig.textColor, fontSize: '0.95rem', lineHeight: '1.5', maxWidth: '640px' }}>
                          {evalConfig.desc}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => fetchTest(true)}
                      style={{ 
                        background: '#fff', 
                        border: `1.5px solid ${evalConfig.borderColor}`, 
                        color: evalConfig.textColor, 
                        padding: '8px 16px', 
                        borderRadius: '8px', 
                        fontSize: '0.85rem', 
                        fontWeight: '700', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        alignSelf: 'flex-start'
                      }}
                    >
                      <FiRefreshCw style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh Status
                    </button>
                  </div>

                  {/* Submission and Evaluation Timestamps */}
                  <div style={{ 
                    marginTop: '20px', 
                    paddingTop: '16px', 
                    borderTop: `1px solid ${evalConfig.borderColor}44`, 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '20px', 
                    fontSize: '0.85rem', 
                    color: evalConfig.textColor 
                  }}>
                    <div>
                      <strong>Test:</strong> {test.test_title}
                    </div>
                    {test.submitted_at && (
                      <div>
                        <strong>Submitted:</strong> {new Date(test.submitted_at).toLocaleString()}
                      </div>
                    )}
                    {test.evaluated_at && (
                      <div>
                        <strong>HR Evaluated:</strong> {new Date(test.evaluated_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Official HR Feedback Box (If provided by HR) */}
                {test.feedback ? (
                  <div style={{ 
                    background: '#fff', 
                    border: '1.5px solid #cbd5e1', 
                    borderRadius: '16px', 
                    padding: '24px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '1.3rem' }}>💬</span>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                        Official HR Evaluation Feedback
                      </h3>
                    </div>
                    <div style={{ 
                      background: '#f8fafc', 
                      borderLeft: '4px solid #2563eb', 
                      padding: '16px 20px', 
                      borderRadius: '0 12px 12px 0',
                      fontStyle: 'italic',
                      color: '#1e293b',
                      fontSize: '0.95rem',
                      lineHeight: '1.6'
                    }}>
                      "{test.feedback}"
                    </div>
                    {test.evaluated_at && (
                      <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: '#64748b', textAlign: 'right' }}>
                        Recorded by Recruitment Team on {new Date(test.evaluated_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div style={{ 
                    background: '#fff', 
                    border: '1px dashed #cbd5e1', 
                    borderRadius: '12px', 
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#64748b',
                    fontSize: '0.9rem'
                  }}>
                    <FiClock style={{ fontSize: '1.2rem', color: '#f59e0b' }} />
                    <span>HR has received your submission. Individual qualitative feedback will appear here once finalized.</span>
                  </div>
                )}

                {/* 3. Performance Scorecard (MCQ) */}
                {test.test_type === 'mcq' && (
                  <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                      Assessment Performance Breakdown
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                      
                      {/* Overall Accuracy */}
                      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: accuracy >= 70 ? '#10b981' : '#f59e0b' }}>
                          {accuracy}%
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginTop: '4px' }}>
                          Accuracy Rate
                        </div>
                      </div>

                      {/* Score Fraction */}
                      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#2563eb' }}>
                          {correctCount} / {totalCount}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginTop: '4px' }}>
                          Score
                        </div>
                      </div>

                      {/* Correct Answers */}
                      <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '20px', borderRadius: '12px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#10b981' }}>
                          {correctCount}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#047857', textTransform: 'uppercase', marginTop: '4px' }}>
                          Correct Answers
                        </div>
                      </div>

                      {/* Incorrect Answers */}
                      <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '20px', borderRadius: '12px', border: '1px solid #fecaca', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#ef4444' }}>
                          {wrongCount}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase', marginTop: '4px' }}>
                          Incorrect Answers
                        </div>
                      </div>

                    </div>

                    {/* Performance Benchmark Bar */}
                    <div style={{ background: '#f1f5f9', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Performance Rating: </span>
                        <span style={{ 
                          fontSize: '0.9rem', 
                          fontWeight: '800', 
                          color: accuracy >= 85 ? '#059669' : accuracy >= 70 ? '#2563eb' : '#d97706',
                          background: accuracy >= 85 ? '#d1fae5' : accuracy >= 70 ? '#dbeafe' : '#fef3c7',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          marginLeft: '6px'
                        }}>
                          {accuracy >= 85 ? '🏆 Outstanding (Above 85%)' : accuracy >= 70 ? '🌟 Good Standard (70-84%)' : accuracy >= 50 ? '👍 Satisfactory (50-69%)' : '⚠️ Below Benchmark'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Benchmark Pass Threshold: 70%
                      </span>
                    </div>

                    {/* Detailed Question Review Toggle */}
                    {mcqData.length > 0 && (
                      <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                        <button
                          onClick={() => setShowDetailedReview(!showDetailedReview)}
                          style={{
                            width: '100%',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.9rem',
                            fontWeight: '700',
                            color: '#334155'
                          }}
                        >
                          <span>Review Question-by-Question Answers ({mcqData.length} questions)</span>
                          {showDetailedReview ? <FiChevronUp /> : <FiChevronDown />}
                        </button>

                        {showDetailedReview && (
                          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {mcqData.map((q, qIdx) => {
                              const isCorrect = q.isCorrect === true;
                              return (
                                <div 
                                  key={qIdx} 
                                  style={{ 
                                    background: '#fff', 
                                    border: `1.5px solid ${isCorrect ? '#10b981' : '#ef4444'}`, 
                                    borderRadius: '12px', 
                                    padding: '18px',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)' 
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                                      Question {qIdx + 1} • {q.category || 'General'}
                                    </span>
                                    <span style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '4px', 
                                      fontSize: '0.8rem', 
                                      fontWeight: '800', 
                                      color: isCorrect ? '#059669' : '#dc2626',
                                      background: isCorrect ? '#ecfdf5' : '#fef2f2',
                                      padding: '3px 8px',
                                      borderRadius: '6px'
                                    }}>
                                      {isCorrect ? <><FiCheck /> Correct</> : <><FiX /> Incorrect</>}
                                    </span>
                                  </div>

                                  <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', lineHeight: '1.5' }}>
                                    {q.question}
                                  </h4>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {(q.options || []).map((opt, optIdx) => {
                                      const isChosen = q.candidateChoice === optIdx;
                                      const isRightAnswer = q.correctIndex === optIdx;
                                      
                                      let optBg = '#f8fafc';
                                      let optBorder = '#e2e8f0';
                                      let optColor = '#475569';

                                      if (isRightAnswer) {
                                        optBg = '#ecfdf5';
                                        optBorder = '#10b981';
                                        optColor = '#065f46';
                                      } else if (isChosen && !isRightAnswer) {
                                        optBg = '#fef2f2';
                                        optBorder = '#ef4444';
                                        optColor = '#991b1b';
                                      }

                                      return (
                                        <div 
                                          key={optIdx}
                                          style={{
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            background: optBg,
                                            border: `1px solid ${optBorder}`,
                                            color: optColor,
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                          }}
                                        >
                                          <span>{opt}</span>
                                          {isChosen && (
                                            <span style={{ fontSize: '0.75rem', fontWeight: '800', background: optBorder, color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                                              Your Choice
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Hiring Process Stage Roadmap */}
                <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                    Recruitment Stage Roadmap
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    {/* Stage 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '16px', backgroundColor: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        ✓
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>1. Registration & Assessment Assignment</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Account credentials issued and test module assigned.</div>
                      </div>
                    </div>

                    {/* Stage 2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '16px', backgroundColor: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        ✓
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>2. Assessment Test Completed</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Submitted successfully on {test.submitted_at ? new Date(test.submitted_at).toLocaleDateString() : 'Record'}.
                        </div>
                      </div>
                    </div>

                    {/* Stage 3 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '16px', 
                        backgroundColor: (test.status === 'Selected' || test.status === 'Passed' || test.status === 'Evaluated') ? '#10b981' : '#f59e0b', 
                        color: '#fff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 'bold' 
                      }}>
                        {(test.status === 'Selected' || test.status === 'Passed' || test.status === 'Evaluated') ? '✓' : '3'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
                          3. HR Performance Evaluation & Confirmation
                        </div>
                        <div style={{ fontSize: '0.8rem', color: (test.status === 'Selected' || test.status === 'Passed') ? '#059669' : '#d97706', fontWeight: '600' }}>
                          Current Status: {test.status} {test.evaluated_at ? `(Confirmed on ${new Date(test.evaluated_at).toLocaleDateString()})` : '(Pending HR Review)'}
                        </div>
                      </div>
                    </div>

                    {/* Stage 4 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: (test.status === 'Selected' || test.status === 'Passed') ? 1 : 0.5 }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '16px', 
                        backgroundColor: (test.status === 'Selected' || test.status === 'Passed') ? '#2563eb' : '#cbd5e1', 
                        color: '#fff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 'bold' 
                      }}>
                        4
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>4. Final Interview & Offer Discussion</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {(test.status === 'Selected' || test.status === 'Passed') 
                            ? 'Our team will reach out to schedule your final discussion.' 
                            : 'Unlocked upon HR confirmation.'}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            ) : (
              /* ======================================================== */
              /* ACTIVE TEST TAKING FORM                                  */
              /* ======================================================== */
              <div style={{ background: '#fff', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#06b6d4', marginBottom: '5px' }}>
                    <FiFileText style={{ fontSize: '1.5rem' }} />
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>{test.test_title}</h2>
                  </div>
                  <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Assigned on {new Date(test.created_at).toLocaleDateString()}</p>
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '10px', color: '#334155' }}>Instructions / Task Details</h3>
                  <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '12px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
                    {test.test_instructions}
                  </div>
                </div>

                {test.test_type === 'mcq' ? (
                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '20px', color: '#0f172a' }}>Multiple Choice Assessment</h3>
                    
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (Object.keys(answers).length < mcqData.length) {
                        Swal.fire({
                          title: 'Incomplete Test',
                          text: 'Please answer all questions before submitting.',
                          icon: 'warning',
                          confirmButtonColor: '#06b6d4'
                        });
                        return;
                      }
                      
                      Swal.fire({
                        title: 'Submit Assessment?',
                        text: 'Are you sure you want to submit your test? This will submit your results for HR evaluation.',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#06b6d4',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: 'Yes, submit it!'
                      }).then(async (result) => {
                        if (result.isConfirmed) {
                          setSubmitting(true);
                          try {
                            const res = await fetch('/api/candidates/submit-test', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ testId: test.id, candidateId: user.id, candidateAnswers: answers })
                            });
                            const data = await res.json();
                            if (data.success) {
                              Swal.fire({ 
                                title: 'Assessment Submitted!', 
                                text: 'Your test has been successfully submitted and forwarded to HR for evaluation.', 
                                icon: 'success', 
                                confirmButtonColor: '#06b6d4' 
                              }).then(() => {
                                fetchTest();
                              });
                            } else {
                              Swal.fire('Error', data.error || 'Failed to submit test', 'error');
                            }
                          } catch (err) {
                            Swal.fire('Error', 'Network error during submission.', 'error');
                          } finally {
                            setSubmitting(false);
                          }
                        }
                      });
                    }}>
                      {mcqData.length > 0 && (() => {
                        const idx = currentPage;
                        const q = mcqData[idx];
                        return (
                          <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                              <span style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700' }}>
                                Part: {q.category || 'General'}
                              </span>
                              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
                                Question {idx + 1} of {mcqData.length}
                              </span>
                            </div>
                            
                            <h4 style={{ margin: '0 0 25px', color: '#1e293b', fontSize: '1.15rem', lineHeight: '1.6' }}>
                              {q.question}
                            </h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {q.options.map((opt, optIdx) => (
                                <label key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: answers[idx] === optIdx ? 'rgba(6, 182, 212, 0.05)' : '#fff', padding: '16px', borderRadius: '8px', border: answers[idx] === optIdx ? '2px solid #06b6d4' : '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.2s' }}>
                                  <input 
                                    type="radio" 
                                    name={`question-${idx}`} 
                                    value={optIdx}
                                    checked={answers[idx] === optIdx}
                                    onChange={() => setAnswers({...answers, [idx]: optIdx})}
                                    style={{ transform: 'scale(1.2)' }}
                                  />
                                  <span style={{ color: answers[idx] === optIdx ? '#0f172a' : '#475569', fontSize: '1rem', fontWeight: answers[idx] === optIdx ? '600' : '400' }}>{opt}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', gap: '15px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} disabled={currentPage === 0} style={{ background: '#fff', color: '#64748b', border: '1px solid #cbd5e1', padding: '14px 25px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold', cursor: currentPage === 0 ? 'not-allowed' : 'pointer', opacity: currentPage === 0 ? 0.5 : 1 }}>
                          Previous
                        </button>
                        
                        {currentPage < mcqData.length - 1 ? (
                          <button type="button" onClick={() => setCurrentPage(prev => Math.min(mcqData.length - 1, prev + 1))} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '14px 40px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer' }}>
                            Next
                          </button>
                        ) : (
                          <button type="submit" disabled={submitting} style={{ background: '#06b6d4', color: '#fff', border: 'none', padding: '14px 30px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', flex: 1, marginLeft: 'auto', maxWidth: '250px', boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)' }}>
                            {submitting ? 'Submitting...' : 'Submit Assessment'}
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                ) : (
                  <>
                    {test.file_url && (
                      <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '10px', color: '#334155' }}>Resources</h3>
                        <a href={test.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', padding: '12px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>
                          <FiDownload /> Download Provided Resource
                        </a>
                      </div>
                    )}

                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FiCheckCircle style={{ fontSize: '1.2rem' }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>When you are finished, please submit your work directly to the HR contact via email or as instructed.</span>
                    </div>
                  </>
                )}

              </div>
            )}
          </>
        ) : (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '50px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 10px', color: '#0f172a' }}>No active tests assigned</h3>
            <p style={{ color: '#64748b', margin: 0 }}>HR has not yet assigned a specific test to your profile. Please contact them if you believe this is an error.</p>
          </div>
        )}

      </main>
    </div>
  );
}
