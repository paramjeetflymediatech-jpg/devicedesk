'use client';
import { useState } from 'react';
import Swal from 'sweetalert2';
import Logo from '../../components/Logo';

export default function CandidateRegistration() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    experience_level: 'Fresher',
    company_name: '',
    company_location: '',
    years_worked: '',
    current_salary: '',
    expected_salary: '',
    why_left: '',
    resume_url: '',
    portfolio_url: '',
    education: '',
    skills: '',
    notice_period: '',
    position_applied: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);

      const res = await fetch("/api/candidates/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForm({ ...form, resume_url: data.fileUrls[0] });
        Swal.fire({ icon: 'success', title: 'Resume Uploaded', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Upload Failed', text: err.message });
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Basic Required Fields Validation
    if (!form.name || !form.email || !form.phone || !form.position_applied) {
      Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please fill in all mandatory fields, including Position Applied For.' });
      return;
    }

    // 2. Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      Swal.fire({ icon: 'warning', title: 'Invalid Email', text: 'Please enter a valid email address.' });
      return;
    }

    // 3. Phone Format Validation
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(form.phone)) {
      Swal.fire({ icon: 'warning', title: 'Invalid Phone Number', text: 'Please enter a valid phone number (10-15 digits).' });
      return;
    }

    // 4. Resume Validation
    if (!form.resume_url) {
      Swal.fire({ icon: 'warning', title: 'Resume Required', text: 'Please upload your resume before submitting.' });
      return;
    }

    // 5. Experience Validation
    if (form.experience_level === 'Experienced') {
      if (!form.company_name || !form.company_location || !form.years_worked || !form.why_left || !form.notice_period) {
        Swal.fire({ icon: 'warning', title: 'Missing Experience Details', text: 'Please fill in all required experience details, including Notice Period.' });
        return;
      }
      if (isNaN(parseFloat(form.years_worked))) {
        Swal.fire({ icon: 'warning', title: 'Invalid Years Worked', text: 'Please enter a valid number for years worked (e.g., 2.5).' });
        return;
      }
    }

    setLoading(true);
    try {
      let experience_details = '';
      if (form.experience_level === 'Experienced') {
        experience_details = `Company: ${form.company_name}
Location: ${form.company_location}
Years Worked: ${form.years_worked}
Current Salary: ${form.current_salary}
Expected Salary: ${form.expected_salary}
Reason for Leaving: ${form.why_left}`;
      }

      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        experience_level: form.experience_level,
        experience_details,
        resume_url: form.resume_url,
        portfolio_url: form.portfolio_url,
        education: form.education,
        skills: form.skills,
        notice_period: form.notice_period,
        position_applied: form.position_applied
      };

      const res = await fetch('/api/candidates/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSubmitted(true);
        Swal.fire({ icon: 'success', title: 'Registration Complete', text: 'Your application has been submitted successfully. HR will review it and provide you with a temporary login for the test.' });
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Failed to submit application.' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        
        <div style={{ background: '#fff', padding: '50px 40px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(2, 132, 199, 0.08)', maxWidth: '550px', width: '100%', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(90deg, #0284c7, #7c3aed)' }}></div>
          
          <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center' }}>
            <Logo height="50px" />
          </div>

          <div style={{ width: '80px', height: '80px', background: '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px', color: '#0284c7' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', margin: '0 0 15px', letterSpacing: '-0.5px' }}>Application Received</h2>
          
          <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '1.05rem', margin: '0 0 30px' }}>
            Thank you for your interest in joining <strong>Company Careers</strong>! Our HR team is currently reviewing your application. 
          </p>
          
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'left', marginBottom: '30px' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#334155', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>What happens next?</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>
              <li style={{ marginBottom: '8px' }}>Your profile will be evaluated by our recruitment team.</li>
              <li style={{ marginBottom: '8px' }}>If shortlisted, HR will assign an assessment test to you.</li>
              <li>You will receive <strong>temporary login credentials</strong> to access your secure test dashboard.</li>
            </ul>
          </div>

          <a href="/" style={{ display: 'inline-block', padding: '14px 32px', background: '#0f172a', color: '#fff', textDecoration: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '1rem', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)' }}>
            Return to Homepage
          </a>
        </div>

        <div style={{ marginTop: '30px', color: '#64748b', fontSize: '0.85rem' }}>
          &copy; {new Date().getFullYear()} Fly Media Technology. All rights reserved.
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header */}
      <div style={{ background: '#0f172a', padding: '20px', textAlign: 'center', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ background: '#fff', padding: '10px 20px', borderRadius: '12px', marginBottom: '15px' }}>
          <Logo height="40px" />
        </div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>Company Careers</h1>
        <p style={{ margin: '5px 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>Candidate Registration Portal</p>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 25px rgba(0,0,0,0.05)', maxWidth: '800px', width: '100%', overflow: 'hidden' }}>
          
          <div style={{ padding: '30px 40px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: '700' }}>Candidate Enrollment</h2>
            <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Please fill out all the details accurately for the interview process.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="text" 
                required
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                placeholder="e.g. John Doe"
              />
            </div>

            {/* Contact Info Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Email Address <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="email" 
                  required
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                  placeholder="e.g. john@example.com"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="tel" 
                  required
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                  placeholder="e.g. +91 9876543210"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Current Address</label>
              <textarea 
                rows="2"
                value={form.address}
                onChange={e => setForm({...form, address: e.target.value})}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', resize: 'vertical' }}
                placeholder="Your full address..."
              ></textarea>
            </div>

            {/* Professional Details Section */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Professional Details</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Position Applied For</label>
                  <input type="text" value={form.position_applied} onChange={e => setForm({...form, position_applied: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="e.g. Software Engineer" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Highest Education</label>
                  <input type="text" value={form.education} onChange={e => setForm({...form, education: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="e.g. B.Tech Computer Science" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Key Skills (Comma separated)</label>
                  <input type="text" value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="e.g. React, Node.js, SQL" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Portfolio / LinkedIn URL</label>
                  <input type="url" value={form.portfolio_url} onChange={e => setForm({...form, portfolio_url: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="https://" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Upload Resume (PDF/Word)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    disabled={uploadingResume}
                    style={{
                      padding: '8px',
                      background: '#fff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      width: '100%',
                      cursor: uploadingResume ? 'not-allowed' : 'pointer'
                    }}
                  />
                  {uploadingResume && <span style={{ fontSize: '0.85rem', color: '#06b6d4', fontWeight: '600', whiteSpace: 'nowrap' }}>Uploading...</span>}
                </div>
                {form.resume_url && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#10b981', fontWeight: '500' }}>✓ Resume attached successfully</p>
                )}
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '10px' }}>Experience Level</label>
              <div style={{ display: 'flex', gap: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input type="radio" name="exp" checked={form.experience_level === 'Fresher'} onChange={() => setForm({...form, experience_level: 'Fresher'})} />
                  Fresher
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input type="radio" name="exp" checked={form.experience_level === 'Experienced'} onChange={() => setForm({...form, experience_level: 'Experienced'})} />
                  Experienced
                </label>
              </div>
            </div>

            {/* Experience Details (Conditional) */}
            {form.experience_level === 'Experienced' && (
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Experience Details</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Company Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" required value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="e.g. Google" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Company Location <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" required value={form.company_location} onChange={e => setForm({...form, company_location: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="e.g. New York, NY" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Years Worked <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" required value={form.years_worked} onChange={e => setForm({...form, years_worked: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="e.g. 2.5" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Current Salary</label>
                    <input type="text" value={form.current_salary} onChange={e => setForm({...form, current_salary: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="e.g. 50k" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Expected Salary</label>
                    <input type="text" value={form.expected_salary} onChange={e => setForm({...form, expected_salary: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="e.g. 70k" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Notice Period</label>
                    <select value={form.notice_period} onChange={e => setForm({...form, notice_period: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}>
                      <option value="">Select...</option>
                      <option value="Immediate">Immediate</option>
                      <option value="15 Days">15 Days</option>
                      <option value="30 Days">30 Days</option>
                      <option value="45 Days">45 Days</option>
                      <option value="60+ Days">60+ Days</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Reason for Leaving <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea rows="2" required value={form.why_left} onChange={e => setForm({...form, why_left: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }} placeholder="Please explain..."></textarea>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div style={{ marginTop: '10px' }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  borderRadius: '8px', 
                  background: '#06b6d4', 
                  color: '#fff', 
                  fontSize: '1rem', 
                  fontWeight: '700', 
                  border: 'none', 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'background 0.2s'
                }}
              >
                {loading ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </div>

          </form>
        </div>
      </div>
      
    </div>
  );
}
