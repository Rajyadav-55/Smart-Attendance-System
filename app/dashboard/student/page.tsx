
"use client";
import React, { useEffect, useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import { AttendanceAnalytics } from "@/components/attendance-analytics";
import { CoursesTable } from "@/components/courses-table";
// import { StudentsTable } from "@/components/students-table";
// import { AttendanceInterface } from "@/components/attendance-interface"; // For marking attendance, if needed
// import { QRAttendanceDisplay } from "@/components/qr-attendance-display"; // For QR attendance, if needed


export default function StudentDashboard() {
  // Supabase and hooks
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = require("@/lib/supabase/client").createClient();
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setLoading(false);
        return;
      }
      // Get student profile
      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("email", userData.user.email)
        .single();
      setStudent(studentData);

      // Get enrolled courses
      const { data: enrollments } = await supabase
        .from("student_enrollments")
        .select(`courses(*)`)
        .eq("student_id", studentData?.id)
        .eq("is_active", true);
      const enrolledCourses = enrollments?.map((e: any) => e.courses).filter(Boolean) || [];
      setCourses(enrolledCourses);

      // Get attendance records
      const { data: attendance } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("student_id", studentData?.id);
      setAttendanceRecords(attendance || []);

      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="p-6 space-y-8">
        <nav className="flex items-center justify-between mb-6">
          <div className="text-xl font-bold text-blue-700">Student Dashboard</div>
          <div className="flex gap-4">
            <a href="/scan" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Scan QR</a>
            <a href="/analytics" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition">View Analytics</a>
            <a href="/logout" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition">Logout</a>
          </div>
        </nav>
        <div className="bg-white rounded shadow p-4">Loading your dashboard...</div>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-8">
      <nav className="flex items-center justify-between mb-6">
        <div className="text-xl font-bold text-blue-700">Student Dashboard</div>
        <div className="flex gap-4">
          <a href="/scan" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Scan QR</a>
          <a href="/analytics" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition">View Analytics</a>
          <LogoutButton />
        </div>
      </nav>

      {/* Attendance Analytics */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Attendance Analytics</h2>
  {student && <AttendanceAnalytics studentId={student.id} />}
      </section>

      {/* Courses Overview */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">My Courses</h2>
        <CoursesTable courses={courses} />
      </section>

      {/* Recent Activity */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
        <div className="bg-white rounded shadow p-4">
          {attendanceRecords.length === 0 ? (
            <span>No recent attendance records.</span>
          ) : (
            <ul>
              {attendanceRecords.slice(0, 5).map((record: any) => (
                <li key={record.id}>
                  {record.status} for class {record.class_id} on {new Date(record.created_at).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Profile Info */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Profile</h2>
        {student ? (
          <div className="bg-white rounded shadow p-4">
            <div><strong>Name:</strong> {student.first_name} {student.last_name}</div>
            <div><strong>Email:</strong> {student.email}</div>
            <div><strong>Department:</strong> {student.department}</div>
            <div><strong>Year:</strong> {student.year_of_study}</div>
            <div><strong>Enrollment Date:</strong> {new Date(student.enrollment_date).toLocaleDateString()}</div>
          </div>
        ) : (
          <div className="bg-white rounded shadow p-4">Profile info not found.</div>
        )}
      </section>
    </main>
  );
}
