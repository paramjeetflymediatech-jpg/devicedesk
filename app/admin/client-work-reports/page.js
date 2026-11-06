/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FiFileText, FiCheckCircle, FiClock, FiAlertCircle, FiXCircle, 
  FiTrendingUp, FiSend, FiEye, FiTrash2, FiShare2, FiRefreshCw, 
  FiDownload, FiSearch, FiFilter, FiSave, FiX, FiCheck, FiImage, 
  FiRepeat, FiCalendar, FiUser, FiBriefcase, FiMessageCircle, 
  FiHeart, FiBookmark, FiExternalLink, FiLayers, FiShield
} from 'react-icons/fi';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
import { FaWandMagicSparkles } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import Pagination from '@/app/components/Pagination.js';
import GoogleDriveBadge from '@/app/components/GoogleDriveBadge.js';

function parseAttachments(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (e) {}
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [trimmed].filter(Boolean);
  }
  return [];
}

function extractFirstImage(val) {
  if (!val) return null;
  const list = parseAttachments(val);
  for (const u of list) {
    if (typeof u === 'string' && /\.(jpeg|jpg|png|webp|svg|gif)($|\?)/i.test(u)) {
      return u;
    }
  }
  return list[0] || null;
}

export default function AdminClientWorkReportsPage() {
  // Data States
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Social Post & Preview Modal State
  const [selectedReq, setSelectedReq] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [previewTab, setPreviewTab] = useState('facebook'); // 'facebook' | 'instagram'
  const [editCaption, setEditCaption] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [targetPlatforms, setTargetPlatforms] = useState(['facebook', 'instagram']);
  const [publishing, setPublishing] = useState(false);
  const [savingCopy, setSavingCopy] = useState(false);
  const [regeneratingAI, setRegeneratingAI] = useState(false);

  // Scheduling Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReq, setRejectReq] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Full Details Modal State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailReq, setDetailReq] = useState(null);

  // Image Zoom Modal State
  const [fullImageZoom, setFullImageZoom] = useState(null);

  const fetchData = async () => {
    try {
      const [smoRes, srRes] = await Promise.all([
        fetch('/api/client-services/smo'),
        fetch('/api/client-services/requests?viewerRole=Admin')
      ]);

      const smoData = await smoRes.json();
      const srData = await srRes.json();

      const smoList = (smoData.success && Array.isArray(smoData.data)) ? smoData.data : [];
      const srList = (srData.success && Array.isArray(srData.data)) ? srData.data : [];

      // Map of SMO requests by ID
      const smoMap = new Map();
      smoList.forEach(item => {
        smoMap.set(item.id, item);
      });

      // Merge and unify records
      const unified = [];
      const seenIds = new Set();

      // 1. Process SMO requests first (these have Meta publishing capabilities)
      smoList.forEach(smo => {
        seenIds.add(smo.id);
        const matchedSr = srList.find(s => s.id === smo.id);

        let parsedPlatforms = ['facebook', 'instagram'];
        if (smo.platforms) {
          try {
            parsedPlatforms = typeof smo.platforms === 'string' ? JSON.parse(smo.platforms) : smo.platforms;
          } catch (e) {
            parsedPlatforms = ['facebook', 'instagram'];
          }
        }

        unified.push({
          id: smo.id,
          clientId: smo.client_id,
          client_name: smo.client_name || matchedSr?.client_name || 'Client',
          client_avatar: smo.client_avatar,
          company_name: smo.company_name || 'Business Account',
          service_type: matchedSr?.service_type || 'SMO / Social Media',
          requirements: smo.requirements || matchedSr?.requirements || 'No brief provided',
          banner_url: smo.banner_url || extractFirstImage(smo.task_deliverables) || extractFirstImage(matchedSr?.attachment),
          attachment: matchedSr?.attachment || null,
          drive_url: matchedSr?.drive_url || null,
          caption: smo.caption || matchedSr?.caption || '',
          hashtags: smo.hashtags || matchedSr?.hashtags || '#Flymedia #SocialMedia',
          platforms: Array.isArray(parsedPlatforms) ? parsedPlatforms : ['facebook', 'instagram'],
          status: smo.status || 'Pending Design',
          tl_name: matchedSr?.tl_name || 'Unassigned',
          assigned_tl_id: matchedSr?.assigned_tl_id || smo.assigned_tl_id,
          designer_name: smo.designer_name || smo.task_designer || matchedSr?.specialist_name || 'Unassigned',
          scheduled_at: smo.scheduled_at,
          published_at: smo.published_at,
          social_post_ids: smo.social_post_ids,
          has_meta_token: Boolean(smo.has_meta_token),
          fb_page_id: smo.fb_page_id,
          ig_business_id: smo.ig_business_id,
          revision_notes: smo.revision_notes || matchedSr?.revision_notes,
          created_at: smo.created_at || matchedSr?.created_at || new Date().toISOString(),
          is_smo: true
        });
      });

      // 2. Include any non-SMO service requests (e.g. SEO, Web Dev, Content)
      srList.forEach(sr => {
        if (!seenIds.has(sr.id)) {
          seenIds.add(sr.id);
          unified.push({
            id: sr.id,
            clientId: sr.clientId,
            client_name: sr.client_name || 'Client',
            client_avatar: null,
            company_name: 'Client Account',
            service_type: sr.service_type || 'General Service',
            requirements: sr.requirements || 'No brief provided',
            banner_url: extractFirstImage(sr.deliverable_files) || extractFirstImage(sr.attachment),
            attachment: sr.attachment || null,
            drive_url: sr.drive_url || null,
            caption: sr.caption || '',
            hashtags: sr.hashtags || '',
            platforms: [],
            status: sr.status || 'Pending',
            tl_name: sr.tl_name || 'Unassigned',
            assigned_tl_id: sr.assigned_tl_id,
            designer_name: sr.specialist_name || 'Unassigned',
            scheduled_at: null,
            published_at: null,
            social_post_ids: null,
            has_meta_token: false,
            fb_page_id: null,
            ig_business_id: null,
            revision_notes: sr.revision_notes,
            created_at: sr.created_at || new Date().toISOString(),
            is_smo: false
          });
        }
      });

      // Sort by created_at DESC
      unified.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRequests(unified);
    } catch (err) {
      console.error('Error fetching client work reports:', err);
      Swal.fire({
        icon: 'error',
        title: 'Fetch Error',
        text: 'Failed to load client work reports. Please check your connection.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        await fetchData();
      }
    })();
    return () => { active = false; };
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const total = requests.length;
    let readyForApproval = 0;
    let published = 0;
    let inProduction = 0;
    let scheduled = 0;
    let rejected = 0;

    requests.forEach(r => {
      const s = (r.status || '').toLowerCase();
      if (s === 'ready for approval' || s === 'approved') readyForApproval++;
      else if (s === 'published') published++;
      else if (s === 'scheduled') scheduled++;
      else if (s === 'rejected') rejected++;
      else if (s === 'in progress' || s === 'under review' || s === 'assigned' || s === 'pending design') inProduction++;
    });

    return { total, readyForApproval, published, inProduction, scheduled, rejected };
  }, [requests]);

  // Available Service Types for Filter
  const availableServiceTypes = useMemo(() => {
    const set = new Set();
    requests.forEach(r => {
      if (r.service_type) set.add(r.service_type);
    });
    return Array.from(set);
  }, [requests]);

  // Filtered and Searched Requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const clientMatch = (req.client_name || '').toLowerCase().includes(q);
        const compMatch = (req.company_name || '').toLowerCase().includes(q);
        const idMatch = (req.id || '').toLowerCase().includes(q);
        const reqMatch = (req.requirements || '').toLowerCase().includes(q);
        const sTypeMatch = (req.service_type || '').toLowerCase().includes(q);
        if (!clientMatch && !compMatch && !idMatch && !reqMatch && !sTypeMatch) {
          return false;
        }
      }

      // Status Filter
      if (statusFilter !== 'All') {
        const s = (req.status || '').toLowerCase();
        const f = statusFilter.toLowerCase();
        if (f === 'in production') {
          if (!['in progress', 'under review', 'assigned', 'pending design'].includes(s)) return false;
        } else if (f === 'ready for approval') {
          if (s !== 'ready for approval' && s !== 'approved') return false;
        } else if (s !== f) {
          return false;
        }
      }

      // Platform Filter
      if (platformFilter !== 'All') {
        if (!Array.isArray(req.platforms) || !req.platforms.includes(platformFilter.toLowerCase())) {
          return false;
        }
      }

      // Service Type Filter
      if (serviceTypeFilter !== 'All') {
        if ((req.service_type || '').toLowerCase() !== serviceTypeFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [requests, searchTerm, statusFilter, platformFilter, serviceTypeFilter]);

  // Paginated Results
  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const currentRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Open Social Preview & Post Modal
  const openPostModal = (req) => {
    setSelectedReq(req);
    setEditCaption(req.caption || req.requirements || '');
    setEditHashtags(req.hashtags || '#Flymedia #SocialMedia');
    setTargetPlatforms(req.platforms && req.platforms.length > 0 ? req.platforms : ['facebook', 'instagram']);
    setPreviewTab(req.platforms && req.platforms.includes('facebook') ? 'facebook' : 'instagram');
    setShowPostModal(true);
  };

  // Live Meta Publishing Handler
  const handlePublish = async (simulate = false) => {
    if (!selectedReq) return;
    try {
      setPublishing(true);

      // Auto-save edited caption if changed
      if (editCaption !== selectedReq.caption || editHashtags !== selectedReq.hashtags) {
        try {
          await fetch('/api/client-services/smo', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_copy',
              id: selectedReq.id,
              caption: editCaption,
              hashtags: editHashtags
            })
          });
        } catch (e) {}
      }

      const isRepost = selectedReq.status === 'Published';
      const res = await fetch('/api/smo/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedReq.id,
          simulate,
          platforms: targetPlatforms.length > 0 ? targetPlatforms : ['facebook']
        })
      });
      const data = await res.json();

      if (data.success) {
        setShowPostModal(false);
        fetchData();
        Swal.fire({
          icon: 'success',
          title: simulate 
            ? (isRepost ? 'Simulation Complete (Repost)' : 'Simulation Complete') 
            : (isRepost ? '🎉 Reposted to Social Media!' : '🎉 Published Live to Social Media!'),
          html: `
            <div style="text-align: left; font-size: 0.9rem;">
              <p>${isRepost ? 'Your creative banner was reposted live via the official Meta Graph API.' : 'Your creative banner was published live via the official Meta Graph API.'}</p>
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
          confirmButtonText: 'Test Simulation Instead',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#0284c7'
        }).then((result) => {
          if (result.isConfirmed) {
            handlePublish(true);
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Publishing Failed',
          text: data.error || 'Meta returned an error during live publishing.'
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Publishing Error', text: err.message });
    } finally {
      setPublishing(false);
    }
  };

  // AI Caption Regeneration
  const handleRegenerateAICaption = async () => {
    if (!selectedReq) return;
    try {
      setRegeneratingAI(true);
      const res = await fetch('/api/client-services/smo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate_ai_caption',
          id: selectedReq.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditCaption(data.caption);
        setEditHashtags(data.hashtags);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: '✨ AI Caption generated!',
          showConfirmButton: false,
          timer: 2500
        });
      } else {
        Swal.fire('Error', data.error || 'AI generation failed', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setRegeneratingAI(false);
    }
  };

  // Save Modified Caption & Hashtags
  const handleSaveCopy = async () => {
    if (!selectedReq) return;
    try {
      setSavingCopy(true);
      const res = await fetch('/api/client-services/smo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_copy',
          id: selectedReq.id,
          caption: editCaption,
          hashtags: editHashtags
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedReq(prev => ({
          ...prev,
          caption: editCaption,
          hashtags: editHashtags
        }));
        fetchData();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Caption updated successfully!',
          showConfirmButton: false,
          timer: 2000
        });
      } else {
        Swal.fire('Error', data.error || 'Failed to save copy', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSavingCopy(false);
    }
  };

  // Schedule Post Modal Trigger
  const openScheduleModal = (req) => {
    setSelectedReq(req);
    // Default scheduled time: 2 hours from now formatted for input datetime-local
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const iso = new Date(future.getTime() - future.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setScheduledDateTime(iso);
    setShowScheduleModal(true);
  };

  // Schedule Post Submit
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq || !scheduledDateTime) return;
    try {
      setScheduling(true);
      const res = await fetch('/api/client-services/smo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule_post',
          id: selectedReq.id,
          scheduled_at: scheduledDateTime
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowScheduleModal(false);
        setShowPostModal(false);
        fetchData();
        Swal.fire({
          icon: 'success',
          title: 'Post Scheduled!',
          text: data.message || `Post scheduled for ${new Date(scheduledDateTime).toLocaleString()}`,
          confirmButtonColor: '#6366f1'
        });
      } else {
        Swal.fire('Scheduling Failed', data.error || 'Failed to schedule post.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setScheduling(false);
    }
  };

  // Cancel Scheduled Post
  const handleCancelSchedule = async (reqId) => {
    try {
      const res = await fetch('/api/client-services/smo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_schedule', id: reqId })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        if (selectedReq && selectedReq.id === reqId) {
          setShowPostModal(false);
        }
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Schedule cancelled. Post returned to Ready for Approval.',
          showConfirmButton: false,
          timer: 3000
        });
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  // Open Reject Modal
  const openRejectModal = (req) => {
    setRejectReq(req);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  // Submit Rejection
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReq || !rejectionReason.trim()) return;

    try {
      setSubmittingReject(true);
      const res = await fetch('/api/client-services/smo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_request',
          id: rejectReq.id,
          rejection_notes: rejectionReason
        })
      });
      const data = await res.json();

      if (data.success) {
        setShowRejectModal(false);
        if (showPostModal && selectedReq?.id === rejectReq.id) {
          setShowPostModal(false);
        }
        fetchData();
        Swal.fire({
          icon: 'success',
          title: 'Request Rejected',
          text: 'The request has been marked as Rejected. The client and team leader have been notified.',
          confirmButtonColor: '#ef4444'
        });
      } else {
        Swal.fire('Error', data.error || 'Failed to reject request', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSubmittingReject(false);
    }
  };

  // Permanent Delete Request Handler
  const handleDeleteRequest = async (req) => {
    const confirm = await Swal.fire({
      title: 'Delete Client Request?',
      html: `
        <div style="text-align: left; font-size: 0.9rem;">
          <p>Are you sure you want to permanently delete request <strong>#${req.id}</strong>?</p>
          <p style="color: #ef4444; margin-top: 6px;">⚠️ This will delete the service request, deliverable proofs, and associated tasks across the entire system. This action cannot be undone.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, permanently delete'
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/client-services/smo?id=${encodeURIComponent(req.id)}&viewerRole=Admin`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        fetchData();
        if (selectedReq?.id === req.id) setShowPostModal(false);
        if (detailReq?.id === req.id) setShowDetailsModal(false);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Request permanently deleted!',
          showConfirmButton: false,
          timer: 3000
        });
      } else {
        Swal.fire('Delete Failed', data.error || 'Failed to delete request', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRequests.length === 0) {
      Swal.fire('No Data', 'No records match your current filters to export.', 'info');
      return;
    }

    const headers = ['ID', 'Date', 'Client Name', 'Company', 'Service Type', 'Status', 'Team Leader', 'Specialist / Designer', 'Caption', 'Platforms', 'Published At', 'Scheduled At'];
    const rows = filteredRequests.map(r => [
      `"${r.id}"`,
      `"${new Date(r.created_at).toLocaleDateString()}"`,
      `"${(r.client_name || '').replace(/"/g, '""')}"`,
      `"${(r.company_name || '').replace(/"/g, '""')}"`,
      `"${(r.service_type || '').replace(/"/g, '""')}"`,
      `"${r.status}"`,
      `"${(r.tl_name || '').replace(/"/g, '""')}"`,
      `"${(r.designer_name || '').replace(/"/g, '""')}"`,
      `"${(r.caption || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${(r.platforms || []).join(', ')}"`,
      `"${r.published_at ? new Date(r.published_at).toLocaleString() : ''}"`,
      `"${r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `client-work-reports-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Status Badge Styling
  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'published') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <FiCheckCircle size={12} /> Published
        </span>
      );
    }
    if (s === 'ready for approval' || s === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-300 shadow-sm animate-pulse">
          <FiCheckCircle size={12} /> Ready for Approval
        </span>
      );
    }
    if (s === 'scheduled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <FiClock size={12} /> Scheduled
        </span>
      );
    }
    if (s === 'under review') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <FiClock size={12} /> Under Review
        </span>
      );
    }
    if (s === 'in progress' || s === 'assigned') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <FiClock size={12} /> In Progress
        </span>
      );
    }
    if (s === 'revision requested') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
          <FiAlertCircle size={12} /> Revision Requested
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <FiXCircle size={12} /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <FiClock size={12} /> {status || 'Pending'}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-900 dark:text-slate-100">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-xl shadow-md">
              <FiFileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Client Work Reports & SMO Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Full administrative overview of client service work, live social publishing to Facebook & Instagram, revision audits, and request lifecycle management.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all cursor-pointer"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm transition-all cursor-pointer"
          >
            <FiDownload size={14} />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* KPI Analytical Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Work Requests */}
        <div 
          onClick={() => { setStatusFilter('All'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${statusFilter === 'All' ? 'border-cyan-500 bg-cyan-50/20 shadow-md ring-2 ring-cyan-500/20' : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Work</span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              <FiLayers size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{metrics.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">All client requests</div>
        </div>

        {/* Ready for Approval */}
        <div 
          onClick={() => { setStatusFilter('Ready for Approval'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${statusFilter === 'Ready for Approval' ? 'border-cyan-500 bg-cyan-50/20 shadow-md ring-2 ring-cyan-500/20' : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-cyan-300'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-600">Ready to Post</span>
            <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600">
              <FiCheckCircle size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{metrics.readyForApproval}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Approved & awaiting publish</div>
        </div>

        {/* Published Live */}
        <div 
          onClick={() => { setStatusFilter('Published'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${statusFilter === 'Published' ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/20' : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-emerald-300'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Published</span>
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600">
              <FiShare2 size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.published}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Live on FB & IG</div>
        </div>

        {/* In Production */}
        <div 
          onClick={() => { setStatusFilter('In Production'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${statusFilter === 'In Production' ? 'border-blue-500 bg-blue-50/20 shadow-md ring-2 ring-blue-500/20' : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-blue-300'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">In Production</span>
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600">
              <FiClock size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{metrics.inProduction}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Design & TL Review</div>
        </div>

        {/* Scheduled Posts */}
        <div 
          onClick={() => { setStatusFilter('Scheduled'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${statusFilter === 'Scheduled' ? 'border-purple-500 bg-purple-50/20 shadow-md ring-2 ring-purple-500/20' : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-purple-300'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Scheduled</span>
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600">
              <FiCalendar size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{metrics.scheduled}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Automated queue</div>
        </div>

        {/* Rejected */}
        <div 
          onClick={() => { setStatusFilter('Rejected'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${statusFilter === 'Rejected' ? 'border-rose-500 bg-rose-50/20 shadow-md ring-2 ring-rose-500/20' : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-rose-300'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Rejected</span>
            <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600">
              <FiXCircle size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{metrics.rejected}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Declined requests</div>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by client, business, ID, requirement..."
            className="w-full pl-10 pr-9 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-slate-800 dark:text-slate-100"
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <FiX size={14} />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="All">All Statuses ({requests.length})</option>
              <option value="Ready for Approval">Ready for Approval ({metrics.readyForApproval})</option>
              <option value="Published">Published ({metrics.published})</option>
              <option value="In Production">In Production ({metrics.inProduction})</option>
              <option value="Scheduled">Scheduled ({metrics.scheduled})</option>
              <option value="Rejected">Rejected ({metrics.rejected})</option>
            </select>
          </div>

          {/* Platform Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-400">Platform:</span>
            <select
              value={platformFilter}
              onChange={(e) => { setPlatformFilter(e.target.value); setCurrentPage(1); }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="All">All Platforms</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>

          {/* Service Type Dropdown */}
          {availableServiceTypes.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-400">Type:</span>
              <select
                value={serviceTypeFilter}
                onChange={(e) => { setServiceTypeFilter(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="All">All Services</option>
                {availableServiceTypes.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Reports Table */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <FiRefreshCw className="animate-spin text-cyan-600 mx-auto mb-3" size={32} />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Loading client work reports...</p>
            <p className="text-xs text-slate-400 mt-1">Aggregating deliverables, proof banners, and live publishing states</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FiFileText size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">No Client Requests Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              {searchTerm || statusFilter !== 'All' || platformFilter !== 'All' 
                ? 'No client requests match your selected search query or filters. Try resetting the filters.'
                : 'There are currently no client service requests in the database.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4">Date & ID</th>
                  <th className="px-5 py-4">Client & Business</th>
                  <th className="px-5 py-4 w-1/4">Requirement Brief</th>
                  <th className="px-5 py-4">Deliverable Banner</th>
                  <th className="px-5 py-4">Assigned TL & Designer</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-center">Platforms</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {currentRequests.map((req) => {
                  const isReadyOrPublished = req.status === 'Ready for Approval' || req.status === 'Published' || req.status === 'Scheduled';
                  const hasBanner = Boolean(req.banner_url);

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* Date & ID */}
                      <td className="px-5 py-4 whitespace-nowrap align-top">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                          #{req.id}
                        </div>
                        <div className="mt-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {req.service_type}
                          </span>
                        </div>
                      </td>

                      {/* Client & Business */}
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {(req.client_name || 'CL').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white leading-tight">
                              {req.client_name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {req.company_name}
                            </div>
                            
                            {/* Meta Connection Badge */}
                            <div className="mt-1.5 flex items-center gap-1.5">
                              {req.has_meta_token ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Meta Linked
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  No Token
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Requirement Brief */}
                      <td className="px-5 py-4 align-top">
                        <p className="text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed">
                          {req.requirements}
                        </p>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => { setDetailReq(req); setShowDetailsModal(true); }}
                            className="text-[11px] font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <FiEye size={12} /> View Full Brief
                          </button>
                          <GoogleDriveBadge source={req} compact />
                        </div>
                      </td>

                      {/* Deliverable Banner Proof */}
                      <td className="px-5 py-4 align-top">
                        {hasBanner ? (
                          <div className="flex items-center gap-3">
                            <div 
                              onClick={() => setFullImageZoom(req.banner_url)}
                              className="relative group w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm cursor-zoom-in bg-slate-100 shrink-0"
                              title="Click to zoom in"
                            >
                              <img
                                src={req.banner_url}
                                alt="Deliverable proof"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <FiEye size={16} />
                              </div>
                            </div>
                            <div className="text-[11px] space-y-1">
                              <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold text-[10px]">
                                Creative Ready
                              </span>
                              <a
                                href={req.banner_url}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                              >
                                <FiDownload size={11} /> Download
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-[11px]">
                            <FiClock size={14} className="shrink-0" />
                            <span>Awaiting banner upload</span>
                          </div>
                        )}
                      </td>

                      {/* Assigned TL & Designer */}
                      <td className="px-5 py-4 align-top whitespace-nowrap">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[10px] uppercase font-bold w-12">TL:</span>
                            <span className={`font-semibold ${req.tl_name !== 'Unassigned' ? 'text-slate-800 dark:text-slate-200' : 'text-amber-500'}`}>
                              {req.tl_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[10px] uppercase font-bold w-12">Artist:</span>
                            <span className={`font-semibold ${req.designer_name !== 'Unassigned' ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                              {req.designer_name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 align-top text-center whitespace-nowrap">
                        {renderStatusBadge(req.status)}
                        {req.status === 'Scheduled' && req.scheduled_at && (
                          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-1">
                            {new Date(req.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {req.status === 'Published' && req.published_at && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                            {new Date(req.published_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </td>

                      {/* Platforms */}
                      <td className="px-5 py-4 align-top text-center whitespace-nowrap">
                        {Array.isArray(req.platforms) && req.platforms.length > 0 ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {req.platforms.includes('facebook') && (
                              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200" title="Facebook Page">
                                <FaFacebook size={13} />
                              </span>
                            )}
                            {req.platforms.includes('instagram') && (
                              <span className="p-1.5 rounded-lg bg-pink-50 text-pink-600 border border-pink-200" title="Instagram Business">
                                <FaInstagram size={13} />
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Post / Repost Button (for any request with a banner or SMO enabled) */}
                          {hasBanner ? (
                            <button
                              type="button"
                              onClick={() => openPostModal(req)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                                req.status === 'Published'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white'
                              }`}
                              title={req.status === 'Published' ? 'Repost creative banner to Facebook/Instagram' : 'Review creative, preview post & publish live'}
                            >
                              {req.status === 'Published' ? (
                                <>
                                  <FiRepeat size={12} />
                                  <span>Repost</span>
                                </>
                              ) : (
                                <>
                                  <FiSend size={12} />
                                  <span>View & Post</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setDetailReq(req); setShowDetailsModal(true); }}
                              className="px-2.5 py-1.5 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                              title="View full requirement details"
                            >
                              Details
                            </button>
                          )}

                          {/* Reject Request Button */}
                          {req.status !== 'Rejected' && (
                            <button
                              type="button"
                              onClick={() => openRejectModal(req)}
                              className="p-2 rounded-xl text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                              title="Reject Request with reason"
                            >
                              <FiXCircle size={15} />
                            </button>
                          )}

                          {/* Delete Request Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRequest(req)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Permanently Delete Request"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Universal Pagination */}
        {!loading && filteredRequests.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredRequests.length}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              itemName="requests"
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. SOCIAL MEDIA LIVE PREVIEW & PUBLISH MODAL */}
      {/* ======================================================== */}
      {showPostModal && selectedReq && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-tr from-pink-500 to-rose-600 text-white rounded-xl shadow-md">
                  <FiShare2 size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    {selectedReq.status === 'Published' ? 'Repost Creative Banner' : 'Review & Publish to Social Media'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Client: <strong className="text-slate-800 dark:text-slate-200">{selectedReq.client_name}</strong> ({selectedReq.company_name}) · ID #{selectedReq.id}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPostModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body: 2 Columns (Mockup Preview on Left, Studio on Right) */}
            <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT: SOCIAL POST MOCKUP (7 COLS) */}
                <div className="lg:col-span-7 flex flex-col items-center">
                  
                  {/* Platform Switcher Tabs */}
                  <div className="flex items-center justify-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-sm mb-4">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('facebook')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        previewTab === 'facebook'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <FaFacebook size={14} /> Facebook Post
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('instagram')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        previewTab === 'instagram'
                          ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <FaInstagram size={14} /> Instagram Feed
                    </button>
                  </div>

                  {/* FACEBOOK POST MOCKUP */}
                  {previewTab === 'facebook' && (
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden text-slate-900 font-sans">
                      {/* FB Header */}
                      <div className="p-3.5 flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                          {(selectedReq.client_name || 'CL').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-sm text-slate-900 truncate">
                              {selectedReq.company_name || selectedReq.client_name}
                            </span>
                            <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                            <span>Just now</span>
                            <span>•</span>
                            <span title="Public">🌐</span>
                          </div>
                        </div>
                        <span className="text-slate-400 text-sm font-bold">•••</span>
                      </div>

                      {/* FB Caption */}
                      <div className="px-3.5 pb-3 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {editCaption || selectedReq.caption || ''}
                        {(editHashtags || selectedReq.hashtags) && (
                          <div className="text-blue-600 font-semibold mt-2">
                            {editHashtags || selectedReq.hashtags}
                          </div>
                        )}
                      </div>

                      {/* FB Banner Image */}
                      <div className="bg-slate-100 border-y border-slate-100 flex items-center justify-center overflow-hidden">
                        <img 
                          src={selectedReq.banner_url} 
                          alt="Banner Creative" 
                          className="w-full max-h-[380px] object-contain mx-auto"
                        />
                      </div>

                      {/* FB Reactions Bar */}
                      <div className="p-3 px-3.5 flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100">
                        <span className="flex items-center gap-1">
                          <span className="p-0.5 rounded-full bg-blue-500 text-white text-[9px]">👍</span>
                          <span>You and 142 others</span>
                        </span>
                        <span>18 comments • 12 shares</span>
                      </div>

                      {/* FB Engagement Buttons */}
                      <div className="grid grid-cols-3 text-center text-xs text-slate-600 font-semibold py-1">
                        <div className="py-2 flex items-center justify-center gap-1.5 hover:bg-slate-50 cursor-pointer">
                          <span>👍</span> Like
                        </div>
                        <div className="py-2 flex items-center justify-center gap-1.5 hover:bg-slate-50 cursor-pointer">
                          <FiMessageCircle /> Comment
                        </div>
                        <div className="py-2 flex items-center justify-center gap-1.5 hover:bg-slate-50 cursor-pointer">
                          <FiShare2 /> Share
                        </div>
                      </div>
                    </div>
                  )}

                  {/* INSTAGRAM POST MOCKUP */}
                  {previewTab === 'instagram' && (
                    <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden text-slate-900 font-sans">
                      {/* IG Header */}
                      <div className="p-3 flex items-center justify-between border-b border-slate-100">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                            <div className="w-full h-full bg-white rounded-full p-[1px]">
                              <div className="w-full h-full bg-pink-100 text-pink-700 font-bold text-xs flex items-center justify-center rounded-full">
                                {(selectedReq.client_name || 'CL').slice(0, 2).toUpperCase()}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-900 lowercase truncate max-w-[200px]">
                            {(selectedReq.company_name || selectedReq.client_name || 'client').replace(/\s+/g, '_').toLowerCase()}
                          </span>
                        </div>
                        <span className="text-slate-400 text-xs font-bold">•••</span>
                      </div>

                      {/* IG Banner Image */}
                      <div className="bg-slate-900/5 aspect-square flex items-center justify-center overflow-hidden">
                        <img 
                          src={selectedReq.banner_url} 
                          alt="Instagram Creative" 
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* IG Actions Bar */}
                      <div className="p-3">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-3 text-slate-800 text-lg">
                            <FiHeart className="text-rose-500" />
                            <FiMessageCircle />
                            <FiSend />
                          </div>
                          <FiBookmark className="text-lg" />
                        </div>
                        <div className="text-xs font-bold text-slate-900 mb-1">
                          Liked by flymediatech and 284 others
                        </div>
                        <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                          <strong className="lowercase mr-1.5 font-bold">
                            {(selectedReq.company_name || selectedReq.client_name || 'client').replace(/\s+/g, '_').toLowerCase()}
                          </strong>
                          {editCaption || selectedReq.caption || ''}
                          {(editHashtags || selectedReq.hashtags) && (
                            <div className="text-blue-900 font-semibold mt-1.5">{editHashtags || selectedReq.hashtags}</div>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-2">
                          Just now
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: EDITABLE SOCIAL COPY & CONTROLS (5 COLS) */}
                <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 flex flex-col space-y-4">
                  
                  {/* Studio Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Social Copy & Publishing Studio</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Live preview reflects these modifications</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRegenerateAICaption}
                      disabled={regeneratingAI}
                      className="px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 cursor-pointer disabled:opacity-50"
                      title="Regenerate high-converting caption using Gemini AI"
                    >
                      <FaWandMagicSparkles className={regeneratingAI ? 'animate-spin' : ''} size={12} />
                      <span>{regeneratingAI ? 'Writing...' : '✨ AI Rewrite'}</span>
                    </button>
                  </div>

                  {/* Caption Editor */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Post Caption
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {editCaption.length} chars
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="Enter the post caption..."
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all resize-y font-sans leading-relaxed"
                    />
                  </div>

                  {/* Hashtags Editor */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                      Hashtags
                    </label>
                    <input
                      type="text"
                      value={editHashtags}
                      onChange={(e) => setEditHashtags(e.target.value)}
                      placeholder="#Flymedia #Trending #SocialMedia..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                    />
                  </div>

                  {/* Target Platforms Checkboxes */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Target Destination Platforms
                    </span>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-200 hover:text-blue-600">
                        <input
                          type="checkbox"
                          checked={targetPlatforms.includes('facebook')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTargetPlatforms(prev => [...new Set([...prev, 'facebook'])]);
                            } else {
                              if (targetPlatforms.length > 1) {
                                setTargetPlatforms(prev => prev.filter(p => p !== 'facebook'));
                              } else {
                                Swal.fire({ toast: true, icon: 'info', title: 'At least one platform must be selected', timer: 2000, showConfirmButton: false });
                              }
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <FaFacebook className="text-blue-600" />
                        <span>Facebook Page</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-200 hover:text-pink-600">
                        <input
                          type="checkbox"
                          checked={targetPlatforms.includes('instagram')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTargetPlatforms(prev => [...new Set([...prev, 'instagram'])]);
                            } else {
                              if (targetPlatforms.length > 1) {
                                setTargetPlatforms(prev => prev.filter(p => p !== 'instagram'));
                              } else {
                                Swal.fire({ toast: true, icon: 'info', title: 'At least one platform must be selected', timer: 2000, showConfirmButton: false });
                              }
                            }
                          }}
                          className="rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                        />
                        <FaInstagram className="text-pink-600" />
                        <span>Instagram Business</span>
                      </label>
                    </div>
                  </div>

                  {/* Meta Connection Diagnostics Box */}
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Meta Access Token:</span>
                      <span className={selectedReq.has_meta_token ? 'text-emerald-600 font-bold' : 'text-amber-500 font-bold'}>
                        {selectedReq.has_meta_token ? 'Connected' : 'Not Linked'}
                      </span>
                    </div>
                    {selectedReq.fb_page_id && (
                      <div className="flex items-center justify-between">
                        <span>FB Page ID:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{selectedReq.fb_page_id}</span>
                      </div>
                    )}
                    {selectedReq.ig_business_id && (
                      <div className="flex items-center justify-between">
                        <span>IG Business ID:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{selectedReq.ig_business_id}</span>
                      </div>
                    )}
                  </div>

                  {/* Save Caption Changes Button */}
                  <div className="pt-2 flex items-center justify-between">
                    {(editCaption !== selectedReq.caption || editHashtags !== selectedReq.hashtags) ? (
                      <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                        ● Unsaved copy changes
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        ✓ Saved to database
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveCopy}
                      disabled={savingCopy}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      <FiSave size={13} />
                      <span>{savingCopy ? 'Saving...' : 'Save Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Action Bar */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => openRejectModal(selectedReq)}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-xl transition-colors cursor-pointer"
                >
                  ❌ Reject Request
                </button>
                <button
                  type="button"
                  onClick={() => openScheduleModal(selectedReq)}
                  className="px-3.5 py-2 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FiClock size={13} />
                  <span>Schedule Post</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handlePublish(true)}
                  disabled={publishing}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-all cursor-pointer"
                  title="Simulate posting in test mode without calling Meta API"
                >
                  🧪 Simulate Post
                </button>

                <button
                  type="button"
                  onClick={() => handlePublish(false)}
                  disabled={publishing}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 shadow-md shadow-pink-500/20 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Publish live to Facebook and/or Instagram via Meta API"
                >
                  {publishing ? (
                    <>
                      <FiRefreshCw className="animate-spin" size={14} />
                      <span>Publishing Live...</span>
                    </>
                  ) : (
                    <>
                      <FiSend size={14} />
                      <span>{selectedReq.status === 'Published' ? 'Repost Live Now' : 'Publish Live Now'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. REJECT REQUEST MODAL */}
      {/* ======================================================== */}
      {showRejectModal && rejectReq && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-600 text-white">
                  <FiXCircle size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Reject Client Request</h3>
                  <p className="text-xs text-slate-500">Request #{rejectReq.id} · {rejectReq.client_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                  Please provide a clear reason for rejecting this work request. This reason will be recorded in the system and communicated to the client and team leader.
                </p>

                {/* Quick Selection Reasons */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    'Insufficient requirements or brief unclear',
                    'Missing source brand assets / logos',
                    'Outside current package quota or expired',
                    'Client requested cancellation',
                    'Duplicate request submission'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  required
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReject || !rejectionReason.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingReject ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SCHEDULE POST MODAL */}
      {/* ======================================================== */}
      {showScheduleModal && selectedReq && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600 text-white">
                  <FiClock size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Schedule Social Post</h3>
                  <p className="text-xs text-slate-500">Request #{selectedReq.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                  Select Publication Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  The automated cron worker will publish this post to Meta when the time arrives.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduling}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {scheduling ? 'Scheduling...' : 'Set Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. FULL DETAILS MODAL */}
      {/* ======================================================== */}
      {showDetailsModal && detailReq && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Request Details #{detailReq.id}
                </h3>
                <p className="text-xs text-slate-500">
                  {detailReq.service_type} · Submitted on {new Date(detailReq.created_at).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Client Name</span>
                  <span className="font-bold text-slate-800 dark:text-white text-sm">{detailReq.client_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Company / Brand</span>
                  <span className="font-bold text-slate-800 dark:text-white text-sm">{detailReq.company_name}</span>
                </div>
              </div>

              {/* Requirements Brief */}
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1.5">Requirement Brief</span>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {detailReq.requirements}
                </div>
              </div>

              {/* Revision / Rejection Notes if any */}
              {detailReq.revision_notes && (
                <div>
                  <span className="text-rose-500 text-[10px] uppercase font-bold block mb-1.5">Feedback / Notes</span>
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 leading-relaxed whitespace-pre-wrap">
                    {detailReq.revision_notes}
                  </div>
                </div>
              )}

              {/* Deliverable Proof */}
              {detailReq.banner_url && (
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1.5">Deliverable Proof Banner</span>
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 max-h-72">
                    <img 
                      src={detailReq.banner_url} 
                      alt="Deliverable" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Attachments / Drive */}
              <div className="flex items-center gap-3">
                <GoogleDriveBadge source={detailReq} />
                {detailReq.attachment && (
                  <a
                    href={detailReq.attachment}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 font-semibold"
                  >
                    <FiDownload size={13} /> Attached File
                  </a>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
              <button
                type="button"
                onClick={() => handleDeleteRequest(detailReq)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <FiTrash2 size={13} /> Delete Request
              </button>

              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. FULL IMAGE ZOOM MODAL */}
      {/* ======================================================== */}
      {fullImageZoom && (
        <div 
          onClick={() => setFullImageZoom(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[1000] flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={fullImageZoom}
              alt="Full size proof"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              onClick={() => setFullImageZoom(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
