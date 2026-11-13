/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';
import { 
  FiX, FiUploadCloud, FiImage, FiCheckCircle, FiClock, 
  FiSend, FiCalendar, FiLink, FiTrash2, FiUser, FiCheck, 
  FiLayers, FiAlertCircle, FiShare2
} from 'react-icons/fi';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
import { FaWandMagicSparkles } from 'react-icons/fa6';
import Swal from 'sweetalert2';

export default function CreateSmoPostModal({
  isOpen,
  onClose,
  onSuccess,
  currentUser = null,
  initialClientId = '',
  lockClient = false,
  clientsList = null
}) {
  const [clients, setClients] = useState(clientsList || []);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || '');

  // Form fields
  const [requirements, setRequirements] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageInputMode, setImageInputMode] = useState('upload'); // 'upload' | 'url'
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('#Flymedia #DigitalMarketing #Trending');
  const [platforms, setPlatforms] = useState(['facebook', 'instagram']);
  const [actionType, setActionType] = useState('approval'); // 'approval' | 'schedule' | 'publish'
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [minDateTime, setMinDateTime] = useState('');

  // UI state
  const [previewTab, setPreviewTab] = useState('facebook'); // 'facebook' | 'instagram'
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Set min datetime for scheduling
  useEffect(() => {
    const now = new Date(Date.now() + 5 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setMinDateTime(localIso);
  }, []);

  // Fetch clients if not provided and not locked
  useEffect(() => {
    if (clientsList && clientsList.length > 0) {
      setClients(clientsList);
      if (!selectedClientId && clientsList[0]) {
        setSelectedClientId(clientsList[0].id || clientsList[0].clientId);
      }
      return;
    }

    if (isOpen && !lockClient) {
      let isMounted = true;
      async function loadClients() {
        try {
          setLoadingClients(true);
          const res = await fetch('/api/employees');
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.data)) {
            const clientOnly = data.data.filter(
              (u) => (u.role || '').toLowerCase() === 'client'
            );
            setClients(clientOnly);
            if (!selectedClientId && clientOnly.length > 0) {
              setSelectedClientId(initialClientId || clientOnly[0].id);
            }
          }
        } catch (err) {
          console.error('Failed to load clients:', err);
        } finally {
          if (isMounted) setLoadingClients(false);
        }
      }
      loadClients();
      return () => { isMounted = false; };
    }
  }, [isOpen, lockClient, clientsList, initialClientId, selectedClientId]);

  // Sync initialClientId if provided
  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
    }
  }, [initialClientId]);

  if (!isOpen) return null;

  const selectedClient = clients.find(
    (c) => String(c.id || c.clientId) === String(selectedClientId)
  );

  const clientDisplayName = selectedClient?.company_name || selectedClient?.name || (lockClient ? 'Client' : 'Select Client');

  // Handle Image Upload
  const handleFileUpload = async (e) => {
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
        setBannerUrl(data.fileUrls[0]);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Banner uploaded successfully!',
          showConfirmButton: false,
          timer: 2000
        });
      } else {
        throw new Error(data.error || 'Image upload failed.');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Upload Failed', text: err.message });
    } finally {
      setUploadingImage(false);
    }
  };

  // Apply Manual URL
  const handleApplyUrl = () => {
    if (!imageUrlInput.trim()) return;
    setBannerUrl(imageUrlInput.trim());
    setImageUrlInput('');
  };

  // Generate AI Caption
  const handleGenerateAiCaption = async () => {
    if (!requirements.trim() && !caption.trim()) {
      Swal.fire({
        icon: 'info',
        title: 'Topic Required',
        text: 'Please enter a Post Title or Campaign Topic to generate relevant AI copy.'
      });
      return;
    }

    try {
      setGeneratingAi(true);
      const res = await fetch('/api/smo/ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: requirements.trim() || caption.trim(),
          brandName: clientDisplayName,
          bannerUrl: bannerUrl || undefined
        })
      });
      const data = await res.json();

      if (data.success && data.caption) {
        setCaption(data.caption);
        if (data.hashtags) setHashtags(data.hashtags);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: '✨ AI Caption & Hashtags Generated!',
          showConfirmButton: false,
          timer: 2200
        });
      } else {
        throw new Error(data.error || 'Failed to generate copy.');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'AI Generation Failed', text: err.message });
    } finally {
      setGeneratingAi(false);
    }
  };

  // Quick Preset Helper for Scheduling
  const setQuickSchedule = (hoursAhead) => {
    const d = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    const isoVal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setScheduledDateTime(isoVal);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedClientId) {
      Swal.fire({ icon: 'warning', title: 'Missing Client', text: 'Please select a client for this post.' });
      return;
    }

    if (!requirements.trim() && !caption.trim() && !bannerUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'Incomplete Post',
        text: 'Please provide at least a post topic, banner graphic, or caption.'
      });
      return;
    }

    if (actionType === 'schedule') {
      if (!scheduledDateTime) {
        Swal.fire({ icon: 'warning', title: 'Schedule Required', text: 'Please pick a date and time to schedule this post.' });
        return;
      }
      const chosenTime = new Date(scheduledDateTime.replace(' ', 'T')).getTime();
      if (chosenTime <= Date.now()) {
        Swal.fire({ icon: 'warning', title: 'Invalid Time', text: 'Scheduled time must be in the future.' });
        return;
      }
    }

    if (actionType === 'publish' && !bannerUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'Banner Graphic Required',
        text: 'Meta requires an image to publish a post. Please upload or link a banner graphic first, or choose "Ready for Approval" to design it later.'
      });
      return;
    }

    try {
      setSubmitting(true);

      const creatorRole = (currentUser?.role || currentUser?.dbRole || 'staff').toLowerCase();
      const creatorName = currentUser?.name || 'SMO Specialist';
      const creatorId = currentUser?.id || null;

      const payload = {
        clientId: selectedClientId,
        requirements: requirements.trim() || caption.slice(0, 100) || 'SMO Social Post',
        banner_url: bannerUrl || null,
        caption: caption.trim(),
        hashtags: hashtags.trim(),
        platforms,
        status: actionType === 'schedule' ? 'Scheduled' : actionType === 'publish' ? 'Published' : 'Ready for Approval',
        scheduled_at: actionType === 'schedule' ? scheduledDateTime : null,
        publishNow: actionType === 'publish',
        simulate: false,
        creator_id: creatorId,
        creator_name: creatorName,
        creator_role: creatorRole,
        assigned_tl_id: creatorRole.includes('leader') || creatorRole === 'tl' ? creatorId : null
      };

      const res = await fetch('/api/client-services/smo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        if (actionType === 'publish') {
          const pubRes = data.data?.publishResult;
          if (pubRes?.success) {
            let details = '';
            if (pubRes.results?.facebook?.success) {
              details += '<p style="margin-top:4px;">📘 <strong>Facebook Page:</strong> Posted live successfully!</p>';
            }
            if (pubRes.results?.instagram?.success) {
              details += '<p style="margin-top:4px;">📸 <strong>Instagram Business:</strong> Posted live successfully!</p>';
            }
            Swal.fire({
              icon: 'success',
              title: '🎉 SMO Post Published Live to Meta!',
              html: `
                <div style="text-align: left; font-size: 0.9rem;">
                  <p>Your post was published live to the client's Meta social feeds!</p>
                  ${details}
                </div>
              `,
              confirmButtonColor: '#ec4899'
            });
          } else {
            const errDetail = pubRes?.error || 'Live publication to Meta could not be completed.';
            Swal.fire({
              icon: 'warning',
              title: 'Saved, but Meta Publish Issue',
              html: `
                <div style="text-align: left; font-size: 0.9rem;">
                  <p>The post was created in your system, but publishing to Facebook/Instagram failed:</p>
                  <p style="margin-top: 8px; color: #ef4444; font-weight: 600;">${errDetail}</p>
                  <p style="margin-top: 8px; color: #64748b; font-size: 0.8rem;">The post has been placed in "Ready for Approval" so you can fix credentials and publish it whenever you wish.</p>
                </div>
              `,
              confirmButtonColor: '#ec4899'
            });
          }
        } else if (actionType === 'schedule') {
          Swal.fire({
            icon: 'success',
            title: '🎉 SMO Post Scheduled!',
            text: `The SMO post has been scheduled for publication on ${new Date(scheduledDateTime).toLocaleString()}!`,
            confirmButtonColor: '#ec4899'
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: '🎉 SMO Post Created!',
            text: 'The SMO post has been created and delivered to the client for approval!',
            confirmButtonColor: '#ec4899'
          });
        }

        // Reset fields
        setRequirements('');
        setBannerUrl('');
        setCaption('');
        setHashtags('#Flymedia #DigitalMarketing #Trending');
        setActionType('approval');
        setScheduledDateTime('');

        onSuccess?.(data.data);
        onClose();
      } else {
        throw new Error(data.error || 'Failed to create SMO post.');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error Creating Post', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-pink-500 to-rose-600 text-white rounded-2xl shadow-md shadow-pink-500/20">
              <FiShare2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Create SMO Social Post
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300">
                  {currentUser?.role || 'Creator'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Craft banner graphics, generate AI captions, preview live mockups, and deliver, schedule, or publish.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (7 cols) */}
          <form onSubmit={handleSubmit} id="create-smo-form" className="lg:col-span-7 space-y-4">
            {/* Client Selector (if not locked) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Client / Business Account *
              </label>
              {lockClient ? (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <FiUser className="text-pink-500" />
                  <span>{clientDisplayName}</span>
                  <span className="text-xs text-slate-400 font-normal ml-auto">(Your account)</span>
                </div>
              ) : (
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  disabled={loadingClients}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-pink-500 outline-none"
                  required
                >
                  <option value="">-- Choose Client --</option>
                  {clients.map((c) => (
                    <option key={c.id || c.clientId} value={c.id || c.clientId}>
                      {c.company_name ? `${c.company_name} (${c.name})` : c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Post Title / Topic */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Campaign / Post Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Diwali Mega Sale 30% Off, Summer Launch Campaign"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-pink-500 outline-none"
                required
              />
            </div>

            {/* Banner Image Upload & Preview */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FiImage className="text-pink-600" /> Banner / Creative Image
                </span>
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setImageInputMode('upload')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      imageInputMode === 'upload' 
                        ? 'bg-pink-600 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode('url')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      imageInputMode === 'url' 
                        ? 'bg-pink-600 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Paste URL
                  </button>
                </div>
              </div>

              {bannerUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-52 bg-slate-900/5 group">
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    className="w-full h-44 object-contain mx-auto"
                  />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBannerUrl('')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center gap-1 shadow-md hover:bg-rose-700"
                    >
                      <FiTrash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              ) : imageInputMode === 'upload' ? (
                <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 dark:hover:border-pink-500 hover:bg-pink-50/20 transition-all text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <FiUploadCloud className={`text-2xl text-pink-500 mb-1.5 ${uploadingImage ? 'animate-bounce' : ''}`} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {uploadingImage ? 'Uploading creative...' : 'Click to select or drag & drop banner'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, WEBP, or SVG up to 25MB</span>
                </label>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/banner.png"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-pink-500 outline-none text-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-sm"
                  >
                    Set URL
                  </button>
                </div>
              )}
            </div>

            {/* Caption & AI Assistant */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Caption / Social Copy
                </label>
                <button
                  type="button"
                  onClick={handleGenerateAiCaption}
                  disabled={generatingAi}
                  className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold rounded-lg shadow-sm hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <FaWandMagicSparkles className={generatingAi ? 'animate-spin' : ''} size={11} />
                  <span>{generatingAi ? 'Generating Copy...' : '✨ Generate AI Caption'}</span>
                </button>
              </div>
              <textarea
                rows={3}
                placeholder="Write engaging social media caption or click 'Generate AI Caption'..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-pink-500 outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Hashtags */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Hashtags
              </label>
              <input
                type="text"
                placeholder="#Flymedia #Trending #DiwaliSale #Marketing"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-pink-600 dark:text-pink-400 font-semibold placeholder-slate-400 focus:ring-2 focus:ring-pink-500 outline-none"
              />
            </div>

            {/* Target Platforms */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Target Social Platforms
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500">
                  <input
                    type="checkbox"
                    checked={platforms.includes('facebook')}
                    onChange={(e) => {
                      const set = new Set(platforms);
                      e.target.checked ? set.add('facebook') : set.delete('facebook');
                      setPlatforms(Array.from(set));
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <FaFacebook className="text-blue-600 text-base" /> Facebook Page
                </label>

                <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-pink-500">
                  <input
                    type="checkbox"
                    checked={platforms.includes('instagram')}
                    onChange={(e) => {
                      const set = new Set(platforms);
                      e.target.checked ? set.add('instagram') : set.delete('instagram');
                      setPlatforms(Array.from(set));
                    }}
                    className="rounded text-pink-600 focus:ring-pink-500"
                  />
                  <FaInstagram className="text-pink-600 text-base" /> Instagram Business
                </label>
              </div>
            </div>

            {/* Publishing & Delivery Mode */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                Publication Workflow
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActionType('approval')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    actionType === 'approval'
                      ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-300 ring-2 ring-cyan-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                    <FiCheckCircle className="text-cyan-600" /> Ready for Approval
                  </div>
                  <div className="text-[10px] text-slate-500">Deliver to client queue</div>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('schedule')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    actionType === 'schedule'
                      ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 ring-2 ring-purple-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                    <FiClock className="text-purple-600" /> Schedule Post
                  </div>
                  <div className="text-[10px] text-slate-500">Auto-publish at time</div>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('publish')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    actionType === 'publish'
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                    <FiSend className="text-emerald-600" /> Publish Now
                  </div>
                  <div className="text-[10px] text-slate-500">Live Meta Graph API</div>
                </button>
              </div>

              {/* Schedule Datetime Picker (Conditional) */}
              {actionType === 'schedule' && (
                <div className="mt-3 p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <FiCalendar size={13} /> Select Date & Time:
                    </span>
                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setQuickSchedule(24)}
                        className="px-2 py-0.5 rounded bg-white dark:bg-purple-900 text-purple-700 dark:text-purple-200 border border-purple-300 dark:border-purple-700 hover:bg-purple-100"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickSchedule(48)}
                        className="px-2 py-0.5 rounded bg-white dark:bg-purple-900 text-purple-700 dark:text-purple-200 border border-purple-300 dark:border-purple-700 hover:bg-purple-100"
                      >
                        In 2 Days
                      </button>
                    </div>
                  </div>
                  <input
                    type="datetime-local"
                    min={minDateTime}
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    required={actionType === 'schedule'}
                  />
                </div>
              )}
            </div>
          </form>

          {/* Right Column: Live Mockup Social Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FiLayers size={13} /> Live Post Preview
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewTab('facebook')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                    previewTab === 'facebook'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FaFacebook size={12} /> FB
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('instagram')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                    previewTab === 'instagram'
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FaInstagram size={12} /> IG
                </button>
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950/60 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
              {previewTab === 'facebook' ? (
                /* Facebook Post Mockup */
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 w-full max-w-[380px] overflow-hidden text-xs">
                  {/* Header */}
                  <div className="p-3 flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                      {clientDisplayName.charAt(0) || 'C'}
                    </div>
                    <div className="leading-tight flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {clientDisplayName}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>Just now</span> &bull; <span>🌐 Public</span>
                      </div>
                    </div>
                    <FaFacebook className="text-blue-600 text-sm ml-auto" />
                  </div>

                  {/* Caption */}
                  <div className="p-3 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                    {caption ? (
                      <>
                        <p>{caption}</p>
                        {hashtags && <p className="text-blue-600 font-medium mt-1">{hashtags}</p>}
                      </>
                    ) : (
                      <p className="text-slate-400 italic">Caption and promotional copy will appear here...</p>
                    )}
                  </div>

                  {/* Banner Image */}
                  <div className="w-full bg-slate-950 flex items-center justify-center min-h-[180px] max-h-[260px] overflow-hidden">
                    {bannerUrl ? (
                      <img
                        src={bannerUrl}
                        alt="FB Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-slate-500">
                        <FiImage size={32} className="mb-2 text-slate-600" />
                        <span className="text-xs">Banner Graphic Preview</span>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-around text-slate-500 text-[11px] font-semibold">
                    <span className="hover:text-blue-600 cursor-pointer">👍 Like</span>
                    <span className="hover:text-blue-600 cursor-pointer">💬 Comment</span>
                    <span className="hover:text-blue-600 cursor-pointer">↗ Share</span>
                  </div>
                </div>
              ) : (
                /* Instagram Post Mockup */
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 w-full max-w-[380px] overflow-hidden text-xs">
                  {/* IG Header */}
                  <div className="p-2.5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-7 h-7 rounded-full p-[1.5px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
                      <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center font-bold text-[10px] text-pink-600">
                        {clientDisplayName.charAt(0) || 'I'}
                      </div>
                    </div>
                    <div className="leading-tight flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate text-[11px]">
                        {clientDisplayName.toLowerCase().replace(/\s+/g, '_')}
                      </div>
                      <div className="text-[9px] text-slate-400">Sponsored</div>
                    </div>
                    <FaInstagram className="text-pink-600 text-sm ml-auto" />
                  </div>

                  {/* IG Banner */}
                  <div className="w-full aspect-square bg-slate-950 flex items-center justify-center overflow-hidden">
                    {bannerUrl ? (
                      <img
                        src={bannerUrl}
                        alt="IG Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-slate-500">
                        <FiImage size={32} className="mb-2 text-slate-600" />
                        <span className="text-xs">Banner Graphic Preview</span>
                      </div>
                    )}
                  </div>

                  {/* IG Footer & Caption */}
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="cursor-pointer hover:text-rose-500">❤️</span>
                        <span className="cursor-pointer">💬</span>
                        <span className="cursor-pointer">✈️</span>
                      </div>
                      <span className="cursor-pointer">🔖</span>
                    </div>
                    <div className="font-bold text-[10px] text-slate-900 dark:text-white">
                      Liked by marketing_pros and others
                    </div>
                    <div className="text-slate-800 dark:text-slate-200 text-[11px] leading-relaxed max-h-24 overflow-y-auto">
                      <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                        {clientDisplayName.toLowerCase().replace(/\s+/g, '_')}
                      </span>
                      {caption ? (
                        <>
                          <span>{caption}</span>
                          {hashtags && <p className="text-pink-600 font-semibold mt-0.5">{hashtags}</p>}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Caption copy preview...</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <FiCheck className="text-emerald-500" />
            <span>Posting for: <strong>{clientDisplayName}</strong></span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-smo-form"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-md shadow-pink-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FiSend size={13} />
              <span>
                {submitting
                  ? 'Saving Post...'
                  : actionType === 'schedule'
                  ? 'Schedule Post'
                  : actionType === 'publish'
                  ? 'Publish Live Now'
                  : 'Create & Deliver for Approval'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

