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
  FiX,
  FiChevronLeft,
  FiChevronRight
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
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'correct' | 'wrong'
  const [refreshing, setRefreshing] = useState(false);
  const [showTestBrief, setShowTestBrief] = useState(false);

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
            console.error('Failed to parse MCQ data', e);
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
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : (test?.score || 0);

  // Status Configuration for HR Evaluation
  const getEvaluationConfig = () => {
    const s = (test?.status || '').toLowerCase();
    if (s === 'selected' || s === 'passed') {
      return {
        badge: 'CONFIRMED: SELECTED 🎉',
        title: 'HR Evaluation Confirmed: Selected',
        desc: 'Congratulations! The HR recruitment team has reviewed your assessment and confirmed your selection for the next round.',
        bg: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
        accentBorder: '#10b981',
        textColor: '#ecfdf5',
        badgeBg: '#10b981',
        icon: <FiAward style={{ fontSize: '2.5rem', color: '#34d399' }} />,
        grade: '🏆 Outstanding (Top Candidate)'
      };
    }
    if (s === 'under review') {
      return {
        badge: 'HR REVIEW IN PROGRESS ⏳',
        title: 'Assessment Under HR Review',
        desc: 'Your assessment was received. HR is actively reviewing your answers and candidate profile. Updates will reflect here shortly.',
        bg: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
        accentBorder: '#3b82f6',
        textColor: '#eff6ff',
        badgeBg: '#3b82f6',
        icon: <FiClock style={{ fontSize: '2.5rem', color: '#60a5fa' }} />,
        grade: '⏳ Under Evaluation'
      };
    }
    if (s === 'rejected') {
      return {
        badge: 'EVALUATION FINALIZED',
        title: 'Application Concluded',
        desc: 'Thank you for your effort in completing this assessment. While this position was not matched, your profile remains in our talent records.',
        bg: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
        accentBorder: '#ef4444',
        textColor: '#fef2f2',
        badgeBg: '#ef4444',
        icon: <FiAlertCircle style={{ fontSize: '2.5rem', color: '#f87171' }} />,
        grade: 'Concluded'
      };
    }
    if (s === 'evaluated') {
      return {
        badge: 'EVALUATED BY HR 📋',
        title: 'HR Evaluation Completed',
        desc: 'The HR team has completed evaluating your performance. Review the verified feedback notes and recruitment roadmap below.',
        bg: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)',
        accentBorder: '#6366f1',
        textColor: '#eef2ff',
        badgeBg: '#6366f1',
        icon: <FiCheckCircle style={{ fontSize: '2.5rem', color: '#818cf8' }} />,
        grade: accuracy >= 70 ? '🌟 Good Standard' : 'Evaluated'
      };
    }
    // Submitted / Default
    return {
      badge: 'AWAITING HR CONFIRMATION 🕒',
      title: 'Submitted - Pending HR Confirmation',
      desc: 'Your assessment was submitted successfully. The HR team has your results and will confirm your evaluation remarks shortly.',
      bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      accentBorder: '#f59e0b',
      textColor: '#f8fafc',
      badgeBg: '#f59e0b',
      icon: <FiCheckCircle style={{ fontSize: '2.5rem', color: '#fbbf24' }} />,
      grade: accuracy >= 85 ? '🏆 Outstanding (85%+)' : accuracy >= 70 ? '🌟 Good (70-84%)' : accuracy >= 50 ? '👍 Satisfactory' : '⚠️ Below Benchmark'
    };
  };

  const evalConfig = getEvaluationConfig();
  const isHrEvaluated = !!(test?.feedback || (test?.status && test.status !== 'Completed' && test.status !== 'Pending'));
  const isSelected = test?.status === 'Selected' || test?.status === 'Passed';

  // SVG Radial Ring Metrics
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracy / 100) * circumference;

  // Filtered review questions
  const filteredQuestions = mcqData.filter(q => {
    if (reviewFilter === 'correct') return q.isCorrect === true;
    if (reviewFilter === 'wrong') return q.isCorrect === false;
    return true;
  });

  return (
    <div style={{ width: '100%', flex: 1, minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* Sleek Top Navbar */}
      <nav style={{ 
        background: '#0f172a', 
        padding: '14px 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            background: 'linear-gradient(135deg, #0284c7, #2563eb)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#fff', 
            fontWeight: '800', 
            fontSize: '1.2rem',
            boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)'
          }}>
            {user.name?.charAt(0) || 'C'}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: '800' }}>{user.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                ID: #{user.id}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>• Candidate Assessment Portal</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => fetchTest(true)} 
            disabled={refreshing}
            style={{ 
              background: 'rgba(56, 189, 248, 0.12)', 
              border: '1px solid rgba(56, 189, 248, 0.25)', 
              color: '#38bdf8', 
              padding: '8px 16px', 
              borderRadius: '8px', 
              cursor: refreshing ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.85rem',
              fontWeight: '700',
              transition: 'all 0.2s'
            }}
          >
            <FiRefreshCw style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Updating...' : 'Check HR Status'}
          </button>
          
          <button 
            onClick={logout} 
            style={{ 
              background: 'rgba(239, 68, 68, 0.12)', 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              color: '#fca5a5', 
              padding: '8px 14px', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.85rem', 
              fontWeight: '700',
              transition: 'all 0.2s'
            }}
          >
            <FiLogOut /> Logout
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main style={{ padding: '28px 20px 60px', maxWidth: '920px', margin: '0 auto', width: '100%' }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '70px 20px', background: '#fff', borderRadius: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <FiRefreshCw style={{ fontSize: '2.4rem', color: '#0284c7', animation: 'spin 1s linear infinite', marginBottom: '14px' }} />
            <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontWeight: '800' }}>Loading Assessment Portal...</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Retrieving your test assignment records and live HR evaluation status</p>
          </div>
        ) : test ? (
          <>
            {/* ======================================================== */}
            {/* SUBMITTED / EVALUATION EXPERIENCE                        */}
            {/* ======================================================== */}
            {isSubmitted ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                
                {/* 1. Hero HR Confirmation Status Card */}
                <div style={{ 
                  background: evalConfig.bg, 
                  border: `2px solid ${evalConfig.accentBorder}`, 
                  borderRadius: '20px', 
                  padding: '30px',
                  boxShadow: '0 12px 30px -10px rgba(0,0,0,0.15)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flex: 1, minWidth: '300px' }}>
                      <div style={{ 
                        width: '64px', 
                        height: '64px', 
                        borderRadius: '16px', 
                        background: 'rgba(255,255,255,0.12)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0 
                      }}>
                        {evalConfig.icon}
                      </div>
                      <div>
                        <div style={{ 
                          display: 'inline-block', 
                          background: evalConfig.badgeBg, 
                          color: '#fff', 
                          padding: '4px 12px', 
                          borderRadius: '20px', 
                          fontSize: '0.75rem', 
                          fontWeight: '800', 
                          letterSpacing: '0.6px',
                          marginBottom: '8px' 
                        }}>
                          {evalConfig.badge}
                        </div>
                        <h2 style={{ margin: '0 0 8px', fontSize: '1.45rem', fontWeight: '900', color: evalConfig.textColor, letterSpacing: '-0.3px' }}>
                          {evalConfig.title}
                        </h2>
                        <p style={{ margin: 0, color: evalConfig.textColor, fontSize: '0.95rem', lineHeight: '1.6', opacity: 0.92, maxWidth: '650px' }}>
                          {evalConfig.desc}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => fetchTest(true)}
                      disabled={refreshing}
                      style={{ 
                        background: '#fff', 
                        border: 'none', 
                        color: '#0f172a', 
                        padding: '10px 18px', 
                        borderRadius: '10px', 
                        fontSize: '0.85rem', 
                        fontWeight: '800', 
                        cursor: refreshing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <FiRefreshCw style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', color: '#0284c7' }} />
                      Refresh HR Status
                    </button>
                  </div>

                  {/* Metadata Chips Bar */}
                  <div style={{ 
                    marginTop: '22px', 
                    paddingTop: '16px', 
                    borderTop: '1px solid rgba(255,255,255,0.15)', 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '24px', 
                    fontSize: '0.85rem', 
                    color: evalConfig.textColor 
                  }}>
                    <div>
                      <span style={{ opacity: 0.7, fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '800', display: 'block' }}>TEST TITLE</span>
                      <strong>{test.test_title}</strong>
                    </div>
                    {test.submitted_at && (
                      <div>
                        <span style={{ opacity: 0.7, fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '800', display: 'block' }}>SUBMITTED ON</span>
                        <strong>{new Date(test.submitted_at).toLocaleString()}</strong>
                      </div>
                    )}
                    {test.evaluated_at && (
                      <div>
                        <span style={{ opacity: 0.7, fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '800', display: 'block' }}>HR EVALUATED</span>
                        <strong>{new Date(test.evaluated_at).toLocaleString()}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Executive Performance & Score Metrics */}
                <div style={{ 
                  background: '#fff', 
                  borderRadius: '20px', 
                  padding: '28px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                  border: '1px solid #e2e8f0' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FiAward style={{ fontSize: '1.4rem', color: '#0284c7' }} />
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>
                        Performance Breakdown
                      </h3>
                    </div>
                    <div style={{ 
                      background: 'rgba(2, 132, 199, 0.1)', 
                      color: '#0284c7', 
                      padding: '6px 14px', 
                      borderRadius: '20px', 
                      fontSize: '0.85rem', 
                      fontWeight: '800' 
                    }}>
                      {evalConfig.grade}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'center' }}>
                    
                    {/* Visual Radial Gauge Card */}
                    <div style={{ 
                      background: '#0f172a', 
                      borderRadius: '16px', 
                      padding: '24px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '20px',
                      color: '#fff',
                      boxShadow: '0 8px 18px rgba(15, 23, 42, 0.15)'
                    }}>
                      <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                        <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="45" cy="45" r={radius} stroke="#334155" strokeWidth="8" fill="transparent" />
                          <circle 
                            cx="45" 
                            cy="45" 
                            r={radius} 
                            stroke="#38bdf8" 
                            strokeWidth="8" 
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round" 
                            fill="transparent"
                            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} 
                          />
                        </svg>
                        <div style={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          width: '100%', 
                          height: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexDirection: 'column'
                        }}>
                          <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#38bdf8' }}>{accuracy}%</span>
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase' }}>OVERALL ACCURACY</span>
                        <h4 style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>{correctCount} of {totalCount} Correct</h4>
                      </div>
                    </div>

                    {/* Metric Pills */}
                    <div style={{ 
                      background: '#f8fafc', 
                      borderRadius: '16px', 
                      padding: '22px', 
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '2.2rem', fontWeight: '900', color: '#0f172a' }}>{totalCount}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px', marginTop: '4px', textTransform: 'uppercase' }}>Total Questions</span>
                    </div>

                    <div style={{ 
                      background: '#ecfdf5', 
                      borderRadius: '16px', 
                      padding: '22px', 
                      border: '1.5px solid #10b981',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '2.2rem', fontWeight: '900', color: '#10b981' }}>{correctCount}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#047857', letterSpacing: '0.5px', marginTop: '4px', textTransform: 'uppercase' }}>Correct Answers</span>
                    </div>

                    <div style={{ 
                      background: '#fef2f2', 
                      borderRadius: '16px', 
                      padding: '22px', 
                      border: '1.5px solid #ef4444',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '2.2rem', fontWeight: '900', color: '#ef4444' }}>{wrongCount}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#b91c1c', letterSpacing: '0.5px', marginTop: '4px', textTransform: 'uppercase' }}>Incorrect Answers</span>
                    </div>

                  </div>
                </div>

                {/* 3. Official HR Feedback Box */}
                <div style={{ 
                  background: '#fff', 
                  borderRadius: '20px', 
                  padding: '26px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                  border: '1px solid #e2e8f0' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FiFileText style={{ fontSize: '1.3rem', color: '#0284c7' }} />
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '900', color: '#0f172a' }}>
                        Official HR Evaluation Feedback
                      </h3>
                    </div>
                    {test.evaluated_at && (
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                        Verified on {new Date(test.evaluated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {test.feedback ? (
                    <div style={{ 
                      background: 'rgba(2, 132, 199, 0.04)', 
                      borderLeft: '4px solid #0284c7', 
                      padding: '20px 24px', 
                      borderRadius: '0 14px 14px 0',
                      border: '1px solid rgba(2, 132, 199, 0.15)',
                      borderLeftWidth: '5px'
                    }}>
                      <p style={{ margin: 0, fontSize: '1rem', fontStyle: 'italic', color: '#1e293b', lineHeight: '1.7' }}>
                        “{test.feedback}”
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px', color: '#10b981', fontSize: '0.8rem', fontWeight: '800' }}>
                        <FiCheckCircle /> Recorded by HR Recruitment Coordinator
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      background: '#f8fafc', 
                      borderRadius: '14px', 
                      padding: '20px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '14px', 
                      border: '1px dashed #cbd5e1' 
                    }}>
                      <FiClock style={{ fontSize: '1.5rem', color: '#f59e0b', flexShrink: 0 }} />
                      <div>
                        <h4 style={{ margin: '0 0 2px', fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>HR Review In Progress</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                          Your assessment has been queued for evaluation. Written qualitative remarks from the recruitment team will appear here once finalized.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Hiring Process Stage Roadmap */}
                <div style={{ 
                  background: '#fff', 
                  borderRadius: '20px', 
                  padding: '26px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                  border: '1px solid #e2e8f0' 
                }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '1.15rem', fontWeight: '900', color: '#0f172a' }}>
                    Recruitment Stage Roadmap
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    
                    {/* Stage 1 */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '14px', backgroundColor: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>✓</div>
                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>1. Test Assigned</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                        {test.created_at ? new Date(test.created_at).toLocaleDateString() : 'Issued'}
                      </p>
                    </div>

                    {/* Stage 2 */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '14px', backgroundColor: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>✓</div>
                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>2. Submitted</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                        {test.submitted_at ? new Date(test.submitted_at).toLocaleDateString() : 'Recorded'}
                      </p>
                    </div>

                    {/* Stage 3 */}
                    <div style={{ 
                      background: isHrEvaluated ? '#ecfdf5' : '#eff6ff', 
                      padding: '16px', 
                      borderRadius: '14px', 
                      border: `1.5px solid ${isHrEvaluated ? '#10b981' : '#3b82f6'}` 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '14px', 
                          backgroundColor: isHrEvaluated ? '#10b981' : '#3b82f6', 
                          color: '#fff', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 'bold',
                          fontSize: '0.85rem'
                        }}>
                          {isHrEvaluated ? '✓' : '3'}
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: isHrEvaluated ? '#065f46' : '#1e40af' }}>
                          3. HR Evaluation
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: isHrEvaluated ? '#047857' : '#2563eb', fontWeight: '700' }}>
                        Status: {test.status || 'Pending'}
                      </p>
                    </div>

                    {/* Stage 4 */}
                    <div style={{ 
                      background: isSelected ? '#ecfdf5' : '#f8fafc', 
                      padding: '16px', 
                      borderRadius: '14px', 
                      border: `1.5px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                      opacity: isSelected ? 1 : 0.6 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '14px', 
                          backgroundColor: isSelected ? '#10b981' : '#cbd5e1', 
                          color: '#fff', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 'bold',
                          fontSize: '0.85rem' 
                        }}>
                          {isSelected ? '✓' : '4'}
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
                          4. Interview & Offer
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                        {isSelected ? 'Confirmed! Team will reach out.' : 'Pending HR decision'}
                      </p>
                    </div>

                  </div>
                </div>

                {/* 5. Question-by-Question Review (MCQ) */}
                {test.test_type === 'mcq' && mcqData.length > 0 && (
                  <div style={{ 
                    background: '#fff', 
                    borderRadius: '20px', 
                    padding: '26px', 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                    border: '1px solid #e2e8f0' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ background: '#0284c7', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '800' }}>
                          {mcqData.length}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '900', color: '#0f172a' }}>
                          Question-by-Question Answers
                        </h3>
                      </div>

                      <button
                        onClick={() => setShowDetailedReview(!showDetailedReview)}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          color: '#334155'
                        }}
                      >
                        {showDetailedReview ? 'Hide Questions' : 'Review Questions'}
                        {showDetailedReview ? <FiChevronUp /> : <FiChevronDown />}
                      </button>
                    </div>

                    {showDetailedReview && (
                      <div style={{ marginTop: '20px' }}>
                        {/* Filter tabs */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                          <button
                            onClick={() => setReviewFilter('all')}
                            style={{
                              background: reviewFilter === 'all' ? '#0f172a' : '#f1f5f9',
                              color: reviewFilter === 'all' ? '#fff' : '#64748b',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            All ({mcqData.length})
                          </button>
                          <button
                            onClick={() => setReviewFilter('correct')}
                            style={{
                              background: reviewFilter === 'correct' ? '#10b981' : '#f1f5f9',
                              color: reviewFilter === 'correct' ? '#fff' : '#64748b',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Correct ({correctCount})
                          </button>
                          <button
                            onClick={() => setReviewFilter('wrong')}
                            style={{
                              background: reviewFilter === 'wrong' ? '#ef4444' : '#f1f5f9',
                              color: reviewFilter === 'wrong' ? '#fff' : '#64748b',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Incorrect ({wrongCount})
                          </button>
                        </div>

                        {/* Questions list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {filteredQuestions.map((q, idx) => {
                            const isCorrect = q.isCorrect === true;
                            return (
                              <div 
                                key={idx} 
                                style={{ 
                                  background: '#f8fafc', 
                                  border: `1.5px solid ${isCorrect ? '#a7f3d0' : '#fecaca'}`, 
                                  borderRadius: '14px', 
                                  padding: '18px'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                                    {q.category || `Question ${idx + 1}`}
                                  </span>
                                  <span style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '4px', 
                                    fontSize: '0.8rem', 
                                    fontWeight: '800', 
                                    color: isCorrect ? '#059669' : '#dc2626',
                                    background: isCorrect ? '#d1fae5' : '#fee2e2',
                                    padding: '3px 8px',
                                    borderRadius: '6px'
                                  }}>
                                    {isCorrect ? <><FiCheck /> Correct (+1)</> : <><FiX /> Incorrect (0)</>}
                                  </span>
                                </div>

                                <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', lineHeight: '1.5' }}>
                                  {q.question}
                                </h4>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {(q.options || []).map((opt, optIdx) => {
                                    const isChosen = q.candidateChoice === optIdx;
                                    const isRightAnswer = q.correctIndex === optIdx;
                                    
                                    let optBg = '#fff';
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
                                          <span style={{ fontSize: '0.75rem', fontWeight: '800', background: optBorder, color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>
                                            Your Answer
                                          </span>
                                        )}
                                        {!isChosen && isRightAnswer && (
                                          <span style={{ fontSize: '0.75rem', fontWeight: '800', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>
                                            Correct Answer
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
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Collapsible Original Instructions */}
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <button
                    onClick={() => setShowTestBrief(!showTestBrief)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FiFileText />
                    {showTestBrief ? 'Hide Original Test Instructions' : 'View Original Test Instructions'}
                  </button>

                  {showTestBrief && (
                    <div style={{ 
                      marginTop: '12px', 
                      background: '#fff', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '14px', 
                      padding: '20px', 
                      textAlign: 'left' 
                    }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#0f172a' }}>Task Instructions & Details</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {test.test_instructions}
                      </p>
                      {test.file_url && (
                        <a 
                          href={test.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            marginTop: '12px', 
                            color: '#0284c7', 
                            fontWeight: '700', 
                            fontSize: '0.85rem', 
                            textDecoration: 'none' 
                          }}
                        >
                          <FiDownload /> Download Provided Resource File
                        </a>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* ======================================================== */
              /* ACTIVE TEST TAKING FORM                                  */
              /* ======================================================== */
              <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                
                {/* Header info */}
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0284c7', marginBottom: '6px' }}>
                    <FiFileText style={{ fontSize: '1.6rem' }} />
                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900', color: '#0f172a' }}>{test.test_title}</h2>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Assigned on {new Date(test.created_at).toLocaleDateString()}</p>
                </div>

                {/* Instructions */}
                <div style={{ marginBottom: '28px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', marginBottom: '10px', color: '#334155' }}>Instructions / Task Details</h3>
                  <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
                    {test.test_instructions}
                  </div>
                </div>

                {test.test_type === 'mcq' ? (
                  <div>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (Object.keys(answers).length < mcqData.length) {
                        Swal.fire({
                          title: 'Incomplete Assessment',
                          text: 'Please answer all questions before submitting your test.',
                          icon: 'warning',
                          confirmButtonColor: '#0284c7'
                        });
                        return;
                      }
                      
                      Swal.fire({
                        title: 'Submit Assessment?',
                        text: 'Are you sure you want to finalize your submission? Your score will be calculated and forwarded to HR for evaluation.',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#0284c7',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: 'Yes, Submit Test!'
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
                                title: 'Assessment Submitted! 🎉', 
                                text: 'Your test has been successfully submitted and forwarded to HR for confirmation.', 
                                icon: 'success', 
                                confirmButtonColor: '#0284c7' 
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
                        const progress = ((currentPage + 1) / mcqData.length) * 100;

                        return (
                          <div>
                            {/* Smooth Progress Tracker */}
                            <div style={{ marginBottom: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: '800' }}>
                                  {q.category || 'General'}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>
                                  Question <strong style={{ color: '#0f172a' }}>{idx + 1}</strong> of {mcqData.length}
                                </span>
                              </div>
                              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${progress}%`, height: '100%', background: '#0284c7', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                              </div>
                            </div>
                            
                            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                              <h4 style={{ margin: '0 0 20px', color: '#0f172a', fontSize: '1.15rem', lineHeight: '1.6', fontWeight: '800' }}>
                                {idx + 1}. {q.question}
                              </h4>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {(q.options || []).map((opt, optIdx) => {
                                  const isSelected = answers[idx] === optIdx;
                                  return (
                                    <label 
                                      key={optIdx} 
                                      style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '14px', 
                                        background: isSelected ? '#f0f9ff' : '#fff', 
                                        padding: '16px 20px', 
                                        borderRadius: '12px', 
                                        border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1', 
                                        cursor: 'pointer', 
                                        transition: 'all 0.15s ease' 
                                      }}
                                    >
                                      <input 
                                        type="radio" 
                                        name={`question-${idx}`} 
                                        value={optIdx}
                                        checked={isSelected}
                                        onChange={() => setAnswers({...answers, [idx]: optIdx})}
                                        style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer' }}
                                      />
                                      <span style={{ color: isSelected ? '#0369a1' : '#334155', fontSize: '0.95rem', fontWeight: isSelected ? '700' : '500' }}>
                                        {opt}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Nav buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                        <button 
                          type="button" 
                          onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} 
                          disabled={currentPage === 0} 
                          style={{ 
                            background: '#fff', 
                            color: '#64748b', 
                            border: '1px solid #cbd5e1', 
                            padding: '12px 24px', 
                            borderRadius: '10px', 
                            fontSize: '0.9rem', 
                            fontWeight: '700', 
                            cursor: currentPage === 0 ? 'not-allowed' : 'pointer', 
                            opacity: currentPage === 0 ? 0.4 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <FiChevronLeft /> Previous
                        </button>
                        
                        {currentPage < mcqData.length - 1 ? (
                          <button 
                            type="button" 
                            onClick={() => setCurrentPage(prev => Math.min(mcqData.length - 1, prev + 1))} 
                            style={{ 
                              background: '#0f172a', 
                              color: '#fff', 
                              border: 'none', 
                              padding: '12px 32px', 
                              borderRadius: '10px', 
                              fontSize: '0.9rem', 
                              fontWeight: '700', 
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            Next <FiChevronRight />
                          </button>
                        ) : (
                          <button 
                            type="submit" 
                            disabled={submitting} 
                            style={{ 
                              background: '#0284c7', 
                              color: '#fff', 
                              border: 'none', 
                              padding: '12px 30px', 
                              borderRadius: '10px', 
                              fontSize: '0.95rem', 
                              fontWeight: '800', 
                              cursor: submitting ? 'not-allowed' : 'pointer', 
                              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <FiCheckCircle />
                            {submitting ? 'Submitting...' : 'Submit Assessment'}
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                ) : (
                  <>
                    {test.file_url && (
                      <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: '800', marginBottom: '10px', color: '#334155' }}>Resources</h3>
                        <a 
                          href={test.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            background: 'rgba(2, 132, 199, 0.1)', 
                            color: '#0284c7', 
                            padding: '12px 20px', 
                            borderRadius: '10px', 
                            textDecoration: 'none', 
                            fontWeight: '700',
                            fontSize: '0.9rem' 
                          }}
                        >
                          <FiDownload /> Download Provided Resource
                        </a>
                      </div>
                    )}

                    <div style={{ background: '#ecfdf5', color: '#065f46', padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #a7f3d0' }}>
                      <FiCheckCircle style={{ fontSize: '1.4rem', color: '#10b981' }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                        When you are finished with this assignment, submit your work directly to your HR contact as instructed.
                      </span>
                    </div>
                  </>
                )}

              </div>
            )}
          </>
        ) : (
          <div style={{ background: '#fff', borderRadius: '20px', padding: '60px 30px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            <FiAward style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: '14px' }} />
            <h3 style={{ margin: '0 0 10px', color: '#0f172a', fontWeight: '800' }}>No active tests assigned</h3>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>HR has not yet assigned an assessment to your candidate profile. Please check back soon or contact your recruiter.</p>
          </div>
        )}

      </main>
    </div>
  );
}
