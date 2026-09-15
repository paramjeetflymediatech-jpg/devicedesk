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
