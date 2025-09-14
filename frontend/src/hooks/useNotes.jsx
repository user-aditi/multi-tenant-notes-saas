import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';


export const useNotes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({});
  const { user, updateUserContext  } = useAuth();

  const fetchNotes = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/notes');
      setNotes(response.data.notes || []);
      setMeta(response.data.meta || {});
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to fetch notes';
      setError(errorMsg);
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (noteData) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    const loadingToast = toast.loading('Creating note...');
    
    try {
      const response = await api.post('/notes', noteData);
      const newNote = response.data.note;
      
      // Immediately update local state
      setNotes(prev => [newNote, ...prev]);
      
      // Update meta to reflect new note count
      setMeta(prev => ({
        ...prev,
        total: (prev.total || 0) + 1,
        limit_reached: user?.tenant?.subscription_plan === 'free' && ((prev.total || 0) + 1) >= 3
      }));

      toast.success('✨ Note created successfully!', {
        id: loadingToast,
        duration: 3000,
      });
      
      return { success: true, note: newNote };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to create note';
      
      if (error.response?.data?.limit_reached) {
        toast.error('📝 Note limit reached! Ask your admin to upgrade to Pro for unlimited notes.', {
          id: loadingToast,
          duration: 5000,
        });
      } else {
        toast.error(`❌ ${errorMsg}`, {
          id: loadingToast,
        });
      }
      
      return { 
        success: false, 
        error: errorMsg, 
        limit_reached: error.response?.data?.limit_reached 
      };
    }
  };

  const updateNote = async (id, noteData) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    const loadingToast = toast.loading('Updating note...');
    
    try {
      const response = await api.put(`/notes/${id}`, noteData);
      const updatedNote = response.data.note;
      
      // Immediately update local state
      setNotes(prev => prev.map(note => 
        note.id === id ? updatedNote : note
      ));

      toast.success('✅ Note updated successfully!', {
        id: loadingToast,
        duration: 2000,
      });
      
      return { success: true, note: updatedNote };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to update note';
      
      toast.error(`❌ ${errorMsg}`, {
        id: loadingToast,
      });
      
      return { success: false, error: errorMsg };
    }
  };

  const deleteNote = async (id) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    const loadingToast = toast.loading('Deleting note...');
    
    try {
      await api.delete(`/notes/${id}`);
      
      // Immediately update local state
      setNotes(prev => prev.filter(note => note.id !== id));
      
      // Update meta to reflect decreased note count
      setMeta(prev => ({
        ...prev,
        total: Math.max(0, (prev.total || 0) - 1),
        limit_reached: false // Deleting always removes limit
      }));

      toast.success('🗑️ Note deleted successfully!', {
        id: loadingToast,
        duration: 2000,
      });
      
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to delete note';
      
      toast.error(`❌ ${errorMsg}`, {
        id: loadingToast,
      });
      
      return { success: false, error: errorMsg };
    }
  };

  const upgradeTenant = async () => {
    if (!user?.tenant?.slug) {
      toast.error('❌ Unable to upgrade: tenant information not found');
      return { success: false, error: 'Tenant not found' };
    }

    const loadingToast = toast.loading('Upgrading to Pro plan...');
    
    try {
      const response = await api.post(`/tenants/${user.tenant.slug}/upgrade`);
      
      updateUserContext(response.data.user);

      // Refresh user data and notes to get updated subscription status
      await fetchNotes();
      
      // Update local meta immediately
      setMeta(prev => ({
        ...prev,
        limit_reached: false
      }));
      
      toast.success('🎉 Successfully upgraded to Pro plan! You now have unlimited notes.', {
        id: loadingToast,
        duration: 5000,
      });
      
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to upgrade';
      
      toast.error(`❌ Upgrade failed: ${errorMsg}`, {
        id: loadingToast,
        duration: 4000,
      });
      
      return { success: false, error: errorMsg };
    }
  };

  const downgradeTenant = async () => {
  if (!user?.tenant?.slug) {
    toast.error('❌ Unable to downgrade: tenant information not found');
    return { success: false, error: 'Tenant not found' };
  }

  const loadingToast = toast.loading('Downgrading to Free plan...');
  try {
    const response = await api.post(`/tenants/${user.tenant.slug}/downgrade`);
    updateUserContext(response.data.user);
    toast.success('✅ Successfully downgraded to the Free plan.', {
      id: loadingToast,
      duration: 4000,
    });
    
    return { success: true };

  } catch (error) {
    const errorMsg = error.response?.data?.error || 'Failed to downgrade';
    toast.error(`❌ ${errorMsg}`, {
      id: loadingToast,
      duration: 5000,
    });
    return { success: false, error: errorMsg, needs_action: error.response?.data?.needs_action };
  }
};

  // Initial fetch when user is available
  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  // Auto-refresh notes every 30 seconds when user is active
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      // Only refresh if document is visible (user is active)
      if (!document.hidden) {
        fetchNotes();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  // Handle visibility change to refresh when user comes back to tab
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotes();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  return {
    notes,
    loading,
    error,
    meta,
    createNote,
    updateNote,
    deleteNote,
    upgradeTenant,
    downgradeTenant,
    refetch: fetchNotes
  };
};
