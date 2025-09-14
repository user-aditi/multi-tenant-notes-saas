import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotes } from '../hooks/useNotes';
import { PlusCircle, FileText, Crown, Users, LogOut, Edit, Trash2, Search, TrendingUp, Database, Download, X, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import NoteEditor from './NoteEditor';
import ThemeToggle from './ThemeToggle';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';

const renderNoteContent = (content) => {
  if (!content) return null;
  
  // Sanitize HTML to prevent XSS attacks
  const cleanContent = DOMPurify.sanitize(content);
  const truncatedContent = cleanContent.length > 150 
    ? cleanContent.substring(0, 150) + '...' 
    : cleanContent;
  
  return (
    <div 
      className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4 line-clamp-4"
      dangerouslySetInnerHTML={{ __html: truncatedContent }}
    />
  );
};


const ActivityChart = ({ notes, tenantSlug }) => {
  const last7Days = Array.from({length: 7}, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const notesPerDay = last7Days.map(date => {
    return notes.filter(note => 
      new Date(note.created_at).toISOString().split('T')[0] === date
    ).length;
  });

  const maxNotes = Math.max(...notesPerDay, 1);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📈 Activity This Week</h3>
      <div className="flex items-end space-x-2 h-32">
        {last7Days.map((date, index) => (
          <div key={date} className="flex-1 flex flex-col items-center">
            <div 
              className={`w-full rounded-t transition-all hover:opacity-80 ${
                tenantSlug === 'acme' ? 'bg-blue-500' : 'bg-green-500'
              }`}
              style={{
                height: `${(notesPerDay[index] / maxNotes) * 100}%`,
                minHeight: '4px'
              }}
              title={`${notesPerDay[index]} notes on ${date}`}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Subscription Management Modal (Admin Only)
const SubscriptionModal = ({ isOpen, onClose, user, onUpgrade, onDowngrade }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');
    await onUpgrade();
    setLoading(false);
    onClose();
  };

  const handleDowngrade = async () => {
    setLoading(true);
    setError('');
    const result = await onDowngrade();
    if (!result.success) {
      if (result.needs_action) {
        setError(result.error);
      }
    } else {
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manage Subscription
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {user?.tenant?.subscription_plan === 'pro' ? (
          <div className="space-y-6">
            <p className="text-center text-gray-600 dark:text-gray-300">
              Your organization is on the Pro plan with unlimited notes.
            </p>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}
            <button
              onClick={handleDowngrade}
              disabled={loading}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Downgrade to Free Plan'}
            </button>
          </div>
        ) : (
          // ... The existing Upgrade UI is here, no changes needed ...
          <div className="space-y-6">
             <div className="text-center"><Crown className="w-16 h-16 mx-auto mb-4 text-purple-600" /></div>
             <div className="space-y-3">
               <div className="flex items-center"><span className="text-green-500 mr-2">✓</span><span className="text-gray-700 dark:text-gray-300">Unlimited notes</span></div>
               <div className="flex items-center"><span className="text-green-500 mr-2">✓</span><span className="text-gray-700 dark:text-gray-300">Advanced search & filtering</span></div>
               <div className="flex items-center"><span className="text-green-500 mr-2">✓</span><span className="text-gray-700 dark:text-gray-300">Export to multiple formats</span></div>
               <div className="flex items-center"><span className="text-green-500 mr-2">✓</span><span className="text-gray-700 dark:text-gray-300">Priority support</span></div>
             </div>
             <div className="text-center">
               <div className="text-3xl font-bold text-gray-900 dark:text-white">$9.99</div>
               <div className="text-gray-500 dark:text-gray-400">per month</div>
             </div>
             <button onClick={handleUpgrade} disabled={loading} className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-semibold disabled:opacity-50">
               {loading ? 'Upgrading...' : 'Upgrade Now'}
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Loading Skeleton Component
const NotesSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-3"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3 mb-4"></div>
        <div className="flex justify-between">
          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
        </div>
      </div>
    ))}
  </div>
);

// Empty State Component
const EmptyState = ({ searchTerm, handleCreateNote, meta, tenantSlug }) => (
  <div className="text-center py-16">
    <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
      <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
      {searchTerm ? 'No notes found' : 'No notes yet'}
    </h3>
    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
      {searchTerm 
        ? 'Try adjusting your search terms or create a new note'
        : 'Start organizing your thoughts by creating your first note'
      }
    </p>
    {!searchTerm && !meta.limit_reached && (
      <button
        onClick={handleCreateNote}
        className={`inline-flex items-center px-6 py-3 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg ${
          tenantSlug === 'acme' 
            ? 'bg-blue-600 hover:bg-blue-700' 
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        <PlusCircle className="w-5 h-5 mr-2" />
        Create your first note
      </button>
    )}
  </div>
);

// Stats Card Component
const StatsCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700 hover:shadow-md transition-shadow">
    <div className="flex items-center">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
        color === 'blue' ? 'bg-blue-100 dark:bg-blue-900' :
        color === 'green' ? 'bg-green-100 dark:bg-green-900' :
        color === 'orange' ? 'bg-orange-100 dark:bg-orange-900' :
        'bg-purple-100 dark:bg-purple-900'
      }`}>
        <Icon className={`w-6 h-6 ${
          color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
          color === 'green' ? 'text-green-600 dark:text-green-400' :
          color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
          'text-purple-600 dark:text-purple-400'
        }`} />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</div>
        {subtitle && <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>}
      </div>
    </div>
  </div>
);

// Note Card Component
const NoteCard = ({ note, onEdit, onDelete, tenantSlug, formatDate }) => (
  <div className="group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 transform hover:-translate-y-1">
    <div className="p-6">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-4">
          {note.title}
        </h3>
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(note)}
            className={`p-2 text-gray-400 rounded-lg transition-colors ${
              tenantSlug === 'acme' 
                ? 'hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20' 
                : 'hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
            }`}
            title="Edit note"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {note.content && renderNoteContent(note.content)}
      
      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-600">
        <span className="flex items-center">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
          {note.author_email.split('@')[0]}
        </span>
        <span>{formatDate(note.created_at)}</span>
      </div>
    </div>
  </div>
);

// Main Dashboard Component
const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const { 
  notes, 
  loading, 
  error, 
  meta, 
  refetch, 
  upgradeTenant, 
  downgradeTenant, 
  deleteNote, 
  updateNote  
} = useNotes();
  
  // State Management
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Get tenant slug for conditional styling
  const tenantSlug = user?.tenant?.slug || 'acme';

  const theme = {
    'acme': {
      bg: 'bg-blue-600',
      hoverBg: 'hover:bg-blue-700',
      ring: 'focus:ring-blue-500'
    },
    'globex': {
      bg: 'bg-green-600',
      hoverBg: 'hover:bg-green-700',
      ring: 'focus:ring-green-500'
    }
  };
  const currentTheme = theme[tenantSlug] || theme['acme']; 
  
  // Helper functions
  const isThisMonth = (date) => {
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportNotes = () => {
    const dataStr = JSON.stringify(notes.map(note => ({
      title: note.title,
      content: note.content,
      created_at: note.created_at,
      author: note.author_email
    })), null, 2);
    
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${user.tenant.name}-notes-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('📥 Notes exported successfully!');
  };

    // Event Handlers
  const handleCreateNote = () => {
    setEditingNote(null);
    setShowEditor(true);
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setShowEditor(true);
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      await deleteNote(noteId);
    }
  };

  const handleUpgrade = async () => {
    await upgradeTenant();
  };

  // Filter notes by search term
  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowProfileMenu(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (showEditor) {
    return (
      <NoteEditor 
        note={editingNote}
        onSave={() => {
          setShowEditor(false);
          setEditingNote(null);
          refetch();
        }}
        onCancel={() => {
          setShowEditor(false);
          setEditingNote(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Enhanced Header */}
      <header className={`shadow-sm ${tenantSlug === 'acme' ? 'bg-blue-600' : 'bg-green-600'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <FileText className="h-8 w-8 text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {user?.tenant?.name} Notes
                </h1>
                <p className={`${tenantSlug === 'acme' ? 'text-blue-100' : 'text-green-100'}`}>
                  Welcome back, {user?.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <ThemeToggle className="text-white hover:bg-white/10" />
              
              {/* Admin Panel Link */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Admin Panel"
                >
                  <Settings className="w-5 h-5" />
                </Link>
              )}
              
              {/* Subscription Button - Admin Only */}
              {isAdmin && (
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  className={`px-4 py-2 rounded-lg transition-all shadow-lg ${
                    user?.tenant?.subscription_plan === 'free'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white transform hover:scale-105'
                      : 'bg-purple-100 text-purple-800 cursor-default'
                  }`}
                >
                  <div className="flex items-center">
                    <Crown className="w-4 h-4 mr-2" />
                    {user?.tenant?.subscription_plan === 'free' ? 'Upgrade to Pro' : 'Pro Plan'}
                  </div>
                </button>
              )}

              {/* Role Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 ${
                isAdmin ? 'bg-purple-100 text-purple-800' : `${
                  tenantSlug === 'acme' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`
              }`}>
                {isAdmin ? (
                  <>
                    <Users className="w-3 h-3 inline mr-1" />
                    Admin
                  </>
                ) : 'Member'}
              </div>
              
              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileMenu(!showProfileMenu);
                  }}
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  {user?.email.charAt(0).toUpperCase()}
                </button>
                
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-50">
                    <div className="py-2">
                      <button 
                        onClick={logout}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard 
            title="My Notes" 
            value={notes.length}
            icon={FileText}
            color="blue"
            subtitle="Total notes"
          />
          <StatsCard 
            title="This Month" 
            value={notes.filter(note => isThisMonth(new Date(note.created_at))).length}
            icon={TrendingUp}
            color="green"
            subtitle="New notes created"
          />
          <StatsCard 
            title="Storage Used" 
            value={user?.tenant?.subscription_plan === 'free' ? `${notes.length}/3` : '∞'}
            icon={Database}
            color={user?.tenant?.subscription_plan === 'free' ? 'orange' : 'purple'}
            subtitle={user?.tenant?.subscription_plan === 'free' ? 'Free plan limit' : 'Unlimited'}
          />
        </div>

        {/* Activity Chart */}
        <div className="mb-8">
          <ActivityChart notes={notes} tenantSlug={tenantSlug} />
        </div>

        {/* Action Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              {user?.tenant?.subscription_plan === 'free' && (
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        tenantSlug === 'acme' ? 'bg-blue-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min((notes.length / 3) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {notes.length}/3 notes used
                  </span>
                  {meta.limit_reached && (
                    <span className="text-orange-600 text-sm ml-2">
                      Limit reached!
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Export Button */}
              {notes.length > 0 && (
                <button
                  onClick={exportNotes}
                  className="inline-flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Export all notes"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
              )}
              
              {/* Create Note Button */}
              <button
                onClick={handleCreateNote}
                disabled={meta.limit_reached}
                className={`inline-flex items-center px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${currentTheme.bg} ${currentTheme.hoverBg}`}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                New Note
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {notes.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search your notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                  tenantSlug === 'acme' 
                    ? 'focus:ring-blue-500' 
                    : 'focus:ring-green-500'
                }`}
              />
            </div>
          </div>
        )}

        {/* Notes Grid */}
        {loading ? (
          <NotesSkeleton />
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <EmptyState 
            searchTerm={searchTerm}
            handleCreateNote={handleCreateNote}
            meta={meta}
            tenantSlug={tenantSlug}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                tenantSlug={tenantSlug}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}

        {/* Subscription Modal (Admin Only) */}
        {isAdmin && (
          <SubscriptionModal
              isOpen={showSubscriptionModal}
              onClose={() => setShowSubscriptionModal(false)}
              user={user}
              onUpgrade={upgradeTenant}
              onDowngrade={downgradeTenant} // <-- Pass the function here
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
