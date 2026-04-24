import { useState, useEffect, useRef } from 'react';
import { Plus, X, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCourse } from '@/context/CourseContext';


export default function Outcomes({ data, updateData, onNext, onBack, isLoading }) {
  const { fetchOutcomes, courseId, isLoading: isCtxLoading } = useCourse();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const hasFetched = useRef(false);

  useEffect(() => {
    // Only fetch if we have a courseId AND we don't have outcomes yet (prevents overwriting AI data)
    if (courseId && !hasFetched.current && (!data.outcomes || data.outcomes.length === 0)) {
      fetchOutcomes();
      hasFetched.current = true;
    }
  }, [courseId, fetchOutcomes, data.outcomes]);

  const handleNext = () => {
    const validOutcomes = data.outcomes.filter(o => o.trim() !== '');
    if (validOutcomes.length === 0) {
      setError('Please provide at least one learning outcome.');
      return;
    }
    setError('');
    onNext();
  };

  const generateOutcomes = async () => {
    if (!courseId) return;
    setIsGenerating(true);
    await fetchOutcomes();
    setIsGenerating(false);
  };

  const addOutcome = () => {
    updateData('outcomes', [...data.outcomes, '']);
  };

  const updateOutcome = (index, value) => {
    const newOutcomes = [...data.outcomes];
    newOutcomes[index] = value;
    updateData('outcomes', newOutcomes);
  };

  const removeOutcome = (index) => {
    const newOutcomes = [...data.outcomes];
    newOutcomes.splice(index, 1);
    updateData('outcomes', newOutcomes);
  };

  return (
    <div className="cc-step-content">
      <div className="cc-step-header">
        <h2 className="cc-step-heading">Learning outcomes</h2>
        <p className="cc-step-description">
          Be specific about what students will be able to do after completing this course
        </p>
      </div>

      <div className="cc-form">
        {/* AI Generation Banner */}
        <div className="cc-outcomes-banner">
          <div className="cc-outcomes-banner-icon">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="cc-outcomes-banner-content">
            <h4 className="cc-outcomes-banner-title">Competency-based outcomes</h4>
            <p className="cc-outcomes-banner-text">
              {data.category
                ? `Outcomes generated from the "${data.category}" competency framework. Edit or add more as needed.`
                : 'Select a course category in the previous step to auto-generate outcomes.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateOutcomes}
            disabled={isGenerating || !data.category}
            className="cc-regenerate-btn"
            id="regenerate-outcomes-btn"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isGenerating ? 'Generating...' : 'Regenerate'}
          </Button>
        </div>

        {/* Outcomes List */}
        <div className="cc-form-section">
          <div className="cc-outcomes-list">
            {data.outcomes.map((outcome, index) => (
              <div key={index} className="cc-outcome-row">
                <span className="cc-outcome-num">{index + 1}</span>
                <Input
                  id={`outcome-${index + 1}`}
                  placeholder={`Outcome ${index + 1} — describe what students will achieve`}
                  value={outcome}
                  onChange={(e) => updateOutcome(index, e.target.value)}
                  className="cc-outcome-input"
                />
                {data.outcomes.length > 1 && (
                  <button
                    className="cc-outcome-remove"
                    onClick={() => removeOutcome(index)}
                    aria-label="Remove outcome"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button className="cc-add-btn" onClick={addOutcome} id="add-outcome-btn">
              <Plus className="h-4 w-4" />
              {data.outcomes.length === 0 ? 'Add a learning outcome' : 'Add another outcome'}
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="cc-actions" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        {error && <span className="text-red-500 text-sm font-semibold">{error}</span>}
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" onClick={onBack} id="back-from-outcomes-btn">
            ← Back
          </Button>
          <Button onClick={handleNext} className="cc-btn-primary" id="next-lessons-btn" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Next: Lessons →
          </Button>
        </div>
      </div>
    </div>
  );
}
