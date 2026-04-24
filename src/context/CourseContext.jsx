import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { coursesApi, lessonsApi, quizApi, aiApi } from '../services/api';
import { toast } from 'sonner';

const CourseContext = createContext();

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
};

export const CourseProvider = ({ children, initialCourseId }) => {
  const [courseId, setCourseId] = useState(initialCourseId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [originalCourseData, setOriginalCourseData] = useState(null);
  const [courseData, setCourseData] = useState({
    title: '',
    category: '',
    description: '',
    difficultyLevel: '',
    estimatedDuration: '',
    coverImage: null,
    introVideo: null,
    outcomes: [],
    lessons: [],
    questions: [],
    enrollmentType: 'open',
    enrollmentCode: '',
    startDate: '',
    deadline: '',
    awardCertificate: 'yes',
    passingScore: '0',
    notifyEnroll: true,
    notifyFailQuiz: true,
    remindInactive: false,
    status: 'draft',
  });

  // Helper to map API question to UI format
  const mapApiToUiQuestion = (q) => ({
    id: q.id,
    text: q.text,
    points: q.points,
    type: q.question_type === 'multiple_choice' ? 'mc' :
      q.question_type === 'true_false' ? 'tf' :
        q.question_type === 'fill_in_blank' ? 'fib' :
          q.question_type === 'short_answer' ? 'sa' : 'match',
    order: q.order,
    options: q.options?.map(o => ({ id: o.id, text: o.text, isCorrect: o.is_correct })) || [],
    correctAnswer: q.correct_answer,
    acceptedAnswers: q.accepted_answers?.join(', ') || '',
    pairs: q.pairs?.map(p => ({ id: p.id, leftText: p.left_text, right_text: p.right_text })) || [],
    explanation: q.explanation || ''
  });

  // Helper to map UI values to API enums for initial course creation
  const mapUiToBasicApi = (data) => ({
    title: data.title,
    subject: data.category,
    description: data.description,
    difficulty_level: data.difficultyLevel,
    estimated_duration: data.estimatedDuration,
  });

  // Helper to map UI values to API enums for full updates/settings
  const mapUiToFullApi = (data) => ({
    title: data.title,
    subject: data.category,
    description: data.description,
    difficulty_level: data.difficultyLevel,
    estimated_duration: data.estimatedDuration,
    enrollment_type: data.enrollmentType === 'code' ? 'code_protected' : 'open',
    enrollment_code: data.enrollmentCode || '',
    start_date: data.startDate || null,
    deadline: data.deadline || null,
    award_certificate: data.awardCertificate === 'yes' || data.awardCertificate === 'score',
    passing_score: parseInt(data.passingScore) || 70,
    notify_on_enroll: data.notifyEnroll,
    notify_on_quiz_fail: data.notifyFailQuiz,
    notify_inactive_after_days: data.remindInactive ? 3 : null,
  });

  // Helper to map API response back to UI state
  const mapApiToUi = (apiData) => ({
    title: apiData.title || '',
    category: apiData.subject || '',
    description: apiData.description || '',
    difficultyLevel: apiData.difficulty_level || '',
    estimatedDuration: apiData.estimated_duration || '',
    coverImage: apiData.cover_image_url || null,
    introVideo: apiData.intro_video_url || null,
    enrollmentType: apiData.enrollment_type === 'code_protected' ? 'code' : 'open',
    enrollmentCode: apiData.enrollment_code || '',
    startDate: apiData.start_date || '',
    deadline: apiData.deadline || '',
    awardCertificate: apiData.award_certificate ? 'yes' : 'no',
    passingScore: apiData.passing_score?.toString() || '70',
    notifyEnroll: apiData.notify_on_enroll || false,
    notifyFailQuiz: apiData.notify_on_quiz_fail || false,
    remindInactive: !!apiData.notify_inactive_after_days,
    status: apiData.status || 'draft',
    outcomes: (apiData.outcomes && apiData.outcomes.length > 0)
      ? apiData.outcomes.map(o => o.description)
      : [],
  });

  const fetchCourse = async () => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const response = await coursesApi.get(courseId);
      const mappedData = mapApiToUi(response.data.data);
      setCourseData(prev => ({
        ...prev,
        ...mappedData
      }));
      setOriginalCourseData(JSON.parse(JSON.stringify(mappedData)));
      return response.data.data;
    } catch (error) {
      console.error('Fetch course error:', error);
      toast.error('Failed to load course data');
    } finally {
      setIsLoading(false);
    }
  };

  const updateCourseData = useCallback((field, value) => {
    setCourseData(prev => ({ ...prev, [field]: value }));
  }, []);

  const saveBasics = async () => {
    if (courseId && originalCourseData) {
      const payload = mapUiToFullApi(courseData);
      const originalPayload = mapUiToFullApi(originalCourseData);
      const isDirty = JSON.stringify(payload) !== JSON.stringify(originalPayload) ||
        courseData.coverImage instanceof File ||
        courseData.introVideo instanceof File;

      if (!isDirty) {
        console.log('No basics changes detected, skipping API');
        return;
      }
    }

    setIsLoading(true);
    try {
      let response;
      let newId = courseId;
      if (courseId) {
        // Use full payload for updates as it's Step 5 settings sync too
        const payload = mapUiToFullApi(courseData);
        response = await coursesApi.update(courseId, payload);
      } else {
        // STAGE 1: Only send basic fields as per doc for initial creation
        const payload = mapUiToBasicApi(courseData);
        response = await coursesApi.create(payload);
        newId = response.data.data.id;
        setCourseId(newId);
      }

      // Handle Sequenced Media Uploads
      // Only upload if it's a File object (meaning it's newly selected)
      if (courseData.coverImage instanceof File) {
        const coverResp = await coursesApi.uploadCover(newId, courseData.coverImage);
        setCourseData(prev => ({ ...prev, coverImage: coverResp.data.data.cover_image_url }));
      }
      if (courseData.introVideo instanceof File) {
        const videoResp = await coursesApi.uploadVideo(newId, courseData.introVideo);
        setCourseData(prev => ({ ...prev, introVideo: videoResp.data.data.intro_video_url }));
      }

      setOriginalCourseData(prev => {
        const clone = JSON.parse(JSON.stringify(courseData));
        // IMPORTANT: If this is the initial creation, subsequent steps (outcomes, lessons)
        // are NOT yet persisted in the DB, so we must not track them in original state yet.
        if (!courseId) {
          clone.outcomes = [];
          clone.lessons = [];
          clone.questions = [];
        }
        if (courseData.coverImage instanceof File) clone.coverImage = undefined;
        if (courseData.introVideo instanceof File) clone.introVideo = undefined;
        return clone;
      });

      toast.success('Course basics saved');
      return response.data.data;
    } catch (error) {
      toast.error('Failed to save course basics');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const uploadMedia = async (type, file) => {
    if (!courseId) {
      // If no courseId yet, we need to save basics first
      await saveBasics();
    }

    setIsLoading(true);
    try {
      let response;
      if (type === 'coverImage') {
        response = await coursesApi.uploadCover(courseId, file);
      } else {
        response = await coursesApi.uploadVideo(courseId, file);
      }
      toast.success(`${type === 'coverImage' ? 'Cover' : 'Video'} uploaded`);
      return response.data.data;
    } catch (error) {
      toast.error('Upload failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOutcomes = async () => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const response = await coursesApi.getOutcomes(courseId);
      const outcomes = Array.isArray(response.data.data) ? response.data.data : [];
      const outcomeStrings = outcomes.map(o => o.description);
      setCourseData(prev => ({ ...prev, outcomes: outcomeStrings }));
      setOriginalCourseData(prev => prev ? { ...prev, outcomes: [...outcomeStrings] } : null);
    } catch (error) {
      console.error('Fetch outcomes error:', error);
      toast.error('Failed to fetch outcomes');
    } finally {
      setIsLoading(false);
    }
  };

  const saveOutcomes = async () => {
    if (!courseId) return;

    if (originalCourseData && (originalCourseData.outcomes?.length || 0) > 0) {
      const isDirty = JSON.stringify(courseData.outcomes) !== JSON.stringify(originalCourseData.outcomes);
      if (!isDirty) {
        console.log('No outcome changes detected, skipping API');
        return;
      }
    }

    setIsLoading(true);
    try {
      const formattedOutcomes = courseData.outcomes
        .filter(o => o.trim() !== '')
        .map((o, index) => ({ description: o, order: index + 1 }));

      await coursesApi.updateOutcomes(courseId, formattedOutcomes);
      setOriginalCourseData(prev => ({ ...prev, outcomes: [...courseData.outcomes] }));
      toast.success('Outcomes saved');
    } catch (error) {
      toast.error('Failed to save outcomes');
    } finally {
      setIsLoading(false);
    }
  };

  const publishCourse = async () => {
    if (!courseId) return false;
    setIsLoading(true);
    try {
      await coursesApi.publish(courseId);
      setCourseData(prev => ({ ...prev, status: 'published' }));
      toast.success('Course published successfully!');
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Failed to publish course';
      toast.error(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to map single lesson
  const mapLessonApiToUi = useCallback((l) => ({
    ...l,
    estimatedTime: l.estimated_time || '',
    completionRule: l.completion_rule || 'watch-pass',
    minQuizScore: l.min_quiz_score || '70',
    contentBlocks: (l.content_blocks || []).map(b => ({
      ...b,
      id: b.id,
      type: b.block_type || '',
      content: b.content || '',
      originalFilename: b.original_filename || '',
      fileSize: b.file_size || 0,
      fileUrl: b.file_url || null,
      order: b.order || 0
    }))
  }), []);

  // Lesson & Content Block Methods
  const fetchLessons = useCallback(async () => {
    if (!courseId) return;
    try {
      const response = await lessonsApi.getAll(courseId);
      const rawLessons = response.data.data || [];

      // Fetch content blocks for each lesson in parallel
      const lessonsWithBlocks = await Promise.all(
        rawLessons.map(async (lesson) => {
          try {
            const blocksRes = await lessonsApi.getBlocks(courseId, lesson.id);
            const blocks = blocksRes.data.data;
            return {
              ...lesson,
              content_blocks: Array.isArray(blocks) ? blocks : []
            };
          } catch (e) {
            console.error(`Failed to fetch blocks for lesson ${lesson.id}`, e);
            return { ...lesson, content_blocks: [] };
          }
        })
      );

      const mappedLessons = lessonsWithBlocks.map(mapLessonApiToUi).sort((a, b) => a.order - b.order);
      setCourseData(prev => ({ ...prev, lessons: mappedLessons }));
      return mappedLessons;
    } catch (error) {
      toast.error('Failed to fetch lessons');
    }
  }, [courseId, mapLessonApiToUi]);

  const addLesson = async (title, duration, autoFetch = true) => {
    if (!courseId) await saveBasics();
    setIsLoading(true);
    try {
      const response = await lessonsApi.create(courseId, {
        title: title || 'Untitled Lesson',
        estimated_time: duration || '10 min'
      });
      if (autoFetch) {
        toast.success('Lesson created');
        await fetchLessons();
      }
      return mapLessonApiToUi(response.data.data);
    } catch (error) {
      toast.error('Failed to add lesson');
    } finally {
      setIsLoading(false);
    }
  };

  const updateLesson = async (lessonId, updates, autoFetch = true) => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      // Map UI completion rule to API enum
      const mappedUpdates = { ...updates };
      if (updates.completionRule) {
        const ruleMap = {
          'watch-pass': 'both',
          'watch-only': 'watch_all',
          'pass-quiz': 'pass_quiz'
        };
        mappedUpdates.completion_rule = ruleMap[updates.completionRule] || updates.completionRule;
        delete mappedUpdates.completionRule;
      }
      if (updates.minQuizScore) {
        mappedUpdates.min_quiz_score = parseFloat(updates.minQuizScore);
        delete mappedUpdates.minQuizScore;
      }
      if (updates.estimatedTime) {
        mappedUpdates.estimated_time = updates.estimatedTime;
        delete mappedUpdates.estimatedTime;
      }

      await lessonsApi.update(courseId, lessonId, mappedUpdates);
      if (autoFetch) await fetchLessons();
    } catch (error) {
      toast.error('Failed to update lesson');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteLesson = async (lessonId) => {
    if (!courseId) return;
    try {
      await lessonsApi.delete(courseId, lessonId);
    } catch (error) {
      toast.error('Failed to delete lesson');
    }
  };

  const reorderLessons = async (orderArray) => {
    if (!courseId || !orderArray || orderArray.length === 0) return;
    try {
      await lessonsApi.reorder(courseId, orderArray);
    } catch (error) {
      console.error('Failed to reorder lessons', error);
    }
  };

  const addContentBlock = async (lessonId, blockData, file, autoFetch = true) => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const payload = {
        block_type: blockData.type.toLowerCase(),
        content: blockData.content || '',
        external_url: blockData.external_url || null,
        order: blockData.order || 1,
      };

      const response = await lessonsApi.createBlock(courseId, lessonId, payload);
      const blockId = response.data.data.id;

      if (file) {
        await lessonsApi.uploadBlockFile(courseId, lessonId, blockId, file);
      }

      if (autoFetch) {
        toast.success('Content block added');
        await fetchLessons();
      }

      // Attempt to return the new block from the freshly fetched data if possible
      // or map the one we just got
      return {
        ...response.data.data,
        id: blockId,
        type: blockData.type,
        order: blockData.order,
        originalFilename: file ? file.name : '',
        fileUrl: response.data.data.file_url // This might be in the response
      };
    } catch (error) {
      toast.error('Failed to add content block');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteContentBlock = async (lessonId, blockId) => {
    if (!courseId) return;
    try {
      await lessonsApi.deleteBlock(courseId, lessonId, blockId);
    } catch (error) {
      toast.error('Failed to delete content block');
    }
  };

  const reorderContentBlocks = async (lessonId, orderArray) => {
    if (!courseId || !orderArray || orderArray.length === 0) return;
    try {
      await lessonsApi.reorderBlocks(courseId, lessonId, orderArray);
    } catch (error) {
      console.error('Failed to reorder content blocks', error);
    }
  };

  const updateContentBlock = async (lessonId, blockId, data) => {
    if (!courseId) return;
    try {
      await lessonsApi.updateBlock(courseId, lessonId, blockId, data);
    } catch (error) {
      console.error('Failed to update content block', error);
    }
  };

  // Quiz Methods
  const fetchQuiz = useCallback(async (lessonId) => {
    if (!courseId || !lessonId) return null;
    try {
      const response = await quizApi.get(courseId, lessonId);
      const questions = (response.data.data.questions || []).map(mapApiToUiQuestion);
      return { ...response.data.data, questions };
    } catch (error) {
      if (error.response?.status === 404) {
        try {
          const newQuiz = await quizApi.create(courseId, lessonId);
          return { ...newQuiz.data.data, questions: [] };
        } catch (createError) {
          console.error('Failed to create quiz on 404', createError);
        }
      }
      console.error('Fetch quiz error:', error);
      return null;
    }
  }, [courseId, mapApiToUiQuestion]);

  const addQuizQuestion = useCallback(async (lessonId, questionData) => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const typeMap = { mc: 'multiple_choice', tf: 'true_false', fib: 'fill_in_blank', sa: 'short_answer', match: 'matching' };
      const payload = {
        question_type: typeMap[questionData.type] || questionData.type,
        text: questionData.text,
        points: parseInt(questionData.points) || 1,
        explanation: questionData.explanation || '',
        order: questionData.order,
      };

      if (questionData.type === 'mc') {
        payload.options = questionData.options?.map(o => ({ text: o.text || 'Untitled Option', is_correct: !!o.isCorrect }));
      } else if (questionData.type === 'tf') {
        payload.correct_answer = questionData.correctAnswer === true;
      } else if (questionData.type === 'fib' || questionData.type === 'sa') {
        payload.accepted_answers = questionData.acceptedAnswers ? questionData.acceptedAnswers.split(',').map(s => s.trim()) : [];
      } else if (questionData.type === 'match') {
        payload.pairs = questionData.pairs?.map(p => ({ left_text: p.leftText || '', right_text: p.rightText || '' })) || [];
      } else {
        payload.correct_answer = questionData.correctAnswer;
      }

      try {
        const response = await quizApi.addQuestion(courseId, lessonId, payload);
        return mapApiToUiQuestion(response.data.data);
      } catch (error) {
        if (error.response?.status === 404) {
          // Quiz not found? Create it and retry once
          await quizApi.create(courseId, lessonId);
          const response = await quizApi.addQuestion(courseId, lessonId, payload);
          return mapApiToUiQuestion(response.data.data);
        }
        throw error;
      }
    } catch (error) {
      console.error('Failed to add quiz question:', error);
      toast.error('Failed to add question');
    } finally {
      setIsLoading(false);
    }
  }, [courseId, updateCourseData, mapApiToUiQuestion]);

  const updateQuizQuestion = useCallback(async (lessonId, questionId, questionData) => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const typeMap = { mc: 'multiple_choice', tf: 'true_false', fib: 'fill_in_blank', sa: 'short_answer', match: 'matching' };
      const payload = {
        question_type: typeMap[questionData.type] || questionData.type,
        text: questionData.text,
        points: parseInt(questionData.points) || 1,
        explanation: questionData.explanation || '',
        order: questionData.order,
      };

      if (questionData.type === 'mc') {
        payload.options = questionData.options?.map(o => ({ text: o.text || 'Untitled Option', is_correct: !!o.isCorrect }));
      } else if (questionData.type === 'tf') {
        payload.correct_answer = questionData.correctAnswer === true;
      } else if (questionData.type === 'fib' || questionData.type === 'sa') {
        payload.accepted_answers = questionData.acceptedAnswers ? questionData.acceptedAnswers.split(',').map(s => s.trim()) : [];
      } else if (questionData.type === 'match') {
        payload.pairs = questionData.pairs?.map(p => ({ left_text: p.leftText || '', right_text: p.rightText || '' })) || [];
      } else {
        payload.correct_answer = questionData.correctAnswer;
      }

      const response = await quizApi.updateQuestion(courseId, lessonId, questionId, payload);
      return mapApiToUiQuestion(response.data.data);
    } catch (error) {
      toast.error('Failed to update question');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [courseId, mapApiToUiQuestion]);

  const syncQuizQuestions = async (lessonId, questions, originalQuestions = null) => {
    if (!courseId || !lessonId) return [];
    setIsLoading(true);
    const syncedQuestions = [];
    try {
      for (const q of questions) {
        if (String(q.id).startsWith('temp-')) {
          const syncedQ = await addQuizQuestion(lessonId, q);
          if (syncedQ) syncedQuestions.push(syncedQ);
        } else {
          let isDirty = true;
          if (originalQuestions) {
            const original = originalQuestions.find(oq => oq.id === q.id);
            if (original) {
              isDirty = JSON.stringify(original) !== JSON.stringify(q);
            }
          }
          if (isDirty) {
            const syncedQ = await updateQuizQuestion(lessonId, q.id, q);
            if (syncedQ) syncedQuestions.push(syncedQ);
          } else {
            syncedQuestions.push(q);
          }
        }
      }

      // Clear AI draft once synced
      setCourseData(prev => ({
        ...prev,
        lessons: prev.lessons.map(l => l.id === lessonId ? { ...l, aiQuizQuestions: undefined } : l)
      }));

      toast.success('Quiz synchronized');
      return syncedQuestions;
    } catch (error) {
      console.error('Quiz sync error:', error);
      return questions;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteQuizQuestion = async (lessonId, questionId) => {
    if (!courseId) return;
    try {
      await quizApi.deleteQuestion(courseId, lessonId, questionId);
    } catch (error) {
      console.error('Failed to delete question', error);
      toast.error('Failed to permanently delete question');
    }
  };

  const fetchProgress = async () => {
    if (!courseId) return null;
    try {
      const response = await coursesApi.getProgress(courseId);
      return response.data.data.completed_steps;
    } catch (error) {
      console.error('Fetch progress error:', error);
      return null;
    }
  };

  const updateStepProgress = async (stepKey, completed = true, idOverride = null) => {
    const id = idOverride || courseId;
    if (!id) return;
    try {
      await coursesApi.updateProgress(id, { step: stepKey, completed });
    } catch (error) {
      console.error('Update progress error:', error);
    }
  };

  const generateCourseWithAi = async (file, prompt) => {
    setIsLoading(true);
    try {

      //    // Simulating API call for testing with mock data from sampleOutFromAI.json
      // await new Promise(resolve => setTimeout(resolve, 3000));

      // const aiData = aiMockData.data.data.course;

      const response = await aiApi.generateCourse(file, prompt);
      const aiData = response.data.data.data.course;

      const mappedLessons = aiData.lessons.map((l, lIdx) => ({
        id: `temp-ai-l-${Date.now()}-${lIdx}`,
        title: l.title,
        estimatedTime: l.estimated_time || '',
        completionRule: l.completion_rule === 'both' ? 'watch-pass' : l.completion_rule === 'watch_all' ? 'watch-only' : 'pass-quiz',
        minQuizScore: l.min_quiz_score?.toString() || '70',
        order: lIdx + 1,
        contentBlocks: (l.blocks || []).map((b, bIdx) => ({
          id: `temp-ai-cb-${Date.now()}-${bIdx}`,
          type: b.block_type || 'text',
          content: b.content || '',
          order: bIdx + 1
        })),
        aiQuizQuestions: (l.quiz?.questions || []).map((q, qIdx) => ({
          id: `temp-ai-q-${Date.now()}-${qIdx}`,
          text: q.text,
          points: q.points || 1,
          type: q.question_type === 'multiple_choice' ? 'mc' :
            q.question_type === 'true_false' ? 'tf' :
              q.question_type === 'fill_in_blank' ? 'fib' :
                q.question_type === 'short_answer' ? 'sa' : 'match',
          order: qIdx + 1,
          explanation: q.explanation || '',
          options: q.options?.map((o, oIdx) => ({
            id: `temp-ai-o-${Date.now()}-${oIdx}`,
            text: o.text,
            isCorrect: o.is_correct
          })) || [],
          correctAnswer: q.correct_answer,
          acceptedAnswers: q.accepted_answers ? q.accepted_answers.join(', ') : '',
          pairs: q.pairs?.map((p, pIdx) => ({
            id: `temp-ai-p-${Date.now()}-${pIdx}`,
            leftText: p.left_text,
            rightText: p.right_text
          })) || []
        }))
      }));

      const newCourseData = {
        ...courseData,
        title: aiData.title || '',
        category: aiData.subject || '',
        description: aiData.description || '',
        difficultyLevel: aiData.difficulty_level || '',
        estimatedDuration: aiData.estimated_duration || '',
        outcomes: (aiData.outcomes || []).map(o => o.description),
        lessons: mappedLessons,
        enrollmentType: aiData.enrollment_type || 'open',
        passingScore: aiData.passing_score?.toString() || '70',
        awardCertificate: aiData.award_certificate ? 'yes' : 'no',
        notifyEnroll: !!aiData.notify_on_enroll,
        notifyFailQuiz: !!aiData.notify_on_quiz_fail,
        status: 'draft'
      };

      setCourseData(newCourseData);
      toast.success('Course generated successfully! Please review each step.');
      return true;
    } catch (error) {
      console.error('AI Generation error:', error);
      toast.error('Failed to generate course with AI');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    courseId,
    courseData,
    isLoading,
    updateCourseData,
    fetchCourse,
    saveBasics,
    uploadMedia,
    fetchOutcomes,
    saveOutcomes,
    publishCourse,
    addLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
    fetchLessons,
    addContentBlock,
    deleteContentBlock,
    reorderContentBlocks,
    updateContentBlock,
    fetchQuiz,
    addQuizQuestion,
    updateQuizQuestion,
    deleteQuizQuestion,
    syncQuizQuestions,
    fetchProgress,
    updateStepProgress,
    generateCourseWithAi,
  };

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
};
