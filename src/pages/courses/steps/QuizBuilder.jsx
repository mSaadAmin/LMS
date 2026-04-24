import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  X,
  Circle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCourse } from '@/context/CourseContext';
import { Loader2 } from 'lucide-react';

const QUESTION_TYPES = [
  { id: 'mc', label: 'Multiple choice' },
  { id: 'tf', label: 'True / False' },
  { id: 'fib', label: 'Fill in blank' },
  { id: 'sa', label: 'Short answer' },
  { id: 'match', label: 'Matching' },
];

export default function QuizBuilder({ data, updateData, onNext, onBack, isLoading: propLoading }) {
  const { 
    fetchQuiz, 
    deleteQuizQuestion,
    syncQuizQuestions,
    isLoading: ctxLoading  
  } = useCourse();
  
  // State: object keyed by lessonId containing the quiz questions for that lesson
  const [quizzes, setQuizzes] = useState({});
  const [originalQuizzes, setOriginalQuizzes] = useState({});
  const [expandedLessons, setExpandedLessons] = useState([]);
  const [error, setError] = useState('');
  
  const isLoading = propLoading || ctxLoading;

  const fetchingRef = useRef(false);
  const hasFetchedAll = useRef(false);

  // Initialize expandedLessons with the first lesson if available
  useEffect(() => {
    if (data.lessons?.length > 0 && expandedLessons.length === 0) {
      setExpandedLessons([data.lessons[0].id]);
    }
  }, [data.lessons]);

  // Load all quizzes on mount or when lessons change IDs
  useEffect(() => {
    const fetchAllQuizzes = async () => {
      if (!data.lessons || data.lessons.length === 0 || fetchingRef.current) return;
      
      // Check if we actually need to fetch (if any lesson is missing from our state)
      const needsFetch = data.lessons.some(l => !quizzes[l.id]);
      if (!needsFetch && hasFetchedAll.current) return;
      
      fetchingRef.current = true;
      hasFetchedAll.current = true;
      
      try {
        const newQuizzes = { ...quizzes };
        const newOriginals = { ...originalQuizzes };
        let changed = false;
        
        for (const lesson of data.lessons) {
          // If we already have this lesson's quiz in local state, skip it
          if (newQuizzes[lesson.id]) continue;
          
          changed = true;
          // PRIORITY: If we have AI-proposed questions locally, use them first
          if (lesson.aiQuizQuestions && lesson.aiQuizQuestions.length > 0) {
            newQuizzes[lesson.id] = lesson.aiQuizQuestions;
            newOriginals[lesson.id] = []; 
          } else if (!String(lesson.id).startsWith('temp-')) {
            try {
              const quiz = await fetchQuiz(lesson.id);
              if (quiz?.questions) {
                newQuizzes[lesson.id] = quiz.questions;
                newOriginals[lesson.id] = JSON.parse(JSON.stringify(quiz.questions));
              } else {
                newQuizzes[lesson.id] = [];
                newOriginals[lesson.id] = [];
              }
            } catch (e) {
              newQuizzes[lesson.id] = [];
              newOriginals[lesson.id] = [];
            }
          } else {
            newQuizzes[lesson.id] = [];
            newOriginals[lesson.id] = [];
          }
        }
        
        if (changed) {
          setQuizzes(newQuizzes);
          setOriginalQuizzes(newOriginals);
        }
      } finally {
        fetchingRef.current = false;
      }
    };
    
    fetchAllQuizzes();
  }, [data.lessons, fetchQuiz]);

  // Fetch quiz when a lesson is expanded (only if not already loaded)
  const handleToggleExpand = async (lessonId) => {
    const isExpanded = expandedLessons.includes(lessonId);
    if (!isExpanded) {
      setExpandedLessons(prev => [...prev, lessonId]);
      
      if (!quizzes[lessonId] && !String(lessonId).startsWith('temp-') && !fetchingRef.current) {
        const quiz = await fetchQuiz(lessonId);
        if (quiz?.questions) {
          setQuizzes(prev => ({ ...prev, [lessonId]: quiz.questions }));
          setOriginalQuizzes(prev => ({ ...prev, [lessonId]: JSON.parse(JSON.stringify(quiz.questions)) }));
        }
      }
    } else {
      setExpandedLessons(prev => prev.filter(id => id !== lessonId));
    }
  };

  const handleNextClick = async () => {
    // Sync all quizzes that have changed
    for (const lessonId of Object.keys(quizzes)) {
      const currentQuestions = quizzes[lessonId];
      const originalQuestions = originalQuizzes[lessonId];
      
      if (!currentQuestions) continue;

      // Validate
      for (const q of currentQuestions) {
        if (!q.text?.trim()) {
          setError(`Please provide text for all questions in lesson quiz`);
          if (!expandedLessons.includes(lessonId)) handleToggleExpand(lessonId);
          return;
        }
      }

      // Sync if real ID
      if (!String(lessonId).startsWith('temp-')) {
        // Deep compare
        if (JSON.stringify(currentQuestions) !== JSON.stringify(originalQuestions)) {
          const synced = await syncQuizQuestions(lessonId, currentQuestions, originalQuestions);
          // Optional: update local state if we weren't moving to next page
          // setQuizzes(prev => ({ ...prev, [lessonId]: synced }));
        }
      }
    }
    
    setError('');
    onNext();
  };

  const updateQuestionField = (lessonId, qId, field, value) => {
    setQuizzes((prev) => ({
      ...prev,
      [lessonId]: prev[lessonId].map((q) => (q.id === qId ? { ...q, [field]: value } : q))
    }));
  };

  const updateOptionText = (lessonId, qId, optionId, newText) => {
    setQuizzes((prev) => ({
      ...prev,
      [lessonId]: prev[lessonId].map((q) => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: q.options.map((o) => (o.id === optionId ? { ...o, text: newText } : o))
        };
      })
    }));
  };

  const toggleOptionCorrect = (lessonId, qId, optionId) => {
    setQuizzes((prev) => ({
      ...prev,
      [lessonId]: prev[lessonId].map((q) => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: q.options.map((o) => (o.id === optionId ? { ...o, isCorrect: !o.isCorrect } : o))
        };
      })
    }));
  };

  const addOption = (lessonId, qId) => {
    setQuizzes((prev) => ({
      ...prev,
      [lessonId]: prev[lessonId].map((q) => {
        if (q.id !== qId) return q;
        const newOptionId = `o${Date.now()}`;
        return {
          ...q,
          options: [...(q.options || []), { id: newOptionId, text: '', isCorrect: false }]
        };
      })
    }));
  };

  const removeOption = (lessonId, qId, optionId) => {
    setQuizzes((prev) => ({
      ...prev,
      [lessonId]: prev[lessonId].map((q) => {
        if (q.id !== qId) return q;
        if ((q.options?.length || 0) <= 2) return q;
        return {
          ...q,
          options: q.options.filter((o) => o.id !== optionId)
        };
      })
    }));
  };

  const updatePairField = (lessonId, qId, pairId, field, value) => {
    setQuizzes((prev) => ({
      ...prev,
      [lessonId]: prev[lessonId].map((q) => {
        if (q.id !== qId) return q;
        return {
          ...q,
          pairs: q.pairs?.map((p) => (p.id === pairId ? { ...p, [field]: value } : p)) || []
        };
      })
    }));
  };

  const addPair = (lessonId, qId) => {
    setQuizzes((prev) => ({
      ...prev,
      [lessonId]: prev[lessonId].map((q) => {
        if (q.id !== qId) return q;
        const newPairId = `p${Date.now()}`;
        return {
          ...q,
          pairs: [...(q.pairs || []), { id: newPairId, leftText: '', rightText: '' }]
        };
      })
    }));
  };

  const removePair = (lessonId, qId, pairId) => {
    setQuizzes((prev) => ({
      ...prev,
      [lessonId]: prev[lessonId].map((q) => {
        if (q.id !== qId) return q;
        if ((q.pairs?.length || 0) <= 2) return q;
        return {
          ...q,
          pairs: q.pairs.filter((p) => p.id !== pairId)
        };
      })
    }));
  };

  const removeQuestion = async (lessonId, qId) => {
    // Immediate API call for real questions
    if (!String(lessonId).startsWith('temp-') && !String(qId).startsWith('temp-')) {
      await deleteQuizQuestion(lessonId, qId);
    }
    
    setQuizzes((prev) => ({
      ...prev,
      [lessonId]: prev[lessonId].filter((q) => q.id !== qId)
    }));
  };

  const addQuestion = (lessonId, type) => {
    const currentQuestions = quizzes[lessonId] || [];
    const newQuestion = {
      id: `temp-q-${Date.now()}`,
      text: '',
      points: 1,
      type,
      order: currentQuestions.length + 1,
      options: type === 'mc' ? [
        { id: `o1-${Date.now()}`, text: '', isCorrect: false },
        { id: `o2-${Date.now()}`, text: '', isCorrect: false },
      ] : [],
      pairs: type === 'match' ? [
        { id: `p1-${Date.now()}`, leftText: '', rightText: '' },
        { id: `p2-${Date.now()}`, leftText: '', rightText: '' },
      ] : [],
      explanation: '',
    };
    
    setQuizzes(prev => ({
      ...prev,
      [lessonId]: [...(prev[lessonId] || []), newQuestion]
    }));
  };

  const getQuestionTypeLabel = (type) => {
    return QUESTION_TYPES.find((t) => t.id === type)?.label || type;
  };

  const renderQuestion = (lessonId, question, index) => {
    return (
      <div key={question.id} className="cc-quiz-question" id={`quiz-question-${question.id}`}>
        <div className="cc-quiz-question-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span className="cc-quiz-q-label">
            Q{index + 1}: {getQuestionTypeLabel(question.type)} · {question.points}pt
          </span>
          <button 
            onClick={() => removeQuestion(lessonId, question.id)}
            aria-label="Remove question"
            title="Remove question"
            style={{ color: '#c4bfb8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#e74c3c'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#c4bfb8'; }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Question text */}
        <div style={{ position: 'relative' }}>
          <Input
            value={question.text || ''}
            onChange={(e) => updateQuestionField(lessonId, question.id, 'text', e.target.value)}
            placeholder={question.type === 'fib' ? "Type your question here and insert blanks" : "Enter your question..."}
            className={`cc-quiz-q-input ${question.type === 'fib' ? 'pr-20' : ''}`}
          />
          {question.type === 'fib' && (
            <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }}>
              <Button 
                variant="outline" 
                size="sm"
                style={{ height: '26px', padding: '0 10px', fontSize: '12px', background: '#fff' }}
                onClick={() => updateQuestionField(lessonId, question.id, 'text', (question.text || '') + ' _____ ')}
              >
                + Blank
              </Button>
            </div>
          )}
        </div>

        {question.type === 'fib' && (
          <div className="cc-quiz-fib-preview mt-3">
            <Label className="text-xs text-muted-foreground block mb-1">Preview:</Label>
            <div className="cc-fib-text">
              {(question.text || '').split('_____').map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && <span className="cc-fib-blank"></span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Multiple choice options */}
        {question.type === 'mc' && (
          <div className="cc-quiz-options">
            {question.options?.map((option) => (
              <div
                key={option.id}
                className={`cc-quiz-option ${option.isCorrect ? 'correct' : ''}`}
                style={{ paddingRight: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}
              >
                <button
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
                  onClick={() => toggleOptionCorrect(lessonId, question.id, option.id)}
                >
                  {option.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 cc-option-check" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <Input
                  value={option.text || ''}
                  onChange={(e) => updateOptionText(lessonId, question.id, option.id, e.target.value)}
                  placeholder="Option text..."
                  className="cc-quiz-q-input"
                  style={{ border: 'none', background: 'transparent', height: 'auto', padding: 0, boxShadow: 'none', flex: 1 }}
                />
                {(question.options?.length || 0) > 2 && (
                  <button
                    onClick={() => removeOption(lessonId, question.id, option.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
                    aria-label="Remove option"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button className="cc-add-btn small" onClick={() => addOption(lessonId, question.id)}>
              <Plus className="h-3.5 w-3.5" />
              Add option
            </button>
          </div>
        )}

        {/* True / False options */}
        {question.type === 'tf' && (
          <div className="cc-quiz-options">
            <button 
              className={`cc-quiz-option ${question.correctAnswer === true ? 'correct' : ''}`}
              onClick={() => updateQuestionField(lessonId, question.id, 'correctAnswer', true)}
              style={{ width: '100%', textAlign: 'left' }}
            >
              {question.correctAnswer === true ? (
                <CheckCircle2 className="h-4 w-4 cc-option-check" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="cc-option-text">True</span>
            </button>
            <button 
              className={`cc-quiz-option ${question.correctAnswer === false ? 'correct' : ''}`}
              onClick={() => updateQuestionField(lessonId, question.id, 'correctAnswer', false)}
              style={{ width: '100%', textAlign: 'left' }}
            >
              {question.correctAnswer === false ? (
                <CheckCircle2 className="h-4 w-4 cc-option-check" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="cc-option-text">False</span>
            </button>
          </div>
        )}

        {/* Fill in blank and short answer accepted answers */}
        {(question.type === 'fib' || question.type === 'sa') && (
          <div className="cc-quiz-fib-answers">
            <Label className="text-xs text-muted-foreground">Accepted answers (comma separated):</Label>
            <Input
              value={question.acceptedAnswers || ''}
              onChange={(e) => updateQuestionField(lessonId, question.id, 'acceptedAnswers', e.target.value)}
              placeholder={question.type === 'sa' ? "e.g. Variable is a container, Memory location" : "e.g. print, print()"}
              className="cc-quiz-q-input mt-1"
            />
          </div>
        )}

        {/* Matching pairs */}
        {question.type === 'match' && (
          <div className="cc-quiz-options">
            {question.pairs?.map((pair) => (
              <div
                key={pair.id}
                className="cc-quiz-option"
                style={{ paddingRight: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}
              >
                <Input
                  value={pair.leftText || ''}
                  onChange={(e) => updatePairField(lessonId, question.id, pair.id, 'leftText', e.target.value)}
                  placeholder="Term..."
                  className="cc-quiz-q-input"
                  style={{ border: 'none', background: 'transparent', height: 'auto', padding: 0, boxShadow: 'none', flex: 1 }}
                />
                <span className="text-muted-foreground" style={{ display: 'flex', alignItems: 'center' }}>→</span>
                <Input
                  value={pair.rightText || ''}
                  onChange={(e) => updatePairField(lessonId, question.id, pair.id, 'rightText', e.target.value)}
                  placeholder="Definition..."
                  className="cc-quiz-q-input"
                  style={{ border: 'none', background: 'transparent', height: 'auto', padding: 0, boxShadow: 'none', flex: 1 }}
                />
                {(question.pairs?.length || 0) > 2 && (
                  <button
                    onClick={() => removePair(lessonId, question.id, pair.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
                    aria-label="Remove pair"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button className="cc-add-btn small" onClick={() => addPair(lessonId, question.id)}>
              <Plus className="h-3.5 w-3.5" />
              Add pair
            </button>
          </div>
        )}

        {/* Points & Explanation row */}
        <div className="cc-quiz-meta-row" style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '20px', alignItems: 'end', marginTop: '16px' }}>
          <div className="cc-quiz-points">
            <Label className="text-xs font-bold text-muted-foreground block mb-1">Points:</Label>
            <Input
              type="number"
              value={question.points || 1}
              onChange={(e) => updateQuestionField(lessonId, question.id, 'points', e.target.value)}
              className="cc-quiz-points-input"
            />
          </div>
          <div style={{ flex: 1 }}>
            <Label className="text-xs font-bold text-muted-foreground block mb-1">Explanation (optional):</Label>
            <Input
              value={question.explanation || ''}
              onChange={(e) => updateQuestionField(lessonId, question.id, 'explanation', e.target.value)}
              placeholder="Why this answer is correct..."
              className="cc-quiz-explanation-input"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="cc-step-content">
      <div className="cc-step-header">
        <h2 className="cc-step-heading">Quiz builder</h2>
        <p className="cc-step-description">Associate quizzes with your lessons to test student knowledge</p>
      </div>

      <div className="cc-form">
        <div className="cc-lessons-accordion">
          {(data.lessons || []).map((lesson, lessonIndex) => {
            const isExpanded = expandedLessons.includes(lesson.id);
            const questionCount = quizzes[lesson.id]?.length || 0;

            return (
              <div key={lesson.id} className={`cc-lesson-card ${isExpanded ? 'active' : ''}`}>
                <div 
                  className="cc-lesson-card-header" 
                  onClick={() => handleToggleExpand(lesson.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="cc-lesson-card-left">
                    <div className="cc-lesson-number" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="cc-lesson-card-info">
                      <span className="cc-lesson-card-title">{lesson.title || `Lesson ${lessonIndex + 1}`}</span>
                      <span className="cc-lesson-card-meta">
                        {questionCount} question{questionCount !== 1 ? 's' : ''} in quiz
                      </span>
                    </div>
                  </div>
                  <div className="cc-lesson-card-actions">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="cc-lesson-card-body" style={{ padding: '20px' }}>
                    <div className="cc-quiz-questions">
                      {(quizzes[lesson.id] || []).map((q, i) => renderQuestion(lesson.id, q, i))}

                      {/* Add question bar */}
                      <div className="cc-add-question-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0eee9' }}>
                        <span className="text-xs font-bold text-muted-foreground w-100 block mb-1">ADD QUESTION:</span>
                        {QUESTION_TYPES.map((type) => (
                          <Button
                            key={type.id}
                            variant="outline"
                            size="sm"
                            onClick={() => addQuestion(lesson.id, type.id)}
                            className="text-xs"
                            style={{ height: '30px' }}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {type.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {(data.lessons || []).length === 0 && (
            <div className="cc-empty-state" style={{ textAlign: 'center', padding: '40px', background: '#faf9f6', borderRadius: '12px', border: '1px dashed #e8e5e0' }}>
              <p className="text-muted-foreground">No lessons added yet. Go back to add lessons before creating quizzes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="cc-actions" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        {error && <span className="text-red-500 text-sm font-semibold">{error}</span>}
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button onClick={onBack} variant="outline" id="back-from-quiz-btn" disabled={isLoading}>
            ← Back
          </Button>
          <Button onClick={handleNextClick} className="cc-btn-primary" id="next-settings-btn" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Next: Settings & Publish →
          </Button>
        </div>
      </div>
    </div>
  );
}
