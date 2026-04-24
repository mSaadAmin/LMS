import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './CreateCourse.css';
import { Check } from 'lucide-react';
import CourseBasics from './steps/CourseBasics';
import Outcomes from './steps/Outcomes';
import LessonBuilder from './steps/LessonBuilder';
import QuizBuilder from './steps/QuizBuilder';
import SettingsPublish from './steps/SettingsPublish';
import { CourseProvider, useCourse } from '@/context/CourseContext';

// Top stepper: Settings & Publish merged into one
const STEPS = [
  { id: 1, label: 'Basics', key: 'basics' },
  { id: 2, label: 'Outcomes', key: 'outcomes' },
  { id: 3, label: 'Lessons', key: 'lessons' },
  { id: 4, label: 'Quiz', key: 'quiz' },
  { id: 5, label: 'Settings & Publish', key: 'settings-publish' },
];

// Sidebar mirrors the same 5 steps
const SIDEBAR_ITEMS = [
  { id: 1, label: 'Course basics' },
  { id: 2, label: 'Outcomes' },
  { id: 3, label: 'Lessons' },
  { id: 4, label: 'Quiz' },
  { id: 5, label: 'Settings & publish' },
];

const BREADCRUMB_LABELS = {
  1: 'New course',
  2: 'Outcomes',
  3: 'Lessons',
  4: 'Quiz builder',
  5: 'Settings & publish',
};

import { useParams } from 'react-router-dom';

const STEP_KEYS = {
  1: 'basics',
  2: 'outcomes',
  3: 'lessons',
  4: 'quiz',
  5: 'settings'
};

export default function CreateCourse({ isEditMode }) {
  const { courseId } = useParams();

  return (
    <CourseProvider initialCourseId={isEditMode ? courseId : null}>
      <CreateCourseContent isEditMode={isEditMode} />
    </CourseProvider>
  );
}

function CreateCourseContent({ isEditMode }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);

  const {
    courseData,
    updateCourseData,
    saveBasics,
    saveOutcomes,
    publishCourse,
    fetchProgress,
    updateStepProgress,
    courseId,
    isLoading
  } = useCourse();

  // Hydrate progress from backend if in edit mode
  useEffect(() => {
    const hydrateProgress = async () => {
      if (isEditMode && courseId) {
        const progress = await fetchProgress();
        if (progress) {
          const completed = [];
          if (progress.basics) completed.push(1);
          if (progress.outcomes) completed.push(2);
          if (progress.lessons) completed.push(3);
          if (progress.quiz) completed.push(4);
          if (progress.settings) completed.push(5);
          setCompletedSteps(completed);
        }
      }
    };
    hydrateProgress();
  }, [isEditMode, courseId, fetchProgress]);

  const totalSteps = STEPS.length;

  const handleNext = async () => {
    try {
      let activeId = courseId;
      if (currentStep === 1) {
        const result = await saveBasics();
        activeId = result?.id || courseId;
      } else if (currentStep === 2) {
        await saveOutcomes();
      }

      // Save progress to backend
      const stepKey = STEP_KEYS[currentStep];
      if (stepKey) {
        await updateStepProgress(stepKey, true, activeId);
      }

      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep]);
      }
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } catch (error) {
      console.error('Step save failed', error);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleStepClick = (stepId) => {
    if (stepId <= Math.max(...completedSteps, 0) + 1) {
      setCurrentStep(stepId);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <CourseBasics
            data={courseData}
            updateData={updateCourseData}
            onNext={handleNext}
            isLoading={isLoading}
            isEditMode={isEditMode}
          />
        );
      case 2:
        return (
          <Outcomes
            data={courseData}
            updateData={updateCourseData}
            onNext={handleNext}
            onBack={handleBack}
            isLoading={isLoading}
          />
        );
      case 3:
        return (
          <LessonBuilder
            data={courseData}
            updateData={updateCourseData}
            onNext={handleNext}
            onBack={handleBack}
            isLoading={isLoading}
          />
        );
      case 4:
        return (
          <QuizBuilder
            data={courseData}
            updateData={updateCourseData}
            onNext={handleNext}
            onBack={handleBack}
            isLoading={isLoading}
          />
        );
      case 5:
        return (
          <SettingsPublish
            data={courseData}
            updateData={updateCourseData}
            onBack={handleBack}
            onPublish={publishCourse}
            isLoading={isLoading}
            isEditMode={isEditMode}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="create-course-page">
      {/* Header Breadcrumb */}
      <div className="cc-header">
        <div className="cc-header-inner">
          <nav className="cc-breadcrumb">
            <Link to="/dashboard" className="cc-breadcrumb-link">LMS</Link>
            <span className="cc-breadcrumb-sep">/</span>
            <Link to="/dashboard" className="cc-breadcrumb-link">My courses</Link>
            <span className="cc-breadcrumb-sep">/</span>
            <span className="cc-breadcrumb-current">
              {currentStep === 1 && isEditMode ? 'Edit course' : BREADCRUMB_LABELS[currentStep]}
            </span>
          </nav>
          <div className="cc-header-avatar">
            <div className="cc-avatar">SA</div>
          </div>
        </div>
      </div>

      <div className="cc-layout">
        {/* Sidebar */}
        <aside className="cc-sidebar">
          <div className="cc-sidebar-section">
            <h3 className="cc-sidebar-title">STEPS</h3>
            <ul className="cc-sidebar-list">
              {SIDEBAR_ITEMS.map((item) => (
                <li key={item.id}>
                  <button
                    className={`cc-sidebar-item ${currentStep === item.id ? 'active' : ''} ${completedSteps.includes(item.id) ? 'completed' : ''}`}
                    onClick={() => handleStepClick(item.id)}
                  >
                    <span className="cc-sidebar-num">{item.id}.</span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>


        </aside>

        {/* Main content area */}
        <main className="cc-main">
          {/* Step indicator */}
          <div className="cc-stepper">
            {STEPS.map((step, index) => (
              <div key={step.id} className="cc-step-wrapper">
                <button
                  className={`cc-step ${currentStep === step.id ? 'current' : ''
                    } ${completedSteps.includes(step.id) ? 'completed' : ''} ${step.id > Math.max(...completedSteps, 0) + 1 ? 'disabled' : ''
                    }`}
                  onClick={() => handleStepClick(step.id)}
                >
                  <span className="cc-step-indicator">
                    {completedSteps.includes(step.id) ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      step.id
                    )}
                  </span>
                  <span className="cc-step-label">{step.label}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`cc-step-connector ${completedSteps.includes(step.id) ? 'completed' : ''}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="cc-content">
            {renderStepContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
