'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/AuthContext';
import { FiLogOut, FiFileText, FiDownload, FiCheckCircle } from 'react-icons/fi';

export default function CandidateDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mcqData, setMcqData] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // If not logged in, or not a candidate, boot them
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.dbRole !== 'Candidate') {
      router.push('/'); // send to their normal dashboard
      return;
    }

    const fetchTest = async () => {
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
      }
    };

    fetchTest();
  }, [user, router]);

  if (!user || user.dbRole !== 'Candidate') return null;

  return (
    <div style={{ width: '100%', flex: 1, minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* Navbar */}
      <nav style={{ background: '#0f172a', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '35px', height: '35px', background: '#06b6d4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
            {user.name?.charAt(0)}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>{user.name}</h2>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Candidate Assessment Portal</p>
          </div>
        </div>
        <button onClick={logout} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
          <FiLogOut /> Logout
        </button>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ background: '#fff', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: '1.5rem', fontWeight: '800' }}>Welcome to your Assessment</h1>
          <p style={{ color: '#64748b', margin: 0, lineHeight: '1.5' }}>
            Please review the instructions below carefully. This environment is monitored and your time is recorded from your first login. Good luck!
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading your test module...</div>
        ) : test ? (
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
                
                {test.status === 'Completed' ? (
                   <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                     <FiCheckCircle style={{ fontSize: '2rem', marginBottom: '10px' }} />
                     <h3 style={{ margin: '0 0 5px' }}>Assessment Completed</h3>
                     <p style={{ margin: 0 }}>You have successfully completed this test. HR will review your results.</p>
                   </div>
                ) : (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (Object.keys(answers).length < mcqData.length) {
                      alert('Please answer all questions before submitting.');
                      return;
                    }
                    if (!confirm('Are you sure you want to submit your test? This action cannot be undone.')) return;
                    setSubmitting(true);
                    try {
                      const res = await fetch('/api/candidates/submit-test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ testId: test.id, candidateId: user.id, candidateAnswers: answers })
                      });
                      const data = await res.json();
                      if (data.success) {
                         alert('Test submitted successfully!');
                         window.location.reload();
                      } else {
                         alert(data.error || 'Failed to submit test');
                      }
                    } catch (err) {
                      alert('Network error during submission.');
                    } finally {
                      setSubmitting(false);
                    }
                  }}>
                    {mcqData.map((q, idx) => (
                      <div key={idx} style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 15px', color: '#1e293b', fontSize: '1rem' }}>
                          <span style={{ color: '#06b6d4', marginRight: '8px' }}>Q{idx + 1}.</span> {q.question}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {q.options.map((opt, optIdx) => (
                            <label key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                              <input 
                                type="radio" 
                                name={`question-${idx}`} 
                                value={optIdx}
                                checked={answers[idx] === optIdx}
                                onChange={() => setAnswers({...answers, [idx]: optIdx})}
                              />
                              <span style={{ color: '#475569', fontSize: '0.95rem' }}>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    <button type="submit" disabled={submitting} style={{ background: '#06b6d4', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', width: '100%', marginTop: '20px', boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)' }}>
                      {submitting ? 'Submitting...' : 'Submit Assessment'}
                    </button>
                  </form>
                )}
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
