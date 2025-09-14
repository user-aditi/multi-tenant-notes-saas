import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Mail, Shield, Trash2, Copy, X, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom'; 

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member'
  });
  const [inviting, setInviting] = useState(false);

  // Copy to clipboard function
  const copyToClipboard = async (text, type = 'text') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type === 'url' ? 'Invitation link' : 'Token'} copied to clipboard!`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      setUsers(response.data.users);
      setInvitations(response.data.invitations || []);
    } catch (error) {
      toast.error('Failed to load users');
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async (e) => {
    e.preventDefault();
    setInviting(true);

    try {
      const response = await api.post('/admin/invite-user', inviteForm);
      toast.success(`Invitation sent to ${inviteForm.email}!`);
      
      // Reset form and close modal
      setInviteForm({ email: '', role: 'member' });
      setShowInviteModal(false);
      
      // Refresh data
      await fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const deleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to remove ${userEmail}?`)) return;
    
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User removed successfully');
      await fetchUsers();
    } catch (error) {
      toast.error('Failed to remove user');
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          Access Denied
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Only administrators can access user management.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
        <div className="flex justify-between items-start">
            <Link to="/dashboard" className="flex items-center text-sm text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 mb-4 sm:mb-0">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </Link>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              User Management
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage users in {user?.tenant?.name}
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Active Users */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
            <div className="px-6 py-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Active Users ({users.length})
              </h3>
            </div>
            <div className="divide-y dark:divide-gray-700">
              {users.map((user) => (
                <div key={user.id} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center">
                            <Shield className="w-3 h-3 mr-1" />
                            Administrator
                          </span>
                        ) : (
                          'Member'
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => deleteUser(user.id, user.email)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {users.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Get started by inviting a user.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Pending Invitations - UPDATED */}
          {invitations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
              <div className="px-6 py-4 border-b dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Pending Invitations ({invitations.length})
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Share these links with users to join your organization
                </p>
              </div>
              <div className="divide-y dark:divide-gray-700">
                {invitations.map((invitation) => {
                  const inviteUrl = `${window.location.origin}/register?invite=${invitation.token}`;
                  
                  return (
                    <div key={invitation.id} className="p-6 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                            <Mail className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {invitation.email}
                              </p>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                                {invitation.role}
                              </span>
                            </div>
                            
                            {/* Invitation URL - CLEARLY DISPLAYED */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-2">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                  Invitation Link:
                                </p>
                                <button
                                  onClick={() => copyToClipboard(inviteUrl, 'url')}
                                  className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                                  title="Copy invitation link"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy Link
                                </button>
                              </div>
                              <code className="text-xs text-gray-600 dark:text-gray-300 break-all bg-white dark:bg-gray-800 p-2 rounded block">
                                {inviteUrl}
                              </code>
                            </div>
                            
                            {/* Token Display */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                  Token:
                                </p>
                                <button
                                  onClick={() => copyToClipboard(invitation.token, 'token')}
                                  className="inline-flex items-center px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors"
                                  title="Copy token only"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy Token
                                </button>
                              </div>
                              <code className="text-xs text-gray-600 dark:text-gray-300 break-all bg-white dark:bg-gray-800 p-2 rounded block">
                                {invitation.token}
                              </code>
                            </div>
                            
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              Expires {new Date(invitation.expires_at).toLocaleDateString()} at {new Date(invitation.expires_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Invite User Modal - Same as before */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Invite User
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={inviteUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="user@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
