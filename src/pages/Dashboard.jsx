import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, LogOut, BookOpen, Users, BarChart3 } from 'lucide-react';
import { coursesApi } from '@/services/api';

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchCourses = async () => {
      try {
        const response = await coursesApi.getAll({ page_size: 100, page: 1 });
        const coursesData = response.data?.data?.items || [];
        setCourses(coursesData);
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div className="min-h-screen bg-[#fdfaf6]">
      {/* Header */}
      <header className="bg-white border-b border-orange-100 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 p-2 rounded-lg">
            <BookOpen className="text-white h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">LMS</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={logout} className="text-gray-500 flex items-center gap-2 hover:text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
          <div className="h-10 w-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">
            SA
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-2">Welcome back, Professor!</h2>
            <p className="text-gray-500 text-lg">Your students are waiting for your next lesson.</p>
          </div>
          <Button
            onClick={() => navigate('/courses/create')}
            className="bg-orange-600 hover:bg-orange-700 h-14 px-8 text-lg font-bold rounded-2xl flex gap-3 shadow-lg shadow-orange-200"
          >
            <Plus className="h-6 w-6" /> Create new course
          </Button>
        </div>

        {/* Dashboard Stats */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-orange-50 shadow-orange-100/50">
            <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl w-fit mb-4">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-gray-500 font-medium">Total Students</p>
            <h3 className="text-3xl font-black text-gray-900">1,284</h3>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-orange-50 shadow-orange-100/50">
            <div className="bg-green-50 text-green-600 p-3 rounded-2xl w-fit mb-4">
              <BookOpen className="h-6 w-6" />
            </div>
            <p className="text-gray-500 font-medium">Active Courses</p>
            <h3 className="text-3xl font-black text-gray-900">12</h3>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-orange-50 shadow-orange-100/50">
            <div className="bg-orange-50 text-orange-600 p-3 rounded-2xl w-fit mb-4">
              <BarChart3 className="h-6 w-6" />
            </div>
            <p className="text-gray-500 font-medium">Total Revenue</p>
            <h3 className="text-3xl font-black text-gray-900">$24,400</h3>
          </div>
        </div> */}

        {/* Courses Section */}
        {loading ? (
          <div className="flex justify-center p-20 text-gray-500 font-medium">Loading courses...</div>
        ) : (!Array.isArray(courses) || courses.length === 0) ? (
          <div className="bg-white rounded-[40px] border border-dashed border-orange-200 p-20 text-center">
            <div className="mx-auto bg-orange-50 h-24 w-24 rounded-full flex items-center justify-center mb-6">
              <Plus className="text-orange-400 h-12 w-12" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No active courses yet</h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">Create your first course to start sharing your knowledge with the world.</p>
            <Button
              variant="outline"
              onClick={() => navigate('/courses/create')}
              className="border-orange-200 text-orange-600 hover:bg-orange-50 h-12 px-6 rounded-xl font-bold"
            >
              Start building now
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => navigate(`/courses/${course.id}/edit`)}
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow group flex flex-col"
              >
                <div className="aspect-video bg-gray-100 rounded-2xl mb-4 overflow-hidden relative shrink-0">
                  {course.cover_image_url ? (
                    <img src={course.cover_image_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium text-lg">
                      No Image
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {course.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{course.title || 'Untitled Course'}</h3>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-grow">{course.description || 'No description provided'}</p>
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 mb-4">
                  <span className="text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                    {course.subject || 'Uncategorized'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {course.difficulty_level || 'Beginner'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                  <span>{course.estimated_duration ? `${course.estimated_duration}` : 'Duration TBD'}</span>
                  <span className="text-orange-600 group-hover:underline">Edit course &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
