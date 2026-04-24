import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useCourse } from '@/context/CourseContext';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, Loader2 } from 'lucide-react';

export default function SettingsPublish({ data, updateData, onBack, onPublish, isLoading, isEditMode }) {
  const { saveBasics, updateStepProgress } = useCourse();
  const navigate = useNavigate();
  const blockCount = data.lessons.reduce((acc, lesson) => 
    acc + (lesson.contentBlocks?.filter(b => b.file_url || b.external_url || b.file || b.content || b.type === 'text').length || 0), 0
  );

  const handleSave = async () => {
    try {
      await saveBasics();
      await updateStepProgress('settings', true);
      navigate('/dashboard');
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  const handlePublish = async () => {
    try {
      await saveBasics();
      const success = await onPublish();
      if (success) {
        await updateStepProgress('settings', true);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Publish failed', err);
    }
  };
  return (
    <div className="cc-step-content">
      <div className="cc-step-header">
        <h2 className="cc-step-heading">Settings & publish</h2>
        <p className="cc-step-description">Configure access, then publish when ready</p>
      </div>

      <div className="cc-form">
        {/* Enrollment Section */}
        <div className="cc-form-section">
          <h3 className="cc-section-label">ENROLLMENT</h3>
          <div className="cc-form-row cc-form-row-2">
            <div className="cc-form-group">
              <Label htmlFor="enrollment-type">Enrollment type</Label>
              <Select
                id="enrollment-type"
                value={data.enrollmentType}
                onChange={(e) => updateData('enrollmentType', e.target.value)}
              >
                <option value="open">Open — anyone can enroll</option>
                <option value="code">Enrollment code required</option>
                <option value="invite">Invite only</option>
                <option value="paid">Paid enrollment</option>
              </Select>
            </div>
            <div className="cc-form-group">
              <Label htmlFor="enrollment-code">Enrollment code (optional)</Label>
              <Input
                id="enrollment-code"
                placeholder="Leave blank for open access"
                value={data.enrollmentCode}
                onChange={(e) => updateData('enrollmentCode', e.target.value)}
              />
            </div>
          </div>
          <div className="cc-form-row cc-form-row-2">
            <div className="cc-form-group">
              <Label htmlFor="start-date">Start date</Label>
              <Input
                id="start-date"
                type="date"
                placeholder="MM/DD/YYYY"
                value={data.startDate}
                onChange={(e) => updateData('startDate', e.target.value)}
              />
            </div>
            <div className="cc-form-group">
              <Label htmlFor="deadline">Deadline (optional)</Label>
              <Input
                id="deadline"
                type="date"
                placeholder="MM/DD/YYYY"
                value={data.deadline}
                onChange={(e) => updateData('deadline', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Completion & Certificate */}
        <div className="cc-form-section">
          <h3 className="cc-section-label">COMPLETION & CERTIFICATE</h3>
          <div className="cc-form-row cc-form-row-2">
            <div className="cc-form-group">
              <Label htmlFor="award-certificate">Award certificate</Label>
              <Select
                id="award-certificate"
                value={data.awardCertificate}
                onChange={(e) => updateData('awardCertificate', e.target.value)}
              >
                <option value="yes">Yes — on course completion</option>
                <option value="no">No certificate</option>
                <option value="score">Yes — if passing score met</option>
              </Select>
            </div>
            <div className="cc-form-group">
              <Label htmlFor="passing-score">Course passing score</Label>
              <Input
                id="passing-score"
                placeholder="70% avg across all quizzes"
                value={data.passingScore}
                onChange={(e) => updateData('passingScore', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="cc-form-section">
          <h3 className="cc-section-label">NOTIFICATIONS</h3>
          <div className="cc-checkbox-group">
            <label className="cc-checkbox-item" htmlFor="notify-enroll">
              <Checkbox
                id="notify-enroll"
                checked={data.notifyEnroll}
                onCheckedChange={(val) => updateData('notifyEnroll', val)}
              />
              <span>Notify me when a student enrolls</span>
            </label>
            <label className="cc-checkbox-item" htmlFor="notify-fail">
              <Checkbox
                id="notify-fail"
                checked={data.notifyFailQuiz}
                onCheckedChange={(val) => updateData('notifyFailQuiz', val)}
              />
              <span>Notify me when a student fails a quiz</span>
            </label>
            <label className="cc-checkbox-item" htmlFor="remind-inactive">
              <Checkbox
                id="remind-inactive"
                checked={data.remindInactive}
                onCheckedChange={(val) => updateData('remindInactive', val)}
              />
              <span>Remind inactive students after 3 days</span>
            </label>
          </div>
        </div>

        {/* Ready to publish */}
        <div className="cc-publish-summary">
          <div className="cc-publish-icon">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="cc-publish-info">
            <h4 className="cc-publish-title">Ready to publish?</h4>
            <p className="cc-publish-text">
              Your course has {data.lessons.length} lesson{data.lessons.length !== 1 ? 's' : ''} containing {blockCount} piece{blockCount !== 1 ? 's' : ''} of content, and {data.questions.length} quiz question{data.questions.length !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="cc-actions">
        <Button variant="outline" onClick={onBack} id="save-as-draft-btn">
          Back
        </Button>
        <div className="cc-action-buttons" style={{ display: 'flex', gap: '12px' }}>
          {isEditMode && (
            <Button
              className="cc-btn-secondary"
              onClick={handleSave}
              disabled={isLoading}
              style={{ padding: '0 24px' }}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update course
            </Button>
          )}

          {(data.status !== 'published') ? (
            <Button
              className="cc-btn-primary cc-btn-publish"
              id="publish-course-btn"
              onClick={handlePublish}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Publish course
            </Button>
          ) : !isEditMode && (
            <Button
              className="cc-btn-primary cc-btn-publish"
              disabled
            >
              Published
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
