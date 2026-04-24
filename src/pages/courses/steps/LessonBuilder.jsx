import { useState, useRef, useCallback, useEffect } from 'react';
import {
  GripVertical,
  Video,
  FileText,
  Presentation,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
  AlignLeft,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCourse } from '@/context/CourseContext';
import { Loader2 } from 'lucide-react';

const CONTENT_TYPES = [
  { icon: Video, label: 'Video', color: '#4a90d9', bgColor: '#eef4fb', accept: 'video/*' },
  { icon: FileText, label: 'PDF', color: '#ef4444', bgColor: '#fef2f2', accept: 'application/pdf' },
  { icon: Presentation, label: 'PPT', color: '#f59e0b', bgColor: '#fefce8', accept: 'application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  { icon: AlignLeft, label: 'Text', color: '#8b5cf6', bgColor: '#f5f3ff' },
];

let nextLessonId = 2;
let nextBlockId = 1;

const createLesson = (order) => ({
  id: nextLessonId++,
  title: '',
  estimatedTime: '',
  contentBlocks: [],
  completionRule: 'watch-pass',
  minQuizScore: '70',
  order,
});

const createContentBlock = (type, file) => {
  const config = CONTENT_TYPES.find((t) => t.label === type);
  const title = file ? file.name : (type === 'Video' ? 'Untitled video' : type === 'PDF' ? 'Untitled document' : 'Untitled presentation');
  const subtitle = file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'No file uploaded';

  return {
    id: `cb-${nextBlockId++}`,
    type: type.toLowerCase(),
    icon: config?.icon || FileText,
    iconColor: config?.color || '#6b7280',
    title,
    subtitle,
    file,
  };
};

export default function LessonBuilder({ data, updateData, onNext, onBack }) {
  const {
    fetchLessons,
    addLesson: addLessonApi,
    updateLesson: updateLessonApi,
    addContentBlock,
    updateContentBlock,
    deleteLesson,
    deleteContentBlock,
    reorderLessons,
    reorderContentBlocks,
    isLoading
  } = useCourse();
  const [lessons, setLessons] = useState([]);
  const [originalLessons, setOriginalLessons] = useState(null);
  const [expandedLessons, setExpandedLessons] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [error, setError] = useState('');

  const hasFetched = useRef(false);

  // Initial load
  useEffect(() => {
    const init = async () => {
      // If we already have lessons (e.g. from AI generation), don't overwrite them with a fetch
      if (hasFetched.current || (data.lessons && data.lessons.length > 0)) {
        if (!hasFetched.current && data.lessons && data.lessons.length > 0) {
          setLessons(data.lessons);
          setOriginalLessons(JSON.parse(JSON.stringify(data.lessons)));
          setExpandedLessons([data.lessons[0].id]);
          setActiveLessonId(data.lessons[0].id);
          hasFetched.current = true;
        }
        return;
      }
      hasFetched.current = true;

      const fetched = await fetchLessons();
      if (fetched && fetched.length > 0) {
        setLessons(fetched);
        setOriginalLessons(JSON.parse(JSON.stringify(fetched)));
        setExpandedLessons([fetched[0].id]);
        setActiveLessonId(fetched[0].id);
      } else {
        setLessons([]);
      }
    };
    init();
  }, [fetchLessons, data.lessons]);

  useEffect(() => {
    updateData('lessons', lessons);
  }, [lessons, updateData]);

  const handleNextClick = async () => {
    // Dirty check: skip only if all items are real IDs AND nothing has changed
    const hasTempIds = lessons.some(l => String(l.id).startsWith('temp-'));
    const hasTempBlocks = lessons.some(l => l.contentBlocks?.some(b => String(b.id).startsWith('temp-')));
    
    if (!hasTempIds && !hasTempBlocks && originalLessons) {
      const currentClone = JSON.parse(JSON.stringify(lessons));
      if (JSON.stringify(currentClone) === JSON.stringify(originalLessons)) {
        console.log('No lesson changes detected, skipping API');
        onNext();
        return;
      }
    }

    let updatedLessons = [...lessons];

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      if (!lesson.title) {
        setError(`Please provide a title for Lesson ${i + 1}`);
        if (!expandedLessons.includes(lesson.id)) toggleExpand(lesson.id);
        return;
      }

      // Defer API sync to Here
      try {
        let realLessonId = lesson.id;
        if (lesson.id && String(lesson.id).startsWith('temp-')) {
          const newLesson = await addLessonApi(lesson.title, lesson.estimatedTime, false);
          if (newLesson) {
            realLessonId = newLesson.id;
            // Update our tracker for this loop and for state, PRESERVING existing local blocks and AI quizes
            updatedLessons = updatedLessons.map(l => l.id === lesson.id ? { 
              ...newLesson, 
              contentBlocks: l.contentBlocks,
              aiQuizQuestions: l.aiQuizQuestions 
            } : l);
          }
          // Wait, for NEW lessons we should also update them immediately with their completion rules!
          if (lesson.completionRule || lesson.minQuizScore) {
            await updateLessonApi(realLessonId, {
              completionRule: lesson.completionRule,
              minQuizScore: lesson.minQuizScore
            }, false);
          }
        } else {
          // Item-level dirty check
          const original = originalLessons?.find(ol => ol.id === lesson.id);
          const needsUpdate = !original ||
            original.title !== lesson.title ||
            original.estimatedTime !== lesson.estimatedTime ||
            original.completionRule !== lesson.completionRule ||
            original.minQuizScore !== lesson.minQuizScore;

          if (needsUpdate) {
            await updateLessonApi(lesson.id, {
              title: lesson.title,
              estimated_time: lesson.estimatedTime,
              completionRule: lesson.completionRule,
              minQuizScore: lesson.minQuizScore
            }, false);
          }
        }

        // Sync Content Blocks
        const currentLesson = updatedLessons[i];
        const syncedBlocks = [];
        for (const block of currentLesson.contentBlocks) {
          if (String(block.id).startsWith('temp-')) {
            const uploadedBlock = await addContentBlock(currentLesson.id, {
              type: block.type,
              order: block.order,
              content: block.content || ''
            }, block.file, false);

            if (uploadedBlock) {
              syncedBlocks.push(uploadedBlock);
            } else {
              syncedBlocks.push(block);
            }
          } else {
            // Check if existing content block needs update (especially for 'text' blocks)
            const originalLesson = originalLessons?.find(ol => ol.id === currentLesson.id);
            const originalBlock = originalLesson?.content_blocks?.find(ob => ob.id === block.id);
            
            if (originalBlock && block.type === 'text' && originalBlock.content !== block.content) {
              await updateContentBlock(currentLesson.id, block.id, {
                content: block.content
              });
            }
            syncedBlocks.push(block);
          }
        }
        updatedLessons[i].contentBlocks = syncedBlocks;
      } catch (e) {
        console.error('Failed to sync lesson:', e);
      }
    }

    // Process reorders after all real IDs have been resolved
    try {
      if (originalLessons && originalLessons.length > 0) {
        const lessonOrderArray = updatedLessons.map(l => l.id);
        const origLessonOrder = originalLessons.map(l => l.id);
        if (lessonOrderArray.length > 0 && !lessonOrderArray.some(id => String(id).startsWith('temp-'))) {
          if (JSON.stringify(lessonOrderArray) !== JSON.stringify(origLessonOrder)) {
            await reorderLessons(lessonOrderArray);
          }
        }
      }

      for (const lesson of updatedLessons) {
        const blockOrderArray = lesson.contentBlocks.map(b => b.id);
        const origLesson = originalLessons?.find(ol => ol.id === lesson.id);
        if (origLesson && origLesson.contentBlocks?.length > 0) {
          const origBlockOrder = origLesson.contentBlocks.map(b => b.id);
          if (blockOrderArray.length > 0 && !blockOrderArray.some(id => String(id).startsWith('temp-'))) {
            if (JSON.stringify(blockOrderArray) !== JSON.stringify(origBlockOrder)) {
              await reorderContentBlocks(lesson.id, blockOrderArray);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to sync reorders:', e);
    }

    // Update local state and SIGNIFICANTLY, update global context before onNext
    setLessons(updatedLessons);
    updateData('lessons', updatedLessons);
    setError('');
    onNext();
  };

  const fileInputRef = useRef(null);
  const [activeUploadContext, setActiveUploadContext] = useState({ lessonId: null, type: null });

  // Drag state
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const dragType = useRef(null); // 'lesson' or 'block'
  const dragLessonId = useRef(null);

  // === LESSON CRUD ===
  const addLesson = async () => {
    try {
      const newLesson = await addLessonApi('New Lesson', '10 min', false);
      if (newLesson) {
        setLessons((prev) => [...prev, newLesson]);
        setExpandedLessons((prev) => [...prev, newLesson.id]);
        setActiveLessonId(newLesson.id);
        // Also update originalLessons to avoid dirty check triggers
        setOriginalLessons(prev => [...(prev || []), JSON.parse(JSON.stringify(newLesson))]);
      }
    } catch (err) {
      console.error('Failed to add lesson:', err);
      setError('Failed to create lesson on server');
    }
  };

  const removeLesson = async (lessonId) => {
    if (lessons.length <= 1) return;

    // If it's a real lesson, dispatch deletion API
    if (lessonId && !String(lessonId).startsWith('temp-')) {
      await deleteLesson(lessonId);
    }

    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    setExpandedLessons((prev) => prev.filter((id) => id !== lessonId));
    if (activeLessonId === lessonId) {
      setActiveLessonId(lessons[0]?.id === lessonId ? lessons[1]?.id : lessons[0]?.id);
    }
  };

  const duplicateLesson = (lessonId) => {
    const source = lessons.find((l) => l.id === lessonId);
    if (!source) return;
    const newLesson = {
      ...source,
      id: nextLessonId++,
      title: source.title ? `${source.title} (copy)` : '',
      contentBlocks: source.contentBlocks.map((b) => ({ ...b, id: `cb-${nextBlockId++}` })),
    };
    const index = lessons.findIndex((l) => l.id === lessonId);
    const updated = [...lessons];
    updated.splice(index + 1, 0, newLesson);
    setLessons(updated);
    setExpandedLessons((prev) => [...prev, newLesson.id]);
  };

  const handleUpdateLesson = (lessonId, field, value) => {
    // Local update for immediate feedback
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, [field]: value } : l))
    );
  };

  const toggleExpand = (lessonId) => {
    setExpandedLessons((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );
    setActiveLessonId(lessonId);
  };

  // === CONTENT BLOCK CRUD ===
  const initiateUpload = (lessonId, type) => {
    setActiveUploadContext({ lessonId, type });
    if (type === 'Text') {
      const newBlock = {
        id: `temp-cb-${Date.now()}`,
        type: 'text',
        content: '',
        order: (lessons.find(l => l.id === lessonId)?.contentBlocks?.length || 0) + 1
      };

      setLessons(prev =>
        prev.map(l => l.id === lessonId
          ? { ...l, contentBlocks: [...l.contentBlocks, newBlock] }
          : l
        )
      );
      return;
    }
    if (fileInputRef.current) {
      const config = CONTENT_TYPES.find((t) => t.label === type);
      fileInputRef.current.accept = config?.accept || '';
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const lessonId = activeUploadContext.lessonId;
    const type = activeUploadContext.type;

    if (file && lessonId && type) {
      const newBlock = {
        id: `temp-cb-${Date.now()}`,
        type: type.toLowerCase(),
        originalFilename: file.name,
        fileSize: file.size,
        file: file, // Keep local file for later upload
        order: (lessons.find(l => l.id === lessonId)?.contentBlocks?.length || 0) + 1
      };

      setLessons(prev =>
        prev.map(l => l.id === lessonId
          ? { ...l, contentBlocks: [...l.contentBlocks, newBlock] }
          : l
        )
      );
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setActiveUploadContext({ lessonId: null, type: null });
  };

  const removeContentBlock = async (lessonId, blockId) => {
    // If it's a real block, dispatch deletion API
    if (blockId && !String(blockId).startsWith('temp-cb-')) {
      await deleteContentBlock(lessonId, blockId);
    }

    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId
          ? { ...l, contentBlocks: l.contentBlocks.filter((b) => b.id !== blockId) }
          : l
      )
    );
  };

  const handleUpdateBlockContent = (lessonId, blockId, content) => {
    setLessons(prev =>
      prev.map(l => l.id === lessonId
        ? {
          ...l,
          contentBlocks: l.contentBlocks.map(b =>
            b.id === blockId ? { ...b, content } : b
          )
        }
        : l
      )
    );
  };

  // === DRAG & DROP — LESSONS ===
  const handleLessonDragStart = (e, index) => {
    dragItem.current = index;
    dragType.current = 'lesson';
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };

  const handleLessonDragOver = (e, index) => {
    e.preventDefault();
    if (dragType.current !== 'lesson') return;
    dragOverItem.current = index;
  };

  const handleLessonDrop = (e) => {
    e.preventDefault();
    if (dragType.current !== 'lesson') return;
    const updated = [...lessons];
    const [draggedItem] = updated.splice(dragItem.current, 1);
    updated.splice(dragOverItem.current, 0, draggedItem);
    setLessons(updated);
    dragItem.current = null;
    dragOverItem.current = null;
    dragType.current = null;
  };

  const handleLessonDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    dragType.current = null;
  };

  // === DRAG & DROP — CONTENT BLOCKS ===
  const handleBlockDragStart = (e, lessonId, blockIndex) => {
    dragItem.current = blockIndex;
    dragLessonId.current = lessonId;
    dragType.current = 'block';
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };

  const handleBlockDragOver = (e, blockIndex) => {
    e.preventDefault();
    if (dragType.current !== 'block') return;
    dragOverItem.current = blockIndex;
  };

  const handleBlockDrop = (e, lessonId) => {
    e.preventDefault();
    if (dragType.current !== 'block') return;
    if (dragLessonId.current !== lessonId) return;

    setLessons((prev) =>
      prev.map((l) => {
        if (l.id !== lessonId) return l;
        const blocks = [...l.contentBlocks];
        const [draggedBlock] = blocks.splice(dragItem.current, 1);
        blocks.splice(dragOverItem.current, 0, draggedBlock);
        return { ...l, contentBlocks: blocks };
      })
    );

    dragItem.current = null;
    dragOverItem.current = null;
    dragType.current = null;
    dragLessonId.current = null;
  };

  const handleBlockDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    dragType.current = null;
  };



  return (
    <div className="cc-step-content">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
      <div className="cc-step-header">
        <div className="cc-step-header-row">
          <div>
            <h2 className="cc-step-heading">Lesson builder</h2>
            <p className="cc-step-description">
              Add lessons, drag to reorder, and fill each with content blocks
            </p>
          </div>
          <span className="cc-lesson-badge">
            {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="cc-form">
        {/* Lessons Accordion */}
        <div className="cc-lessons-accordion">
          {lessons.map((lesson, lessonIndex) => {
            const isExpanded = expandedLessons.includes(lesson.id);
            const isActive = activeLessonId === lesson.id;

            return (
              <div
                key={lesson.id}
                className={`cc-lesson-card ${isActive ? 'active' : ''}`}
                draggable
                onDragStart={(e) => handleLessonDragStart(e, lessonIndex)}
                onDragOver={(e) => handleLessonDragOver(e, lessonIndex)}
                onDrop={handleLessonDrop}
                onDragEnd={handleLessonDragEnd}
                id={`lesson-card-${lesson.id}`}
              >
                {/* Lesson Header (always visible) */}
                <div className="cc-lesson-card-header" onClick={() => toggleExpand(lesson.id)}>
                  <div className="cc-lesson-card-left">
                    <button
                      className="cc-block-drag"
                      aria-label="Drag to reorder lesson"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <span className="cc-lesson-number">{lessonIndex + 1}</span>
                    <div className="cc-lesson-card-info">
                      <span className="cc-lesson-card-title">
                        {lesson.title || `Lesson ${lessonIndex + 1}`}
                      </span>
                      <span className="cc-lesson-card-meta">
                        {lesson.contentBlocks.filter(b => b.file_url || b.external_url || b.file || b.content || b.type === 'text').length} block{lesson.contentBlocks.filter(b => b.file_url || b.external_url || b.file || b.content || b.type === 'text').length !== 1 ? 's' : ''}
                        {lesson.estimatedTime ? ` · ${lesson.estimatedTime}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="cc-lesson-card-actions">
                    <button
                      className="cc-lesson-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateLesson(lesson.id);
                      }}
                      title="Duplicate lesson"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="cc-lesson-action-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLesson(lesson.id);
                      }}
                      title="Delete lesson"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 cc-lesson-chevron" />
                    ) : (
                      <ChevronRight className="h-4 w-4 cc-lesson-chevron" />
                    )}
                  </div>
                </div>

                {/* Lesson Body (expanded) */}
                {isExpanded && (
                  <div className="cc-lesson-card-body">
                    {/* Title & Time */}
                    <div className="cc-form-row cc-form-row-2">
                      <div className="cc-form-group">
                        <Label htmlFor={`lesson-title-${lesson.id}`}>Lesson title *</Label>
                        <Input
                          id={`lesson-title-${lesson.id}`}
                          placeholder="e.g. Variables and data types"
                          value={lesson.title}
                          onChange={(e) => handleUpdateLesson(lesson.id, 'title', e.target.value)}
                        />
                      </div>
                      <div className="cc-form-group">
                        <Label htmlFor={`lesson-time-${lesson.id}`}>Estimated time</Label>
                        <Input
                          id={`lesson-time-${lesson.id}`}
                          placeholder="e.g. 20 min"
                          value={lesson.estimatedTime || ''}
                          onChange={(e) => handleUpdateLesson(lesson.id, 'estimatedTime', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Content Blocks */}
                    <div className="cc-form-section">
                      <h3 className="cc-section-label">
                        CONTENT BLOCKS{' '}
                        <span className="cc-section-hint">(drag to reorder)</span>
                      </h3>

                      {lesson.contentBlocks.filter(b => b.file_url || b.external_url || b.file || b.content || b.type === 'text').length === 0 ? (
                        <div className="cc-empty-blocks">
                          <p className="cc-empty-blocks-text">No content yet. Add a text, video, PDF, or PPT below.</p>
                        </div>
                      ) : (
                        <div className="cc-content-blocks">
                          {lesson.contentBlocks
                            .filter(b => b.file_url || b.external_url || b.file || b.content || b.type === 'text')
                            .map((block, blockIndex) => (
                            <div
                              key={block.id}
                              className="cc-content-block"
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                handleBlockDragStart(e, lesson.id, blockIndex);
                              }}
                              onDragOver={(e) => handleBlockDragOver(e, blockIndex)}
                              onDrop={(e) => {
                                e.stopPropagation();
                                handleBlockDrop(e, lesson.id);
                              }}
                              onDragEnd={handleBlockDragEnd}
                              id={`content-block-${block.id}`}
                            >
                              <div className="cc-block-left">
                                <button className="cc-block-drag" aria-label="Drag to reorder">
                                  <GripVertical className="h-4 w-4" />
                                </button>
                                <div
                                  className="cc-block-icon"
                                  style={{
                                    backgroundColor: `${CONTENT_TYPES.find(t => t.label.toLowerCase() === block.type)?.color || '#6b7280'}15`,
                                    color: CONTENT_TYPES.find(t => t.label.toLowerCase() === block.type)?.color || '#6b7280',
                                  }}
                                >
                                  {(() => {
                                    const Icon = CONTENT_TYPES.find(t => t.label.toLowerCase() === block.type)?.icon || FileText;
                                    return <Icon className="h-4 w-4" />;
                                  })()}
                                </div>
                                <div className="cc-block-info">
                                  {block.type === 'text' ? (
                                    <Textarea
                                      placeholder="Type your lesson content here..."
                                      value={block.content || ''}
                                      onChange={(e) => handleUpdateBlockContent(lesson.id, block.id, e.target.value)}
                                      className="cc-block-textarea"
                                    />
                                  ) : (
                                    <>
                                      <span className="cc-block-title">
                                        {block.originalFilename || block.content || `Untitled ${block.type}`}
                                      </span>
                                      <span className="cc-block-subtitle">
                                        {block.fileSize ? `${(block.fileSize / (1024 * 1024)).toFixed(2)} MB` : block.type}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="cc-block-actions">
                                {/* Simplified actions: removed edit */}
                                <button
                                  className="cc-block-delete"
                                  onClick={() => removeContentBlock(lesson.id, block.id)}
                                  aria-label="Remove block"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add content buttons */}
                      <div className="cc-add-content-bar">
                        {CONTENT_TYPES.map((type) => (
                          <button
                            key={type.label}
                            className="cc-add-content-btn"
                            onClick={() => initiateUpload(lesson.id, type.label)}
                            id={`add-${type.label.toLowerCase()}-btn-${lesson.id}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Completion Rule */}
                    <div className="cc-form-section">
                      <h3 className="cc-section-label">COMPLETION RULE</h3>
                      <div className="cc-form-row cc-form-row-2">
                        <div className="cc-form-group">
                          <Label htmlFor={`completion-rule-${lesson.id}`}>Student must *</Label>
                          <Select
                            id={`completion-rule-${lesson.id}`}
                            value={lesson.completionRule || 'watch-pass'}
                            onChange={(e) => handleUpdateLesson(lesson.id, 'completionRule', e.target.value)}
                          >
                            <option value="watch-pass">Watch all content + pass quiz</option>
                            <option value="watch-only">Watch all content</option>
                            <option value="pass-quiz">Pass quiz only</option>
                          </Select>
                        </div>
                        <div className="cc-form-group">
                          <Label htmlFor={`min-quiz-score-${lesson.id}`}>Minimum quiz score</Label>
                          <Input
                            id={`min-quiz-score-${lesson.id}`}
                            placeholder="70 %"
                            value={lesson.minQuizScore || '70'}
                            onChange={(e) => handleUpdateLesson(lesson.id, 'minQuizScore', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Lesson Button */}
        {/* Add Lesson Button */}
        <button className="cc-add-lesson-btn" onClick={addLesson} id="add-lesson-btn">
          <div className="cc-add-lesson-icon">
            <Plus className="h-5 w-5" />
          </div>
          {lessons.length === 0 ? 'Add a lesson' : 'Add another lesson'}
        </button>
      </div>

      {/* Actions */}
      <div className="cc-actions" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        {error && <span className="text-red-500 text-sm font-semibold">{error}</span>}
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" onClick={onBack} id="back-from-lessons-btn">
            ← Back
          </Button>
          <Button
            onClick={handleNextClick}
            className="cc-btn-primary"
            id="next-quiz-btn"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Next: Quiz →
          </Button>
        </div>
      </div>
    </div>
  );
}
