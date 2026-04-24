import { useState, useEffect, useRef } from 'react';
import { Upload, Film, Loader2, Image as ImageIcon, Sparkles, FileText, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCourse } from '@/context/CourseContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function CourseBasics({ data, updateData, onNext, isLoading, isEditMode }) {
  const [isUploading, setIsUploading] = useState({ cover: false, video: false });
  const { uploadMedia, fetchCourse, courseId, saveBasics, generateCourseWithAi } = useCourse();
  const [error, setError] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiFile, setAiFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Only fetch if we have a courseId AND we don't have a title yet (prevents overwriting AI data)
    if (courseId && !hasFetched.current && !data.title) {
      fetchCourse();
      hasFetched.current = true;
    }
  }, [courseId, fetchCourse, data.title]);

  const handleNext = async () => {
    if (!data.title || !data.category || !data.description || !data.difficultyLevel) {
      setError('Please fill in all required fields (*)');
      return;
    }
    setError('');

    setError('');
    
    // Parent onNext handles the actual saveBasics logic
    onNext();
  };

  const handleAiGenerate = async () => {
    if (!aiFile) {
      setError('Please upload a document for AI to process');
      return;
    }
    setError('');
    setIsGenerating(true);
    try {
      const success = await generateCourseWithAi(aiFile, aiPrompt);
      if (success) {
        // Success toast is handled in context
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <div className="cc-step-content">
      <div className="cc-step-header">
        <h2 className="cc-step-heading">Course basics</h2>
        <p className="cc-step-description">Fill in the general information about your course</p>
      </div>

      <div className="cc-form">
        {!isEditMode && (
          <>
            {/* AI Quick Create Section */}
            <div className="cc-form-divider">
              <span>QUICK CREATE WITH AI</span>
            </div>

            <div className="cc-ai-box">
              <div className="cc-ai-box-header">
                <div className="cc-ai-sparkle">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="cc-ai-title">Course Builder AI</h3>
                  <p className="cc-ai-desc">Upload a syllabus or document to generate your entire course structure</p>
                </div>
              </div>
              
              <div className="cc-ai-content">
                <div className="cc-ai-row">
                  <div 
                    className={`cc-ai-upload ${aiFile ? 'has-file' : ''}`}
                    onClick={() => !aiFile && document.getElementById('ai-file-input').click()}
                  >
                    <input 
                      type="file" 
                      id="ai-file-input" 
                      accept=".pdf,.ppt,.pptx"
                      style={{ display: 'none' }}
                      onChange={(e) => setAiFile(e.target.files[0])}
                    />
                    {aiFile ? (
                      <div className="cc-ai-file-info">
                        <FileText className="h-5 w-5 text-amber-500" />
                        <span className="cc-ai-filename">{aiFile.name}</span>
                        <button className="cc-ai-remove" onClick={(e) => { e.stopPropagation(); setAiFile(null); }}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Upload PDF/PPT</span>
                      </>
                    )}
                  </div>
                  <div className="cc-ai-prompt-wrapper">
                    <Input 
                      className="cc-ai-prompt-input"
                      placeholder="e.g. '3 lessons, beginner Python course'..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleAiGenerate}
                    className="cc-ai-gen-btn"
                    disabled={isGenerating || isLoading}
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    {isGenerating ? 'Generating...' : 'Generate with AI'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="cc-form-divider">
              <span>OR FILL MANUALLY</span>
            </div>
          </>
        )}


        {/* Title & Category Row */}
        <div className="cc-form-row cc-form-row-2">
          <div className="cc-form-group">
            <Label htmlFor="course-title">Course title *</Label>
            <Input
              id="course-title"
              placeholder="e.g. Introduction to Python"
              value={data.title}
              onChange={(e) => updateData('title', e.target.value)}
            />
          </div>
          <div className="cc-form-group">
            <Label htmlFor="course-category">Subject / category *</Label>
            <Select
              id="course-category"
              value={data.category}
              onChange={(e) => updateData('category', e.target.value)}
            >
              <option value="" disabled>Select category...</option>
              <option value="programming">Programming</option>
              <option value="mathematics">Mathematics</option>
              <option value="science">Science</option>
              <option value="languages">Languages</option>
              <option value="business">Business</option>
              <option value="design">Design</option>
              <option value="other">Other</option>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div className="cc-form-group">
          <Label htmlFor="course-description">Course description *</Label>
          <Textarea
            id="course-description"
            placeholder="What will students learn in this course?"
            rows={4}
            value={data.description}
            onChange={(e) => updateData('description', e.target.value)}
          />
        </div>

        {/* Difficulty & Duration Row */}
        <div className="cc-form-row cc-form-row-2">
          <div className="cc-form-group">
            <Label htmlFor="difficulty-level">Difficulty level *</Label>
            <Select
              id="difficulty-level"
              value={data.difficultyLevel}
              onChange={(e) => updateData('difficultyLevel', e.target.value)}
            >
              <option value="" disabled>Select level...</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </div>
          <div className="cc-form-group">
            <Label htmlFor="estimated-duration">Estimated duration</Label>
            <Input
              id="estimated-duration"
              placeholder="e.g. 3 hours"
              value={data.estimatedDuration}
              onChange={(e) => updateData('estimatedDuration', e.target.value)}
            />
          </div>
        </div>


        {/* Cover & Media Section */}
        <div className="cc-form-section">
          <h3 className="cc-section-label">COVER & MEDIA</h3>
          <div className="cc-form-row cc-form-row-2">
            <div className="cc-form-group">
              <Label>Cover Image</Label>
              <div
                className="cc-upload-zone"
                id="cover-image-upload"
                onClick={() => document.getElementById('cover-image-input').click()}
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="file"
                  id="cover-image-input"
                  accept="image/png, image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      updateData('coverImage', file);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <div className="cc-upload-content">
                  {data.coverImage ? (
                    <div className="cc-media-preview-mini">
                      <ImageIcon className="h-5 w-5 text-amber-500" />
                      <span className="cc-upload-text">
                        {data.coverImage instanceof File ? data.coverImage.name : 'Image uploaded'}
                      </span>
                    </div>
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="cc-upload-text">
                    {data.coverImage ? "Will be uploaded on Next" : "Drop image here or click to upload"}
                  </span>
                  <span className="cc-upload-hint">
                    {data.coverImage ? "Click to change" : "PNG, JPG · 1280×720 recommended"}
                  </span>
                </div>
              </div>
            </div>
            <div className="cc-form-group">
              <Label>Intro video (optional)</Label>
              <div
                className="cc-upload-zone"
                id="intro-video-upload"
                onClick={() => document.getElementById('intro-video-input').click()}
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="file"
                  id="intro-video-input"
                  accept="video/mp4"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      updateData('introVideo', file);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <div className="cc-upload-content">
                  {data.introVideo ? (
                    <div className="cc-video-preview">
                      <Film className="h-5 w-5 text-amber-500" />
                      <span className="cc-upload-text">
                        {data.introVideo instanceof File ? data.introVideo.name : 'Video uploaded'}
                      </span>
                    </div>
                  ) : (
                    <Film className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="cc-upload-text">
                    {data.introVideo ? "Will be uploaded on Next" : "Upload intro video or drag & drop"}
                  </span>
                  <span className="cc-upload-hint">
                    {data.introVideo ? "Click to change" : "MP4 format · Max 50MB · 16:9 ratio"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="cc-actions" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        {error && <span className="text-red-500 text-sm font-semibold">{error}</span>}
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" id="save-draft-btn" disabled={isLoading}>Save draft</Button>
          <Button onClick={handleNext} className="cc-btn-primary" id="next-outcomes-btn" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Next: Outcomes →
          </Button>
        </div>
      </div>
    </div>
  );
}
