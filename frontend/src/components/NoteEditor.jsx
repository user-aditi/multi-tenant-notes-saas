import React, { useState, useEffect } from 'react';
import { useNotes } from '../hooks/useNotes';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ThemeToggle from './ThemeToggle';

const NoteEditor = ({ note, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [saving, setSaving] = useState(false);
  const { createNote, updateNote } = useNotes();

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title || '',
        content: note.content || ''
      });
    }
  }, [note]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    
    let result;
    if (note) {
      result = await updateNote(note.id, formData);
    } else {
      result = await createNote(formData);
    }

    setSaving(false);

    if (result.success) {
      // Immediately call onSave to close editor and refresh parent
      onSave();
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'blockquote',
    'code-block', 'link'
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2">
                <FileText className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {note ? 'Edit Note' : 'Create New Note'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !formData.title.trim()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Editor */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter note title..."
              className="w-full text-2xl font-bold text-gray-900 dark:text-white border-none outline-none bg-transparent placeholder-gray-400 focus:ring-0"
              required
            />
          </div>

          {/* Rich Text Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
            <ReactQuill
              theme="snow"
              value={formData.content}
              onChange={(content) => setFormData(prev => ({ ...prev, content }))}
              modules={modules}
              formats={formats}
              placeholder="Start writing your note..."
              className="min-h-96"
            />
          </div>
        </form>
      </main>
    </div>
  );
};

export default NoteEditor;
