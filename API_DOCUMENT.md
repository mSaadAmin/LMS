# LearnFlow Course Creation API Documentation

## Overview

This document describes all API endpoints required for the course creation flow. The flow consists of **5 steps**:

1. **Course Basics** - General course information + Learning Outcomes (separate page)
2. **Lessons** - Lesson builder with content blocks
3. **Quiz** - End-of-lesson quiz builder
4. **Settings & Publish** - Enrollment, completion, and publish settings
5. **Publish** - Final publish action

---

## Base URL

```
/api/v1
```

---

## Authentication

All protected endpoints require Bearer token authentication:

```
Authorization: Bearer <access_token>
```

### Authentication Flow

#### 1. Register a New Account

**Endpoint:** `POST /api/v1/auth/register`
**Description:** Create a new user account
**Auth Required:** No

##### Request Payload

```json
{
  "email": "teacher@example.com",
  "full_name": "John Doe",
  "password": "SecurePass123!",
  "role": "teacher" // optional, defaults to "student"
}
```

##### Response

```json
{
  "id": "uuid-string",
  "email": "teacher@example.com",
  "full_name": "John Doe",
  "role": "teacher",
  "is_active": true,
  "created_at": "2026-04-11T10:00:00Z"
}
```

##### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character
- Cannot be a common password
- Cannot be similar to email or full name

**Rate Limit:** 5 requests per 5 minutes

---

#### 2. Login

**Endpoint:** `POST /api/v1/auth/login`
**Description:** Authenticate and receive access + refresh tokens
**Auth Required:** No

##### Request Payload

```json
{
  "username": "teacher@example.com",
  "password": "SecurePass123!"
}
```

##### Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

**Notes:**
- `access_token` expires in 30 minutes (1800 seconds) by default
- `refresh_token` expires in 7 days by default
- Tokens are JWT signed with the server's `SECRET_KEY`

**Rate Limit:** 10 requests per 60 seconds

---

#### 3. Refresh Access Token

**Endpoint:** `POST /api/v1/auth/refresh`
**Description:** Obtain a new access token using a refresh token
**Auth Required:** No (uses refresh token)

##### Request Payload

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

##### Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new-access...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new-refresh...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

**Notes:**
- Implements **refresh token rotation**: the old refresh token is blacklisted
- Detects token reuse: if an already-consumed refresh token is used again, the entire token family is blacklisted to prevent token theft

**Rate Limit:** 30 requests per 60 seconds

---

#### 4. Logout

**Endpoint:** `POST /api/v1/auth/logout`
**Description:** Invalidate the current access token
**Auth Required:** Yes (Bearer access token)

##### Request

```
Authorization: Bearer <access_token>
```

##### Response

```json
{
  "message": "Successfully logged out"
}
```

**Notes:**
- Blacklists the current access token in Redis so it cannot be reused
- Token remains blacklisted until its original expiry time

---

### User Roles

| Role | Description |
|------|-------------|
| `student` | Can enroll in and take courses |
| `teacher` | Can create and manage courses |
| `admin` | Full access to all features |

### Authorization

Protected endpoints use role-based access control (RBAC):

```
Authorization: Bearer <access_token>
```

JWT tokens contain:
- `sub`: User ID
- `exp`: Expiration timestamp
- `type`: Token type (`access` or `refresh`)
- `jti`: Unique token ID

---

---

## Step 1: Course Basics

### Page 1: Course Basics + Learning Outcomes

This page collects general course information, media uploads, AND learning outcomes in a single form.

**Endpoints to call on page load (PARALLEL):**
1. `GET /api/v1/courses/{course_id}` — Fetch existing course data (if editing)
2. `GET /api/v1/courses/{course_id}/outcomes` — Fetch existing learning outcomes

---

#### Create Course (Initial Save)

**Endpoint:** `POST /api/v1/courses`
**Description:** Create a new course draft
**Auth Required:** Yes (Bearer token, `teacher` role)

##### Request Payload

```json
{
  "title": "Introduction to Python",
  "subject": "programming", // programming | mathematics | science | technology | engineering | languages | arts | social_studies | business | health | history | other
  "description": "What will students learn in this course?",
  "difficulty_level": "beginner", // beginner | intermediate | advanced
  "estimated_duration": "3 hours"
}
```

##### Response

```json
{
  "id": "uuid-string",
  "teacher_id": "uuid-string",
  "title": "Introduction to Python",
  "subject": "programming",
  "description": "What will students learn in this course?",
  "difficulty_level": "beginner",
  "estimated_duration": "3 hours",
  "cover_image_url": null,
  "intro_video_url": null,
  "status": "draft",
  "enrollment_type": "open",
  "enrollment_code": null,
  "start_date": null,
  "deadline": null,
  "award_certificate": true,
  "passing_score": 70,
  "notify_on_enroll": true,
  "notify_on_quiz_fail": true,
  "notify_inactive_after_days": null,
  "created_at": "2026-04-11T10:00:00Z",
  "updated_at": "2026-04-11T10:00:00Z"
}
```

---

#### Update Course Basics

**Endpoint:** `PATCH /api/v1/courses/{course_id}`
**Description:** Update course basics (title, subject, description, difficulty, duration, media URLs)
**Auth Required:** Yes (Bearer token, `teacher` role)

##### Request Payload (all fields optional)

```json
{
  "title": "Introduction to Python",
  "subject": "programming",
  "description": "What will students learn in this course?",
  "difficulty_level": "beginner",
  "estimated_duration": "3 hours",
  "cover_image_url": "https://cdn.example.com/cover.jpg",
  "intro_video_url": "https://cdn.example.com/video.mp4"
}
```

---

#### Cover Image Upload (User-triggered)

**Endpoint:** `POST /api/v1/courses/{course_id}/cover-image`
**Description:** Upload cover image for a course
**Auth Required:** Yes (Bearer token)
**Content-Type:** `multipart/form-data`

##### Request

```
POST /api/v1/courses/{course_id}/cover-image
Content-Type: multipart/form-data

file: <image_file>
```

##### Response (CourseRead)

```json
{
  "id": "course-uuid",
  "title": "Introduction to Python",
  "subject": "programming",
  "description": "...",
  "cover_image_url": "https://storage.example.com/courses/course-uuid/cover",
  "intro_video_url": null,
  "status": "draft",
  ...
}
```

**Note:** This endpoint uploads the file, saves it to storage, updates the course's `cover_image_url` field, and returns the full updated course object.

---

#### Intro Video Upload (User-triggered)

**Endpoint:** `POST /api/v1/courses/{course_id}/intro-video`
**Description:** Upload intro video for a course
**Auth Required:** Yes (Bearer token)
**Content-Type:** `multipart/form-data`

##### Request

```
POST /api/v1/courses/{course_id}/intro-video
Content-Type: multipart/form-data

file: <video_file>
```

##### Response (CourseRead)

```json
{
  "id": "course-uuid",
  "title": "Introduction to Python",
  "subject": "programming",
  "description": "...",
  "cover_image_url": "https://storage.example.com/courses/course-uuid/cover",
  "intro_video_url": "https://storage.example.com/courses/course-uuid/intro",
  "status": "draft",
  ...
}
```

**Note:** This endpoint uploads the file, saves it to storage, updates the course's `intro_video_url` field, and returns the full updated course object.

---

#### Learning Outcomes Section

After the course is created (or on subsequent edits), manage learning outcomes using these endpoints.

##### Fetch Existing Outcomes (Page Load)

**Endpoint:** `GET /api/v1/courses/{course_id}/outcomes`
**Description:** Fetch existing learning outcomes
**Auth Required:** Yes (Bearer token)
**Parallel to:** `GET /api/v1/courses/{course_id}`

##### Response

```json
[
  {
    "id": "uuid-1",
    "course_id": "course-uuid",
    "description": "Write basic Python scripts",
    "order": 1
  },
  {
    "id": "uuid-2",
    "course_id": "course-uuid",
    "description": "Understand variables and loops",
    "order": 2
  },
  {
    "id": "uuid-3",
    "course_id": "course-uuid",
    "description": "Build a simple calculator",
    "order": 3
  }
]
```

---

##### Replace All Outcomes (Save/Update)

**Endpoint:** `PUT /api/v1/courses/{course_id}/outcomes`
**Description:** Replace all learning outcomes (add/update/reorder/delete)
**Auth Required:** Yes (Bearer token)

##### Request Payload

```json
{
  "outcomes": [
    { "description": "Write basic Python scripts", "order": 1 },
    { "description": "Understand variables and loops", "order": 2 },
    { "description": "Build a simple calculator", "order": 3 },
    { "description": "Create functions and modules", "order": 4 }
  ]
}
```

##### Response

```json
[
  {
    "id": "uuid-1",
    "course_id": "course-uuid",
    "description": "Write basic Python scripts",
    "order": 1
  },
  {
    "id": "uuid-2",
    "course_id": "course-uuid",
    "description": "Understand variables and loops",
    "order": 2
  },
  {
    "id": "uuid-3",
    "course_id": "course-uuid",
    "description": "Build a simple calculator",
    "order": 3
  },
  {
    "id": "uuid-4",
    "course_id": "course-uuid",
    "description": "Create functions and modules",
    "order": 4
  }
]
```

**Note:** The `PUT` endpoint replaces ALL outcomes for the course. To remove an outcome, simply omit it from the list. To reorder, change the `order` values.

---

#### Save Draft / Navigate to Next Step

When the user clicks "Save draft" or "Next: Lessons →", save both course basics and outcomes:

**Parallel Requests:**
1. `PATCH /api/v1/courses/{course_id}` — Save course basics (title, subject, description, etc.)
2. `PUT /api/v1/courses/{course_id}/outcomes` — Save learning outcomes

---

## Summary: Page 1 Parallel Request Flow

### On Page Load (New Course)
1. No initial fetch needed — user starts with a blank form

### On Page Load (Edit Existing Course)
1. `GET /api/v1/courses/{course_id}` — Fetch course data (populates form)
2. `GET /api/v1/courses/{course_id}/outcomes` — Fetch outcomes (populates outcome list)

### On "Save Draft" or "Next"
1. `PATCH /api/v1/courses/{course_id}` — Save course basics
2. `PUT /api/v1/courses/{course_id}/outcomes` — Save outcomes

### User-triggered (Parallel to form edits)
1. `POST /api/v1/courses/{course_id}/cover-image` — Upload cover image
2. `POST /api/v1/courses/{course_id}/intro-video` — Upload intro video

---

## Step 2: Lessons

### Page 2: Lesson Builder

This page allows teachers to build lessons with content blocks. Lessons are sequential — subsequent lessons are "locked" until the previous lesson is complete.

**Endpoints to call on page load (PARALLEL):**
1. `GET /api/v1/courses/{course_id}/lessons` — Fetch all lessons for the course
2. `GET /api/v1/courses/{course_id}/lessons/{active_lesson_id}/blocks` — Fetch content blocks for the active lesson

---

#### Create a New Lesson

**Endpoint:** `POST /api/v1/courses/{course_id}/lessons`
**Description:** Create a new lesson
**Auth Required:** Yes (Bearer token, `teacher` role)

##### Request Payload

```json
{
  "title": "Variables and data types",
  "estimated_time": "20 min" // string, e.g., "20 min", "1 hour"
}
```

##### Response

```json
{
  "id": "lesson-uuid-string",
  "course_id": "course-uuid-string",
  "title": "Variables and data types",
  "estimated_time": "20 min",
  "completion_rule": "both",
  "min_quiz_score": 70.0,
  "order": 1,
  "created_at": "2026-04-11T10:30:00Z",
  "updated_at": "2026-04-11T10:30:00Z"
}
```

---

#### Fetch All Lessons

**Endpoint:** `GET /api/v1/courses/{course_id}/lessons`
**Description:** Fetch all lessons for a course (ordered by `order` field)
**Auth Required:** Yes (Bearer token)

##### Response

```json
[
  {
    "id": "lesson-uuid-1",
    "course_id": "course-uuid",
    "title": "Variables and data types",
    "estimated_time": "20 min",
    "completion_rule": "both",
    "min_quiz_score": 70.0,
    "order": 1,
    "created_at": "2026-04-11T10:30:00Z",
    "updated_at": "2026-04-11T10:30:00Z"
  },
  {
    "id": "lesson-uuid-2",
    "course_id": "course-uuid",
    "title": "Control flow",
    "estimated_time": "25 min",
    "completion_rule": "both",
    "min_quiz_score": 70.0,
    "order": 2,
    "created_at": "2026-04-11T10:35:00Z",
    "updated_at": "2026-04-11T10:35:00Z"
  }
]
```

**Note:** The backend does not have a `status` field on lessons. "Locked" is a frontend concept — the FE should determine lock state based on lesson order (e.g., lesson N+1 is locked until lesson N is complete by the student).

---

#### Update Lesson Details

**Endpoint:** `PATCH /api/v1/courses/{course_id}/lessons/{lesson_id}`
**Description:** Update lesson title and estimated time
**Auth Required:** Yes (Bearer token)

##### Request Payload (all fields optional)

```json
{
  "title": "Variables and data types",
  "estimated_time": "20 min",
  "completion_rule": "both", // watch_all | pass_quiz | both
  "min_quiz_score": 70
}
```

---

#### Delete a Lesson

**Endpoint:** `DELETE /api/v1/courses/{course_id}/lessons/{lesson_id}`
**Description:** Delete a lesson and all its content blocks
**Auth Required:** Yes (Bearer token)

---

#### Reorder Lessons (Drag-and-Drop)

**Endpoint:** `PUT /api/v1/courses/{course_id}/lessons/reorder`
**Description:** Reorder all lessons in a course (drag-and-drop in sidebar)
**Auth Required:** Yes (Bearer token)

##### Request Payload

```json
{
  "order": ["lesson-uuid-2", "lesson-uuid-1", "lesson-uuid-3"]
}
```

**Note:** Send a flat array of lesson IDs in the desired order.

---

### Content Blocks

Content blocks are the building blocks of a lesson. Supported types: `video`, `text`, `pdf`, `audio`, `quiz`, `code_sandbox`.

**UI Note:** Content blocks can be dragged to reorder. Use optimistic updates for smooth UX.

---

#### Add Content Block

**Endpoint:** `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks`
**Description:** Add a content block to a lesson
**Auth Required:** Yes (Bearer token)

##### Request Payload (Video)

```json
{
  "block_type": "video",
  "content": "<p>Optional HTML description</p>",
  "external_url": "https://www.youtube.com/watch?v=example", // or direct video URL
  "duration_seconds": 510,
  "order": 1
}
```

##### Request Payload (Text/Rich Text)

```json
{
  "block_type": "text",
  "content": "<p>Variables are containers that store data values.</p>",
  "order": 2
}
```

##### Request Payload (PDF)

```json
{
  "block_type": "pdf",
  "external_url": "https://example.com/python-cheatsheet.pdf",
  "file_tag": "syllabus", // optional: syllabus | slide | course_book | exercise
  "order": 3
}
```

##### Request Payload (Audio)

```json
{
  "block_type": "audio",
  "external_url": "https://example.com/python-podcast.mp3",
  "duration_seconds": 1200,
  "order": 4
}
```

##### Request Payload (Quiz Block - Links to a Quiz)

```json
{
  "block_type": "quiz",
  "quiz_id": "quiz-uuid-string", // ID of the quiz created in Step 3
  "content": "70% to pass", // optional description
  "order": 5
}
```

##### Request Payload (Code Sandbox)

```json
{
  "block_type": "code_sandbox",
  "content": "def greet(name):\n    return f'Hello, {name}!'", // starter code
  "order": 6
}
```

##### Response

```json
{
  "id": "block-uuid-string",
  "lesson_id": "lesson-uuid-string",
  "block_type": "video",
  "order": 1,
  "quiz_id": null,
  "file_url": null,
  "external_url": "https://www.youtube.com/watch?v=example",
  "content": "<p>Optional HTML description</p>",
  "duration_seconds": 510,
  "file_tag": null,
  "created_at": "2026-04-11T10:45:00Z",
  "updated_at": "2026-04-11T10:45:00Z"
}
```

---

#### Fetch Content Blocks for a Lesson

**Endpoint:** `GET /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks`
**Description:** Fetch all content blocks for a lesson (ordered by `order` field)
**Auth Required:** Yes (Bearer token)

##### Response

```json
[
  {
    "id": "block-uuid-1",
    "lesson_id": "lesson-uuid-1",
    "block_type": "video",
    "order": 1,
    "quiz_id": null,
    "file_url": "https://storage.example.com/courses/course-uuid/lessons/lesson-uuid/blocks/block-uuid/video.mp4",
    "external_url": null,
    "content": "<p>Intro to the lesson</p>",
    "duration_seconds": 510,
    "file_tag": null,
    "created_at": "2026-04-11T10:45:00Z",
    "updated_at": "2026-04-11T10:45:00Z"
  },
  {
    "id": "block-uuid-2",
    "lesson_id": "lesson-uuid-1",
    "block_type": "text",
    "order": 2,
    "quiz_id": null,
    "file_url": null,
    "external_url": null,
    "content": "<p>Variables are containers that store data values.</p>",
    "duration_seconds": null,
    "file_tag": null,
    "created_at": "2026-04-11T10:46:00Z",
    "updated_at": "2026-04-11T10:46:00Z"
  },
  {
    "id": "block-uuid-3",
    "lesson_id": "lesson-uuid-1",
    "block_type": "quiz",
    "order": 3,
    "quiz_id": "quiz-uuid-string",
    "file_url": null,
    "external_url": null,
    "content": "70% to pass",
    "duration_seconds": null,
    "file_tag": null,
    "created_at": "2026-04-11T10:47:00Z",
    "updated_at": "2026-04-11T10:47:00Z"
  }
]
```

---

#### Update a Content Block

**Endpoint:** `PATCH /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/{block_id}`
**Description:** Update content block details
**Auth Required:** Yes (Bearer token)

##### Request Payload (all fields optional)

```json
{
  "order": 2,
  "quiz_id": "quiz-uuid",
  "external_url": "https://www.youtube.com/watch?v=updated",
  "content": "<p>Updated content</p>",
  "duration_seconds": 600,
  "file_tag": "syllabus"
}
```

---

#### Reorder Content Blocks (Drag-and-Drop)

**Endpoint:** `PUT /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/reorder`
**Description:** Reorder all content blocks in a lesson (drag-and-drop)
**Auth Required:** Yes (Bearer token)

##### Request Payload

```json
{
  "order": ["block-uuid-2", "block-uuid-1", "block-uuid-3"]
}
```

**Note:** Send a flat array of block IDs in the desired order.

---

#### Delete a Content Block

**Endpoint:** `DELETE /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/{block_id}`
**Description:** Delete a content block
**Auth Required:** Yes (Bearer token)

---

### Completion Rule

Set what students must do to complete a lesson.

**Endpoint:** `PATCH /api/v1/courses/{course_id}/lessons/{lesson_id}`
**Description:** Set lesson completion rule
**Auth Required:** Yes (Bearer token)

##### Request Payload

```json
{
  "completion_rule": "both", // watch_all | pass_quiz | both
  "minimum_quiz_score": 70 // required if completion_rule is "pass_quiz" or "both"
}
```

**Completion Rule Options:**
- `watch_all` — Student must view all content blocks
- `pass_quiz` — Student must pass the lesson quiz
- `both` — Student must view all content AND pass the quiz

---

### Supporting Endpoints (Parallel Requests)

#### Upload File for a Content Block

**Endpoint:** `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/{block_id}/upload`
**Description:** Upload a file (video/audio/pdf) and attach it to an existing content block
**Auth Required:** Yes (Bearer token)
**Content-Type:** `multipart/form-data`

##### Request

```
POST /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/{block_id}/upload
Content-Type: multipart/form-data

file: <file>
file_tag: "syllabus" | "slide" | "course_book" | "exercise" (optional)
```

##### Response (ContentBlockRead)

```json
{
  "id": "block-uuid",
  "lesson_id": "lesson-uuid",
  "block_type": "video",
  "order": 1,
  "quiz_id": null,
  "file_url": "https://storage.example.com/courses/course-uuid/lessons/lesson-uuid/blocks/block-uuid/video.mp4",
  "external_url": null,
  "content": "<p>Optional description</p>",
  "duration_seconds": 510,
  "file_tag": null,
  "created_at": "2026-04-11T10:45:00Z",
  "updated_at": "2026-04-11T10:45:00Z"
}
```

**Note:** The block must already exist before uploading a file to it. The endpoint uploads the file, saves it to storage, updates the block's `file_url` field, and returns the updated block object.

---

#### Flow for Adding a Content Block with a File

1. `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks` — Create the block (with metadata only, no file yet)
2. `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/{block_id}/upload` — Upload the file to the block

---

## Summary: Page 2 Parallel Request Flow

### On Page Load
1. `GET /api/v1/courses/{course_id}/lessons` — Fetch lesson list (populate sidebar)
2. `GET /api/v1/courses/{course_id}/lessons/{active_lesson_id}/blocks` — Fetch blocks for active lesson

### When Switching Lessons
1. `GET /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks` — Fetch blocks for selected lesson

### On "Add Lesson"
1. `POST /api/v1/courses/{course_id}/lessons` — Create new lesson

### On Drag-to-Reorder Lessons
1. `PUT /api/v1/courses/{course_id}/lessons/reorder` — Update lesson order

### On "Add Block"
1. `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks` — Create content block (metadata)
2. `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/{block_id}/upload` — Upload file to block

### On Drag-to-Reorder Blocks
1. `PUT /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/reorder` — Update block order

### On "Save Completion Rule"
1. `PATCH /api/v1/courses/{course_id}/lessons/{lesson_id}` — Update completion_rule and min_quiz_score

---

## Step 3: Quiz Builder

### Page 3: Quiz Builder

This page allows teachers to build end-of-lesson quizzes. Each lesson can have one quiz with multiple questions.

**Endpoints to call on page load (PARALLEL):**
1. `GET /api/v1/courses/{course_id}/lessons` — Fetch lesson list (for sidebar navigation)
2. `GET /api/v1/courses/{course_id}/lessons/{lesson_id}/quiz` — Fetch quiz for the active lesson (create if not exists)

---

#### Fetch Quiz for a Lesson

**Endpoint:** `GET /api/v1/courses/{course_id}/lessons/{lesson_id}/quiz`
**Description:** Fetch quiz for a lesson. If no quiz exists, returns `404` — create one using POST.
**Auth Required:** Yes (Bearer token)

##### Response (if exists)

```json
{
  "id": "quiz-uuid",
  "lesson_id": "lesson-uuid-1",
  "questions": [
    {
      "id": "q-uuid-1",
      "quiz_id": "quiz-uuid",
      "question_type": "multiple_choice",
      "text": "What is a variable in Python?",
      "points": 1,
      "explanation": "Why this answer is correct...",
      "order": 1,
      "correct_answer": null,
      "accepted_answers": null,
      "options": [
        { "id": "opt-1", "text": "A container that stores a value", "is_correct": false },
        { "id": "opt-2", "text": "A named location in memory that holds data", "is_correct": true },
        { "id": "opt-3", "text": "A type of loop", "is_correct": false },
        { "id": "opt-4", "text": "A function definition", "is_correct": false }
      ],
      "pairs": []
    },
    {
      "id": "q-uuid-2",
      "quiz_id": "quiz-uuid",
      "question_type": "true_false",
      "text": "Python is case-sensitive.",
      "points": 1,
      "explanation": "",
      "order": 2,
      "correct_answer": true,
      "accepted_answers": null,
      "options": [],
      "pairs": []
    },
    {
      "id": "q-uuid-3",
      "quiz_id": "quiz-uuid",
      "question_type": "fill_in_blank",
      "text": "To print text in Python, you use the ______ function.",
      "points": 1,
      "explanation": null,
      "order": 3,
      "correct_answer": null,
      "accepted_answers": ["print", "print()"],
      "options": [],
      "pairs": []
    }
  ]
}
```

---

#### Create Quiz for a Lesson

**Endpoint:** `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/quiz`
**Description:** Create a new quiz for a lesson (returns empty quiz)
**Auth Required:** Yes (Bearer token)

##### Request Payload

```json
{
  "lesson_id": "lesson-uuid-1"
}
```

##### Response

```json
{
  "id": "quiz-uuid",
  "lesson_id": "lesson-uuid-1",
  "questions": [],
  "created_at": "2026-04-11T11:00:00Z",
  "updated_at": "2026-04-11T11:00:00Z"
}
```

---

### Question Types

Supported question types: `multiple_choice`, `true_false`, `fill_in_blank`, `short_answer`, `matching`

---

#### Add Question to Quiz

**Endpoint:** `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/quiz/questions`
**Description:** Add a question to the lesson's quiz
**Auth Required:** Yes (Bearer token)

##### Request Payload (Multiple Choice)

```json
{
  "question_type": "multiple_choice",
  "text": "What is a variable in Python?",
  "points": 1,
  "options": [
    { "text": "A container that stores a value", "is_correct": false },
    { "text": "A named location in memory that holds data", "is_correct": true },
    { "text": "A type of loop", "is_correct": false },
    { "text": "A function definition", "is_correct": false }
  ],
  "explanation": "Why this answer is correct...",
  "order": 1
}
```

##### Request Payload (True/False)

```json
{
  "question_type": "true_false",
  "text": "Python is case-sensitive.",
  "points": 1,
  "correct_answer": true,
  "explanation": "",
  "order": 2
}
```

##### Request Payload (Fill in the Blank)

```json
{
  "question_type": "fill_in_blank",
  "text": "To print text in Python, you use the ______ function.",
  "points": 1,
  "accepted_answers": ["print", "print()"],
  "order": 3
}
```

##### Request Payload (Short Answer)

```json
{
  "question_type": "short_answer",
  "text": "Explain what a variable is in your own words.",
  "points": 2,
  "accepted_answers": ["A variable is a named location in memory that stores data"],
  "explanation": "Look for keywords: memory, store, data, value",
  "order": 4
}
```

##### Request Payload (Matching)

```json
{
  "question_type": "matching",
  "text": "Match the Python terms with their descriptions",
  "points": 3,
  "pairs": [
    { "left_text": "Variable", "right_text": "Named location in memory" },
    { "left_text": "Function", "right_text": "Reusable block of code" },
    { "left_text": "Loop", "right_text": "Repeats a block of code" }
  ],
  "order": 5
}
```

##### Response

```json
{
  "id": "q-uuid",
  "quiz_id": "quiz-uuid",
  "question_type": "multiple_choice",
  "text": "What is a variable in Python?",
  "points": 1,
  "explanation": "Why this answer is correct...",
  "order": 1,
  "correct_answer": null,
  "accepted_answers": null,
  "options": [
    { "id": "opt-1", "text": "A container...", "is_correct": false },
    ...
  ],
  "pairs": [],
  "created_at": "2026-04-11T11:05:00Z",
  "updated_at": "2026-04-11T11:05:00Z"
}
```

---

#### Update a Quiz Question

**Endpoint:** `PATCH /api/v1/courses/{course_id}/lessons/{lesson_id}/quiz/questions/{question_id}`
**Description:** Update quiz question details
**Auth Required:** Yes (Bearer token)

##### Request Payload (all fields optional)

```json
{
  "text": "Updated question text?",
  "points": 2,
  "options": [
    { "text": "Option A", "is_correct": false },
    { "text": "Option B", "is_correct": true }
  ],
  "explanation": "Updated explanation"
}
```

---

#### Delete a Quiz Question

**Endpoint:** `DELETE /api/v1/courses/{course_id}/lessons/{lesson_id}/quiz/questions/{question_id}`
**Description:** Delete a quiz question
**Auth Required:** Yes (Bearer token)

**Note:** Quiz questions are ordered by their `order` field. To reorder, update each question's `order` individually via the PATCH endpoint. There is no bulk reorder endpoint for questions.

---

## Summary: Page 3 Parallel Request Flow

### On Page Load
1. `GET /api/v1/courses/{course_id}/lessons` — Fetch lesson list (populate sidebar)
2. `GET /api/v1/courses/{course_id}/lessons/{lesson_id}/quiz` — Fetch quiz for active lesson

### If Quiz Doesn't Exist (404)
1. `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/quiz` — Create empty quiz

### On "Add Question"
1. `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/quiz/questions` — Add question

### On Reorder Questions
1. `PATCH /api/v1/courses/{course_id}/lessons/{lesson_id}/quiz/questions/{question_id}` — Update each question's `order` field

---

## Step 4: Settings & Publish

### Page 4: Settings & Publish

This page combines enrollment settings, completion/certificate options, notifications, and the final publish action.

**Endpoints to call on page load (PARALLEL):**
1. `GET /api/v1/courses/{course_id}` — Fetch course details (populates all settings fields)
2. `GET /api/v1/courses/{course_id}/lessons` — Fetch lesson count (for summary)

---

#### Fetch Course Details

**Endpoint:** `GET /api/v1/courses/{course_id}`
**Description:** Fetch course details for the settings form
**Auth Required:** Yes (Bearer token)

##### Response

```json
{
  "id": "course-uuid",
  "teacher_id": "teacher-uuid",
  "title": "Introduction to Python",
  "subject": "programming",
  "description": "What will students learn in this course?",
  "difficulty_level": "beginner",
  "estimated_duration": "3 hours",
  "cover_image_url": "https://cdn.example.com/cover.jpg",
  "intro_video_url": "https://cdn.example.com/video.mp4",
  "status": "draft",
  "enrollment_type": "open",
  "enrollment_code": null,
  "start_date": null,
  "deadline": null,
  "award_certificate": true,
  "passing_score": 70,
  "notify_on_enroll": true,
  "notify_on_quiz_fail": true,
  "notify_inactive_after_days": null,
  "created_at": "2026-04-11T10:00:00Z",
  "updated_at": "2026-04-11T10:00:00Z"
}
```

---

#### Update Course Settings

**Endpoint:** `PATCH /api/v1/courses/{course_id}`
**Description:** Update course settings (enrollment, completion, notifications)
**Auth Required:** Yes (Bearer token)

##### Request Payload (all fields optional)

```json
{
  "enrollment_type": "open", // open | code_protected
  "enrollment_code": "", // optional, leave blank for open access
  "start_date": "2026-04-15", // YYYY-MM-DD, optional
  "deadline": "2026-12-31", // YYYY-MM-DD, optional
  "award_certificate": true,
  "passing_score": 70, // percentage
  "notify_on_enroll": true,
  "notify_on_quiz_fail": true,
  "notify_inactive_after_days": 3 // 0 or null = disabled
}
```

##### Response

```json
{
  "id": "course-uuid",
  "teacher_id": "teacher-uuid",
  "title": "Introduction to Python",
  "subject": "programming",
  "description": "What will students learn in this course?",
  "difficulty_level": "beginner",
  "estimated_duration": "3 hours",
  "cover_image_url": "https://cdn.example.com/cover.jpg",
  "intro_video_url": "https://cdn.example.com/video.mp4",
  "status": "draft",
  "enrollment_type": "open",
  "enrollment_code": null,
  "start_date": "2026-04-15",
  "deadline": "2026-12-31",
  "award_certificate": true,
  "passing_score": 70,
  "notify_on_enroll": true,
  "notify_on_quiz_fail": true,
  "notify_inactive_after_days": 3,
  "created_at": "2026-04-11T10:00:00Z",
  "updated_at": "2026-04-11T11:30:00Z"
}
```

---

#### Validate Course Before Publishing

**Note:** There is currently no dedicated validation endpoint. The frontend should verify course completeness client-side by checking:
- At least one lesson exists
- Each lesson has at least one content block
- Quiz blocks reference valid quizzes with questions

Alternatively, the backend returns a `422 Unprocessable Entity` error during publish if requirements aren't met. See the publish endpoint below.

---

#### Publish Course

**Endpoint:** `PATCH /api/v1/courses/{course_id}/publish`
**Description:** Publish the course (changes status from `draft` to `published`)
**Auth Required:** Yes (Bearer token)

##### Request Payload

No body required — the endpoint simply publishes the course.

##### Response

```json
{
  "id": "course-uuid",
  "title": "Introduction to Python",
  "status": "published",
  "published_at": "2026-04-11T11:45:00Z",
  "url": "/courses/course-uuid"
}
```

---

#### Save as Draft

**Endpoint:** `PATCH /api/v1/courses/{course_id}`
**Description:** Ensure course status is `draft` (no explicit endpoint needed — just save settings)

**Note:** The course is in `draft` status by default. No separate "save as draft" endpoint is needed — just use `PATCH /api/v1/courses/{course_id}` to persist any pending changes.

---

## Summary: Page 4 Parallel Request Flow

### On Page Load
1. `GET /api/v1/courses/{course_id}` — Fetch course details (populate all settings fields)
2. `GET /api/v1/courses/{course_id}/lessons` — Fetch lesson count (for summary)

### On "Validate Before Publish"
1. `GET /api/v1/courses/{course_id}/validation` — Check if course is ready to publish

### On "Save as Draft"
1. `PATCH /api/v1/courses/{course_id}` — Persist any pending settings changes

### On "Publish Course"
1. `PATCH /api/v1/courses/{course_id}/publish` — Publish the course

---

## Complete Parallel Request Summary

### Page 1: Course Basics + Outcomes

#### On Page Load (Edit Mode)
1. `GET /api/v1/courses/{course_id}` — Fetch course data
2. `GET /api/v1/courses/{course_id}/outcomes` — Fetch outcomes

#### On "Save Draft" / "Next"
1. `PATCH /api/v1/courses/{course_id}` — Save course basics
2. `PUT /api/v1/courses/{course_id}/outcomes` — Save outcomes

#### User-triggered (Parallel)
1. `POST /api/v1/courses/{course_id}/cover-image` — Upload cover image
2. `POST /api/v1/courses/{course_id}/intro-video` — Upload intro video

---

### Page 2: Lessons

#### On Page Load
1. `GET /api/v1/courses/{course_id}/lessons` — Fetch lesson list
2. `GET /api/v1/courses/{course_id}/lessons/{active_lesson_id}/blocks` — Fetch blocks for active lesson

#### When Switching Lessons
1. `GET /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks` — Fetch blocks for selected lesson

#### On "Add Lesson"
1. `POST /api/v1/courses/{course_id}/lessons` — Create new lesson

#### On Drag-to-Reorder Lessons
1. `PUT /api/v1/courses/{course_id}/lessons/reorder` — Update lesson order

#### On "Add Block"
1. `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks` — Create content block
2. `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/{block_id}/upload` — Upload file to block

#### On Drag-to-Reorder Blocks
1. `PUT /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/reorder` — Update block order

#### On "Save Completion Rule"
1. `PATCH /api/v1/courses/{course_id}/lessons/{lesson_id}` — Update completion_rule + min_quiz_score

---

### Page 3: Quiz Builder

#### On Page Load
1. `GET /api/v1/courses/{course_id}/lessons` — Fetch lesson list (sidebar)
2. `GET /api/v1/courses/{course_id}/lessons/{lesson_id}/quiz` — Fetch quiz for active lesson

#### If Quiz Doesn't Exist (404)
1. `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/quiz` — Create empty quiz

#### On "Add Question"
1. `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/quiz/questions` — Add question

#### On Reorder Questions
1. `PATCH /api/v1/courses/{course_id}/lessons/{lesson_id}/quiz/questions/{question_id}` — Update each question's `order` field individually

---

### Page 4: Settings & Publish

#### On Page Load
1. `GET /api/v1/courses/{course_id}` — Fetch course details
2. `GET /api/v1/courses/{course_id}/lessons` — Fetch lesson count (for summary)

#### On "Save as Draft"
1. `PATCH /api/v1/courses/{course_id}` — Persist settings

#### On "Publish Course"
1. `PATCH /api/v1/courses/{course_id}/publish` — Publish (returns 422 if course is incomplete)

---

## Error Responses

All endpoints return standardized error format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Course title is required",
    "details": [
      {
        "field": "title",
        "message": "Title cannot be empty"
      }
    ]
  }
}
```

Common error codes:
- `VALIDATION_ERROR` — Missing/invalid fields
- `NOT_FOUND` — Resource not found
- `UNAUTHORIZED` — Invalid/missing token
- `FORBIDDEN` — Insufficient permissions
- `CONFLICT` — Resource already exists or invalid state

---

## Pagination

List endpoints support pagination:

```
GET /api/v1/courses/{course_id}/lessons?page=1&limit=20
```

Response:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

## Notes for Frontend

1. **Auto-save:** Implement debounced auto-save (e.g., 2 seconds after user stops typing) for all form fields
2. **Optimistic updates:** For drag-and-drop reorder (lessons, blocks), update UI immediately, rollback on error. For quiz questions, update `order` via individual PATCH calls
3. **File uploads:** Files are uploaded directly to endpoints, not to a generic media endpoint:
   - Cover image: `POST /api/v1/courses/{course_id}/cover-image`
   - Intro video: `POST /api/v1/courses/{course_id}/intro-video`
   - Block file: `POST /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/{block_id}/upload`
   - Create the block first (metadata only), then upload the file to it
4. **Lesson locking:** Subsequent lessons are "locked" until previous lesson is complete — show locked state in sidebar
5. **Draft state:** Course remains in `draft` status until explicitly published via `PATCH /api/v1/courses/{course_id}/publish`
6. **Progress indicator:** Use lesson/block counts to show progress in the stepper
7. **Subject dropdown:** The `subject` field uses a fixed enum (no separate `/categories` endpoint needed) — populate dropdown from: `programming`, `mathematics`, `science`, `technology`, `engineering`, `languages`, `arts`, `social_studies`, `business`, `health`, `history`, `other`
8. **Completion rule mapping:** Map FE dropdown values to backend enum:
   - "Watch all content" → `watch_all`
   - "Pass quiz" → `pass_quiz`
   - "Watch all content + pass quiz" → `both`
9. **Block types:** `video`, `text`, `pdf`, `audio`, `quiz`, `code_sandbox`
10. **Reorder endpoints:** Use flat ID arrays, not nested objects:
    - Lessons: `PUT /api/v1/courses/{course_id}/lessons/reorder` → `{"order": ["id1", "id2"]}`
    - Blocks: `PUT /api/v1/courses/{course_id}/lessons/{lesson_id}/blocks/reorder` → `{"order": ["id1", "id2"]}`
11. **Quiz block:** Requires a `quiz_id` linking to an existing quiz (created in Step 3)
12. **File tags (optional):** `syllabus`, `slide`, `course_book`, `exercise`

---

*Document generated: 2026-04-11*
*Version: 2.0*
