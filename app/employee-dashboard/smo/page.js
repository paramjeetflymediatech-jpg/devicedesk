/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiShare2, FiPlus, FiSearch, FiRefreshCw, FiImage, 
  FiClock, FiCheckCircle, FiLayers, FiCalendar, FiExternalLink,
  FiUser, FiSend, FiX, FiCheck, FiTrash2
} from 'react-icons/fi';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { useAuth } from '../../auth/AuthContext';
import CreateSmoPostModal from '@/app/components/modals/CreateSmoPostModal';
import Pagination from '@/app/components/Pagination';

export default function SmoTeamStudioPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewPost, setPreviewPost] = useState(null);

  const fetchPosts = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/client-services/smo');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPosts(data.data);
      }
    } catch (err) {
      console.error('Failed to load SMO posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDeletePost = async (post) => {
    if (!post?.id) return;

    const confirm = await Swal.fire({
      title: 'Delete SMO Post?',
      html: `
        <div style="text-align: left; font-size: 0.9rem;">
          <p>Are you sure you want to delete post <strong>#${post.id}</strong>?</p>
          <p style="color: #ef4444; margin-top: 6px;">⚠️ This will remove the post graphic and copy from the studio. This action cannot be undone.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete post'
    });

    if (!confirm.isConfirmed) return;

    try {
      const viewerRole = user?.role || user?.dbRole || 'SMO Specialist';
      const res = await fetch(`/api/client-services/smo?id=${encodeURIComponent(post.id)}&viewerRole=${encodeURIComponent(viewerRole)}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        if (previewPost?.id === post.id) setPreviewPost(null);
        setPosts(prev => prev.filter(p => p.id !== post.id));
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Post deleted successfully!',
          showConfirmButton: false,
          timer: 3000
        });
      } else {
        Swal.fire('Delete Failed', data.error || 'Failed to delete post', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const metrics = useMemo(() => {
    return {
      total: posts.length,
      ready: posts.filter(p => (p.status || '').toLowerCase() === 'ready for approval' || (p.status || '').toLowerCase() === 'approved').length,
      scheduled: posts.filter(p => (p.status || '').toLowerCase() === 'scheduled').length,
      published: posts.filter(p => (p.status || '').toLowerCase() === 'published').length
    };
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      const q = searchTerm.toLowerCase();
      const matchClient = (p.client_name || '').toLowerCase().includes(q) || (p.company_name || '').toLowerCase().includes(q);
      const matchTopic = (p.requirements || '').toLowerCase().includes(q);
      const matchCaption = (p.caption || '').toLowerCase().includes(q);
      const matchTags = (p.hashtags || '').toLowerCase().includes(q);

      const matchesSearch = !q || matchClient || matchTopic || matchCaption || matchTags;

      if (statusFilter === 'All') return matchesSearch;
      return matchesSearch && (p.status || '').toLowerCase() === statusFilter.toLowerCase();
    });
  }, [posts, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredPosts.length / pageSize) || 1;
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPosts.slice(start, start + pageSize);
  }, [filteredPosts, currentPage, pageSize]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-pink-500 to-rose-600 text-white rounded-2xl shadow-lg shadow-pink-500/20">
            <FiShare2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              SMO Content Studio
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 font-semibold">
                SMO Specialist Mode
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Create, design, and deliver social media graphics, AI captions, and scheduled campaigns for clients.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-md shadow-pink-500/20 transition-all cursor-pointer"
          >
            <FiPlus size={16} />
            <span>Create SMO Post</span>
          </button>

          <button
            type="button"
            onClick={fetchPosts}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all cursor-pointer"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => { setStatusFilter('All'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'All' 
              ? 'border-pink-500 bg-pink-50/20 shadow-md ring-2 ring-pink-500/20' 
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Posts</span>
            <FiLayers className="text-pink-600" size={16} />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{metrics.total}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter('Ready for Approval'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Ready for Approval' 
              ? 'border-cyan-500 bg-cyan-50/20 shadow-md ring-2 ring-cyan-500/20' 
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-600">For Approval</span>
            <FiCheckCircle className="text-cyan-600" size={16} />
          </div>
          <div className="text-2xl font-black text-cyan-600">{metrics.ready}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter('Scheduled'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Scheduled' 
              ? 'border-purple-500 bg-purple-50/20 shadow-md ring-2 ring-purple-500/20' 
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Scheduled</span>
            <FiClock className="text-purple-600" size={16} />
          </div>
          <div className="text-2xl font-black text-purple-600">{metrics.scheduled}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter('Published'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Published' 
              ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/20' 
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Published Live</span>
            <FiCheck className="text-emerald-600" size={16} />
          </div>
          <div className="text-2xl font-black text-emerald-600">{metrics.published}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by client, topic, caption, or hashtag..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-pink-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          {['All', 'Ready for Approval', 'Scheduled', 'Published', 'Pending Design'].map((st) => (
            <button
              key={st}
              onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                statusFilter.toLowerCase() === st.toLowerCase()
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Content Feed */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-3"></div>
          <p className="text-sm">Loading client SMO posts...</p>
        </div>
      ) : paginatedPosts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <div className="w-14 h-14 bg-pink-50 dark:bg-pink-900/30 text-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FiImage size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">No SMO Posts Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            {searchTerm || statusFilter !== 'All' 
              ? 'Try adjusting your search query or status filter.' 
              : 'Get started by creating your first social media post for any client.'}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-md inline-flex items-center gap-1.5"
          >
            <FiPlus size={14} /> Create SMO Post
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedPosts.map((post) => {
            const statusLower = (post.status || '').toLowerCase();
            let statusColor = 'bg-slate-100 text-slate-700';
            if (statusLower === 'published') statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            else if (statusLower.includes('approval') || statusLower === 'approved') statusColor = 'bg-cyan-50 text-cyan-700 border-cyan-300 ring-1 ring-cyan-400';
            else if (statusLower === 'scheduled') statusColor = 'bg-purple-50 text-purple-700 border-purple-200';

            return (
              <div
                key={post.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Post Banner */}
                <div className="h-44 bg-slate-900 relative overflow-hidden flex items-center justify-center group cursor-pointer" onClick={() => setPreviewPost(post)}>
                  {post.banner_url ? (
                    <img
                      src={post.banner_url}
                      alt="Banner"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <FiImage size={32} className="mb-1" />
                      <span className="text-xs">No graphic uploaded</span>
                    </div>
                  )}
                  <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm ${statusColor}`}>
                    {post.status || 'Draft'}
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                        <FiUser size={13} className="text-pink-600" />
                        {post.company_name || post.client_name || 'Client'}
                      </span>
                      <span className="text-[10px]">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 mb-1">
                      {post.requirements}
                    </h4>

                    {post.caption ? (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-2">
                        {post.caption}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic mb-2">No caption written yet.</p>
                    )}

                    {post.hashtags && (
                      <div className="text-[11px] text-pink-600 dark:text-pink-400 font-medium truncate">
                        {post.hashtags}
                      </div>
                    )}
                  </div>

                  {/* Footer & Meta Info */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <FaFacebook className="text-blue-600" size={14} />
                      <FaInstagram className="text-pink-600" size={14} />
                      {post.scheduled_at && (
                        <span className="text-[10px] text-purple-600 font-semibold flex items-center gap-1 ml-1">
                          <FiClock size={11} /> {new Date(post.scheduled_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                        title="Delete SMO Post"
                      >
                        <FiTrash2 size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewPost(post)}
                        className="px-3 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        Preview Post
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Create SMO Post Modal */}
      <CreateSmoPostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => fetchPosts()}
        currentUser={user}
      />

      {/* Quick Preview Modal */}
      {previewPost && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {previewPost.requirements || 'Post Preview'}
              </h3>
              <button
                onClick={() => setPreviewPost(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <FiX size={18} />
              </button>
            </div>
            {previewPost.banner_url && (
              <div className="w-full bg-black max-h-80 overflow-hidden flex items-center justify-center">
                <img
                  src={previewPost.banner_url}
                  alt="Banner preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="p-4 space-y-2">
              <div className="text-xs text-slate-500 font-semibold">
                Client: {previewPost.company_name || previewPost.client_name || 'Client'}
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {previewPost.caption || 'No caption'}
              </p>
              {previewPost.hashtags && (
                <div className="text-xs text-pink-600 font-medium">
                  {previewPost.hashtags}
                </div>
              )}
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => handleDeletePost(previewPost)}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FiTrash2 size={13} /> Delete Post
              </button>

              <button
                onClick={() => setPreviewPost(null)}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

