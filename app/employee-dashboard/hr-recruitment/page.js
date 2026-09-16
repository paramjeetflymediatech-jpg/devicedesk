'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { FiUsers, FiUserPlus, FiArrowLeft, FiCheck, FiX, FiFileText, FiRefreshCw, FiEye } from 'react-icons/fi';

export default function HrRecruitmentPage() {
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'candidates'
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState([]);
  const [assignedTests, setAssignedTests] = useState([]);
  
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedReg, setSelectedReg] = useState(null);
  const [approveForm, setApproveForm] = useState({
    testType: 'text',
    testTitle: '',
    testInstructions: '',
    fileUrl: '',
    mcqData: []
  });

  const predefinedTemplates = {
    aptitude: [
      { question: 'What is 15% of 80?', options: ['10', '12', '15', '20'], correctIndex: 1 },
      { question: 'If all bloops are razzies and all razzies are lazzies, are all bloops lazzies?', options: ['Yes', 'No', 'Cannot be determined', 'Sometimes'], correctIndex: 0 },
      { question: 'A train travels 60 miles in 1.5 hours. What is its average speed in mph?', options: ['30', '40', '45', '50'], correctIndex: 1 }
    ],
    english: [
      { question: 'Choose the correct synonym for "Abundant":', options: ['Scarce', 'Plentiful', 'Empty', 'Brief'], correctIndex: 1 },
      { question: 'Identify the grammatically correct sentence:', options: ['He don\'t know nothing.', 'She doesn\'t know anything.', 'They hasn\'t known nothing.', 'I doesn\'t know anything.'], correctIndex: 1 },
      { question: 'What is the antonym of "Expand"?', options: ['Enlarge', 'Shrink', 'Grow', 'Develop'], correctIndex: 1 }
    ],
    frontend: [
      { question: 'Which of the following is NOT a valid CSS position property value?', options: ['static', 'absolute', 'relative', 'floating'], correctIndex: 3 },
      { question: 'In React, what hook is used to handle side effects?', options: ['useState', 'useContext', 'useEffect', 'useReducer'], correctIndex: 2 }
    ]
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/candidates/list');
      const data = await res.json();
      if (data.success) {
        setRegistrations(data.registrations || []);
        setAssignedTests(data.tests || []);
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveClick = (reg) => {
    setSelectedReg(reg);
    setApproveForm({ testType: 'text', testTitle: 'Technical Assessment', testInstructions: '', fileUrl: '', mcqData: [] });
    setShowApproveModal(true);
  };

  const submitApprove = async (e) => {
    e.preventDefault();
    if (!approveForm.testTitle) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Test title is required.' });
      return;
    }
    if (approveForm.testType === 'text' && !approveForm.testInstructions) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Test instructions are required.' });
      return;
    }
    if (approveForm.testType === 'mcq' && approveForm.mcqData.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please add at least one MCQ question.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/candidates/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: selectedReg.id,
          ...approveForm
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowApproveModal(false);
        fetchData();
        Swal.fire({
          icon: 'success',
          title: 'Candidate Approved!',
          html: `Temporary Login Details Generated:<br/><br/>
                 <b>Email:</b> ${data.credentials.email}<br/>
                 <b>Password:</b> ${data.credentials.password}<br/><br/>
                 <i>Please copy these details and securely share them with the candidate.</i>`,
          confirmButtonText: 'Got it!'
        });
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Failed to approve.' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Network error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderApplications = () => (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
        <thead style={{ background: 'var(--bg-tertiary)', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
          <tr>
            <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Candidate Name</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Contact</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Experience</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Status</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {registrations.length === 0 ? (
            <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No applications found.</td></tr>
          ) : registrations.map(reg => (
            <tr key={reg.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <td style={{ padding: '16px' }}>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{reg.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(reg.created_at).toLocaleString()}</div>
              </td>
              <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div>{reg.email}</div>
                <div style={{ marginTop: '2px' }}>{reg.phone}</div>
              </td>
              <td style={{ padding: '16px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                    background: reg.experience_level === 'Fresher' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                    color: reg.experience_level === 'Fresher' ? '#10b981' : '#f59e0b',
                    border: reg.experience_level === 'Fresher' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(245,158,11,0.2)'
                  }}>
                    {reg.experience_level}
                  </span>
                  <button 
                    onClick={() => { setSelectedReg(reg); setShowDetailsModal(true); }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.75rem', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontWeight: '500' }}
                  >
                    View Profile
                  </button>
                </div>
              </td>
              <td style={{ padding: '16px' }}>
                <span style={{ 
                  padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                  background: reg.status === 'Approved' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: reg.status === 'Approved' ? '#10b981' : '#ef4444',
                  border: reg.status === 'Approved' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)'
                }}>
                  {reg.status}
                </span>
              </td>
              <td style={{ padding: '16px', textAlign: 'right' }}>
                {reg.status === 'Pending' && (
                  <button onClick={() => handleApproveClick(reg)} style={{ background: 'var(--accent-cyan)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 10px rgba(6, 182, 212, 0.2)', transition: 'transform 0.2s' }}>
                    <FiCheck /> Approve & Assign Test
                  </button>
                )}
                {reg.status === 'Approved' && (
                  <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}><FiCheck /> Approved</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTests = () => (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
        <thead style={{ background: 'var(--bg-tertiary)', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
          <tr>
            <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Candidate Name</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Assigned Test</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Date Assigned</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Test Instructions</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Status / Score</th>
          </tr>
        </thead>
        <tbody>
          {assignedTests.length === 0 ? (
            <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No tests assigned yet.</td></tr>
          ) : assignedTests.map(test => {
            let scoreDisplay = null;
            if (test.test_type === 'mcq' && test.status === 'Completed' && test.test_data) {
              try {
                const data = typeof test.test_data === 'string' ? JSON.parse(test.test_data) : test.test_data;
                const correctCount = data.filter(q => q.isCorrect).length;
                scoreDisplay = `${correctCount} / ${data.length}`;
              } catch (e) {}
            }
            return (
            <tr key={test.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <td style={{ padding: '16px' }}>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{test.candidate_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{test.candidate_email}</div>
              </td>
              <td style={{ padding: '16px', fontWeight: '600', color: 'var(--accent-cyan)' }}>{test.test_title}</td>
              <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(test.created_at).toLocaleString()}</td>
              <td style={{ padding: '16px', fontSize: '0.85rem', maxWidth: '250px' }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)' }}>
                  {test.test_instructions}
                </div>
              </td>
              <td style={{ padding: '16px' }}>
                {test.status === 'Completed' ? (
                  <div>
                    <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '15px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold' }}>Completed</span>
                    {scoreDisplay && (
                      <div style={{ marginTop: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        Score: <span style={{ color: 'var(--accent-cyan)' }}>{scoreDisplay}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '15px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 'bold' }}>{test.status || 'Assigned'}</span>
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiUsers style={{ color: 'var(--accent-cyan)' }} /> HR Recruitment Hub
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0', fontSize: '0.9rem' }}>Review candidate applications, assign tests, and generate temporary login credentials.</p>
          </div>
          <button onClick={fetchData} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', transition: 'background 0.2s' }}>
            <FiRefreshCw className={loading ? "spin-icon" : ""} style={{ color: 'var(--accent-cyan)' }} /> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
          <button 
            onClick={() => setActiveTab('applications')} 
            style={{ padding: '8px 20px', borderRadius: '20px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'applications' ? 'var(--accent-cyan)' : 'transparent', color: activeTab === 'applications' ? '#fff' : 'var(--text-secondary)', boxShadow: activeTab === 'applications' ? '0 4px 10px rgba(6, 182, 212, 0.3)' : 'none' }}
          >
            New Applications
          </button>
          <button 
            onClick={() => setActiveTab('candidates')} 
            style={{ padding: '8px 20px', borderRadius: '20px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'candidates' ? 'var(--accent-cyan)' : 'transparent', color: activeTab === 'candidates' ? '#fff' : 'var(--text-secondary)', boxShadow: activeTab === 'candidates' ? '0 4px 10px rgba(6, 182, 212, 0.3)' : 'none' }}
          >
            Assigned Candidate Tests
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FiRefreshCw className="spin-icon" style={{ fontSize: '24px', marginBottom: '10px', color: 'var(--accent-cyan)' }} />
            <div>Loading recruitment data...</div>
          </div>
        ) : (
          activeTab === 'applications' ? renderApplications() : renderTests()
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedReg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-primary)', width: '100%', maxWidth: '550px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 25px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}><FiFileText style={{ color: 'var(--accent-cyan)' }} /> Assign Test to {selectedReg.name}</h3>
              <button onClick={() => setShowApproveModal(false)} style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}><FiX /></button>
            </div>
            
            <form onSubmit={submitApprove} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', gap: '10px' }}>
                <FiCheck style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>Approving this candidate will automatically generate a temporary login account for them to access the test dashboard.</div>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input type="radio" checked={approveForm.testType === 'text'} onChange={() => setApproveForm({...approveForm, testType: 'text'})} /> 
                  Open-Ended Task
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input type="radio" checked={approveForm.testType === 'mcq'} onChange={() => setApproveForm({...approveForm, testType: 'mcq'})} /> 
                  MCQ Quiz
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Test Title</label>
                <input required type="text" value={approveForm.testTitle} onChange={e => setApproveForm({...approveForm, testTitle: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>

              {approveForm.testType === 'text' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Test Instructions / Questions</label>
                    <textarea required rows="5" value={approveForm.testInstructions} onChange={e => setApproveForm({...approveForm, testInstructions: e.target.value})} placeholder="Write the coding question, writing prompt, or test instructions here..." style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', resize: 'vertical', outline: 'none' }}></textarea>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Resource File URL (Optional)</label>
                    <input type="text" value={approveForm.fileUrl} onChange={e => setApproveForm({...approveForm, fileUrl: e.target.value})} placeholder="https://..." style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} />
                  </div>
                </>
              ) : (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>MCQ Questions</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <select onChange={(e) => {
                        const templateKey = e.target.value;
                        if (templateKey && predefinedTemplates[templateKey]) {
                          if (confirm(`Load the "${templateKey}" template? This will replace any existing questions.`)) {
                            setApproveForm({...approveForm, mcqData: JSON.parse(JSON.stringify(predefinedTemplates[templateKey]))});
                          }
                        }
                        e.target.value = ''; // Reset selection
                      }} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: '6px', outline: 'none', fontSize: '0.8rem' }}>
                        <option value="">-- Load Template --</option>
                        <option value="aptitude">General Aptitude</option>
                        <option value="english">Basic English</option>
                        <option value="frontend">Frontend Dev (React/CSS)</option>
                      </select>
                      <button type="button" onClick={() => setApproveForm({...approveForm, mcqData: [...approveForm.mcqData, { question: '', options: ['', '', '', ''], correctIndex: 0 }]})} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>+ Add Question</button>
                    </div>
                  </div>
                  <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px', background: 'var(--bg-tertiary)' }}>
                    {approveForm.mcqData.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No questions added. Click "Add Question" to start.</div>
                    ) : approveForm.mcqData.map((mcq, qIdx) => (
                      <div key={qIdx} style={{ background: 'var(--bg-primary)', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--glass-border)', position: 'relative' }}>
                        <button type="button" onClick={() => {
                          const newData = [...approveForm.mcqData];
                          newData.splice(qIdx, 1);
                          setApproveForm({...approveForm, mcqData: newData});
                        }} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}><FiX /></button>
                        <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Question {qIdx + 1}</h4>
                        <input required placeholder="Enter the question here..." value={mcq.question} onChange={e => {
                          const newData = [...approveForm.mcqData];
                          newData[qIdx].question = e.target.value;
                          setApproveForm({...approveForm, mcqData: newData});
                        }} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }} />
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {mcq.options.map((opt, oIdx) => (
                            <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input type="radio" name={`correct-${qIdx}`} checked={mcq.correctIndex === oIdx} onChange={() => {
                                const newData = [...approveForm.mcqData];
                                newData[qIdx].correctIndex = oIdx;
                                setApproveForm({...approveForm, mcqData: newData});
                              }} style={{ cursor: 'pointer' }} />
                              <input required placeholder={`Option ${oIdx + 1}`} value={opt} onChange={e => {
                                const newData = [...approveForm.mcqData];
                                newData[qIdx].options[oIdx] = e.target.value;
                                setApproveForm({...approveForm, mcqData: newData});
                              }} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
                <button type="button" onClick={() => setShowApproveModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--accent-cyan)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)' }}>
                  {submitting ? 'Processing...' : 'Approve & Assign Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Experience Details Modal */}
      {showDetailsModal && selectedReg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-primary)', width: '100%', maxWidth: '600px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 25px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '700' }}>Candidate Profile: {selectedReg.name}</h3>
              <button onClick={() => setShowDetailsModal(false)} style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiX /></button>
            </div>
            
            <div style={{ padding: '25px', color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div><strong>Email:</strong> {selectedReg.email}</div>
                <div><strong>Phone:</strong> {selectedReg.phone}</div>
                <div><strong>Position:</strong> {selectedReg.position_applied || 'N/A'}</div>
                <div><strong>Education:</strong> {selectedReg.education || 'N/A'}</div>
                <div><strong>Notice Period:</strong> {selectedReg.notice_period || 'N/A'}</div>
                {selectedReg.portfolio_url && (
                  <div><strong>Portfolio:</strong> <a href={selectedReg.portfolio_url} target="_blank" style={{ color: 'var(--accent-cyan)' }}>Link</a></div>
                )}
              </div>
              
              {selectedReg.skills && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>Skills:</strong>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {selectedReg.skills.split(',').map(s => <span key={s} style={{ background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: '15px', fontSize: '0.8rem' }}>{s.trim()}</span>)}
                  </div>
                </div>
              )}

              {selectedReg.experience_details && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>Experience Details:</strong>
                  <div style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>
                    {selectedReg.experience_details}
                  </div>
                </div>
              )}

              {selectedReg.resume_url && (
                <div>
                  <strong>Resume:</strong>
                  <br />
                  <a href={selectedReg.resume_url} target="_blank" download style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent-cyan)', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', marginTop: '8px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    <FiFileText /> Download Resume
                  </a>
                </div>
              )}
            </div>
            
            <div style={{ padding: '15px 25px', borderTop: '1px solid var(--glass-border)', textAlign: 'right', background: 'var(--bg-secondary)' }}>
              <button onClick={() => setShowDetailsModal(false)} style={{ padding: '8px 20px', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', cursor: 'pointer', fontWeight: '500' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
