/* eslint-disable @next/next/no-img-element */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  FiLayout, FiMessageSquare, FiMenu, FiX, FiBox, FiCreditCard, 
  FiGrid, FiFileText, FiImage, FiDollarSign, FiSend, FiDownload, 
  FiEdit3, FiUser, FiCheckCircle, FiClock, FiAlertCircle, 
  FiSettings, FiShare2, FiThumbsUp, FiMessageCircle, FiHeart, 
  FiBookmark, FiRefreshCw, FiExternalLink, FiUploadCloud, FiZap, FiCalendar, FiSave, FiLock,
  FiRepeat, FiPlus
} from 'react-icons/fi';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
import { FaWandMagicSparkles } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import { useClientProfile } from '../useClientProfile';
import CreateSmoPostModal from '@/app/components/modals/CreateSmoPostModal';

function formatScheduledDate(val) {
  if (!val) return 'Pending';
  try {
    let dateObj;
    if (typeof val === 'string' && val.includes(' ') && !val.includes('T')) {
      dateObj = new Date(val.replace(' ', 'T'));
    } else {
      dateObj = new Date(val);
    }
    if (isNaN(dateObj.getTime())) return String(val);

    return dateObj.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return String(val);
  }
}

export default function SMOPage() {
  const { name: clientName, company_name: companyName, initials } = useClientProfile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [myClientId, setMyClientId] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('devicedesk_auth_user') || '{}');
        if (u && u.id) return u.id;
      } catch (e) {}
    }
    return 'emp_1789113315702';
  });
  const [userName, setUserName] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('devicedesk_auth_user') || '{}');
        if (u && u.name) return u.name;
      } catch (e) {}
    }
    return 'Client';
  });
  
  // Data State
  const [smoRequests, setSmoRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [smoForm, setSmoForm] = useState({ 
    requirements: '',
    platforms: ['facebook', 'instagram']
  });

  // Modal & Preview States
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [previewTab, setPreviewTab] = useState('facebook'); // 'facebook' | 'instagram'
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Designer Upload State
  const [uploadFormData, setUploadFormData] = useState({
    banner_url: '',
    caption: '',
    hashtags: '',
    platforms: ['facebook', 'instagram'],
    file: null
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Social Settings State
  const [socialSettings, setSocialSettings] = useState({
    fb_page_id: '',
    ig_business_id: '',
    meta_access_token: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [targetPublishPlatforms, setTargetPublishPlatforms] = useState(['facebook', 'instagram']);

  // Revision Request State
  const [revisionNotes, setRevisionNotes] = useState('');
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  // Scheduling State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [minDateTime, setMinDateTime] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Client Caption & Hashtags Modification State
  const [editCaption, setEditCaption] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [savingCopy, setSavingCopy] = useState(false);
  const [regeneratingAI, setRegeneratingAI] = useState(false);

  // Subscription Entitlement State
  const [hasSmoPackage, setHasSmoPackage] = useState(null); // null = checking, true = has package, false = locked
  const [checkingPackage, setCheckingPackage] = useState(true);

  const fetchSMO = async () => {
    if (!myClientId) return;
    try {
      const res = await fetch(`/api/client-services/smo?clientId=${myClientId}`);
      const data = await res.json();
      if (data.success) {
        setSmoRequests(data.data || []);
        if (data.data && data.data[0]) {
          setSocialSettings(prev => ({
            ...prev,
            fb_page_id: data.data[0].fb_page_id || '',
            ig_business_id: data.data[0].ig_business_id || ''
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch SMO requests:', err);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setCheckingPackage(true);

        // 1. Verify client owns an active SMO package
        let isSmoPurchased = false;
        try {
          const pkgRes = await fetch(`/api/client-services/my-packages?clientId=${myClientId}`);
          const pkgData = await pkgRes.json();
          if (pkgData.success && Array.isArray(pkgData.data)) {
            isSmoPurchased = pkgData.data.some(p => {
              if (p.is_expired) return false;
              const name = (p.name || '').toLowerCase();
              return name.includes('smo') || name.includes('social');
            });
          }
        } catch (pkgErr) {
          console.error('Failed to verify SMO package:', pkgErr);
        }

        if (!ignore) {
          setHasSmoPackage(isSmoPurchased);
          setCheckingPackage(false);
          try {
            localStorage.setItem('devicedesk_client_has_smo', isSmoPurchased ? 'true' : 'false');
          } catch (e) {}
        }

        // If client does not own an active SMO package, lock access and do not fetch SMO records
        if (!isSmoPurchased) {
          if (!ignore) setLoading(false);
          return;
        }

        const res = await fetch(`/api/client-services/smo?clientId=${myClientId}`);
        const data = await res.json();
        if (!ignore && data.success) {
          setSmoRequests(data.data || []);
          if (data.data && data.data[0]) {
            setSocialSettings(prev => ({
              ...prev,
              fb_page_id: data.data[0].fb_page_id || '',
              ig_business_id: data.data[0].ig_business_id || ''
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch SMO requests:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
          setCheckingPackage(false);
        }
      }
    }
    loadData();
    return () => { ignore = true; };
  }, [myClientId]);

  // Handle Client New Graphic Submission
  const handleSMOSubmit = async (e) => {
    e.preventDefault();
    if (!smoForm.requirements.trim()) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/client-services/smo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientId: myClientId, 
          requirements: smoForm.requirements,
          platforms: smoForm.platforms
        })
      });
      const data = await res.json();
      if (data.success) {
        setSmoForm({ requirements: '', platforms: ['facebook', 'instagram'] });
        fetchSMO();
        Swal.fire({
          icon: 'success',
          title: 'Graphic Request Sent!',
          text: 'Our design team will create the banner according to your specifications and notify you once ready.',
          confirmButtonColor: '#ec4899'
        });
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Failed to submit' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Designer Upload Modal for a Request
  const openUploadModal = (req) => {
    setSelectedRequest(req);
    let parsedPlatforms = ['facebook', 'instagram'];
    try {
      if (req.platforms) parsedPlatforms = typeof req.platforms === 'string' ? JSON.parse(req.platforms) : req.platforms;
    } catch (e) {}

    setUploadFormData({
      banner_url: req.banner_url || '',
      caption: req.caption || '',
      hashtags: req.hashtags || '#Flymedia #DigitalMarketing #Trending',
      platforms: parsedPlatforms,
      file: null
    });
    setShowUploadModal(true);
  };

  // Handle File Upload to Flymedia SFTP / Public Storage
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('files', file);
      formData.append('folder', 'smo-banners');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.fileUrls?.[0]) {
        setUploadFormData(prev => ({ ...prev, banner_url: data.fileUrls[0] }));
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Banner uploaded successfully!',
          showConfirmButton: false,
          timer: 2000
        });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Upload Failed', text: err.message });
    } finally {
      setUploadingImage(false);
    }
  };

  // AI Caption Generator
  const handleGenerateAICaption = async () => {
    if (!selectedRequest?.requirements) {
      Swal.fire({ icon: 'info', title: 'Note', text: 'No requirement text found to generate copy.' });
      return;
    }
    try {
      setAiGenerating(true);
      const res = await fetch('/api/smo/ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: selectedRequest.requirements,
          brandName: userName
        })
      });
      const data = await res.json();
      if (data.success) {
        setUploadFormData(prev => ({
          ...prev,
          caption: data.caption || prev.caption,
          hashtags: data.hashtags || prev.hashtags
        }));
      }
    } catch (err) {
      console.error('AI Caption generation failed:', err);
    } finally {
      setAiGenerating(false);
    }
  };

  // Save Designer Upload
  const handleSaveDesign = async (e) => {
    e.preventDefault();
    if (!uploadFormData.banner_url) {
      Swal.fire({ icon: 'warning', title: 'Missing Banner', text: 'Please upload a banner image first.' });
      return;
    }

    try {
      const res = await fetch('/api/client-services/smo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_design',
          id: selectedRequest.id,
          banner_url: uploadFormData.banner_url,
          caption: uploadFormData.caption,
          hashtags: uploadFormData.hashtags,
          platforms: uploadFormData.platforms,
          designer_name: userName || 'Design Specialist'
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowUploadModal(false);
        fetchSMO();
        Swal.fire({
          icon: 'success',
          title: 'Design Submitted!',
          text: 'The banner has been uploaded and submitted for client review & approval.',
          confirmButtonColor: '#ec4899'
        });
      } else {
        throw new Error(data.error || 'Failed to save design');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Open Preview & Approval Modal
  const openPreviewModal = (req) => {
    setSelectedRequest(req);
    setEditCaption(req.caption || '');
    setEditHashtags(req.hashtags || '#Flymedia #SocialMedia #Trending');
    setPreviewTab('facebook');

    // Parse platforms for publish target
    let reqPlatforms = ['facebook', 'instagram'];
    try {
      if (req.platforms) {
        reqPlatforms = typeof req.platforms === 'string' ? JSON.parse(req.platforms) : req.platforms;
      }
    } catch (e) {}

    // Default to Facebook only if no Instagram ID is present and user didn't explicitly request IG
    if (!socialSettings.ig_business_id && (!req.ig_business_id)) {
      setTargetPublishPlatforms(['facebook']);
    } else if (Array.isArray(reqPlatforms) && reqPlatforms.length > 0) {
      setTargetPublishPlatforms(reqPlatforms);
    } else {
      setTargetPublishPlatforms(['facebook']);
    }

    setShowPreviewModal(true);
  };

  // Save Client's Modified Caption & Hashtags
  const handleSaveCopy = async () => {
    if (!selectedRequest?.id) return;
    try {
      setSavingCopy(true);
      const res = await fetch('/api/client-services/smo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_copy',
          id: selectedRequest.id,
          caption: editCaption,
          hashtags: editHashtags
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedRequest(prev => ({ ...prev, caption: editCaption, hashtags: editHashtags }));
        setSmoRequests(prev => prev.map(r => r.id === selectedRequest.id ? { ...r, caption: editCaption, hashtags: editHashtags } : r));
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Caption & Hashtags saved!',
          showConfirmButton: false,
          timer: 2000
        });
      } else {
        throw new Error(data.error || 'Failed to save changes');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Save Failed', text: err.message });
    } finally {
      setSavingCopy(false);
    }
  };

  // Regenerate Fresh AI Caption for Client
  const handleRegenerateAICaption = async () => {
    if (!selectedRequest?.id) return;
    try {
      setRegeneratingAI(true);
      const res = await fetch('/api/client-services/smo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate_ai_caption',
          id: selectedRequest.id
        })
      });
      const data = await res.json();
      if (data.success && data.caption) {
        setEditCaption(data.caption);
        setEditHashtags(data.hashtags || '');
        setSelectedRequest(prev => ({ ...prev, caption: data.caption, hashtags: data.hashtags }));
        setSmoRequests(prev => prev.map(r => r.id === selectedRequest.id ? { ...r, caption: data.caption, hashtags: data.hashtags } : r));
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: '✨ New AI Caption Generated!',
          showConfirmButton: false,
          timer: 2000
        });
      } else {
        throw new Error(data.error || 'Failed to regenerate caption');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Generation Failed', text: err.message });
    } finally {
      setRegeneratingAI(false);
    }
  };

  // Handle Client Approval & Auto-Publishing via Meta Graph API
  const handlePublish = async (simulate = false) => {
    if (!selectedRequest) return;
    try {
      setPublishing(true);

      // Auto-save modified caption if changed before publishing
      if (editCaption !== selectedRequest.caption || editHashtags !== selectedRequest.hashtags) {
        try {
          await fetch('/api/client-services/smo', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_copy',
              id: selectedRequest.id,
              caption: editCaption,
              hashtags: editHashtags
            })
          });
        } catch (saveErr) {}
      }
      const isRepost = selectedRequest.status === 'Published';
      const res = await fetch('/api/smo/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          simulate,
          platforms: targetPublishPlatforms.length > 0 ? targetPublishPlatforms : ['facebook']
        })
      });
      const data = await res.json();

      if (data.success) {
        setShowPreviewModal(false);
        fetchSMO();
        Swal.fire({
          icon: 'success',
          title: simulate 
            ? (isRepost ? 'Test Repost Simulated!' : 'Test Publish Simulated!') 
            : (isRepost ? '🎉 Reposted to Social Media!' : '🎉 Published to Social Media!'),
          html: `
            <div style="text-align: left; font-size: 0.9rem;">
              <p>${isRepost ? 'Your banner has been reposted live via the official Meta Graph API.' : 'Your banner has been published via the official Meta Graph API.'}</p>
              ${data.results?.facebook?.success ? '<p>✅ <strong>Facebook Page:</strong> Posted successfully!</p>' : ''}
              ${data.results?.instagram?.success ? '<p>✅ <strong>Instagram Business:</strong> Posted successfully!</p>' : ''}
              ${data.info?.length ? `<div style="margin-top:8px;padding:8px;background:#fef3c7;color:#92400e;border-radius:8px;font-size:0.8rem;">${data.info.join('<br/>')}</div>` : ''}
            </div>
          `,
          confirmButtonColor: '#059669'
        });
      } else if (data.requiresSetup) {
        Swal.fire({
          icon: 'warning',
          title: 'Meta Access Token Required',
          text: data.error,
          showCancelButton: true,
          confirmButtonText: 'Configure Social Settings',
          cancelButtonText: 'Test Simulation Instead',
          confirmButtonColor: '#ec4899'
        }).then((result) => {
          if (result.isConfirmed) {
            setShowSettingsModal(true);
          } else if (result.dismiss === Swal.DismissReason.cancel) {
            handlePublish(true);
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Publishing Failed',
          text: data.error || 'Unable to publish post. Please check your Meta permissions.'
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Publishing Error', text: err.message });
    } finally {
      setPublishing(false);
    }
  };

  // Handle Client Requesting Revisions
  const handleRequestRevisionSubmit = async (e) => {
    e.preventDefault();
    if (!revisionNotes.trim()) return;
    try {
      setSubmittingRevision(true);
      const res = await fetch('/api/client-services/smo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_revision',
          id: selectedRequest.id,
          revision_notes: revisionNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowRevisionModal(false);
        setShowPreviewModal(false);
        setRevisionNotes('');
        fetchSMO();
        Swal.fire({
          icon: 'success',
          title: 'Feedback Sent!',
          text: 'Your revision notes have been dispatched to the graphic designer.',
          confirmButtonColor: '#ec4899'
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
      setSubmittingRevision(false);
    }
  };

  const formatDateTimeLocal = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openScheduleModal = (req) => {
    const target = req || selectedRequest;
    if (!target) return;
    setSelectedRequest(target);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setScheduledDateTime(formatDateTimeLocal(tomorrow));
    setMinDateTime(formatDateTimeLocal(new Date(Date.now() + 60000)));
    setShowScheduleModal(true);
  };

  const handleConfirmSchedule = async (e) => {
    e.preventDefault();
    if (!selectedRequest?.id || !scheduledDateTime) return;

    const chosenDate = new Date(scheduledDateTime);
    if (chosenDate.getTime() <= Date.now()) {
      Swal.fire({ icon: 'warning', title: 'Invalid Time', text: 'Please pick a future date and time.' });
      return;
    }

    try {
      setScheduling(true);

      // Auto-save modified caption if changed before scheduling
      if (editCaption !== selectedRequest.caption || editHashtags !== selectedRequest.hashtags) {
        try {
          await fetch('/api/client-services/smo', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_copy',
              id: selectedRequest.id,
              caption: editCaption,
              hashtags: editHashtags
            })
          });
        } catch (saveErr) {}
      }

      const res = await fetch('/api/client-services/smo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule_post',
          id: selectedRequest.id,
          scheduled_at: scheduledDateTime,
          platforms: targetPublishPlatforms.length > 0 ? targetPublishPlatforms : ['facebook']
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowScheduleModal(false);
        setShowPreviewModal(false);
        fetchSMO();
        Swal.fire({
          icon: 'success',
          title: 'Post Scheduled!',
          html: `<p>Your banner is scheduled for <strong>${formatScheduledDate(scheduledDateTime)}</strong>.</p><p style="font-size:0.85rem;color:#6b7280;margin-top:6px;">Our automated publishing engine will post it live to your selected platforms at this exact time.</p>`,
          confirmButtonColor: '#4f46e5'
        });
      } else {
        throw new Error(data.error || 'Failed to schedule post');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Scheduling Error', text: err.message });
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelSchedule = async (id) => {
    const targetId = id || selectedRequest?.id;
    if (!targetId) return;

    const result = await Swal.fire({
      title: 'Cancel Scheduled Post?',
      text: 'This will move the post back to "Ready for Approval" and prevent it from automatically posting.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Cancel Schedule',
      confirmButtonColor: '#e11d48'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch('/api/client-services/smo', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel_schedule', id: targetId })
        });
        const data = await res.json();
        if (data.success) {
          fetchSMO();
          if (showPreviewModal) setShowPreviewModal(false);
          Swal.fire({ icon: 'success', title: 'Schedule Cancelled', text: data.message, timer: 2000, showConfirmButton: false });
        }
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
      }
    }
  };

  // Save Meta Social Settings
  const handleSaveSocialSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await fetch('/api/client-services/smo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_social_settings',
          client_id: myClientId,
          ...socialSettings
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowSettingsModal(false);
        fetchSMO();
        Swal.fire({
          icon: 'success',
          title: 'Settings Saved!',
          text: 'Social media credentials updated. You are now ready for automated posting.',
          confirmButtonColor: '#ec4899'
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  // Test Meta Connection
  const handleTestSocialConnection = async () => {
    if (!socialSettings.meta_access_token?.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Access Token',
        text: 'Please paste your Meta Page Access Token before testing.'
      });
      return;
    }
    try {
      setTestingConnection(true);
      const res = await fetch('/api/client-services/smo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_social_connection',
          ...socialSettings
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.details?.detectedIgId && !socialSettings.ig_business_id) {
          setSocialSettings(prev => ({ ...prev, ig_business_id: data.details.detectedIgId }));
        }
        Swal.fire({
          icon: 'success',
          title: 'Meta Connection Verified! 🎉',
          html: `
            <div style="text-align: left; font-size: 0.85rem; line-height: 1.6;">
              <p><strong>Page Name:</strong> ${data.details?.pageName || 'Connected'}</p>
              <p><strong>Page ID:</strong> ${data.details?.pageId || 'Verified'}</p>
              <p><strong>Instagram Business:</strong> ${data.details?.detectedIgId ? `✅ Linked (${data.details.detectedIgId})` : 'ℹ️ None detected (Optional)'}</p>
              ${data.details?.igWarning ? `<div style="margin-top:8px;padding:8px;background:#fef3c7;color:#92400e;border-radius:8px;font-size:0.8rem;border:1px solid #fde68a;">⚠️ ${data.details.igWarning}</div>` : ''}
              <p style="margin-top: 8px; color: #059669; font-weight: 600;">Your token is verified!</p>
            </div>
          `,
          confirmButtonColor: '#059669'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Connection Test Failed',
          text: data.error || 'Failed to authenticate with Meta Graph API.'
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Connection Error', text: err.message });
    } finally {
      setTestingConnection(false);
    }
  };

  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="p-6 border-b border-gray-100 flex flex-col items-center justify-center space-y-3">
        <img src="/flymedia-logo.png" alt="Fly Media Technology" className="h-16 object-contain" />
      </div>
      
      <nav className="flex-1 p-4 flex flex-col space-y-2 overflow-y-auto">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 px-3">Main</div>
        <button onClick={() => window.location.href = '/portal/client/dashboard'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiGrid size={20} /><span>Dashboard</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiLayout size={20} /><span>Project Overview</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/notes'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiMessageSquare size={20} /><span>Project Notes</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/book-service'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiEdit3 size={20} /><span>Book Service</span>
        </button>

        {hasSmoPackage && (
          <>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-3">SMO & Marketing</div>
            <button onClick={() => window.location.href = '/portal/client/smo'} className="flex items-center space-x-3 p-3 rounded-lg font-semibold transition-all bg-pink-50 text-pink-700 shadow-sm shadow-pink-100">
              <FiImage size={20} /><span>SMO Automation</span>
            </button>
          </>
        )}

        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-3">Billing & Packages</div>
        <button onClick={() => window.location.href = '/portal/client/packages'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiBox size={20} /><span>Packages</span>
        </button>
        <button onClick={() => window.location.href = '/portal/client/billing'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiCreditCard size={20} /><span>Billing</span>
        </button>
      
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-3">Account</div>
        <button onClick={() => window.location.href = '/portal/client/profile'} className="flex items-center space-x-3 p-3 rounded-lg font-medium transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
          <FiUser size={20} /><span>Profile Settings</span>
        </button>
      </nav>
      
      <div className="p-4 border-t border-gray-100">
        <button onClick={() => { localStorage.removeItem('devicedesk_auth_user'); sessionStorage.clear(); document.cookie = "devicedesk_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax"; document.cookie = "devicedesk_auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax"; window.location.href = '/login'; }} className="w-full text-center p-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col md:flex-row w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-20 shadow-sm bg-white">
        {renderSidebar()}
      </aside>
      
      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 md:hidden ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-600"><FiX size={20} /></button>
        </div>
        {renderSidebar()}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative overflow-x-hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b px-4 py-4 flex items-center justify-between md:hidden sticky top-0 z-30 shadow-sm">
          <div className="flex items-center">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-lg"><FiMenu size={24} /></button>
            <div>
              <h1 className="text-base font-bold text-gray-800 leading-tight">SMO Automation</h1>
              <p suppressHydrationWarning className="text-xs text-gray-500 font-medium truncate max-w-[180px]">{companyName || clientName || userName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {hasSmoPackage && (
              <button onClick={() => setShowSettingsModal(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <FiSettings size={20} />
              </button>
            )}
            <div 
              onClick={() => window.location.href = '/portal/client/profile'}
              className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs uppercase shadow-sm cursor-pointer"
              suppressHydrationWarning
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex bg-white/80 border-b px-8 py-5 justify-between items-center sticky top-0 z-10 backdrop-blur-md shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">SMO Graphics & Social Automation</h1>
            <p className="text-xs text-gray-500 mt-0.5">Automate graphic requests, designer proofs, client approval, and Facebook & Instagram publishing.</p>
          </div>
          <div className="flex items-center space-x-3">
            {hasSmoPackage && (
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center space-x-2 px-3.5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm transition-all"
              >
                <FiSettings className="text-pink-600" />
                <span>Social Accounts</span>
              </button>
            )}
            <div 
              onClick={() => window.location.href = '/portal/client/profile'}
              className="flex items-center space-x-3 pl-3 border-l border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
              title="Profile Settings"
            >
              <div className="text-right">
                <p suppressHydrationWarning className="text-sm font-bold text-gray-800 leading-tight">
                  {companyName || clientName || userName}
                </p>
                {companyName && (clientName || userName) && (
                  <p suppressHydrationWarning className="text-xs text-gray-500 font-medium leading-tight mt-0.5">
                    {clientName || userName}
                  </p>
                )}
              </div>
              <div 
                className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-sm shadow-sm shadow-pink-100 uppercase"
                suppressHydrationWarning
              >
                {initials}
              </div>
            </div>
          </div>
        </header>

        {checkingPackage ? (
          <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mb-4" />
              <p className="text-sm font-semibold text-gray-700">Verifying SMO package access...</p>
              <p className="text-xs text-gray-400 mt-1">Checking active subscription status</p>
            </div>
          </main>
        ) : !hasSmoPackage ? (
          <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto flex items-center justify-center min-h-[70vh]">
            <div className="max-w-xl w-full bg-white border border-pink-100 rounded-3xl p-8 md:p-12 text-center shadow-xl shadow-pink-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-pink-100 rounded-full blur-3xl opacity-70 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 flex items-center justify-center text-white text-3xl shadow-lg shadow-pink-500/25">
                  <FiLock />
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-pink-50 text-pink-700 border border-pink-100 mb-4">
                  Package Required
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
                  SMO Automation Studio is Locked
                </h2>
                <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-md mx-auto mb-8">
                  To request custom designer banners, approve graphics, generate AI captions, and schedule automated posts to Facebook & Instagram, you must subscribe to an <strong>SMO Package</strong>.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => window.location.href = '/portal/client/packages'}
                    className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                  >
                    <FiBox size={18} />
                    <span>Browse & Buy SMO Package</span>
                    <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                  <button
                    onClick={() => window.location.href = '/portal/client'}
                    className="w-full sm:w-auto px-5 py-3.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Return to Overview
                  </button>
                </div>
              </div>
            </div>
          </main>
        ) : (
          <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6">
          {/* Top Banner: Quick Summary & Pipeline Info */}
          <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 transform translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-md mb-2">
                  <FaWandMagicSparkles className="mr-1.5" /> Direct Meta Graph API Powered
                </span>
                <h2 className="text-2xl font-bold">Automated Social Media Pipeline</h2>
                <p className="text-sm text-pink-100 mt-1 max-w-2xl">
                  Submit design briefs, let designers attach finished creatives, preview mock posts exactly as they appear on Facebook & Instagram, and publish with a single click.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(true)} 
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold rounded-xl shadow-lg text-sm transition-transform active:scale-95 flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <FiPlus size={16} /> Create SMO Post Directly
                </button>
                <button 
                  type="button"
                  onClick={() => setShowSettingsModal(true)} 
                  className="px-4 py-2.5 bg-white text-pink-700 hover:bg-pink-50 font-bold rounded-xl shadow text-sm transition-transform active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  Configure Social Pages
                </button>
              </div>
            </div>
          </div>

          {/* Request New Graphic Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                  <FiEdit3 className="text-pink-600" /> Request New Graphic or Create Post
                </h3>
                <p className="text-sm text-gray-500">
                  Need a custom creative designed? Describe your requirement below, or create the social post directly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <FiPlus size={14} /> Create Post Directly (Upload Banner & AI Copy)
              </button>
            </div>
            <form onSubmit={handleSMOSubmit}>
              <textarea 
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all resize-none mb-3 min-h-[110px] text-sm text-gray-800 bg-gray-50/50 focus:bg-white"
                placeholder="E.g., We need an Instagram & Facebook promotional banner for our upcoming Diwali Mega Sale. Text: 'Flat 30% Off on All Digital Services'. Preferred Colors: Royal Blue and Gold. CTA: Shop Now."
                value={smoForm.requirements}
                onChange={(e) => setSmoForm({ ...smoForm, requirements: e.target.value })}
                required
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="font-semibold text-xs uppercase tracking-wider text-gray-400">Target Platforms:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium hover:text-blue-600">
                    <input 
                      type="checkbox" 
                      checked={smoForm.platforms.includes('facebook')}
                      onChange={(e) => {
                        const set = new Set(smoForm.platforms);
                        e.target.checked ? set.add('facebook') : set.delete('facebook');
                        setSmoForm({ ...smoForm, platforms: Array.from(set) });
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <FaFacebook className="text-blue-600" /> Facebook Page
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium hover:text-pink-600">
                    <input 
                      type="checkbox" 
                      checked={smoForm.platforms.includes('instagram')}
                      onChange={(e) => {
                        const set = new Set(smoForm.platforms);
                        e.target.checked ? set.add('instagram') : set.delete('instagram');
                        setSmoForm({ ...smoForm, platforms: Array.from(set) });
                      }}
                      className="rounded text-pink-600 focus:ring-pink-500"
                    />
                    <FaInstagram className="text-pink-600" /> Instagram Business
                  </label>
                </div>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex items-center justify-center px-6 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm transition-all text-sm"
                >
                  <FiSend className="mr-2" /> {submitting ? 'Submitting...' : 'Send Request to Design Team'}
                </button>
              </div>
            </form>
          </div>

          {/* SMO Requests Table & Interactive Feed */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">SMO Graphics & Publishing History</h3>
                <p className="text-xs text-gray-500">Track banner deliverables, preview mock social posts, and approve publishing.</p>
              </div>
              <button 
                onClick={fetchSMO} 
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors w-fit"
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="p-0 overflow-x-auto">
              {loading ? (
                <div className="p-10 text-center text-gray-400">Loading your graphics requests...</div>
              ) : smoRequests.length === 0 ? (
                <div className="p-10 text-center text-gray-400">You have not submitted any graphic requirements yet.</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-gray-50/75 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & ID</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Requirement Brief</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Banner Proof</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {smoRequests.map((req) => {
                      const isPublished = req.status === 'Published';
                      const isScheduled = req.status === 'Scheduled';
                      const isReady = req.status === 'Ready for Approval';
                      const isApproved = req.status === 'Approved';
                      const isRevision = req.status === 'Revision Requested';
                      const isInProgress = req.status === 'In Progress' || req.status === 'Designing';
                      const isUnderReview = req.status === 'Under Review' || req.status === 'For TL Review';

                      return (
                        <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="font-semibold text-gray-800">
                              {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Recent'}
                            </span>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">{req.id}</div>
                            {req.id?.startsWith('req_') && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded border border-blue-100">
                                Booked Service
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-800">
                            <p className="line-clamp-2">{req.requirements}</p>
                            {req.designer_name && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <span className="font-medium text-gray-700">Designer:</span> {req.designer_name}
                              </div>
                            )}
                            {req.revision_notes && (
                              <div className="mt-1 text-xs text-rose-600 bg-rose-50 p-1.5 rounded-md font-medium border border-rose-100">
                                💬 Revision Note: {req.revision_notes}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {req.banner_url && (isReady || isApproved || isScheduled || isPublished) ? (
                              <div className="flex items-center space-x-3">
                                <img 
                                  src={req.banner_url} 
                                  alt="Banner" 
                                  className="w-14 h-14 object-cover rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => openPreviewModal(req)}
                                />
                                <div>
                                  <span className="text-xs font-semibold text-gray-700 block">Uploaded Banner</span>
                                  <button 
                                    onClick={() => openUploadModal(req)} 
                                    className="text-xs text-pink-600 hover:text-pink-800 font-medium"
                                  >
                                    Replace image
                                  </button>
                                </div>
                              </div>
                            ) : isInProgress ? (
                              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 inline-flex items-center gap-1.5 font-medium">
                                <span>🎨</span>
                                <span>Designing banner...</span>
                              </div>
                            ) : isUnderReview ? (
                              <div className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-md px-2.5 py-1.5 inline-flex items-center gap-1.5 font-medium">
                                <span>🛡️</span>
                                <span>Pending TL approval...</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-400 italic">No banner yet</span>
                                <button 
                                  onClick={() => openUploadModal(req)} 
                                  className="px-2.5 py-1 text-xs font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-md transition-colors"
                                >
                                  + Upload Banner
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              isPublished
                                ? 'bg-emerald-100 text-emerald-800'
                                : isScheduled
                                ? 'bg-indigo-100 text-indigo-800 font-bold'
                                : isApproved
                                ? 'bg-green-100 text-green-800'
                                : isReady
                                ? 'bg-blue-100 text-blue-800 animate-pulse font-bold'
                                : isUnderReview
                                ? 'bg-purple-100 text-purple-800 font-medium'
                                : isInProgress
                                ? 'bg-amber-100 text-amber-800 font-medium'
                                : isRevision
                                ? 'bg-rose-100 text-rose-800 font-bold'
                                : 'bg-gray-100 text-gray-700 font-medium'
                            }`}>
                              {isPublished && <FiCheckCircle className="mr-1" />}
                              {isScheduled && <FiClock className="mr-1" />}
                              {isReady && <FiAlertCircle className="mr-1" />}
                              {isUnderReview && <FiClock className="mr-1" />}
                              {isInProgress && <FiClock className="mr-1" />}
                              {isRevision && <FiAlertCircle className="mr-1" />}
                              {isInProgress ? 'Designing Banner' : isUnderReview ? 'Under Team Review' : req.status || 'Pending Design'}
                            </span>
                            {isScheduled && req.scheduled_at && (
                              <div className="text-[11px] text-indigo-700 font-medium mt-1 flex items-center gap-1">
                                <FiCalendar size={11} />
                                {formatScheduledDate(req.scheduled_at)}
                              </div>
                            )}
                            {isPublished && req.published_at && (
                              <div className="text-[11px] text-gray-400 mt-0.5">
                                {new Date(req.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                            {req.banner_url && (isReady || isApproved || isScheduled || isPublished) ? (
                              <div className="inline-flex items-center gap-1.5">
                                {isPublished ? (
                                  <>
                                    <button 
                                      onClick={() => openPreviewModal(req)}
                                      className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg shadow-xs transition-all cursor-pointer"
                                      title="View social post mockup"
                                    >
                                      👁️ View
                                    </button>
                                    <button 
                                      onClick={() => openPreviewModal(req)}
                                      className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 rounded-lg shadow-sm shadow-pink-200 transition-all flex items-center gap-1.5 cursor-pointer"
                                      title="Repost this banner to Facebook or Instagram"
                                    >
                                      <FiRepeat size={12} />
                                      <span>Repost</span>
                                    </button>
                                  </>
                                ) : (
                                  <button 
                                    onClick={() => openPreviewModal(req)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer ${
                                      isScheduled
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        : 'bg-pink-600 text-white hover:bg-pink-700 shadow-pink-100'
                                    }`}
                                  >
                                    {isScheduled ? '🕒 Scheduled' : '👁️ Preview & Post'}
                                  </button>
                                )}
                                {isScheduled && (
                                  <button
                                    onClick={() => handleCancelSchedule(req.id)}
                                    title="Cancel schedule"
                                    className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200 cursor-pointer"
                                  >
                                    <FiX size={14} />
                                  </button>
                                )}
                              </div>
                            ) : isInProgress ? (
                              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-md border border-amber-200">
                                ⏳ In Design
                              </span>
                            ) : isUnderReview ? (
                              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-md border border-purple-200">
                                🛡️ TL Reviewing
                              </span>
                            ) : (
                              <button 
                                onClick={() => openUploadModal(req)}
                                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                Upload Banner
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: LIVE SOCIAL MEDIA PREVIEW & ONE-CLICK APPROVE/PUBLISH */}
      {/* ============================================================== */}
      {showPreviewModal && selectedRequest && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-5xl w-full overflow-hidden my-6 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/75">
              <div className="flex items-center space-x-3">
                <span className="text-xl">📱</span>
                <div>
                  <h3 className="text-base font-bold text-gray-800">Review Creative & Social Copy</h3>
                  <p className="text-xs text-gray-500">Check the banner delivered by your team leader, modify the AI-generated caption, and post or schedule.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body: Two-Column Split (Live Preview & Caption Editor) */}
            <div className="p-6 bg-gray-50/70 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: LIVE SOCIAL PREVIEW (7 COLS) */}
                <div className="lg:col-span-7 flex flex-col items-center">
                  {/* Platform Switcher */}
                  <div className="w-full flex items-center space-x-2 mb-4 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                    <button 
                      type="button"
                      onClick={() => setPreviewTab('facebook')}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        previewTab === 'facebook'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <FaFacebook size={16} />
                      <span>Facebook Post</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPreviewTab('instagram')}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        previewTab === 'instagram'
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <FaInstagram size={16} />
                      <span>Instagram Feed</span>
                    </button>
                  </div>

                  {/* FACEBOOK POST MOCKUP */}
                  {previewTab === 'facebook' && (
                    <div className="w-full bg-white rounded-xl shadow border border-gray-200 overflow-hidden font-sans">
                      {/* FB Header */}
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                            {userName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                              {userName}
                              <span className="text-blue-500 text-xs">✓</span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              Just now • <span>🌐</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-gray-400 font-bold">•••</span>
                      </div>

                      {/* FB Caption */}
                      <div className="px-4 pb-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {editCaption || selectedRequest.caption || ''}
                        {(editHashtags || selectedRequest.hashtags) && (
                          <div className="text-blue-600 font-medium mt-2">{editHashtags || selectedRequest.hashtags}</div>
                        )}
                      </div>

                      {/* FB Banner Image */}
                      <div className="bg-black/5 border-t border-b border-gray-100">
                        <img 
                          src={selectedRequest.banner_url} 
                          alt="SMO Banner" 
                          className="w-full max-h-[380px] object-contain mx-auto"
                        />
                      </div>

                      {/* FB Engagement Footer */}
                      <div className="px-4 py-2 text-xs text-gray-500 flex justify-between border-b border-gray-100">
                        <div className="flex items-center gap-1">
                          <span className="bg-blue-600 text-white rounded-full p-1 text-[9px]">👍</span>
                          <span className="bg-red-500 text-white rounded-full p-1 text-[9px]">❤️</span>
                          <span className="ml-1">Flymedia and 142 others</span>
                        </div>
                        <div>24 Comments • 8 Shares</div>
                      </div>
                      <div className="grid grid-cols-3 text-center py-1 text-gray-600 text-xs font-semibold">
                        <div className="py-2 flex items-center justify-center gap-2">
                          <FiThumbsUp /> Like
                        </div>
                        <div className="py-2 flex items-center justify-center gap-2">
                          <FiMessageCircle /> Comment
                        </div>
                        <div className="py-2 flex items-center justify-center gap-2">
                          <FiShare2 /> Share
                        </div>
                      </div>
                    </div>
                  )}

                  {/* INSTAGRAM POST MOCKUP */}
                  {previewTab === 'instagram' && (
                    <div className="w-full max-w-sm bg-white rounded-xl shadow border border-gray-200 overflow-hidden font-sans">
                      {/* IG Header */}
                      <div className="p-3 flex items-center justify-between border-b border-gray-100">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                            <div className="w-full h-full bg-white rounded-full p-[1px]">
                              <div className="w-full h-full bg-pink-100 text-pink-700 font-bold text-xs flex items-center justify-center rounded-full">
                                {userName.slice(0, 2).toUpperCase()}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-gray-900 lowercase">
                            {userName.replace(/\s+/g, '_').toLowerCase()}
                          </span>
                        </div>
                        <span className="text-gray-400 text-xs font-bold">•••</span>
                      </div>

                      {/* IG Banner Image */}
                      <div className="bg-black/5 aspect-square flex items-center justify-center overflow-hidden">
                        <img 
                          src={selectedRequest.banner_url} 
                          alt="Instagram Banner" 
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* IG Actions */}
                      <div className="p-3">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-3 text-gray-800 text-lg">
                            <FiHeart className="text-rose-500" />
                            <FiMessageCircle />
                            <FiSend />
                          </div>
                          <FiBookmark className="text-lg" />
                        </div>
                        <div className="text-xs font-bold text-gray-900 mb-1">
                          Liked by flymediatech and 284 others
                        </div>
                        <div className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                          <strong className="lowercase mr-1.5">{userName.replace(/\s+/g, '_').toLowerCase()}</strong>
                          {editCaption || selectedRequest.caption || ''}
                          {(editHashtags || selectedRequest.hashtags) && (
                            <div className="text-blue-900 font-medium mt-1.5">{editHashtags || selectedRequest.hashtags}</div>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-2">
                          Just now
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: CAPTION & HASHTAGS STUDIO (5 COLS) */}
                <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm">✍️</span>
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">Check & Modify Caption</h4>
                        <p className="text-[11px] text-gray-500">Live preview updates in real-time</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRegenerateAICaption}
                      disabled={regeneratingAI}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all flex items-center gap-1 border border-indigo-200 cursor-pointer disabled:opacity-50"
                      title="Generate a new AI caption with Gemini"
                    >
                      <FaWandMagicSparkles className={regeneratingAI ? "animate-spin" : ""} />
                      <span>{regeneratingAI ? "Generating..." : "✨ AI Rewrite"}</span>
                    </button>
                  </div>

                  {/* Caption Textarea */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Post Caption
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {editCaption.length} chars
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="Write or edit your social media post caption..."
                      className="w-full p-3 border border-gray-200 rounded-xl text-xs text-gray-800 leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y font-sans bg-gray-50/50"
                    />
                  </div>

                  {/* Hashtags Input */}
                  <div className="mb-4">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                      Hashtags
                    </label>
                    <input
                      type="text"
                      value={editHashtags}
                      onChange={(e) => setEditHashtags(e.target.value)}
                      placeholder="#Flymedia #Trending #SocialMedia..."
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-indigo-700 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono bg-gray-50/50"
                    />
                  </div>

                  {/* Designer & Approval Attribution */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 mb-4 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Designer:</span>
                      <span className="font-semibold text-slate-800">{selectedRequest.designer_name || 'Design Specialist'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <FiCheckCircle size={12} /> Approved by TL & Delivered
                      </span>
                    </div>
                  </div>

                  {/* Save Caption Changes Button */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-auto">
                    {(editCaption !== selectedRequest.caption || editHashtags !== selectedRequest.hashtags) ? (
                      <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                        ● Unsaved modifications
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        ✓ Saved to post
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveCopy}
                      disabled={savingCopy}
                      className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      <FiSave />
                      <span>{savingCopy ? "Saving..." : "Save Modifications"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Action Bar */}
            <div className="p-4 px-5 border-t border-gray-100 bg-white flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <button 
                  onClick={() => {
                    setShowPreviewModal(false);
                    setShowRevisionModal(true);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                >
                  ✏️ Request Revision
                </button>

                {/* Target Platforms Toggle (Always available so client can choose platforms for posting or reposting) */}
                <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Publish To:</span>
                  <label className="flex items-center gap-1 cursor-pointer select-none font-medium text-slate-700 hover:text-slate-900">
                    <input 
                      type="checkbox"
                      checked={targetPublishPlatforms.includes('facebook')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTargetPublishPlatforms(prev => [...new Set([...prev, 'facebook'])]);
                        } else {
                          if (targetPublishPlatforms.length > 1) {
                            setTargetPublishPlatforms(prev => prev.filter(p => p !== 'facebook'));
                          } else {
                            Swal.fire({ toast: true, icon: 'info', title: 'At least one platform must be selected', timer: 2000, showConfirmButton: false });
                          }
                        }
                      }}
                      className="rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                    />
                    <FaFacebook className="text-blue-600 text-xs" />
                    <span>Facebook</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer select-none font-medium text-slate-700 hover:text-slate-900">
                    <input 
                      type="checkbox"
                      checked={targetPublishPlatforms.includes('instagram')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTargetPublishPlatforms(prev => [...new Set([...prev, 'instagram'])]);
                        } else {
                          if (targetPublishPlatforms.length > 1) {
                            setTargetPublishPlatforms(prev => prev.filter(p => p !== 'instagram'));
                          } else {
                            Swal.fire({ toast: true, icon: 'info', title: 'At least one platform must be selected', timer: 2000, showConfirmButton: false });
                          }
                        }
                      }}
                      className="rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                    />
                    <FaInstagram className="text-pink-600 text-xs" />
                    <span>Instagram</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                {selectedRequest.status === 'Published' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl flex items-center gap-1.5">
                      <FiCheckCircle /> Published Live {selectedRequest.published_at ? `(${new Date(selectedRequest.published_at).toLocaleDateString([], { month: 'short', day: 'numeric' })})` : ''}
                    </div>
                    <button 
                      onClick={() => handlePublish(true)}
                      disabled={publishing}
                      className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
                      title="Simulate repost in demo mode"
                    >
                      🧪 Simulate Repost
                    </button>
                    <button 
                      onClick={() => openScheduleModal(selectedRequest)}
                      className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Schedule repost for a future time"
                    >
                      <FiClock /> Schedule Repost
                    </button>
                    <button 
                      onClick={() => handlePublish(false)}
                      disabled={publishing}
                      className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 shadow-md shadow-pink-200 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Repost this banner live immediately to selected platforms"
                    >
                      {publishing ? (
                        <>
                          <FiRefreshCw className="animate-spin" /> Reposting Live...
                        </>
                      ) : (
                        <>
                          <FiRepeat /> Repost Live Now
                        </>
                      )}
                    </button>
                  </div>
                ) : selectedRequest.status === 'Scheduled' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-xl flex items-center gap-1.5">
                      <FiClock /> Scheduled: {formatScheduledDate(selectedRequest.scheduled_at)}
                    </div>
                    <button 
                      onClick={() => handleCancelSchedule(selectedRequest.id)}
                      className="px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                    >
                      Cancel Schedule
                    </button>
                    <button 
                      onClick={() => handlePublish(false)}
                      disabled={publishing}
                      className="px-4 py-2 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-xl shadow-sm transition-all"
                    >
                      Publish Now Immediately
                    </button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => handlePublish(true)}
                      disabled={publishing}
                      className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                    >
                      🧪 Simulate
                    </button>
                    <button 
                      onClick={() => openScheduleModal(selectedRequest)}
                      className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <FiClock /> Schedule Post
                    </button>
                    <button 
                      onClick={() => handlePublish(false)}
                      disabled={publishing}
                      className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 shadow-md shadow-pink-200 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {publishing ? (
                        <>
                          <FiRefreshCw className="animate-spin" /> Publishing...
                        </>
                      ) : (
                        <>
                          <FiShare2 /> Approve & Publish Live
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: DESIGNER BANNER UPLOAD & AI CAPTION DRAFTING         */}
      {/* ============================================================== */}
      {showUploadModal && selectedRequest && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-xl w-full overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/75">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <FiUploadCloud className="text-pink-600" /> Designer Banner Upload & Copy
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDesign} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  1. Upload Creative / Banner Image (.jpg, .png, .webp)
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-pink-500 transition-colors bg-gray-50/50">
                  {uploadFormData.banner_url ? (
                    <div className="relative group">
                      <img 
                        src={uploadFormData.banner_url} 
                        alt="Preview" 
                        className="max-h-48 rounded-lg mx-auto object-contain shadow-sm border border-gray-200"
                      />
                      <label className="inline-block mt-3 px-3 py-1.5 bg-gray-900/80 text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-black">
                        Change Image
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-6">
                      <FiUploadCloud size={32} className="mx-auto text-pink-500 mb-2" />
                      <span className="text-sm font-semibold text-gray-700 block">Click to select banner file</span>
                      <span className="text-xs text-gray-400">Supports JPG, PNG up to 100MB</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
                    </label>
                  )}
                  {uploadingImage && <div className="text-xs text-pink-600 font-semibold mt-2 animate-pulse">Uploading to storage...</div>}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    2. Post Caption / Description
                  </label>
                  <button 
                    type="button" 
                    onClick={handleGenerateAICaption}
                    disabled={aiGenerating}
                    className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 bg-pink-50 px-2.5 py-1 rounded-md transition-colors"
                  >
                    <FaWandMagicSparkles className={aiGenerating ? "animate-spin" : ""} />
                    {aiGenerating ? 'Generating Copy...' : '✨ Auto-Draft with AI'}
                  </button>
                </div>
                <textarea 
                  rows={4}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Enter catchy headline and copy..."
                  value={uploadFormData.caption}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, caption: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  3. Hashtags
                </label>
                <input 
                  type="text"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="#Brand #DigitalMarketing #Trending"
                  value={uploadFormData.hashtags}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, hashtags: e.target.value })}
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={uploadingImage || !uploadFormData.banner_url}
                  className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-pink-200 transition-all"
                >
                  Submit Banner for Client Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: REVISION REQUEST MODAL                                */}
      {/* ============================================================== */}
      {showRevisionModal && selectedRequest && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
              ✏️ Request Design Revisions
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Tell the graphic designer what adjustments are required (colors, typography, logo placement, wording).
            </p>
            <form onSubmit={handleRequestRevisionSubmit}>
              <textarea 
                rows={4}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 mb-4"
                placeholder="E.g., Please change the background to darker blue and increase the offer font size."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                required
              />
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingRevision}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-200 transition-all"
                >
                  {submittingRevision ? 'Sending...' : 'Send Revision Notes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: META SOCIAL ACCOUNTS CONFIGURATION                   */}
      {/* ============================================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/75">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <FiSettings className="text-pink-600" /> Meta Social Media Settings
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSocialSettings} className="p-6 space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-900 leading-relaxed space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <span>💡 How to generate your Meta Page Access Token:</span>
                </div>
                <ol className="list-decimal pl-4 space-y-1 text-blue-800">
                  <li>
                    Open <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="underline font-bold text-blue-900 hover:text-blue-700">Meta Graph API Explorer ↗</a>.
                  </li>
                  <li>
                    In <strong>&quot;User or Page&quot;</strong> dropdown, switch from <em>User Token</em> to <strong>Your Facebook Page Name</strong>. (Important: User Tokens cause error #200).
                  </li>
                  <li>
                    Ensure permissions are checked: <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">pages_show_list</code>, <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">pages_manage_posts</code>, <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">instagram_content_publish</code>.
                  </li>
                  <li>
                    Click <strong>Generate Access Token</strong> and paste it below.
                  </li>
                  <li>
                    <em>Instagram ID is optional:</em> If your Instagram is connected to your Facebook Page, DeviceDesk will automatically detect it!
                  </li>
                </ol>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                  Facebook Page ID
                </label>
                <input 
                  type="text"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-500 font-mono"
                  placeholder="e.g. 109823481239842"
                  value={socialSettings.fb_page_id}
                  onChange={(e) => setSocialSettings({ ...socialSettings, fb_page_id: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Instagram Business Account ID
                  </label>
                  <span className="text-[10px] text-gray-400 font-medium">Optional (Auto-detected if linked)</span>
                </div>
                <input 
                  type="text"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-500 font-mono"
                  placeholder="e.g. 178414002348239"
                  value={socialSettings.ig_business_id}
                  onChange={(e) => setSocialSettings({ ...socialSettings, ig_business_id: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                  Meta Long-Lived Page Access Token
                </label>
                <textarea 
                  rows={3}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-pink-500 font-mono resize-none"
                  placeholder="EAA..."
                  value={socialSettings.meta_access_token}
                  onChange={(e) => setSocialSettings({ ...socialSettings, meta_access_token: e.target.value })}
                />
                <span className="text-[11px] text-gray-400 block mt-1">Must be generated for your <strong>Facebook Page</strong> with <code>pages_manage_posts</code> permission.</span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
                <button 
                  type="button" 
                  onClick={handleTestSocialConnection}
                  disabled={testingConnection || !socialSettings.meta_access_token}
                  className="w-full sm:w-auto px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {testingConnection ? <FiRefreshCw className="animate-spin" /> : '⚡'}
                  <span>{testingConnection ? 'Testing Connection...' : 'Test Connection'}</span>
                </button>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button 
                    type="button" 
                    onClick={() => setShowSettingsModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                  <button 
                    type="submit"
                    disabled={savingSettings}
                    className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-pink-200 transition-all cursor-pointer"
                  >
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ============================================================== */}
      {/* MODAL 5: SCHEDULE POST MODAL                                   */}
      {/* ============================================================== */}
      {showScheduleModal && selectedRequest && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <FiClock className="text-indigo-600" /> Schedule Social Media Post
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Choose the exact date and time for this creative to be published automatically to your connected social channels.
            </p>

            <form onSubmit={handleConfirmSchedule} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                  Pick Date & Time (Your Local Time)
                </label>
                <input 
                  type="datetime-local"
                  required
                  min={minDateTime}
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono bg-gray-50/50"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Quick Shortcuts:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button 
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() + 2 * 3600 * 1000);
                      setScheduledDateTime(formatDateTimeLocal(d));
                    }}
                    className="p-2 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 rounded-lg text-left transition-colors font-medium"
                  >
                    ⚡ In 2 Hours
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(10, 0, 0, 0);
                      setScheduledDateTime(formatDateTimeLocal(d));
                    }}
                    className="p-2 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 rounded-lg text-left transition-colors font-medium"
                  >
                    ☀️ Tomorrow 10:00 AM
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(18, 0, 0, 0);
                      setScheduledDateTime(formatDateTimeLocal(d));
                    }}
                    className="p-2 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 rounded-lg text-left transition-colors font-medium"
                  >
                    🌙 Tomorrow 6:00 PM
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const daysUntilFriday = (5 - d.getDay() + 7) % 7 || 7;
                      d.setDate(d.getDate() + daysUntilFriday);
                      d.setHours(17, 0, 0, 0);
                      setScheduledDateTime(formatDateTimeLocal(d));
                    }}
                    className="p-2 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 rounded-lg text-left transition-colors font-medium"
                  >
                    🎉 This Friday 5:00 PM
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={scheduling || !scheduledDateTime}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5"
                >
                  {scheduling ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct SMO Post Creator Modal for Client */}
      <CreateSmoPostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => fetchSMO()}
        currentUser={{ id: myClientId, name: userName || clientName || 'Client', role: 'client' }}
        initialClientId={myClientId}
        lockClient={true}
      />
    </div>
  );
}
